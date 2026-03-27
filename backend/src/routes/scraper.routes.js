import express from "express";
import { runScraper } from "../controllers/scraper.controller.js";

const router = express.Router()

// POST /api/scraper/run

router.post("/run", runScraper) ; 

export default router ; 
