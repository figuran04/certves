export function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV must have at least a header row and one data row.');
  }

  const headers = parseCSVLine(lines[0]);
  if (headers.length === 0) {
    throw new Error('CSV header is empty.');
  }

  const cleanHeaders = headers.map((h) => h.trim()).filter((h) => h.length > 0);
  if (cleanHeaders.length === 0) {
    throw new Error('CSV header contains no valid column names.');
  }

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length === 0) continue;
    const values = parseCSVLine(line);
    const row = {};
    for (let j = 0; j < cleanHeaders.length; j++) {
      row[cleanHeaders[j]] = (values[j] ?? '').trim();
    }
    rows.push(row);
  }

  return { headers: cleanHeaders, rows };
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}
