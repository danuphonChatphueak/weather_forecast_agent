import { ToolRegistry } from "./tool_registry.js";

export class ToolExecutor {
    constructor(
        private registry: ToolRegistry
    ) {}

    async execute(
        name: string,
        args: any
    ): Promise<any> {

        const tool = this.registry.get(name);

        if (!tool) {
            throw new Error(`Tool "${name}" not found.`);
        }
        try {
                    const result = await tool.execute(args);
        
                    console.log("ToolExecutor completed:", {
                        toolName: name,
                        hasResult: result != null
                    });
        
                    return result;
        
                } catch (error) {
                    console.error("ToolExecutor failed:", {
                        toolName: name,
                        error: error instanceof Error
                            ? error.message
                            : String(error)
                    });

            throw error;
        }
    }
}
