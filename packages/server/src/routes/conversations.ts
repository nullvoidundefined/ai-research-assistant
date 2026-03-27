import { Router } from "express";
import { requireAuth } from "app/middleware/requireAuth/requireAuth.js";
import {
    getConversationsHandler,
    createConversationHandler,
    getConversationHandler,
    deleteConversationHandler,
} from "app/handlers/chat/chat.js";

const router = Router();

router.use(requireAuth);
router.get("/", getConversationsHandler);
router.post("/", createConversationHandler);
router.get("/:id", getConversationHandler);
router.delete("/:id", deleteConversationHandler);

export default router;
