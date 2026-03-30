import { Router } from 'express';
import { startScrape, getStatus, exportCsv } from '../controllers/scraper.controller.js';

const router = Router();

router.post('/', startScrape);
router.get('/:jobId/status', getStatus);
router.get('/:jobId/export', exportCsv);

export default router;