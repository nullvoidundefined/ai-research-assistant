import {
  addTagToSourceHandler,
  createSourceHandler,
  deleteSourceHandler,
  getSourceHandler,
  getSourcesHandler,
  removeTagFromSourceHandler,
  reprocessSourceHandler,
  upload,
} from 'app/handlers/sources/sources.js';
import { requireAuth } from 'app/middleware/requireAuth/requireAuth.js';
import { Router } from 'express';

const router = Router();

router.use(requireAuth);

router.post('/', upload.single('file'), createSourceHandler);
router.get('/', getSourcesHandler);
router.get('/:id', getSourceHandler);
router.delete('/:id', deleteSourceHandler);
router.post('/:id/reprocess', reprocessSourceHandler);
router.post('/:id/tags', addTagToSourceHandler);
router.delete('/:id/tags/:tagId', removeTagFromSourceHandler);

export default router;
