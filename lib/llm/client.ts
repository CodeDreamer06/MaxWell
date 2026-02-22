import OpenAI from "openai";
import { getServerEnv } from "@/lib/env";

let cachedClient: OpenAI | null = null;

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
    baseURL: env.OPENAI_BASE_URL,
  });
  return cachedClient;
}
