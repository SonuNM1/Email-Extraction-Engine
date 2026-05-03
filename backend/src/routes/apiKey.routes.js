import { Router } from "express";
import { getAllKeys, addKey, deleteKey, updateCredits } from "../controllers/apiKey.controller.js";

const router = Router();

router.get("/",              getAllKeys);
router.post("/",             addKey);
router.delete("/:id",        deleteKey);
router.patch("/credits",     updateCredits);

export default router;