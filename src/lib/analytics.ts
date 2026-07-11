import { format, isSameMonth, parseISO } from "date-fns";
import type { AiUsage, CreditPurchase } from "@/lib/types";
import { PLATFORMS } from "@/lib/constants";
import { toNumber } from "@/lib/utils";

const CREDITS_PER_IMAGE = 150;

export function getDashboardStats(records: AiUsage[], purchases: CreditPurchase[] = []) {
  const now = new Date();
  const currentMonthRecords = records.filter((record) =>
    isSameMonth(parseISO(record.date), now)
  );
  const currentMonthPurchases = purchases.filter((purchase) => isSameMonth(parseISO(purchase.purchase_date), now));

  const totals = records.reduce(
    (acc, record) => {
      acc.creditsUsed += toNumber(record.credits_used);
      acc.styles += toNumber(record.number_of_styles);
      acc.images += toNumber(record.number_of_images);
      acc.wastage += toNumber(record.wastage);
      return acc;
    },
    { buyCredits: 0, creditsUsed: 0, styles: 0, images: 0, wastage: 0 }
  );

  const monthly = currentMonthRecords.reduce(
    (acc, record) => {
      acc.creditsUsed += toNumber(record.credits_used);
      return acc;
    },
    { buyCredits: 0, creditsUsed: 0 }
  );
  totals.buyCredits = purchases.length
    ? purchases.reduce((sum, purchase) => sum + toNumber(purchase.total_credits_purchased), 0)
    : records.reduce((sum, record) => sum + toNumber(record.buy_credits), 0);
  monthly.buyCredits = currentMonthPurchases.reduce((sum, purchase) => sum + toNumber(purchase.total_credits_purchased), 0);
  const usagePercentage = totals.buyCredits > 0 ? (totals.creditsUsed / totals.buyCredits) * 100 : 0;

  return {
    totalBuyCredits: totals.buyCredits,
    totalCreditsUsed: totals.creditsUsed,
    remainingCredits: totals.buyCredits - totals.creditsUsed,
    usagePercentage,
    totalStyles: totals.styles,
    totalImages: totals.images,
    totalWastage: totals.wastage,
    totalWastageCredits: totals.wastage * CREDITS_PER_IMAGE,
    wastagePerEntry: records.length ? totals.wastage / records.length : 0,
    totalEntries: records.length,
    monthlyUsage: monthly.creditsUsed,
    currentMonthBalance: monthly.buyCredits - monthly.creditsUsed,
    monthlyPurchase: monthly.buyCredits,
    totalPurchases: purchases.length,
    latestInvoice: purchases[0]?.invoice_number ?? ""
  };
}

export function getMonthlySeries(records: AiUsage[]) {
  const map = new Map<
    string,
    {
      month: string;
      creditsUsed: number;
      creditsPurchased: number;
      images: number;
      styles: number;
      wastage: number;
    }
  >();

  records.forEach((record) => {
    const key = format(parseISO(record.date), "yyyy-MM");
    const label = format(parseISO(record.date), "MMM yyyy");
    const current =
      map.get(key) ??
      { month: label, creditsUsed: 0, creditsPurchased: 0, images: 0, styles: 0, wastage: 0 };
    current.creditsUsed += toNumber(record.credits_used);
    current.creditsPurchased += toNumber(record.buy_credits);
    current.images += toNumber(record.number_of_images);
    current.styles += toNumber(record.number_of_styles);
    current.wastage += toNumber(record.wastage);
    map.set(key, current);
  });

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, value]) => value);
}

export function getPlatformSeries(records: AiUsage[]) {
  return PLATFORMS.map((platform) => {
    const platformRecords = records.filter((record) => record.platform === platform);
    return {
      platform,
      creditsUsed: platformRecords.reduce(
        (sum, record) => sum + toNumber(record.credits_used),
        0
      ),
      creditsPurchased: platformRecords.reduce((max, record) => Math.max(max, toNumber(record.buy_credits)), 0),
      images: platformRecords.reduce(
        (sum, record) => sum + toNumber(record.number_of_images),
        0
      ),
      styles: platformRecords.reduce(
        (sum, record) => sum + toNumber(record.number_of_styles),
        0
      ),
      wastage: platformRecords.reduce(
        (sum, record) => sum + toNumber(record.wastage),
        0
      ),
      entries: platformRecords.length
    };
  }).filter((item) => item.entries > 0);
}

export function getCategorySeries(records: AiUsage[]) {
  const map = new Map<string, { category: string; styles: number; images: number; wastage: number; creditsUsed: number; entries: number }>();
  records.forEach((record) => {
    const category = record.category || "Custom";
    const current = map.get(category) ?? { category, styles: 0, images: 0, wastage: 0, creditsUsed: 0, entries: 0 };
    current.styles += toNumber(record.number_of_styles);
    current.images += toNumber(record.number_of_images);
    current.wastage += toNumber(record.wastage);
    current.creditsUsed += toNumber(record.credits_used);
    current.entries += 1;
    map.set(category, current);
  });
  return Array.from(map.values()).sort((a, b) => b.creditsUsed - a.creditsUsed);
}

export function getPurchaseSeries(purchases: CreditPurchase[]) {
  const map = new Map<string, { month: string; creditsPurchased: number; invoices: number; amount: number }>();
  purchases.forEach((purchase) => {
    const key = format(parseISO(purchase.purchase_date), "yyyy-MM");
    const label = format(parseISO(purchase.purchase_date), "MMM yyyy");
    const current = map.get(key) ?? { month: label, creditsPurchased: 0, invoices: 0, amount: 0 };
    current.creditsPurchased += toNumber(purchase.total_credits_purchased);
    current.amount += toNumber(purchase.purchase_amount);
    current.invoices += 1;
    map.set(key, current);
  });
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([, value]) => value);
}

export function getSupplierUsage(records: AiUsage[]) {
  const map = new Map<string, { supplier: string; styles: number; images: number; wastage: number; creditsUsed: number; entries: number }>();
  records.forEach((record) => {
    const supplier = record.supplier_requirements || "Unassigned";
    const current = map.get(supplier) ?? { supplier, styles: 0, images: 0, wastage: 0, creditsUsed: 0, entries: 0 };
    current.styles += toNumber(record.number_of_styles);
    current.images += toNumber(record.number_of_images);
    current.wastage += toNumber(record.wastage);
    current.creditsUsed += toNumber(record.credits_used);
    current.entries += 1;
    map.set(supplier, current);
  });
  return Array.from(map.values()).sort((a, b) => b.creditsUsed - a.creditsUsed);
}

export function getDailyActivity(records: AiUsage[]) {
  const map = new Map<string, { date: string; entries: number; creditsUsed: number }>();
  records.forEach((record) => {
    const current = map.get(record.date) ?? {
      date: format(parseISO(record.date), "MMM dd"),
      entries: 0,
      creditsUsed: 0
    };
    current.entries += 1;
    current.creditsUsed += toNumber(record.credits_used);
    map.set(record.date, current);
  });

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30)
    .map(([, value]) => value);
}

export function getSupplierSummary(records: AiUsage[]) {
  return records
    .filter((record) => record.supplier_requirements?.trim())
    .map((record) => ({
      date: record.date,
      platform: record.platform,
      supplier: record.supplier_requirements ?? "",
      description: record.description,
      wastage: toNumber(record.wastage),
      creditsUsed: toNumber(record.credits_used)
    }));
}

export function getWastageSummary(records: AiUsage[]) {
  const map = new Map<string, { label: string; wastage: number; entries: number }>();
  records.forEach((record) => {
    const label = record.category || "Custom";
    const current = map.get(label) ?? { label, wastage: 0, entries: 0 };
    current.wastage += toNumber(record.wastage);
    current.entries += 1;
    map.set(label, current);
  });
  return Array.from(map.values()).sort((a, b) => b.wastage - a.wastage);
}
