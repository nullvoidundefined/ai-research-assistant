import { Router } from "express";
import { requireAuth } from "app/middleware/requireAuth/requireAuth.js";
import {
    createSourceHandler,
    getSourcesHandler,
    getSourceHandler,
    deleteSourceHandler,
    reprocessSourceHandler,
    addTagToSourceHandler,
    removeTagFromSourceHandler,
    upload,
} from "app/handlers/sources/sources.js";

const router = Router();

router.use(requireAuth);

router.post("/", upload.single("file"), createSourceHandler);
router.get("/", getSourcesHandler);
router.get("/:id", getSourceHandler);
router.delete("/:id", deleteSourceHandler);
router.post("/:id/reprocess", reprocessSourceHandler);
router.post("/:id/tags", addTagToSourceHandler);
router.delete("/:id/tags/:tagId", removeTagFromSourceHandler);

export default router;
