import fs from 'fs';
import path from 'path';

// 📂 GET all excel files

export const getExcelFiles = (req, res) => {
  const dir = path.join(process.cwd(), 'excel');

  fs.readdir(dir, (err, files) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to read files' });
    }

    const excelFiles = files
      .filter(f => f.endsWith('.xlsx'))
      .map(f => ({
        name: f,
        url: `/api/excel/download/${f}`,
      }));

    res.json(excelFiles);
  });
};

// 📥 DOWNLOAD file

export const downloadExcelFile = (req, res) => {
  const filePath = path.join(process.cwd(), 'excel', req.params.file);

  res.download(filePath);
};