
import { generateResponseWithTools, generateResponseWithFunctionResult } from "../models/client.js";
import { ToolRegistry } from "../tools/tool_registry.js";
import { ToolExecutor } from "../tools/tool_excute.js";
import { weatherTool } from "../tools/tool_weather_definition.js";
import { weatherFunctionDeclaration } from "../tools/weather_function_declaration.js";
import { memoryFunctionalDeclarations, executionMemoryTool } from "../tools/memory_tools.js";
import { ShortTermMemory } from "../memory/short_term_memory.js";
import { systemPrompt } from "../system_prompt.js";
import type { Content, Part } from "@google/genai";

export async function runAgent(
    userMessage: string,
    memory: ShortTermMemory,
    userId: string
): Promise<string> {

    const registry = new ToolRegistry();
    registry.register(weatherTool);

    const toolExecutor = new ToolExecutor(registry);
    const functionDeclarations = [
        weatherFunctionDeclaration,
        ...memoryFunctionalDeclarations
    ];

    memory.addMessage({
        role: "user",
        parts: [{ text: userMessage }]
    });

    const contents: Content[] = memory.getHistory();

    let response = await generateResponseWithTools(
        contents,
        systemPrompt,
        functionDeclarations
    );

    const maxIterations = 5;

    for (let iteration = 0; iteration <= maxIterations; iteration++) {

        if (!response.candidateContent) {
            throw new Error("Gemini candidate content is missing.");
        }

        memory.addMessage(response.candidateContent);

        const functionCalls = response.functionCalls;

        if (functionCalls.length === 0) {
            const answer = response.candidateContent.parts
                ?.map(part => part.text ?? "")
                .join("")
                .trim() ?? "";

            console.log("Gemini final answer:", JSON.stringify(answer));

            if (!answer) {
                throw new Error("Gemini returned an empty response.");
            }

            return answer;
        }

        if (iteration === maxIterations) {
            throw new Error("Agent reached maximum iterations.");
        }

        const functionResponseParts: Part[] = [];

        for (const call of functionCalls) {

            if (!call.name) {
                throw new Error("Function call name is missing.");
            }


            try {
                let toolResult;

                 console.log("Gemini Tool Call:", {
                        toolName: call.name,
                        arguments: call.args
                    });

                if (
                    call.name === "savePreferredCity" ||
                    call.name === "getPreferredCity"
                ) {
                    // Memory Tool
                    toolResult = await executionMemoryTool(
                        call.name,
                        call.args ?? {},
                        userId
                        
                    );
                       

                } else {
                    // Weather Tool
                    toolResult = await toolExecutor.execute(
                        call.name,
                        call.args ?? {}
                    );
                }

                // Send result back to Gemini
                functionResponseParts.push({
                    functionResponse: {
                        name: call.name,
                        ...(call.id ? { id: call.id } : {}),
                        response: {
                            result: toolResult
                        }
                    }
                });

            } catch (error) {
                console.error("Tool execution failed:", call.name, error);

                functionResponseParts.push({
                    functionResponse: {
                        name: call.name,
                        ...(call.id ? { id: call.id } : {}),
                        response: {
                            error: error instanceof Error
                                ? error.message
                                : "Unknown tool error"
                        }
                    }
                });
            }
        }

        const toolResponse: Content = {
            role: "user",
            parts: functionResponseParts
        };

        memory.addMessage(toolResponse);

        // 8. Send updated history to LLM
        response = await generateResponseWithFunctionResult(
            memory.getHistory(),
            systemPrompt,
            functionDeclarations
        );
    }

    throw new Error("Agent stopped unexpectedly.");
}
