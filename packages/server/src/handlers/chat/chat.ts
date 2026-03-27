import type { Request, Response } from "express";
import { z } from "zod";
import { handleChatStream } from "app/services/chat.service.js";
import {
    createConversation,
    getUserConversations,
    getConversationById,
    deleteConversation,
} from "app/repositories/conversations/conversations.js";
import { getConversationMessages } from "app/repositories/messages/messages.js";
import { logger } from "app/utils/logs/logger.js";

const chatSchema = z.object({
    message: z.string().min(1),
    conversationId: z.string().uuid(),
    collectionId: z.string().uuid().optional(),
});

export async function chatHandler(req: Request, res: Response): Promise<void> {
    const userId = req.session.userId!;
    const parsed = chatSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: "Validation failed", issues: parsed.error.issues });
        return;
    }
    const { message, conversationId, collectionId } = parsed.data;
    await handleChatStream(userId, message, conversationId, collectionId, res);
}

export async function getConversationsHandler(req: Request, res: Response): Promise<void> {
    const userId = req.session.userId!;
    try {
        const conversations = await getUserConversations(userId);
        res.json({ conversations });
    } catch (err) {
        logger.error({ err }, "Get conversations failed");
        res.status(500).json({ error: "Failed to get conversations" });
    }
}

export async function createConversationHandler(req: Request, res: Response): Promise<void> {
    const userId = req.session.userId!;
    const { collectionId } = req.body;
    try {
        const conversation = await createConversation(userId, collectionId);
        res.status(201).json({ conversation });
    } catch (err) {
        logger.error({ err }, "Create conversation failed");
        res.status(500).json({ error: "Failed to create conversation" });
    }
}

export async function getConversationHandler(req: Request, res: Response): Promise<void> {
    const userId = req.session.userId!;
    const { id } = req.params;
    try {
        const conversation = await getConversationById(id, userId);
        if (!conversation) {
            res.status(404).json({ error: "Conversation not found" });
            return;
        }
        const messages = await getConversationMessages(id);
        res.json({ conversation, messages });
    } catch (err) {
        logger.error({ err }, "Get conversation failed");
        res.status(500).json({ error: "Failed to get conversation" });
    }
}

export async function deleteConversationHandler(req: Request, res: Response): Promise<void> {
    const userId = req.session.userId!;
    const { id } = req.params;
    try {
        const deleted = await deleteConversation(id, userId);
        if (!deleted) {
            res.status(404).json({ error: "Conversation not found" });
            return;
        }
        res.json({ message: "Conversation deleted" });
    } catch (err) {
        logger.error({ err }, "Delete conversation failed");
        res.status(500).json({ error: "Failed to delete conversation" });
    }
}
