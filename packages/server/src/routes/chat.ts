import { chatHandler } from 'app/handlers/chat/chat.js';
import { requireAuth } from 'app/middleware/requireAuth/requireAuth.js';
import { Router } from 'express';

const router = Router();

router.use(requireAuth);
router.post('/', chatHandler);

export default router;
