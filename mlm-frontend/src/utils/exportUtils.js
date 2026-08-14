import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function parseCsv(text) {
  const normalized = text.replace(/\r\n/g, "\n");
  const rows = [];
  let row = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    if (inQuotes) {
      if (ch === '"') {
        if (normalized[i + 1] === '"') { cur += '"'; i++; } else { inQuotes = false; }
      } else cur += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") { row.push(cur); cur = ""; }
    else if (ch === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
    else cur += ch;
  }
  if (cur.length > 0 || row.length > 0) { row.push(cur); rows.push(row); }
  const nonEmpty = rows.filter((r) => !(r.length === 1 && r[0] === ""));
  if (!nonEmpty.length) return { headers: [], rows: [] };
  const [headers, ...dataRows] = nonEmpty;
  return { headers, rows: dataRows };
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

// jsPDF's built-in fonts don't have a glyph for ₹, which makes it insert
// stray spacing between every character in the same text run. Use "Rs."
// instead of the ₹ symbol only for text drawn inside the PDF.
const formatInrPdf = (n) =>
  "Rs. " + n.toLocaleString("en-IN", { maximumFractionDigits: 2 });

// Sums every numeric column (e.g. Amount) across all rows and returns a
// footer row aligned to `headers`; non-numeric columns (Status, Month,
// Customer, etc.) are left blank. First cell is always the "TOTAL" label.
export function computeColumnTotals(headers, rows) {
  if (!rows.length) return null;

  const isNumericCol = (idx) => {
    let hasValue = false;
    const allNumericOrBlank = rows.every((r) => {
      const raw = String(r[idx] ?? "").trim();
      if (raw === "" || raw === "-") return true;
      hasValue = true;
      return /^-?[\d,]+(\.\d+)?$/.test(raw.replace(/[₹\s]/g, ""));
    });
    return hasValue && allNumericOrBlank;
  };

  return headers.map((h, idx) => {
    if (idx === 0) return "TOTAL";
    if (!isNumericCol(idx)) return "";
    const sum = rows.reduce((acc, r) => {
      const n = parseFloat(String(r[idx] ?? "").replace(/[₹,\s]/g, ""));
      return acc + (Number.isFinite(n) ? n : 0);
    }, 0);
    return sum.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  });
}

// jsPDF's built-in fonts have no ₹ glyph, which makes it insert stray
// spacing between every character in that text run. Swap ₹ for "Rs." in
// anything drawn inside the PDF (summary lines, table cells, footer).
const sanitizeForPdf = (v) => (typeof v === "string" ? v.replace(/₹/g, "Rs. ") : v);

export function downloadPdfTable(title, headers, rows, filename, periodLabel, opts = {}) {
  const { subtitle } = opts;
  const summaryLeft = opts.summaryLeft?.map((item) => ({ ...item, value: sanitizeForPdf(item.value) }));
  const summaryRight = opts.summaryRight?.map((item) => ({ ...item, value: sanitizeForPdf(item.value) }));
  rows = rows.map((r) => r.map(sanitizeForPdf));
  const footerRow = (opts.footerRow || computeColumnTotals(headers, rows))?.map(sanitizeForPdf);
  const displayHeaders = headers.map(mapHeaderLabel);
  const doc = new jsPDF({ orientation: headers.length > 6 ? "landscape" : "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 32;

  // ---- Header band ----
  const hasCustomSummary = Boolean(summaryLeft || summaryRight);
  const summary = hasCustomSummary ? null : computeAmountSummary(headers, rows);
  let cursorY = 30;
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(16);
  doc.setFont(undefined, "bold");
  doc.text(title.toUpperCase(), pageWidth / 2, cursorY, { align: "center" });
  cursorY += 18;

  if (subtitle) {
    doc.setFontSize(11);
    doc.setFont(undefined, "normal");
    doc.setTextColor(70, 70, 70);
    doc.text(subtitle, pageWidth / 2, cursorY, { align: "center" });
    cursorY += 16;
  }

  doc.setFontSize(9);
  doc.setFont(undefined, "normal");
  doc.setTextColor(90, 90, 90);
  const generatedOn = new Date().toLocaleDateString("en-IN");
  const headerLine = periodLabel
    ? `Generated on: ${generatedOn}   ${periodLabel}   Total Records: ${rows.length}`
    : `Generated on: ${generatedOn}   Total Records: ${rows.length}`;
  doc.text(headerLine, pageWidth / 2, cursorY, { align: "center" });
  cursorY += 16;

  if (summary) {
    const summaryText = `Total Amount: ${formatInrPdf(summary.total)}   |   Pending: ${formatInrPdf(summary.pending)}   |   Paid: ${formatInrPdf(summary.paid)}`;
    doc.setFont(undefined, "bold");
    doc.setTextColor(20, 20, 20);
    doc.text(summaryText, pageWidth / 2, cursorY, { align: "center" });
    doc.setFont(undefined, "normal");
    cursorY += 16;
  }

  if (hasCustomSummary) {
    cursorY += 6;
    let leftY = cursorY;
    let rightY = cursorY;
    doc.setFontSize(10);
    (summaryLeft || []).forEach((item) => {
      const label = `${item.label}: `;
      doc.setFont(undefined, "bold");
      doc.setTextColor(20, 20, 20);
      doc.text(label, margin, leftY);
      const labelWidth = doc.getTextWidth(label);
      doc.setFont(undefined, "normal");
      doc.text(String(item.value), margin + labelWidth, leftY);
      leftY += 15;
    });
    (summaryRight || []).forEach((item) => {
      const label = `${item.label}: `;
      const value = String(item.value);
      doc.setFont(undefined, "bold");
      const fullWidth = doc.getTextWidth(label) + doc.getTextWidth(value);
      doc.text(label, pageWidth - margin - fullWidth, rightY);
      doc.setFont(undefined, "normal");
      doc.text(value, pageWidth - margin - doc.getTextWidth(value), rightY);
      rightY += 15;
    });
    cursorY = Math.max(leftY, rightY);
  }

  const bandHeight = cursorY - 30 + 14;

  // ---- Table ----
  autoTable(doc, {
    startY: bandHeight + 16,
    margin: { left: margin, right: margin },
    head: [displayHeaders],
    body: rows,
    foot: footerRow ? [footerRow] : undefined,
    showFoot: footerRow ? "lastPage" : undefined,
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 6, overflow: "linebreak", lineColor: [0, 0, 0], lineWidth: 0.4, textColor: [20, 20, 20] },
    headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: "bold", halign: "left", lineColor: [0, 0, 0], lineWidth: 0.4 },
    footStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: "bold", halign: "left", lineColor: [0, 0, 0], lineWidth: 0.4 },
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