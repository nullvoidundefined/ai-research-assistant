import { Router } from "express";
import { requireAuth } from "app/middleware/requireAuth/requireAuth.js";
import {
    getCollectionsHandler,
    createCollectionHandler,
    getCollectionHandler,
    updateCollectionHandler,
    deleteCollectionHandler,
    addSourceToCollectionHandler,
    removeSourceFromCollectionHandler,
    shareCollectionHandler,
} from "app/handlers/collections/collections.js";

const router = Router();

router.use(requireAuth);

router.get("/", getCollectionsHandler);
router.post("/", createCollectionHandler);
router.get("/:id", getCollectionHandler);
router.put("/:id", updateCollectionHandler);
router.delete("/:id", deleteCollectionHandler);
router.post("/:id/sources", addSourceToCollectionHandler);
router.delete("/:id/sources/:sourceId", removeSourceFromCollectionHandler);
router.post("/:id/share", shareCollectionHandler);

export default router;
