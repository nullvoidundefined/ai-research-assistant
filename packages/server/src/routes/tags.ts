import {
  createTagHandler,
  deleteTagHandler,
  getTagsHandler,
} from 'app/handlers/tags/tags.js';
import { requireAuth } from 'app/middleware/requireAuth/requireAuth.js';
import { Router } from 'express';

const router = Router();

router.use(requireAuth);

router.get('/', getTagsHandler);
router.post('/', createTagHandler);
router.delete('/:id', deleteTagHandler);

export default router;
