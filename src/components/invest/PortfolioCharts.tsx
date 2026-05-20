import { useMemo } from "react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  BarChart, Bar, Legend,
} from "recharts";
import { formatMoney } from "@/lib/invest";

const COLORS = [
  "#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899",
  "#14b8a6", "#f97316", "#6366f1", "#06b6d4", "#84cc16",
];

interface PortfolioChartsProps {
  investments: any[];
  returns: any[];
  payments: any[];
}

export function PortfolioCharts({ investments, returns, payments }: PortfolioChartsProps) {
  // ── Asset Allocation (Donut) ──
  const allocationData = useMemo(() => {
    const confirmed = investments.filter(
      (i) => i.status === "confirmed" || i.status === "active"
    );
    const grouped: Record<string, number> = {};
    confirmed.forEach((i) => {
      const name = i.investment_properties?.title ?? "Unknown";
      grouped[name] = (grouped[name] ?? 0) + Number(i.total_amount ?? i.amount_invested ?? 0);
    });
    return Object.entries(grouped).map(([name, value]) => ({ name, value }));
  }, [investments]);

  // ── ROI Timeline (Area) ──
  const roiData = useMemo(() => {
    if (!returns.length) return [];
    const sorted = [...returns].sort(
      (a, b) => new Date(a.distribution_date).getTime() - new Date(b.distribution_date).getTime()
    );
    let cumulative = 0;
    return sorted.map((r) => {
      cumulative += Number(r.amount_received);
      return {
        date: new Date(r.distribution_date).toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        payout: Number(r.amount_received),
        cumulative,
      };
    });
  }, [returns]);

  // ── Monthly Investment vs Returns (Bar) ──
  const monthlyData = useMemo(() => {
    const months: Record<string, { invested: number; returned: number }> = {};

    payments
      .filter((p) => p.status === "success")
      .forEach((p) => {
        const key = new Date(p.created_at).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        if (!months[key]) months[key] = { invested: 0, returned: 0 };
        months[key].invested += Number(p.amount);
      });

    returns.forEach((r) => {
      const key = new Date(r.distribution_date).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      if (!months[key]) months[key] = { invested: 0, returned: 0 };
      months[key].returned += Number(r.amount_received);
    });

    return Object.entries(months).map(([month, vals]) => ({
      month,
      ...vals,
    }));
  }, [payments, returns]);

  const hasData = allocationData.length > 0 || roiData.length > 0 || monthlyData.length > 0;

  if (!hasData) return null;

  return (
    <section className="space-y-6">
      <h2 className="font-serif text-xl font-semibold">Portfolio Analytics</h2>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Asset Allocation */}
        {allocationData.length > 0 && (
          <div className="rounded-xl border border-border/50 bg-card p-5 shadow-soft">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
              Asset Allocation
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={allocationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {allocationData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatMoney(value)}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-3 space-y-1.5">
              {allocationData.map((item, i) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <span className="truncate text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="font-medium text-foreground shrink-0 ml-2">
                    {formatMoney(item.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ROI Timeline */}
        {roiData.length > 0 && (
          <div className="rounded-xl border border-border/50 bg-card p-5 shadow-soft">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
              Cumulative Returns
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={roiData}>
                <defs>
                  <linearGradient id="roiGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: number) => formatMoney(value)}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="cumulative"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#roiGrad)"
                  name="Total Returns"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Monthly Comparison */}
        {monthlyData.length > 0 && (
          <div className="rounded-xl border border-border/50 bg-card p-5 shadow-soft">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
              Invested vs. Returns
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: number) => formatMoney(value)}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "12px" }} />
                <Bar dataKey="invested" fill="#3b82f6" name="Invested" radius={[4, 4, 0, 0]} />
                <Bar dataKey="returned" fill="#10b981" name="Returns" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </section>
  );
}
