const XLSX = require('xlsx');
const path = require('path');

const file = process.argv[2] || 'C:/Users/techai/OneDrive/Desktop/federal_congressional_candidates_through_2026.xlsx';
const wb = XLSX.readFile(file);

console.log('Sheets:', wb.SheetNames);
console.log('---');

wb.SheetNames.forEach(name => {
  const ws = wb.Sheets[name];
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  const rows = range.e.r + 1;
  const cols = range.e.c + 1;
  console.log(`Sheet: ${name} (${rows} rows x ${cols} cols)`);

  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
  // Show headers
  if (data[0]) console.log('  Headers:', JSON.stringify(data[0]));
  // Show 3 sample rows
  data.slice(1, 4).forEach((r, i) => {
    console.log(`  Row ${i+1}:`, JSON.stringify(r).slice(0, 300));
  });
  console.log('---');
});
