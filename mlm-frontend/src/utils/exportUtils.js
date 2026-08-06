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

export function buildCsvBlob(headers, rows) {
  const escape = (val) => {
    const s = val == null ? "" : String(val);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))];
  return new Blob(["\uFEFF", lines.join("\n")], { type: "text/csv;charset=utf-8;" });
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
  const rawBlob = new Blob([res.data], { type: "text/csv" });
  const text = await rawBlob.text();
  const { headers, rows } = parseCsv(text);
  // Prefix a UTF-8 BOM so Excel opens ₹ / special characters correctly.
  const blob = new Blob(["\uFEFF", text], { type: "text/csv;charset=utf-8;" });
  return { blob, headers, rows };
}

// Display-only label mapping — keeps CSV/backend data untouched, only changes
// what's shown in the PDF, matching the "Online"/"Cash" convention used
// elsewhere in the app (Withdrawals, PayoutsReport, Dashboard, etc).
function mapHeaderLabel(h) {
  return String(h)
    .replace(/\bBV\b/g, "Online")
    .replace(/\bPV\b/g, "Cash");
}

function computeAmountSummary(headers, rows) {
  const amountIdx = headers.findIndex((h) => /amount/i.test(h));
  const statusIdx = headers.findIndex((h) => /status/i.test(h));
  if (amountIdx === -1 || statusIdx === -1) return null;

  const toNum = (v) => {
    const n = parseFloat(String(v ?? "").replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  };

  let total = 0, pending = 0, paid = 0;
  rows.forEach((r) => {
    const amt = toNum(r[amountIdx]);
    const status = String(r[statusIdx] ?? "").trim().toLowerCase();
    total += amt;
    if (status === "pending") pending += amt;
    else if (status === "paid" || status === "approved") paid += amt;
  });
  return { total, pending, paid };
}

const formatInr = (n) =>
  "\u20B9" + n.toLocaleString("en-IN", { maximumFractionDigits: 2 });

export function downloadPdfTable(title, headers, rows, filename, periodLabel) {
  const displayHeaders = headers.map(mapHeaderLabel);
  const doc = new jsPDF({ orientation: headers.length > 6 ? "landscape" : "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 32;

  // ---- Header band ----
  const summary = computeAmountSummary(headers, rows);
  const bandHeight = periodLabel || summary ? 84 : 64;
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(16);
  doc.setFont(undefined, "bold");
  doc.text(title.toUpperCase(), pageWidth / 2, 30, { align: "center" });
  doc.setFontSize(9);
  doc.setFont(undefined, "normal");
  doc.setTextColor(90, 90, 90);
  const generatedOn = new Date().toLocaleDateString("en-IN");
  const headerLine = periodLabel
    ? `Generated on: ${generatedOn}   ${periodLabel}   Total Records: ${rows.length}`
    : `Generated on: ${generatedOn}   Total Records: ${rows.length}`;
  doc.text(headerLine, pageWidth / 2, 48, { align: "center" });
  if (summary) {
    const summaryText = `Total Amount: ${formatInr(summary.total)}   |   Pending: ${formatInr(summary.pending)}   |   Paid: ${formatInr(summary.paid)}`;
    doc.setFont(undefined, "bold");
    doc.setTextColor(20, 20, 20);
    doc.text(summaryText, pageWidth / 2, 64, { align: "center" });
    doc.setFont(undefined, "normal");
  }

  // ---- Table ----
  autoTable(doc, {
    startY: bandHeight + 16,
    margin: { left: margin, right: margin },
    head: [displayHeaders],
    body: rows,
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 6, overflow: "linebreak", lineColor: [0, 0, 0], lineWidth: 0.4, textColor: [20, 20, 20] },
    headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: "bold", halign: "left", lineColor: [0, 0, 0], lineWidth: 0.4 },
    didDrawPage: () => {
      const pageCount = doc.internal.getNumberOfPages();
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Page ${doc.internal.getCurrentPageInfo().pageNumber} of ${pageCount}`,
        pageWidth - margin - 60,
        pageHeight - 16
      );
      doc.text("MLM Real Estate \u00B7 Confidential", margin, pageHeight - 16);
    },
  });

  doc.save(filename);
}