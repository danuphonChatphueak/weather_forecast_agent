import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import { runAgent } from "./agents/gemini_agent.js";
import { ShortTermMemory } from "./memory/short_term_memory.js";




async function main(): Promise<void> {
    const memory = new ShortTermMemory();
    const rl = createInterface({ input: stdin, output: stdout });


    console.log("This Weather Forecast By Ai Agent");

    try {
        while (true) {
            const input = await rl.question("Enter a question (or type 'exit' to quit): ");
            const city = input.trim();

            if (city.toLowerCase() === 'exit') {
                console.log("Exiting the program.");
                break;
            }
            if (city.length < 2 || city.length > 100) {
                console.log("City name should be between 2 and 100 characters.");
                continue;
            }
            if (city === '') {
                console.log("Please enter a valid city name.");
                continue;
            }

            console.log(`Answering ${city}...`);


            try {
                const answer = await runAgent(
                    `What is the weather like in ${city}?`,
                    memory,
                    "cli_local_user"
                );
                console.log(`Answer for ${city}: ${answer}`);
            } catch (error) {
                console.error("Error fetching weather forecast:", error);

                if (error instanceof Error) {
                    console.error("Error message:", error.message);
                }
                console.log(memory.getHistory());
            }
        }
    } finally {
        rl.close();
    };
}

main();
