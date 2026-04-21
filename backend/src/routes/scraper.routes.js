import { Router } from 'express';
import {
  startScrape,
  stopScrape,
  getStatus,
  exportCsv,
  streamLogs,
  downloadExcel,
} from '../controllers/scraper.controller.js';

const router = Router();

router.post('/',                startScrape);
router.post('/:jobId/stop',     stopScrape);       // ← new
router.get('/:jobId/status',    getStatus);
router.get('/:jobId/export',    exportCsv);
router.get('/:jobId/logs',      streamLogs);
router.get('/:jobId/download',  downloadExcel);    // ← moved from excel router

export default router;