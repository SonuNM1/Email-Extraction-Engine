import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';

const EXCEL_DIR = path.join(process.cwd(), 'excel');

if (!fs.existsSync(EXCEL_DIR)) {
  fs.mkdirSync(EXCEL_DIR);
}

function getFileName(keyword) {
  const date = new Date().toISOString().split('T')[0];
  const safeKeyword = keyword.replace(/[^a-zA-Z0-9]/g, '_');
  return `${safeKeyword}-${date}.xlsx`;
}

export function createWorkbook(keyword) {
  const fileName = getFileName(keyword);
  const filePath = path.join(EXCEL_DIR, fileName);

  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ filename: filePath });
  const sheet = workbook.addWorksheet('Leads');
  sheet.addRow(['Email', 'Website', 'Location', 'Keyword']).commit();

  return { workbook, sheet, filePath };
}

export function appendRow(sheet, data) {
  // .commit() flushes to disk immediately — data safe even if process crashes
  sheet.addRow([data.email, data.website, data.location, data.keyword]).commit();
}

export async function finalizeWorkbook(workbook) {
  await workbook.commit();
}