import express from 'express';
import { getExcelFiles, downloadExcelFile } from '../controllers/excel.controller.js';
import { downloadExcel } from '../controllers/scraper.controller.js';

const router = express.Router();

router.get('/files', getExcelFiles);
router.get('/download/:jobId', downloadExcelFile);  // ← now uses jobId not filename

export default router;