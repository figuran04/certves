import * as XLSX from 'xlsx';

export function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    ['nama', 'skor', 'predikat', 'nomor', 'tanggal'],
    ['Andi Saputra', 95, 'Sangat Baik', 'CERT-001', '19 September 2026'],
    ['Budi Santoso', 87, 'Baik', 'CERT-002', '19 September 2026'],
    ['Citra Dewi', 92, 'Sangat Baik', 'CERT-003', '19 September 2026']
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Peserta');
  XLSX.writeFile(wb, 'template-peserta.xlsx');
}

export function parseXLSX(arrayBuffer) {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetNames = workbook.SheetNames;
  if (sheetNames.length === 0) {
    throw new Error('XLSX file has no sheets.');
  }
  return sheetNames;
}

export function readSheet(arrayBuffer, sheetName) {
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" not found.`);
  }
  const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  if (json.length < 2) {
    throw new Error('Sheet has no data rows.');
  }
  const headers = json[0].map((h) => String(h ?? '').trim()).filter((h) => h.length > 0);
  if (headers.length === 0) {
    throw new Error('Sheet header is empty.');
  }
  const rows = [];
  for (let i = 1; i < json.length; i++) {
    const row = {};
    let hasData = false;
    for (let j = 0; j < headers.length; j++) {
      const val = json[i][j];
      row[headers[j]] = val !== undefined && val !== null ? String(val) : '';
      if (row[headers[j]] !== '') hasData = true;
    }
    if (hasData) rows.push(row);
  }
  return { headers, rows };
}
