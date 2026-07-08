"use client";

import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getCategorySeries, getDashboardStats } from "@/lib/analytics";
import type { AiUsage, CreditPurchase } from "@/lib/types";

const columns = [
  "Date",
  "Platform",
  "Category",
  "Buy Credits",
  "Credits Used",
  "Remaining",
  "Styles",
  "Images",
  "Description",
  "Supplier",
  "Created By"
];

function rows(records: AiUsage[]) {
  return records.map((record) => [
    record.date,
    record.platform,
    record.category || "Custom",
    record.buy_credits,
    record.credits_used,
    record.remaining_credits,
    record.number_of_styles,
    record.number_of_images,
    record.description,
    record.supplier_requirements ?? "",
    record.profiles?.full_name || record.profiles?.email || record.user_id
  ]);
}

export function exportCsv(records: AiUsage[], filename = "zeal-ai-usage.csv") {
  const csvRows = [columns, ...rows(records)].map((row) =>
    row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")
  );
  downloadBlob(csvRows.join("\n"), filename, "text/csv;charset=utf-8;");
}

export function exportExcel(records: AiUsage[], filename = "zeal-ai-usage.xls") {
  const tableRows = [columns, ...rows(records)]
    .map(
      (row) =>
        `<Row>${row
          .map((cell) => `<Cell><Data ss:Type="String">${escapeXml(String(cell))}</Data></Cell>`)
          .join("")}</Row>`
    )
    .join("");
  const workbook = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="AI Usage">
  <Table>${tableRows}</Table>
 </Worksheet>
</Workbook>`;
  downloadBlob(workbook, filename, "application/vnd.ms-excel;charset=utf-8;");
}

export function exportPdf(records: AiUsage[], title = "Zeal AI Usage Report", purchases: CreditPurchase[] = []) {
  const doc = new jsPDF({ orientation: "landscape" });
  const stats = getDashboardStats(records, purchases);
  doc.setFontSize(16);
  doc.text("Zeal Design Studio", 14, 14);
  doc.setTextColor(229, 57, 53);
  doc.text(title, 14, 22);
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.text(`Generated ${format(new Date(), "PPpp")}`, 14, 29);
  doc.text(`Purchased: ${stats.totalBuyCredits}   Used: ${stats.totalCreditsUsed}   Remaining: ${stats.remainingCredits}   Invoices: ${stats.invoicesUploaded}`, 14, 35);
  autoTable(doc, {
    startY: 42,
    head: [["Category", "Styles", "Images", "Credits Used"]],
    body: getCategorySeries(records).map((item) => [item.category, item.styles, item.images, item.creditsUsed]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [17, 17, 17] }
  });
  autoTable(doc, {
    startY: (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY
      ? (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
      : 70,
    head: [["Date", "Platform", "Invoice", "Credits Purchased", "Amount", "Invoice File"]],
    body: purchases.map((purchase) => [
      purchase.purchase_date,
      purchase.platform,
      purchase.invoice_number,
      purchase.total_credits_purchased,
      `${purchase.currency} ${purchase.purchase_amount}`,
      purchase.invoice_file?.name ?? "Missing"
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [229, 57, 53] }
  });
  autoTable(doc, {
    startY: (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY
      ? (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
      : 105,
    head: [columns],
    body: rows(records),
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [229, 57, 53] }
  });
  doc.save(`${title.toLowerCase().replaceAll(" ", "-")}.pdf`);
}

export function printReport() {
  window.print();
}

function downloadBlob(content: BlobPart, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
