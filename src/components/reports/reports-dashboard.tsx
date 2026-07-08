"use client";

import { useMemo, useState } from "react";
import { Download, FileSpreadsheet, FileText, Printer, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PLATFORMS } from "@/lib/constants";
import { exportCsv, exportExcel, exportPdf, printReport } from "@/lib/export";
import { getCategorySeries, getDashboardStats, getPlatformSeries, getSupplierSummary } from "@/lib/analytics";
import type { AiUsage, CreditPurchase } from "@/lib/types";
import { formatDate, formatNumber } from "@/lib/utils";

type ReportType = "monthly" | "platform" | "date-range" | "supplier";

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
      const monthOk = reportType !== "monthly" || record.date.startsWith(month);
      const platformOk =
        reportType !== "platform" || platform === "all" || record.platform === platform;
      const rangeOk =
        reportType !== "date-range" ||
        ((!dateFrom || record.date >= dateFrom) && (!dateTo || record.date <= dateTo));
      const supplierOk = reportType !== "supplier" || !!record.supplier_requirements?.trim();
      return searchOk && monthOk && platformOk && rangeOk && supplierOk;
    });
  }, [records, search, month, platform, dateFrom, dateTo, reportType]);

  const purchaseFiltered = purchases.filter((purchase) => reportType !== "monthly" || purchase.purchase_date.startsWith(month));
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
                <SelectItem value="platform">Platform Report</SelectItem>
                <SelectItem value="date-range">Date Range Report</SelectItem>
                <SelectItem value="supplier">Supplier Report</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Global search" value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
            {reportType === "monthly" ? (
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
        </CardContent>
      </Card>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <ReportMetric label="Credits Purchased" value={stats.totalBuyCredits} />
        <ReportMetric label="Credits Used" value={stats.totalCreditsUsed} />
        <ReportMetric label="Remaining Credits" value={stats.remainingCredits} />
        <ReportMetric label="Total Images" value={stats.totalImages} />
        <ReportMetric label="Total Styles" value={stats.totalStyles} />
        <ReportMetric label="Invoices Uploaded" value={stats.invoicesUploaded} />
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
                <th className="py-3">Credits Used</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((item) => (
                <tr className="border-b last:border-0" key={item.category}>
                  <td className="py-3 font-semibold">{item.category}</td>
                  <td className="py-3">{formatNumber(item.styles)}</td>
                  <td className="py-3">{formatNumber(item.images)}</td>
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
                  <td className="py-3">{formatNumber(item.images ? item.creditsUsed / item.images : 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{reportType === "supplier" ? "Supplier Requirements Summary" : "Report Records"}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {reportType === "supplier" ? (
            <SupplierTable suppliers={suppliers} />
          ) : (
            <RecordsTable records={filtered} />
          )}
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
            <td className="py-3">{formatNumber(item.creditsUsed)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function EmptyState() {
  return (
    <div className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
      No records found for this report.
    </div>
  );
}
