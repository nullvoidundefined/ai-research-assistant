import { Router } from "express";
import { requireAuth } from "app/middleware/requireAuth/requireAuth.js";
import { getTagsHandler, createTagHandler, deleteTagHandler } from "app/handlers/tags/tags.js";

const router = Router();

router.use(requireAuth);

router.get("/", getTagsHandler);
router.post("/", createTagHandler);
router.delete("/:id", deleteTagHandler);

export default router;
