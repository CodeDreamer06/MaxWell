"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { TriageBadge } from "@/components/triage-badge";
import {
  AttachmentIcon,
  ChatIcon,
  CopyIcon,
  HospitalIcon,
  ReferralIcon,
  RefreshIcon,
  SendIcon,
  SpinnerIcon,
  StarIcon,
} from "@/components/ui-icons";
import type {
  AttachmentInput,
  ChatMessageRecord,
  TriageLevel,
} from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

type UiMessage = ChatMessageRecord & {
  pending?: boolean;
};

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to read attachment"));
    reader.readAsDataURL(file);
  });
}

function MarkdownMessage({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ node: _node, ...props }) => (
          <a
            {...props}
            target="_blank"
            rel="noreferrer"
            className="text-cyan-200 underline decoration-cyan-200/60 underline-offset-2 hover:text-cyan-100"
          />
        ),
        blockquote: ({ node: _node, ...props }) => (
          <blockquote
            {...props}
            className="border-l-2 border-cyan-200/50 pl-3 text-cyan-100/80 italic"
          />
        ),
        code: ({ node: _node, ...props }) => (
          <code
            {...props}
            className="rounded bg-slate-900/80 px-1.5 py-0.5 font-mono text-[0.9em] text-cyan-100"
          />
        ),
        h1: ({ node: _node, ...props }) => (
          <h1
            {...props}
            className="mt-3 mb-2 text-lg font-semibold text-cyan-50"
          />
        ),
        h2: ({ node: _node, ...props }) => (
          <h2
            {...props}
            className="mt-3 mb-2 text-base font-semibold text-cyan-50"
          />
        ),
        h3: ({ node: _node, ...props }) => (
          <h3
            {...props}
            className="mt-2 mb-1 text-sm font-semibold tracking-wide text-cyan-50"
          />
        ),
        hr: ({ node: _node, ...props }) => (
          <hr {...props} className="my-3 border-cyan-100/20" />
        ),
        li: ({ node: _node, ...props }) => (
          <li {...props} className="my-1 ml-5 list-outside list-disc" />
        ),
        ol: ({ node: _node, ...props }) => (
          <ol {...props} className="my-2 ml-5 list-outside list-decimal" />
        ),
        p: ({ node: _node, ...props }) => (
          <p {...props} className="my-2 leading-relaxed text-cyan-50/90" />
        ),
        pre: ({ node: _node, ...props }) => (
          <pre
            {...props}
            className="my-2 overflow-x-auto rounded-xl border border-white/10 bg-slate-950/70 p-3 text-xs leading-relaxed"
          />
        ),
        table: ({ node: _node, ...props }) => (
          <div className="my-2 overflow-x-auto">
            <table
              {...props}
              className="w-full border-collapse text-left text-xs"
            />
          </div>
        ),
        td: ({ node: _node, ...props }) => (
          <td
            {...props}
            className="border border-white/10 px-2 py-1 align-top"
          />
        ),
        th: ({ node: _node, ...props }) => (
          <th
            {...props}
            className="border border-white/10 bg-cyan-200/10 px-2 py-1 font-semibold text-cyan-50"
          />
        ),
        ul: ({ node: _node, ...props }) => (
          <ul {...props} className="my-2 ml-5 list-outside list-disc" />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

export function ChatInterface() {
  const searchParams = useSearchParams();
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [conversationId, setConversationId] = useState("");
  const [triageLevel, setTriageLevel] = useState<TriageLevel>("yellow");
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<AttachmentInput[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const conversationFromUrl = searchParams.get("conversationId");

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    setError("");

    const query = conversationFromUrl
      ? `?conversationId=${conversationFromUrl}`
      : "";
    const response = await fetch(`/api/chat/history${query}`);
    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "Unable to load chat history.");
      setLoadingHistory(false);
      return;
    }

    if (data.needsIntake) {
      setConversationId("");
      setMessages([]);
      setLoadingHistory(false);
      return;
    }

    setConversationId(data.conversationId);
    setTriageLevel(data.triageLevel ?? "yellow");
    setMessages(data.messages ?? []);
    setSuggestions(data.triage?.followUpQuestions ?? []);
    setLoadingHistory(false);
  }, [conversationFromUrl]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  const lastUserMessage = useMemo(
    () => [...messages].reverse().find((message) => message.role === "user"),
    [messages],
  );

  async function toggleImportant(message: UiMessage) {
    if (!message.id) {
      return;
    }

    const nextImportant = !message.isImportant;
    setMessages((previous) =>
      previous.map((entry) =>
        entry.id === message.id
          ? { ...entry, isImportant: nextImportant }
          : entry,
      ),
    );

    await fetch(`/api/messages/${message.id}/important`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ important: nextImportant }),
    });
  }

  async function sendMessage(customContent?: string) {
    if (!conversationId || sending) {
      return;
    }

    const content = customContent ?? input;
    if (!content.trim()) {
      return;
    }

    setSending(true);
    setError("");

    const userMessage: UiMessage = {
      id: uid(),
      conversationId,
      role: "user",
      content,
      isImportant: false,
      createdAt: new Date().toISOString(),
    };

    const assistantPlaceholderId = uid();
    const assistantMessage: UiMessage = {
      id: assistantPlaceholderId,
      conversationId,
      role: "assistant",
      content: "",
      isImportant: false,
      createdAt: new Date().toISOString(),
      pending: true,
    };

    setMessages((previous) => [...previous, userMessage, assistantMessage]);
    setInput("");

    const payload = {
      conversationId,
      content,
      attachments,
    };

    setAttachments([]);

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok || !response.body) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "Assistant request failed.");
      setSending(false);
      setMessages((previous) =>
        previous.map((message) =>
          message.id === assistantPlaceholderId
            ? {
                ...message,
                pending: false,
                content: "I could not generate a response. Please retry.",
              }
            : message,
        ),
      );
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let full = "";
    let streamError = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";

      for (const event of events) {
        const line = event
          .split("\n")
          .find((entry) => entry.startsWith("data: "));
        if (!line) {
          continue;
        }
        const json = line.slice(6);
        const packet = JSON.parse(json) as {
          token?: string;
          done?: boolean;
          suggestions?: string[];
          error?: string;
        };

        if (packet.token) {
          full += packet.token;
          setMessages((previous) =>
            previous.map((message) =>
              message.id === assistantPlaceholderId
                ? { ...message, content: full }
                : message,
            ),
          );
        }

        if (packet.suggestions?.length) {
          setSuggestions(packet.suggestions);
        }

        if (packet.error) {
          streamError = packet.error;
          setError(packet.error);
        }
      }
    }

    const finalAssistantContent =
      full.trim() || "I could not generate a response. Please retry.";

    setMessages((previous) =>
      previous.map((message) =>
        message.id === assistantPlaceholderId
          ? { ...message, pending: false, content: finalAssistantContent }
          : message,
      ),
    );
    if (streamError && !full.trim()) {
      setError(streamError);
    }
    setSending(false);
  }

  async function handleFilesChange(files: FileList | null) {
    if (!files) {
      return;
    }

    const chosen = Array.from(files).slice(0, 4);
    const converted = await Promise.all(
      chosen.map(async (file) => {
        const kind = file.type.includes("pdf") ? "pdf" : "image";
        return {
          id: uid(),
          name: file.name,
          kind,
          dataUrl: await fileToDataUrl(file),
        } as AttachmentInput;
      }),
    );

    setAttachments(converted);
  }

  function regenerateNear(index: number) {
    const previousUser = [...messages.slice(0, index)]
      .reverse()
      .find((message) => message.role === "user");
    if (!previousUser) {
      return;
    }
    sendMessage(previousUser.content);
  }

  if (loadingHistory) {
    return (
      <div className="card-glass flex items-center gap-2 rounded-2xl p-4 text-sm text-cyan-50/80">
        <SpinnerIcon className="h-4 w-4" />
        Loading chat...
      </div>
    );
  }

  if (!conversationId) {
    return (
      <section className="card-glass rounded-3xl p-6">
        <h1 className="inline-flex items-center gap-2 text-2xl font-semibold">
          <ChatIcon className="h-6 w-6 text-cyan-200" />
          No intake found yet
        </h1>
        <p className="mt-2 text-sm text-cyan-50/75">
          Complete triage intake first so MaxWell can provide context-aware
          help.
        </p>
        <Link
          href="/intake"
          className="micro-lift mt-5 inline-flex items-center gap-1.5 rounded-full bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 soft-focus-ring"
        >
          <ChatIcon className="h-4 w-4" />
          Start intake
        </Link>
      </section>
    );
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="card-glass flex min-h-[70vh] flex-col rounded-3xl p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <h1 className="inline-flex items-center gap-1.5 text-xl font-semibold">
              <ChatIcon className="h-5 w-5 text-cyan-200" />
              Care Assistant Chat
            </h1>
            <p className="text-xs text-cyan-50/70">
              Conversation ID: {conversationId}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <TriageBadge level={triageLevel} />
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {messages.map((message, index) => (
            <article
              key={message.id}
              className={`micro-lift rounded-2xl border p-3 text-sm ${message.role === "assistant" ? "border-cyan-200/20 bg-cyan-200/5" : "border-white/10 bg-slate-900/50"}`}
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs tracking-wide text-cyan-50/60 uppercase">
                  {message.role}
                </p>
                <p className="text-[11px] text-cyan-50/45">
                  {formatDateTime(message.createdAt)}
                </p>
              </div>
              <div className="break-words">
                <MarkdownMessage
                  content={
                    message.content ||
                    (message.pending ? "Thinking through your case..." : "")
                  }
                />
                {message.pending && (
                  <p className="mt-1 inline-flex items-center gap-1 text-xs text-cyan-100/70">
                    <SpinnerIcon className="h-3.5 w-3.5" />
                    Generating response
                  </p>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(message.content)}
                  className="micro-lift inline-flex items-center gap-1 rounded-full border border-white/20 px-3 py-1 soft-focus-ring"
                >
                  <CopyIcon className="h-3.5 w-3.5" />
                  Copy
                </button>
                {message.role === "assistant" && (
                  <button
                    type="button"
                    onClick={() => regenerateNear(index)}
                    className="micro-lift inline-flex items-center gap-1 rounded-full border border-cyan-200/35 px-3 py-1 soft-focus-ring"
                  >
                    <RefreshIcon className="h-3.5 w-3.5" />
                    Regenerate
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => toggleImportant(message)}
                  className={`micro-lift inline-flex items-center gap-1 rounded-full border px-3 py-1 soft-focus-ring ${message.isImportant ? "border-yellow-200/70 bg-yellow-200/20" : "border-white/20"}`}
                >
                  <StarIcon className="h-3.5 w-3.5" />
                  {message.isImportant ? "Important" : "Mark important"}
                </button>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-4 border-t border-white/10 pt-4">
          <div className="mb-2 flex flex-wrap gap-2">
            {suggestions.map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => setInput(question)}
                className="micro-lift rounded-full border border-cyan-200/35 px-3 py-1 text-xs text-cyan-100/90 soft-focus-ring"
              >
                {question}
              </button>
            ))}
          </div>

          <textarea
            rows={3}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Describe what is happening now, or ask a follow-up..."
            className="w-full rounded-2xl surface-input px-4 py-3 text-sm soft-focus-ring"
          />

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <label className="micro-lift inline-flex cursor-pointer items-center gap-1 rounded-full border border-white/25 px-3 py-1 text-xs soft-focus-ring">
              <AttachmentIcon className="h-3.5 w-3.5" />
              Attach image/PDF
              <input
                type="file"
                accept="image/*,.pdf,application/pdf"
                multiple
                className="hidden"
                onChange={(event) => handleFilesChange(event.target.files)}
              />
            </label>
            {attachments.map((attachment) => (
              <span
                key={attachment.id}
                className="rounded-full border border-cyan-200/20 bg-cyan-200/10 px-2 py-1 text-[11px]"
              >
                {attachment.name}
              </span>
            ))}
            <button
              type="button"
              onClick={() => sendMessage()}
              disabled={sending || !input.trim()}
              className="micro-lift inline-flex items-center gap-1.5 rounded-full bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 soft-focus-ring disabled:opacity-60"
            >
              {sending ? (
                <SpinnerIcon className="h-4 w-4" />
              ) : (
                <SendIcon className="h-4 w-4" />
              )}
              {sending ? "Sending..." : "Send"}
            </button>
          </div>
          {error && <p className="mt-2 text-xs text-red-200/95">{error}</p>}
        </div>
      </div>

      <aside className="space-y-4">
        <div className="card-glass rounded-2xl p-4">
          <h2 className="text-sm font-semibold">Quick Actions</h2>
          <div className="mt-3 space-y-2 text-sm">
            <a
              href="tel:112"
              className="micro-lift block rounded-xl border border-red-200/45 bg-red-900/30 px-3 py-2 soft-focus-ring"
            >
              Call ambulance
            </a>
            <a
              href="tel:108"
              className="micro-lift block rounded-xl border border-orange-200/45 bg-orange-900/20 px-3 py-2 soft-focus-ring"
            >
              Call local health support
            </a>
            <Link
              href="/hospitals"
              className="micro-lift inline-flex w-full items-center gap-1.5 rounded-xl border border-cyan-200/45 bg-cyan-900/20 px-3 py-2 soft-focus-ring"
            >
              <HospitalIcon className="h-4 w-4" />
              Find nearby hospitals
            </Link>
            <Link
              href="/referrals"
              className="micro-lift inline-flex w-full items-center gap-1.5 rounded-xl border border-emerald-200/45 bg-emerald-900/20 px-3 py-2 soft-focus-ring"
            >
              <ReferralIcon className="h-4 w-4" />
              Generate referral note
            </Link>
          </div>
        </div>

        <DisclaimerBanner />

        <div className="card-glass rounded-2xl p-4 text-xs text-cyan-50/75">
          {lastUserMessage
            ? `Latest concern: ${lastUserMessage.content.slice(0, 140)}${lastUserMessage.content.length > 140 ? "..." : ""}`
            : "No recent user message."}
        </div>
      </aside>
    </section>
  );
}
