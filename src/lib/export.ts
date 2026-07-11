"use client";

import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getCategorySeries, getDashboardStats } from "@/lib/analytics";
import { PLATFORMS } from "@/lib/constants";
import type { AiUsage, CreditPurchase } from "@/lib/types";

const CREDITS_PER_IMAGE = 150;

const columns = [
  "Date",
  "Platform",
  "Category",
  "Buy Credits",
  "Credits Used",
  "Remaining",
  "Styles",
  "Images",
  "Wastage",
  "Wastage Credits",
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
    record.wastage,
    Number(record.wastage || 0) * CREDITS_PER_IMAGE,
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
  doc.text(`Purchased: ${stats.totalBuyCredits}   Used: ${stats.totalCreditsUsed}   Remaining: ${stats.remainingCredits}   Wastage Credits: ${stats.totalWastageCredits}   Purchases: ${stats.totalPurchases}`, 14, 35);
  autoTable(doc, {
    startY: 42,
    head: [["Category", "Styles", "Images", "Wastage", "Wastage Credits", "Credits Used"]],
    body: getCategorySeries(records).map((item) => [item.category, item.styles, item.images, item.wastage, item.wastage * CREDITS_PER_IMAGE, item.creditsUsed]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [17, 17, 17] }
  });
  autoTable(doc, {
    startY: (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY
      ? (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
      : 70,
    head: [["Date", "Platform", "Invoice Number", "Credits Purchased", "Amount"]],
    body: purchases.map((purchase) => [
      purchase.purchase_date,
      purchase.platform,
      purchase.invoice_number,
      purchase.total_credits_purchased,
      `${purchase.currency} ${purchase.purchase_amount}`
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

export function exportMonthlyPurchasePdf(records: AiUsage[], purchases: CreditPurchase[], month: string) {
  const doc = buildMonthlyPurchasePdf(records, purchases, month);
  doc.save(`monthly-purchase-report-${month}.pdf`);
}

export function printMonthlyPurchaseReport(records: AiUsage[], purchases: CreditPurchase[], month: string) {
  const doc = buildMonthlyPurchasePdf(records, purchases, month);
  doc.autoPrint();
  const url = URL.createObjectURL(doc.output("blob"));
  const printWindow = window.open(url, "_blank");
  if (!printWindow) {
    doc.save(`monthly-purchase-report-${month}.pdf`);
    URL.revokeObjectURL(url);
    return;
  }
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function printReport() {
  window.print();
}

function buildMonthlyPurchasePdf(records: AiUsage[], purchases: CreditPurchase[], month: string) {
  const doc = new jsPDF({ orientation: "landscape" });
  const monthRecords = records.filter((record) => record.date.startsWith(month));
  const monthPurchases = purchases.filter((purchase) => purchase.purchase_date.startsWith(month));
  const allocation = allocatePurchaseUsage(monthPurchases, monthRecords);
  const totals = getMonthlyPurchaseTotals(monthRecords, monthPurchases, allocation);
  const titleDate = new Date(`${month}-01T00:00:00`);

  doc.setFontSize(17);
  doc.text("Zeal Design Studio", 14, 14);
  doc.setTextColor(229, 57, 53);
  doc.text("Monthly Purchase Report", 14, 23);
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.text(`Month: ${format(titleDate, "MMMM yyyy")}`, 14, 31);
  doc.text(`Generated: ${format(new Date(), "PPpp")}`, 14, 37);

  autoTable(doc, {
    startY: 44,
    body: [
      ["Total Purchases", totals.totalPurchases, "Number of Purchases", totals.totalPurchases],
      ["Total Amount Spent", totals.amountPaid, "Total Credits Purchased", totals.creditsPurchased],
      ["Total Credits Used", totals.creditsUsed, "Remaining Credits", totals.remainingCredits],
      ["Wastage Images", totals.totalWastage, "Wastage Credits", totals.totalWastageCredits],
      ["Total Amount Paid", totals.amountPaid, "", ""]
    ],
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: "bold" }, 2: { fontStyle: "bold" } },
    theme: "grid"
  });

  autoTable(doc, {
    startY: tableEndY(doc) + 8,
    head: [["Platform", "Purchases", "Amount Paid", "Credits Purchased", "Credits Used", "Remaining Credits"]],
    body: getMonthlyPlatformSummary(monthRecords, monthPurchases, allocation).map((item) => [
      item.platform,
      item.purchases,
      item.amountPaid,
      item.creditsPurchased,
      item.creditsUsed,
      item.remainingCredits
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [17, 17, 17] }
  });

  autoTable(doc, {
    startY: tableEndY(doc) + 8,
    head: [["Payment Method", "Purchases", "Amount Paid", "Credits Purchased"]],
    body: getPaymentMethodSummary(monthPurchases).map((item) => [
      item.paymentMethod,
      item.purchases,
      item.amountPaid,
      item.creditsPurchased
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [229, 57, 53] }
  });

  autoTable(doc, {
    startY: tableEndY(doc) + 8,
    head: [["Date", "Platform", "Invoice Number", "Credits Purchased", "Credits Used", "Remaining Credits", "Amount Paid", "Payment Method"]],
    body: monthPurchases.map((purchase) => {
      const used = allocation.get(purchase.id) ?? 0;
      const remaining = Number(purchase.total_credits_purchased || 0) - used;
      return [
        purchase.purchase_date,
        purchase.platform,
        purchase.invoice_number,
        purchase.total_credits_purchased,
        used,
        Math.max(remaining, 0),
        `${purchase.currency} ${purchase.purchase_amount}`,
        purchase.payment_method
      ];
    }),
    foot: [["", "", "Totals", totals.creditsPurchased, totals.creditsUsed, totals.remainingCredits, totals.amountPaid, ""]],
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [17, 17, 17] },
    footStyles: { fillColor: [229, 57, 53], textColor: [255, 255, 255], fontStyle: "bold" }
  });

  return doc;
}

function tableEndY(doc: jsPDF) {
  return (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 40;
}

function allocatePurchaseUsage(purchases: CreditPurchase[], records: AiUsage[]) {
  const usageByPlatform = new Map<string, number>();
  records.forEach((record) => {
    usageByPlatform.set(record.platform, (usageByPlatform.get(record.platform) ?? 0) + Number(record.credits_used || 0));
  });
  const allocation = new Map<string, number>();
  PLATFORMS.forEach((platform) => {
    let remainingUsage = usageByPlatform.get(platform) ?? 0;
    purchases
      .filter((purchase) => purchase.platform === platform)
      .slice()
      .sort((a, b) => a.purchase_date.localeCompare(b.purchase_date))
      .forEach((purchase) => {
        const used = Math.min(remainingUsage, Number(purchase.total_credits_purchased || 0));
        allocation.set(purchase.id, used);
        remainingUsage -= used;
      });
  });
  return allocation;
}

function getMonthlyPurchaseTotals(records: AiUsage[], purchases: CreditPurchase[], allocation: Map<string, number>) {
  const creditsPurchased = purchases.reduce((sum, purchase) => sum + Number(purchase.total_credits_purchased || 0), 0);
  const creditsUsed = records.reduce((sum, record) => sum + Number(record.credits_used || 0), 0);
  const amountPaid = purchases.reduce((sum, purchase) => sum + Number(purchase.purchase_amount || 0), 0);
  return {
    totalPurchases: purchases.length,
    amountPaid,
    creditsPurchased,
    creditsUsed,
    totalWastage: records.reduce((sum, record) => sum + Number(record.wastage || 0), 0),
    totalWastageCredits: records.reduce((sum, record) => sum + Number(record.wastage || 0), 0) * CREDITS_PER_IMAGE,
    remainingCredits: creditsPurchased - Array.from(allocation.values()).reduce((sum, used) => sum + used, 0)
  };
}

function getMonthlyPlatformSummary(records: AiUsage[], purchases: CreditPurchase[], allocation: Map<string, number>) {
  const platforms = Array.from(new Set([...PLATFORMS, ...purchases.map((purchase) => purchase.platform), ...records.map((record) => record.platform)]));
  return platforms
    .map((platform) => {
      const platformPurchases = purchases.filter((purchase) => purchase.platform === platform);
      const creditsPurchased = platformPurchases.reduce((sum, purchase) => sum + Number(purchase.total_credits_purchased || 0), 0);
      const creditsUsed = platformPurchases.reduce((sum, purchase) => sum + (allocation.get(purchase.id) ?? 0), 0);
      return {
        platform,
        purchases: platformPurchases.length,
        amountPaid: platformPurchases.reduce((sum, purchase) => sum + Number(purchase.purchase_amount || 0), 0),
        creditsPurchased,
        creditsUsed,
        remainingCredits: creditsPurchased - creditsUsed
      };
    })
    .filter((item) => item.purchases > 0 || item.creditsUsed > 0);
}

function getPaymentMethodSummary(purchases: CreditPurchase[]) {
  const map = new Map<string, { paymentMethod: string; purchases: number; amountPaid: number; creditsPurchased: number }>();
  purchases.forEach((purchase) => {
    const current = map.get(purchase.payment_method) ?? { paymentMethod: purchase.payment_method, purchases: 0, amountPaid: 0, creditsPurchased: 0 };
    current.purchases += 1;
    current.amountPaid += Number(purchase.purchase_amount || 0);
    current.creditsPurchased += Number(purchase.total_credits_purchased || 0);
    map.set(purchase.payment_method, current);
  });
  return Array.from(map.values()).sort((a, b) => b.amountPaid - a.amountPaid);
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
