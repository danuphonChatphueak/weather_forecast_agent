
import express, { json } from "express";
import type { Request, Response } from "express";
import cookieParser from "cookie-parser";
import { randomBytes, createHash, randomUUID } from "node:crypto";
import cors from "cors";

import { runAgent } from "./agents/gemini_agent.js";
import { ShortTermMemory } from "./memory/short_term_memory.js";

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(json({ limit: "1mb" }));

app.use(cors({
    origin: ["http://localhost:5173",
    "https://delightful-rock-0463fbb00.3.azurestaticapps.net"],
    credentials: true
}));

app.use(cookieParser());

const sessions = new Map<string, ShortTermMemory>();

app.get("/api/health", (_req: Request, res: Response) => {
    res.json({
        status: "ok",
        service: "Weather Forecast By AI Agent"
    });
});

app.post("/api/forecast", async (req: Request, res: Response) => {

    const { sessionId, message } = req.body ?? {};

    if (
        typeof message !== "string" ||
        message.trim().length < 2 ||
        message.trim().length > 1000
    ) {
        res.status(400).json({
            error: "Invalid message"
        });
        return;
    }

    const uuidPattern =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (
        sessionId !== undefined &&
        (
            typeof sessionId !== "string" ||
            !uuidPattern.test(sessionId)
        )
    ) {
        res.status(400).json({
            error: "Invalid session ID"
        });
        return;
    }

    const cookieName = "weather_anon";

    let token: string =
        typeof req.cookies?.[cookieName] === "string"
            ? req.cookies[cookieName]
            : "";

    if (!/^[a-f0-9]{64}$/.test(token)) {
        token = randomBytes(32).toString("hex");

        const isProduction = process.env.NODE_ENV === "production"

        res.cookie(cookieName, token, {
            httpOnly: true,
            secure: isProduction, 
            sameSite: isProduction ? "none" : "lax",
            maxAge: 365 * 24 * 60 * 60 * 1000,
            path: "/"
        });
    }

    const userId = createHash("sha256")
        .update(token)
        .digest("hex");

    const id = sessionId ?? randomUUID();

    const sessionKey = `${userId}:${id}`;
    console.log("Session Debug:", {
    sessionId: id,
    userId: userId.slice(0, 12),
    existingMemory: sessions.has(sessionKey)
});

    let memory = sessions.get(sessionKey);

    if (!memory) {
        memory = new ShortTermMemory();
        sessions.set(sessionKey, memory);
    }

    try {
        const answer = await runAgent(
            message.trim(),
            memory,
            userId
        );

        res.json({
            sessionId: id,
            answer
        });

    } catch (error) {
        console.error("Agent error:", error);

        res.status(500).json({
            error: "Internal server error"
        });
    }
});

app.listen(port, "0.0.0.0", () => {
    console.log(`Server running on port:${port}`);
});
