import type { FunctionDeclaration } from "@google/genai";
import { LongTermMemory } from "../memory/long_term_memory.js";

const memory = new LongTermMemory();


export const memoryFunctionalDeclarations: FunctionDeclaration[] = [
    {
        name: "savePreferredCity",
        description:
            "Save the user's preferred city when the user explicitly asks you to remember it.",
        parametersJsonSchema: {
            type: "object",
            properties: {
                city: {
                    type: "string",
                    description: "The city to remember"
                }
            },
            required: ["city"]
        }
    },
    {
        name: "getPreferredCity",
        description:
            "Retrieve the user's saved preferred city from long-term memory when needed.",
        parametersJsonSchema: {
            type: "object",
            properties: {}
        }
    }
];

export async function executionMemoryTool(name: string, args: Record<string, unknown>, userId: string ): Promise<Record<string, unknown> | null> {
    if (name === "savePreferredCity") {
        const city = args.city;

        if (typeof city !== "string" || !city.trim()) {
            return {
                success: false,
                error: "A valid city is required."
            };
        }
        console.log("Saving preferred city:", {
            userId: userId.slice(0, 12),
            city: city.trim()
        });

        await memory.save(
            userId,
            "preferred_city",
            city.trim()
        );


        console.log("Memory saved successfully!");
        return {
            success: true,
            city: city.trim()
        };
    }

    if (name === "getPreferredCity") {
        const city = await memory.get(
            userId,
            "preferred_city"
        );

        return {
            success: true,
            found: city !== undefined,
            city: city ?? null
        };
    }
    return null;


}