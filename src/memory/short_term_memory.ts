
import type { Content } from "@google/genai";

export class ShortTermMemory {

    private history: Content[] = [];

    addMessage(message: Content): void {
        this.history.push(message);
    }

    getHistory(): Content[] {
        return [...this.history];
    }

    clear(): void {
        this.history = [];
    }
}
