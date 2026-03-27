import Anthropic from "@anthropic-ai/sdk";
import { query } from "app/db/pool/pool.js";
import { logger } from "app/utils/logger.js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function generateConversationTitle(data: {
    conversationId: string;
    firstMessage: string;
    firstResponse: string;
}): Promise<void> {
    const { conversationId, firstMessage, firstResponse } = data;

    try {
        const message = await anthropic.messages.create({
            model: "claude-3-haiku-20240307",
            max_tokens: 50,
            messages: [{
                role: "user",
                content: [
                    {
                        type: "text",
                        text: `Generate a concise 6-word title for this conversation. Return ONLY the title, no quotes or punctuation.\n\nUser: ${firstMessage.slice(0, 200)}\nAssistant: ${firstResponse.slice(0, 200)}`
                    }
                ],
            }],
        });

        const title = message.content[0].type === "text" ? message.content[0].text.trim() : "Research Conversation";

        await query(
            "UPDATE conversations SET title = $1 WHERE id = $2",
            [title, conversationId]
        );

        logger.info({ conversationId, title }, "Conversation title generated");
    } catch (err) {
        logger.error({ err, conversationId }, "Failed to generate conversation title");
    }
}
