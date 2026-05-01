import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";

const EXCEL_DIR = path.join(process.cwd(), "excel");
if (!fs.existsSync(EXCEL_DIR)) fs.mkdirSync(EXCEL_DIR);

export function createWorkbook(keyword, location, existingFilePath) {
  let filePath = existingFilePath;
  if (!filePath) {
    const now = new Date();
    const date = now.toISOString().split("T")[0];
    const time = now.toTimeString().split(" ")[0].replace(/:/g, "-");
    const safeKw = keyword.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const safeLoc = (location || "unknown")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "_");
    const fileName = `${safeKw}_${safeLoc}_${date}_${time}.xlsx`;
    filePath = path.join(EXCEL_DIR, fileName);
  }

  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
    filename: filePath,
    useStyles: true,
  });

  const sheet = workbook.addWorksheet("Leads");
  sheet.columns = [
    { header: "Email", key: "email", width: 35 },
    { header: "Website", key: "website", width: 30 },
    { header: "Business Name", key: "businessName", width: 30 },
    { header: "Phone", key: "phone", width: 18 },
    { header: "Location", key: "location", width: 20 },
    { header: "Source", key: "source", width: 16 },
    { header: "Keyword", key: "keyword", width: 25 },
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).commit();

  return { workbook, sheet, filePath };
}

export function appendRow(sheet, data) {
  sheet
    .addRow({
      email: data.email || "",
      website: data.website || "",
      businessName: data.businessName || "",
      phone: data.phone || "",
      location: data.location || "",
      source: data.source || "google_search",
      keyword: data.keyword || "",
    })
    .commit();
}

export async function finalizeWorkbook(workbook) {
  await workbook.commit();
}
