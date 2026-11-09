
import { GoogleGenAI } from "@google/genai";
import type { FunctionDeclaration, Content } from "@google/genai";
import "dotenv/config";

// 1. Initialize Gemini Client
const GeminiApiKey = process.env.GEMINI_API_KEY;

if (!GeminiApiKey) {
    throw new Error("GEMINI_API_KEY is not set in the environment variables.");
}

const client = new GoogleGenAI({ apiKey: GeminiApiKey });


// 2. Reusable Retry Mechanism
async function withRetry<T>(
    request: () => Promise<T>
): Promise<T> {
    const maxRetries = 3;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await request();

        } catch (error) {
            const status =
                typeof error === "object" &&
                    error !== null &&
                    "status" in error
                    ? Number(error.status)
                    : undefined;

            const shouldRetry =
                status === 429 ||
                (status !== undefined && status >= 500);

            if (!shouldRetry || attempt === maxRetries) {
                throw error;
            }

            const delay = 1000 * Math.pow(2, attempt);

            console.log(
                `Gemini request failed (${status}). Retrying in ${delay / 1000} seconds...`
            );

            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw new Error("Gemini request failed after maximum retries.");
}


// 3. Generate Normal Response
export async function generateResponse(
    prompt: string,
    systemInstructions: string
): Promise<string> {

    const response = await withRetry(() =>
        client.models.generateContent({
            model: "gemini-3.1-flash-lite",
            contents: prompt,
            config: {
                systemInstruction: systemInstructions,
                temperature: 0.3
            }
        })
    );

    const answer = response.text?.trim();

    if (!answer) {
        console.log("Gemini returned an empty response.");
        console.dir(response.candidates, { depth: 5 });
    }

    return answer ?? "";
}


// 4. Generate Response with Function Calling
export async function generateResponseWithTools(
    prompt: string | Content[],
    systemInstruction: string,
    functionDeclarations: FunctionDeclaration[]
) {

    const response = await withRetry(() =>
        client.models.generateContent({
            model: "gemini-3.1-flash-lite",
            contents: prompt,
            config: {
                systemInstruction,
                temperature: 0.3,
                tools: [
                    {
                        functionDeclarations
                    }
                ]
            }
        })
    );

    return {
        text: response.text ?? "",
        functionCalls: response.functionCalls ?? [],
        candidateContent: response.candidates?.[0]?.content
    };
}


// 5. Generate Response with Function Result
export async function generateResponseWithFunctionResult(
    contents: Content[],
    systemInstruction: string,
    functionDeclarations: FunctionDeclaration[]
) {

    const response = await withRetry(() =>
        client.models.generateContent({
            model: "gemini-3.1-flash-lite",
            contents,
            config: {
                systemInstruction,
                temperature: 0.3,
                tools: [
                    {
                        functionDeclarations
                    }
                ]
            }
        })
    );

    const candidate = response.candidates?.[0];

    console.log("Gemini Debug:", {
        finishReason: candidate?.finishReason,
        finishMessage: candidate?.finishMessage,

        parts: candidate?.content?.parts?.map(part => ({
            textLength: part.text?.length ?? 0,
            isThought: part.thought === true,
            functionCall: part.functionCall?.name ?? null
        })),

        usage: response.usageMetadata
    });

    const answer = candidate?.content?.parts
        ?.filter(part =>
            !part.thought &&
            typeof part.text === "string"
        )
        .map(part => part.text)
        .join("")
        .trim() ?? "";

    return {
        text: answer,
        functionCalls: response.functionCalls ?? [],
        candidateContent: candidate?.content
    };
}
