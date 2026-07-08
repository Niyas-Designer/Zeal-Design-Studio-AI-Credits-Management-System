"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function MonthlyUsageChart({ data }: { data: unknown[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Credits Usage</CardTitle>
      </CardHeader>
      <CardContent className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
            <XAxis dataKey="month" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey="creditsPurchased" name="Purchased" stroke="#111111" fill="#111111" fillOpacity={0.12} />
            <Area type="monotone" dataKey="creditsUsed" name="Used" stroke="#E53935" fill="#E53935" fillOpacity={0.18} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function ProductivityChart({ data }: { data: unknown[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Images and Styles</CardTitle>
      </CardHeader>
      <CardContent className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
            <XAxis dataKey="month" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Legend />
            <Bar dataKey="images" name="Images" fill="#E53935" radius={[4, 4, 0, 0]} />
            <Bar dataKey="styles" name="Styles" fill="#111111" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function PlatformChart({ data }: { data: unknown[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Platform-wise Usage</CardTitle>
      </CardHeader>
      <CardContent className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 30 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
            <XAxis type="number" fontSize={12} />
            <YAxis type="category" dataKey="platform" fontSize={12} width={110} />
            <Tooltip />
            <Bar dataKey="creditsUsed" name="Credits Used" fill="#E53935" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function DailyActivityChart({ data }: { data: unknown[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Activity</CardTitle>
      </CardHeader>
      <CardContent className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
            <XAxis dataKey="date" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Area type="monotone" dataKey="entries" name="Entries" stroke="#E53935" fill="#E53935" fillOpacity={0.2} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
