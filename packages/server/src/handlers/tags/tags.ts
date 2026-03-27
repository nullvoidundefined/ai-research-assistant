import type { Request, Response } from "express";
import { z } from "zod";
import { createTag, getUserTags, deleteTag } from "app/repositories/tags/tags.js";
import { logger } from "app/utils/logs/logger.js";

const createTagSchema = z.object({
    name: z.string().min(1).max(100),
    color: z.string().max(20).optional(),
});

export async function getTagsHandler(req: Request, res: Response): Promise<void> {
    const userId = req.session.userId!;
    try {
        const tags = await getUserTags(userId);
        res.json({ tags });
    } catch (err) {
        logger.error({ err }, "Get tags failed");
        res.status(500).json({ error: "Failed to get tags" });
    }
}

export async function createTagHandler(req: Request, res: Response): Promise<void> {
    const userId = req.session.userId!;
    const parsed = createTagSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: "Validation failed", issues: parsed.error.issues });
        return;
    }
    try {
        const tag = await createTag(userId, parsed.data.name, parsed.data.color);
        res.status(201).json({ tag });
    } catch (err) {
        logger.error({ err }, "Create tag failed");
        res.status(500).json({ error: "Failed to create tag" });
    }
}

export async function deleteTagHandler(req: Request, res: Response): Promise<void> {
    const userId = req.session.userId!;
    const { id } = req.params;
    try {
        const deleted = await deleteTag(id, userId);
        if (!deleted) {
            res.status(404).json({ error: "Tag not found" });
            return;
        }
        res.json({ message: "Tag deleted" });
    } catch (err) {
        logger.error({ err }, "Delete tag failed");
        res.status(500).json({ error: "Failed to delete tag" });
    }
}
