import { auth } from "@clerk/nextjs/server";
import {
  addChatMessage,
  getConversationContext,
  getConversationMessages,
  getLatestMemorySnapshot,
  saveMemorySnapshot,
} from "@/lib/db";
import { hasLLMEnv } from "@/lib/env";
import { getLLMClient, getLLMModel } from "@/lib/llm/client";
import { chatSystemPrompt } from "@/lib/llm/prompts";
import { ChatRequestSchema } from "@/lib/schemas";
import {
  buildAttachmentSummary,
  composeIntakeContext,
  deriveSuggestedQuestions,
  memorySummary,
} from "@/lib/services/chat";
import { updateMemoryWithChat } from "@/lib/services/triage";

export const runtime = "nodejs";

function parseDataUrl(dataUrl: string) {
  const matched = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!matched) {
    return null;
  }

  return {
    mime: matched[1],
    data: Buffer.from(matched[2], "base64"),
  };
}

async function extractPdfText(dataUrl: string) {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) {
    return "";
  }

  try {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: parsed.data });
    const result = await parser.getText();
    await parser.destroy();
    return result.text?.slice(0, 3000) ?? "";
  } catch {
    return "";
  }
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = ChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid chat payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const payload = parsed.data;
  const context = await getConversationContext({
    clerkUserId: userId,
    conversationId: payload.conversationId,
  });
  if (!context) {
    return Response.json({ error: "Conversation not found" }, { status: 404 });
  }

  const recentMessages = await getConversationMessages({
    clerkUserId: userId,
    conversationId: payload.conversationId,
    limit: 20,
  });

  const latestMemory = await getLatestMemorySnapshot(userId);

  const attachmentsWithText = await Promise.all(
    payload.attachments.map(async (attachment) => {
      if (attachment.kind !== "pdf") {
        return attachment;
      }
      return {
        ...attachment,
        extractedText: await extractPdfText(attachment.dataUrl),
      };
    }),
  );

  const attachmentSummary = buildAttachmentSummary(attachmentsWithText);
  const userPrompt = `${payload.content}\n\n${attachmentSummary}`.trim();

  const userMessageId = await addChatMessage({
    conversationId: payload.conversationId,
    role: "user",
    content: userPrompt,
    metadata: {
      attachmentCount: payload.attachments.length,
    },
  });

  const systemPrompt = chatSystemPrompt({
    triage: context.intakeTriage,
    memory: latestMemory?.snapshot ?? null,
  });

  const llmMessages: Array<Record<string, unknown>> = [
    { role: "system", content: systemPrompt },
    ...recentMessages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  ];

  const imageAttachments = payload.attachments.filter(
    (attachment) => attachment.kind === "image",
  );

  if (imageAttachments.length) {
    llmMessages.push({
      role: "user",
      content: [
        {
          type: "text",
          text: `${userPrompt}\n\nIntake Context: ${composeIntakeContext(context.intakePayload)}\nMemory Snapshot: ${memorySummary(latestMemory?.snapshot ?? null)}`,
        },
        ...imageAttachments.map((attachment) => ({
          type: "image_url",
          image_url: {
            url: attachment.dataUrl,
          },
        })),
      ],
    });
  } else {
    llmMessages.push({
      role: "user",
      content: `${userPrompt}\n\nIntake Context: ${composeIntakeContext(context.intakePayload)}\nMemory Snapshot: ${memorySummary(latestMemory?.snapshot ?? null)}`,
    });
  }

  const encoder = new TextEncoder();
  let assistantResponse = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        if (!hasLLMEnv()) {
          assistantResponse = [
            "I can still help with triage steps even though the LLM credentials are missing.",
            "",
            "What you can do now:",
            "- Re-check key vitals (temperature, pulse, oxygen) and track changes.",
            "- Continue hydration and avoid unknown medications.",
            "",
            "When to seek help:",
            "- Seek urgent care immediately if breathing worsens, chest pain starts, or confusion appears.",
            "",
            "What to tell the doctor:",
            "- Symptom timeline, red flags, and medications/allergies.",
          ].join("\n");

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ token: assistantResponse })}\n\n`,
            ),
          );
        } else {
          const client = getLLMClient();
          const response = await client.chat.completions.create({
            model: getLLMModel(),
            temperature: 0.2,
            stream: true,
            messages: llmMessages as never,
          });

          for await (const chunk of response) {
            const token = chunk.choices[0]?.delta?.content ?? "";
            if (!token) {
              continue;
            }
            assistantResponse += token;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ token })}\n\n`),
            );
          }
        }

        if (!assistantResponse.trim()) {
          assistantResponse = "I could not generate a response. Please retry.";
          console.error("[MaxWell][API][Chat] Empty assistant output", {
            clerkUserId: userId,
            conversationId: payload.conversationId,
            hasLLMEnv: hasLLMEnv(),
            model: getLLMModel(),
            attachmentCount: payload.attachments.length,
          });
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ token: assistantResponse })}\n\n`,
            ),
          );
        }

        const suggestions = deriveSuggestedQuestions({
          memory: latestMemory?.snapshot ?? null,
          userPrompt: payload.content,
        });

        await addChatMessage({
          conversationId: payload.conversationId,
          role: "assistant",
          content: assistantResponse,
          metadata: { suggestions },
        });

        if (latestMemory?.snapshot) {
          const nextSnapshot = updateMemoryWithChat(
            latestMemory.snapshot,
            payload.content,
            assistantResponse,
          );
          await saveMemorySnapshot({
            clerkUserId: userId,
            snapshot: nextSnapshot,
            sourceMessageIds: [userMessageId],
          });
        }

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ done: true, suggestions })}\n\n`,
          ),
        );
        controller.close();
      } catch (error) {
        const fallbackResponse =
          assistantResponse.trim() ||
          "I could not generate a response. Please retry.";
        console.error("[MaxWell][API][Chat] Assistant failed to respond", {
          clerkUserId: userId,
          conversationId: payload.conversationId,
          hasLLMEnv: hasLLMEnv(),
          model: getLLMModel(),
          attachmentCount: payload.attachments.length,
          error,
        });
        if (!assistantResponse.trim()) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ token: fallbackResponse })}\n\n`,
            ),
          );
        }
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: "Assistant failed to respond." })}\n\n`,
          ),
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
