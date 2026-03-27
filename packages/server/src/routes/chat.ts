import { Router } from "express";
import { requireAuth } from "app/middleware/requireAuth/requireAuth.js";
import { chatHandler } from "app/handlers/chat/chat.js";

const router = Router();

router.use(requireAuth);
router.post("/", chatHandler);

export default router;
