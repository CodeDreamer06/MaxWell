import OpenAI from "openai";
import { getServerEnv } from "@/lib/env";

let cachedClient: OpenAI | null = null;

function normalizeBaseURL(baseURL?: string) {
  if (!baseURL) {
    return undefined;
  }

  const trimmed = baseURL.trim().replace(/\/+$/, "");
  return trimmed
    .replace(/\/chat\/completions$/i, "")
    .replace(/\/responses$/i, "");
}

export function getLLMModel() {
  return getServerEnv().OPENAI_MODEL ?? "";
}

export function getLLMClient() {
  if (cachedClient) {
    return cachedClient;
  }

  const env = getServerEnv();
  cachedClient = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
    baseURL: normalizeBaseURL(env.OPENAI_BASE_URL),
  });
  return cachedClient;
}
