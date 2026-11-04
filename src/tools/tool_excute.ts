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

        return await tool.execute(args);
    }
}