const serverKeys = [
  "OPENAI_BASE_URL",
  "OPENAI_API_KEY",
  "OPENAI_MODEL",
  "MAPBOX_ACCESS_TOKEN",
  "POSTGRES_URL",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
] as const;

export function getServerEnv() {
  return {
    OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
    MAPBOX_ACCESS_TOKEN: process.env.MAPBOX_ACCESS_TOKEN,
    POSTGRES_URL: process.env.POSTGRES_URL,
  };
}

export function findMissingServerEnv(): string[] {
  return serverKeys.filter((key) => !process.env[key]);
}

export function hasLLMEnv() {
  return Boolean(
    process.env.OPENAI_BASE_URL &&
      process.env.OPENAI_API_KEY &&
      process.env.OPENAI_MODEL,
  );
}

export function getPublicMapboxToken() {
  return (
    process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ??
    process.env.MAPBOX_ACCESS_TOKEN ??
    ""
  );
}
