import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../lib/api.js';

const ACCENT = ['#046bd2', '#22d3ee', '#10b981', '#f59e0b', '#ec4899', '#0b1d3f'];

function fmtUsd(n) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n}`;
}

function prettyChannel(key) {
  return key.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function ChannelRoiBar({ metrics }) {
  const data = Object.entries(metrics).map(([k, m]) => ({
    name: prettyChannel(k),
    roi: m.spend === 0 ? null : Number((m.revenue / m.spend).toFixed(2)),
    isOrganic: m.spend === 0,
  }));
  const max = Math.max(...data.map((d) => d.roi || 0));
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">ROI by Channel</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 25, left: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} />
          <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11, fill: '#334155' }} />
          <Tooltip
            cursor={{ fill: '#f1f5f9' }}
            formatter={(v) => (v == null ? 'Organic (∞)' : `${v}x`)}
            contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
          />
          <Bar dataKey="roi" radius={[0, 6, 6, 0]}>
            {data.map((d, i) => {
              let color = '#64748b';
              if (d.isOrganic) color = '#22d3ee';
              else if (d.roi === max) color = '#046bd2';
              else if (d.roi >= 4) color = '#0ea5e9';
              else if (d.roi >= 2) color = '#f59e0b';
              else color = '#ef4444';
              return <Cell key={i} fill={color} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function RevenueDonut({ metrics }) {
  const data = Object.entries(metrics).map(([k, m]) => ({
    name: prettyChannel(k),
    value: m.revenue,
  }));
  const total = data.reduce((a, d) => a + d.value, 0);
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">Revenue Mix</h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={3}
            stroke="none"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={ACCENT[i % ACCENT.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v) => [`$${v.toLocaleString()}`, `${((v / total) * 100).toFixed(1)}%`]}
            contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
          />
          <Legend
            verticalAlign="bottom"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, color: '#475569' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function MonthlyTrend({ clientId }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    let alive = true;
    api.get(`/clients/${clientId}/trends`).then((r) => {
      if (alive) setData(r.data);
    });
    return () => {
      alive = false;
    };
  }, [clientId]);

  if (!data) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-5 h-[270px] animate-pulse">
        <div className="h-4 w-32 bg-slate-200 rounded mb-3" />
        <div className="h-full bg-slate-100 rounded" />
      </div>
    );
  }

  const series = data.monthly_totals.map((row) => ({
    period: row.period.split(' ')[0], // "Jan" not "Jan 2026"
    revenue: row.total_revenue,
    spend: row.total_spend,
    roi: row.overall_roi,
  }));

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 col-span-1 md:col-span-2">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-700">5-Month Trend</h3>
        <div className="flex gap-3 text-[11px]">
          <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-brand inline-block"/> Revenue</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-slate-400 inline-block"/> Spend</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-emerald-500 inline-block"/> ROI</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={series} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#64748b' }} />
          <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={fmtUsd} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#10b981' }} />
          <Tooltip
            contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
            formatter={(v, n) => (n === 'roi' ? [`${v}x`, 'ROI'] : [`$${v.toLocaleString()}`, n === 'revenue' ? 'Revenue' : 'Spend'])}
          />
          <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#046bd2" strokeWidth={2.5} dot={{ r: 3 }} />
          <Line yAxisId="left" type="monotone" dataKey="spend" stroke="#94a3b8" strokeWidth={2} dot={{ r: 3 }} />
          <Line yAxisId="right" type="monotone" dataKey="roi" stroke="#22d3ee" strokeWidth={2.5} strokeDasharray="4 3" dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function ChannelCharts({ clientId, metrics }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <ChannelRoiBar metrics={metrics} />
      <RevenueDonut metrics={metrics} />
      <MonthlyTrend clientId={clientId} />
    </div>
  );
}
