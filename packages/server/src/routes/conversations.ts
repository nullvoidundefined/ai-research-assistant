import {
  createConversationHandler,
  deleteConversationHandler,
  getConversationHandler,
  getConversationsHandler,
} from 'app/handlers/chat/chat.js';
import { requireAuth } from 'app/middleware/requireAuth/requireAuth.js';
import { Router } from 'express';

const router = Router();

router.use(requireAuth);
router.get('/', getConversationsHandler);
router.post('/', createConversationHandler);
router.get('/:id', getConversationHandler);
router.delete('/:id', deleteConversationHandler);

export default router;
