import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function parseCsv(text) {
  const lines = text.replace(/\r\n/g, "\n").split("\n").filter((l) => l.length > 0);
  if (!lines.length) return { headers: [], rows: [] };
  const parseLine = (line) => {
    const cells = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (line[i + 1] === '"') { cur += '"'; i++; } else { inQuotes = false; }
        } else cur += ch;
      } else if (ch === '"') inQuotes = true;
      else if (ch === ",") { cells.push(cur); cur = ""; }
      else cur += ch;
    }
    cells.push(cur);
    return cells;
  };
  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows };
}

export function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function fetchCsvForPreview(api, url, params) {
  const res = await api.get(url, { params, responseType: "blob" });
  const blob = new Blob([res.data], { type: "text/csv" });
  const text = await blob.text();
  const { headers, rows } = parseCsv(text);
  return { blob, headers, rows };
}

export function downloadPdfTable(title, headers, rows, filename) {
  const doc = new jsPDF({ orientation: headers.length > 6 ? "landscape" : "portrait", unit: "pt" });
  doc.setFontSize(14);
  doc.text(title, 40, 30);
  doc.setFontSize(9);
  doc.text(new Date().toLocaleString(), 40, 45);
  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 55,
    styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak" },
    headStyles: { fillColor: [33, 37, 41] },
    margin: { left: 40, right: 40 },
  });
  doc.save(filename);
}