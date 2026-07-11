"use client";

import { useMemo, useState } from "react";
import { Download, FileSpreadsheet, FileText, Printer, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PLATFORMS } from "@/lib/constants";
import { exportCsv, exportExcel, exportMonthlyPurchasePdf, exportPdf, printMonthlyPurchaseReport, printReport } from "@/lib/export";
import { getCategorySeries, getDashboardStats, getPlatformSeries, getSupplierSummary } from "@/lib/analytics";
import type { AiUsage, CreditPurchase } from "@/lib/types";
import { formatDate, formatNumber } from "@/lib/utils";

type ReportType = "monthly" | "monthly-purchase" | "platform" | "date-range" | "supplier" | "wastage";
const CREDITS_PER_IMAGE = 150;

export function ReportsDashboard({ records, purchases = [] }: { records: AiUsage[]; purchases?: CreditPurchase[] }) {
  const [reportType, setReportType] = useState<ReportType>("monthly");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [platform, setPlatform] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return records.filter((record) => {
      const searchOk =
        !search ||
        `${record.platform} ${record.category ?? ""} ${record.description} ${record.supplier_requirements ?? ""}`
          .toLowerCase()
          .includes(search.toLowerCase());
      const monthOk = (reportType !== "monthly" && reportType !== "monthly-purchase") || record.date.startsWith(month);
      const platformOk =
        reportType !== "platform" || platform === "all" || record.platform === platform;
      const rangeOk =
        reportType !== "date-range" ||
        ((!dateFrom || record.date >= dateFrom) && (!dateTo || record.date <= dateTo));
      const supplierOk = reportType !== "supplier" || !!record.supplier_requirements?.trim();
      const wastageOk = reportType !== "wastage" || Number(record.wastage || 0) > 0 || record.category === "Wastage";
      return searchOk && monthOk && platformOk && rangeOk && supplierOk && wastageOk;
    });
  }, [records, search, month, platform, dateFrom, dateTo, reportType]);

  const purchaseFiltered = purchases.filter((purchase) => (reportType !== "monthly" && reportType !== "monthly-purchase") || purchase.purchase_date.startsWith(month));
  const stats = getDashboardStats(filtered, purchaseFiltered);
  const platforms = getPlatformSeries(filtered);
  const suppliers = getSupplierSummary(filtered);
  const categories = getCategorySeries(filtered);

  return (
    <div className="space-y-6">
      <Card className="no-print">
        <CardContent className="space-y-4 p-4">
          <div className="grid gap-3 lg:grid-cols-5">
            <Select value={reportType} onValueChange={(value) => setReportType(value as ReportType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly Report</SelectItem>
                <SelectItem value="monthly-purchase">Monthly Purchase Report</SelectItem>
                <SelectItem value="platform">Platform Report</SelectItem>
                <SelectItem value="date-range">Date Range Report</SelectItem>
                <SelectItem value="supplier">Supplier Report</SelectItem>
                <SelectItem value="wastage">Wastage Report</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Global search" value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
            {reportType === "monthly" || reportType === "monthly-purchase" ? (
              <Input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
            ) : null}
            {reportType === "platform" ? (
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All platforms</SelectItem>
                  {PLATFORMS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : null}
            {reportType === "date-range" ? (
              <>
                <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
                <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
              </>
            ) : null}
          </div>
          {reportType === "monthly-purchase" ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => exportMonthlyPurchasePdf(records, purchases, month)}>
              <FileText className="h-4 w-4" />
              Download PDF
            </Button>
            <Button variant="outline" onClick={() => printMonthlyPurchaseReport(records, purchases, month)}>
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </div>
          ) : (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => exportCsv(filtered)}>
              <Download className="h-4 w-4" />
              CSV
            </Button>
            <Button variant="outline" onClick={() => exportExcel(filtered)}>
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </Button>
            <Button variant="outline" onClick={() => exportPdf(filtered, "Zeal AI Credits Report", purchaseFiltered)}>
              <FileText className="h-4 w-4" />
              PDF
            </Button>
            <Button variant="outline" onClick={printReport}>
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </div>
          )}
        </CardContent>
      </Card>

      {reportType === "monthly-purchase" ? (
        <MonthlyPurchaseReport records={filtered} purchases={purchaseFiltered} />
      ) : (
      <>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <ReportMetric label="Credits Purchased" value={stats.totalBuyCredits} />
        <ReportMetric label="Credits Used" value={stats.totalCreditsUsed} />
        <ReportMetric label="Remaining Credits" value={stats.remainingCredits} />
        <ReportMetric label="Total Images" value={stats.totalImages} />
        <ReportMetric label="Total Styles" value={stats.totalStyles} />
        <ReportMetric label="Wastage Images" value={stats.totalWastage} />
        <ReportMetric label="Wastage Credits" value={stats.totalWastageCredits} />
        <ReportMetric label="Wastage per Entry" value={stats.wastagePerEntry} />
        <ReportMetric label="Total Purchases" value={stats.totalPurchases} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Category-wise Usage</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-3">Category</th>
                <th className="py-3">Styles</th>
                <th className="py-3">Images</th>
                <th className="py-3">Wastage</th>
                <th className="py-3">Wastage Credits</th>
                <th className="py-3">Credits Used</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((item) => (
                <tr className="border-b last:border-0" key={item.category}>
                  <td className="py-3 font-semibold">{item.category}</td>
                  <td className="py-3">{formatNumber(item.styles)}</td>
                  <td className="py-3">{formatNumber(item.images)}</td>
                  <td className="py-3">{formatNumber(item.wastage)}</td>
                  <td className="py-3">{formatNumber(item.wastage * CREDITS_PER_IMAGE)}</td>
                  <td className="py-3">{formatNumber(item.creditsUsed)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Platform-wise Usage</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-3">Platform</th>
                <th className="py-3">Entries</th>
                <th className="py-3">Credits Consumed</th>
                <th className="py-3">Credits Purchased</th>
                <th className="py-3">Images</th>
                <th className="py-3">Styles</th>
                <th className="py-3">Wastage</th>
                <th className="py-3">Wastage Credits</th>
                <th className="py-3">Credits / Image</th>
              </tr>
            </thead>
            <tbody>
              {platforms.map((item) => (
                <tr key={item.platform} className="border-b last:border-0">
                  <td className="py-3 font-semibold">{item.platform}</td>
                  <td className="py-3">{item.entries}</td>
                  <td className="py-3">{formatNumber(item.creditsUsed)}</td>
                  <td className="py-3">{formatNumber(item.creditsPurchased)}</td>
                  <td className="py-3">{formatNumber(item.images)}</td>
                  <td className="py-3">{formatNumber(item.styles)}</td>
                  <td className="py-3">{formatNumber(item.wastage)}</td>
                  <td className="py-3">{formatNumber(item.wastage * CREDITS_PER_IMAGE)}</td>
                  <td className="py-3">{formatNumber(item.images ? item.creditsUsed / item.images : 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{reportType === "supplier" ? "Supplier Requirements Summary" : reportType === "wastage" ? "Wastage Summary" : "Report Records"}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {reportType === "supplier" ? (
            <SupplierTable suppliers={suppliers} />
          ) : reportType === "wastage" ? (
            <WastageTable records={filtered} />
          ) : (
            <RecordsTable records={filtered} />
          )}
        </CardContent>
      </Card>
      </>
      )}
    </div>
  );
}

function WastageTable({ records }: { records: AiUsage[] }) {
  if (!records.length) return <EmptyState />;

  return (
    <table className="w-full min-w-[840px] text-sm">
      <thead>
        <tr className="border-b text-left text-muted-foreground">
          <th className="py-3">Date</th>
          <th className="py-3">Platform</th>
          <th className="py-3">Category</th>
          <th className="py-3">Description</th>
          <th className="py-3">Images</th>
          <th className="py-3">Styles</th>
          <th className="py-3">Wastage</th>
          <th className="py-3">Wastage Credits</th>
        </tr>
      </thead>
      <tbody>
        {records.map((record) => (
          <tr key={record.id} className="border-b last:border-0">
            <td className="py-3">{formatDate(record.date)}</td>
            <td className="py-3 font-semibold">{record.platform}</td>
            <td className="py-3">{record.category || "Custom"}</td>
            <td className="max-w-sm truncate py-3">{record.description}</td>
            <td className="py-3">{formatNumber(record.number_of_images)}</td>
            <td className="py-3">{formatNumber(record.number_of_styles)}</td>
            <td className="py-3">{formatNumber(record.wastage)}</td>
            <td className="py-3">{formatNumber(Number(record.wastage || 0) * CREDITS_PER_IMAGE)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function MonthlyPurchaseReport({ records, purchases }: { records: AiUsage[]; purchases: CreditPurchase[] }) {
  const allocation = useMemo(() => allocateMonthlyPurchaseUsage(purchases, records), [purchases, records]);
  const creditsPurchased = purchases.reduce((sum, purchase) => sum + Number(purchase.total_credits_purchased || 0), 0);
  const creditsUsed = records.reduce((sum, record) => sum + Number(record.credits_used || 0), 0);
  const totalWastage = records.reduce((sum, record) => sum + Number(record.wastage || 0), 0);
  const totalWastageCredits = totalWastage * CREDITS_PER_IMAGE;
  const allocatedUsed = Array.from(allocation.values()).reduce((sum, used) => sum + used, 0);
  const amountPaid = purchases.reduce((sum, purchase) => sum + Number(purchase.purchase_amount || 0), 0);
  const remainingCredits = creditsPurchased - allocatedUsed;
  const platformSummary = getMonthlyPlatformSummary(records, purchases, allocation);
  const paymentSummary = getMonthlyPaymentSummary(purchases);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <ReportMetric label="Total Purchases" value={purchases.length} />
        <ReportMetric label="Number of Purchases" value={purchases.length} />
        <ReportMetric label="Total Amount Spent" value={amountPaid} />
        <ReportMetric label="Credits Purchased" value={creditsPurchased} />
        <ReportMetric label="Credits Used" value={creditsUsed} />
        <ReportMetric label="Wastage Images" value={totalWastage} />
        <ReportMetric label="Wastage Credits" value={totalWastageCredits} />
        <ReportMetric label="Remaining Credits" value={remainingCredits} />
      </section>

      <Card>
        <CardHeader><CardTitle>Platform-wise Summary</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-3">Platform</th>
                <th className="py-3">Purchases</th>
                <th className="py-3">Amount Paid</th>
                <th className="py-3">Credits Purchased</th>
                <th className="py-3">Credits Used</th>
                <th className="py-3">Remaining Credits</th>
              </tr>
            </thead>
            <tbody>
              {platformSummary.map((item) => (
                <tr key={item.platform} className="border-b last:border-0">
                  <td className="py-3 font-semibold">{item.platform}</td>
                  <td className="py-3">{item.purchases}</td>
                  <td className="py-3">{formatNumber(item.amountPaid)}</td>
                  <td className="py-3">{formatNumber(item.creditsPurchased)}</td>
                  <td className="py-3">{formatNumber(item.creditsUsed)}</td>
                  <td className="py-3">{formatNumber(item.remainingCredits)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Payment Method Summary</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-3">Payment Method</th>
                <th className="py-3">Purchases</th>
                <th className="py-3">Amount Paid</th>
                <th className="py-3">Credits Purchased</th>
              </tr>
            </thead>
            <tbody>
              {paymentSummary.map((item) => (
                <tr key={item.paymentMethod} className="border-b last:border-0">
                  <td className="py-3 font-semibold">{item.paymentMethod}</td>
                  <td className="py-3">{item.purchases}</td>
                  <td className="py-3">{formatNumber(item.amountPaid)}</td>
                  <td className="py-3">{formatNumber(item.creditsPurchased)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Purchase History</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-3">Date</th>
                <th className="py-3">Platform</th>
                <th className="py-3">Invoice Number</th>
                <th className="py-3">Credits Purchased</th>
                <th className="py-3">Credits Used</th>
                <th className="py-3">Remaining Credits</th>
                <th className="py-3">Amount Paid</th>
                <th className="py-3">Payment Method</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((purchase) => {
                const used = allocation.get(purchase.id) ?? 0;
                const remaining = Number(purchase.total_credits_purchased || 0) - used;
                return (
                  <tr key={purchase.id} className="border-b last:border-0">
                    <td className="py-3">{formatDate(purchase.purchase_date)}</td>
                    <td className="py-3 font-semibold">{purchase.platform}</td>
                    <td className="py-3">{purchase.invoice_number}</td>
                    <td className="py-3">{formatNumber(purchase.total_credits_purchased)}</td>
                    <td className="py-3">{formatNumber(used)}</td>
                    <td className="py-3">{formatNumber(Math.max(remaining, 0))}</td>
                    <td className="py-3">{purchase.currency} {formatNumber(purchase.purchase_amount)}</td>
                    <td className="py-3">{purchase.payment_method}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t font-bold">
                <td className="py-3" colSpan={3}>Totals</td>
                <td className="py-3">{formatNumber(creditsPurchased)}</td>
                <td className="py-3">{formatNumber(creditsUsed)}</td>
                <td className="py-3">{formatNumber(remainingCredits)}</td>
                <td className="py-3">{formatNumber(amountPaid)}</td>
                <td className="py-3" />
              </tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function ReportMetric({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-bold">{formatNumber(value)}</p>
      </CardContent>
    </Card>
  );
}

function RecordsTable({ records }: { records: AiUsage[] }) {
  if (!records.length) return <EmptyState />;

  return (
    <table className="w-full min-w-[900px] text-sm">
      <thead>
        <tr className="border-b text-left text-muted-foreground">
          <th className="py-3">Date</th>
          <th className="py-3">Platform</th>
          <th className="py-3">Category</th>
          <th className="py-3">Description</th>
          <th className="py-3">Purchased</th>
          <th className="py-3">Used</th>
          <th className="py-3">Remaining</th>
          <th className="py-3">Images</th>
          <th className="py-3">Styles</th>
          <th className="py-3">Wastage</th>
          <th className="py-3">Wastage Credits</th>
        </tr>
      </thead>
      <tbody>
        {records.map((record) => (
          <tr key={record.id} className="border-b last:border-0">
            <td className="py-3">{formatDate(record.date)}</td>
            <td className="py-3 font-semibold">{record.platform}</td>
            <td className="py-3">{record.category || "Custom"}</td>
            <td className="max-w-sm truncate py-3">{record.description}</td>
            <td className="py-3">{formatNumber(record.buy_credits)}</td>
            <td className="py-3">{formatNumber(record.credits_used)}</td>
            <td className="py-3">{formatNumber(record.remaining_credits)}</td>
            <td className="py-3">{formatNumber(record.number_of_images)}</td>
            <td className="py-3">{formatNumber(record.number_of_styles)}</td>
            <td className="py-3">{formatNumber(record.wastage)}</td>
            <td className="py-3">{formatNumber(Number(record.wastage || 0) * CREDITS_PER_IMAGE)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SupplierTable({
  suppliers
}: {
  suppliers: ReturnType<typeof getSupplierSummary>;
}) {
  if (!suppliers.length) return <EmptyState />;

  return (
    <table className="w-full min-w-[760px] text-sm">
      <thead>
        <tr className="border-b text-left text-muted-foreground">
          <th className="py-3">Date</th>
          <th className="py-3">Platform</th>
          <th className="py-3">Supplier Requirements</th>
          <th className="py-3">Description</th>
          <th className="py-3">Wastage</th>
          <th className="py-3">Wastage Credits</th>
          <th className="py-3">Credits Used</th>
        </tr>
      </thead>
      <tbody>
        {suppliers.map((item, index) => (
          <tr key={`${item.date}-${index}`} className="border-b last:border-0">
            <td className="py-3">{formatDate(item.date)}</td>
            <td className="py-3 font-semibold">{item.platform}</td>
            <td className="py-3">{item.supplier}</td>
            <td className="py-3">{item.description}</td>
            <td className="py-3">{formatNumber(item.wastage)}</td>
            <td className="py-3">{formatNumber(Number(item.wastage || 0) * CREDITS_PER_IMAGE)}</td>
            <td className="py-3">{formatNumber(item.creditsUsed)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function allocateMonthlyPurchaseUsage(purchases: CreditPurchase[], records: AiUsage[]) {
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

function getMonthlyPaymentSummary(purchases: CreditPurchase[]) {
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

function EmptyState() {
  return (
    <div className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
      No records found for this report.
    </div>
  );
}
