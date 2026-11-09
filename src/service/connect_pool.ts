
import { Agent, fetch } from "undici";

const weatherAgent = new Agent({
  connections: 2,
  pipelining: 1,
  keepAliveTimeout: 10_000,
  keepAliveMaxTimeout: 30_000,
  connect: {
    timeout: 6_000
  }
});

export async function fetchOpenMeteoJson<T>(
  url: URL | string
): Promise<T> {

  const requestUrl = url.toString();
  const host = new URL(requestUrl).hostname;
  const startTime = Date.now();

  try {
    const response = await fetch(requestUrl, {
      dispatcher: weatherAgent,
      signal: AbortSignal.timeout(15_000)
    });

    if (!response.ok) {
      await response.text();

      throw new Error(
        `Open-Meteo API returned HTTP ${response.status}`
      );
    }

    const data = (await response.json()) as T;

    console.log("[WEATHER HTTP SUCCESS]", {
      host,
      durationMs: Date.now() - startTime
    });

    return data;

  } catch (error) {

    const cause = (
      error as Error & {
        cause?: { code?: string };
      }
    ).cause;

  
    console.error("[WEATHER HTTP ERROR]", {
      host,
      code: cause?.code,
      message: error instanceof Error
        ? error.message
        : String(error),
      durationMs: Date.now() - startTime
    });

    throw error;
  }
}
