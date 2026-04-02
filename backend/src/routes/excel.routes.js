import express from 'express';
import {
  getExcelFiles,
  downloadExcelFile
} from '../controllers/excel.controller.js';

const router = express.Router();

router.get('/files', getExcelFiles);
router.get('/download/:file', downloadExcelFile);

export default router;