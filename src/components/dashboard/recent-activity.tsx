import type { AiUsage } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatNumber } from "@/lib/utils";

export function RecentActivity({ records }: { records: AiUsage[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {records.length === 0 ? (
          <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
            No usage records yet.
          </div>
        ) : (
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-3 font-medium">Date</th>
                <th className="py-3 font-medium">Platform</th>
                <th className="py-3 font-medium">Purpose</th>
                <th className="py-3 font-medium">Used</th>
                <th className="py-3 font-medium">Images</th>
                <th className="py-3 font-medium">Styles</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id} className="border-b last:border-0">
                  <td className="py-3">{formatDate(record.date)}</td>
                  <td className="py-3 font-medium">{record.platform}</td>
                  <td className="max-w-xs truncate py-3 text-muted-foreground">{record.description}</td>
                  <td className="py-3">{formatNumber(record.credits_used)}</td>
                  <td className="py-3">{formatNumber(record.number_of_images)}</td>
                  <td className="py-3">{formatNumber(record.number_of_styles)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
