import React from 'react';
import { Transaction } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend } from 'recharts';

interface SalesPerformanceProps {
  transactions: Transaction[];
}

const SalesPerformance: React.FC<SalesPerformanceProps> = ({ transactions }) => {
  // Aggregate data by date
  const dailyDataMap = transactions.reduce((acc, t) => {
    const date = t.timestamp.split('T')[0];
    if (!acc[date]) {
      acc[date] = { date, buyVolume: 0, sellVolume: 0, profit: 0 };
    }
    if (t.status === 'COMPLETED') {
      if (t.type === 'BUY') acc[date].buyVolume += t.amountCash;
      if (t.type === 'SELL') acc[date].sellVolume += t.amountCash;
      acc[date].profit += t.grossProfit;
    }
    return acc;
  }, {} as Record<string, { date: string; buyVolume: number; sellVolume: number; profit: number }>);

  const chartData = Object.values(dailyDataMap).sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Sales & Performance</h2>
        <p className="text-slate-500">Detailed breakdown of Buy/Sell volumes and profitability.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Buy vs Sell Volume Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Buy vs Sell Volume</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBuy" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSell" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{fontSize: 10}} tickFormatter={(str) => str.slice(5)} />
                <YAxis tick={{fontSize: 10}} />
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <Tooltip 
                   contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend />
                <Area type="monotone" dataKey="buyVolume" stroke="#10b981" fillOpacity={1} fill="url(#colorBuy)" name="Buy (Dispense)" />
                <Area type="monotone" dataKey="sellVolume" stroke="#f43f5e" fillOpacity={1} fill="url(#colorSell)" name="Sell (Intake)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Profit Trend Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Gross Profit Trend</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <XAxis dataKey="date" tick={{fontSize: 10}} tickFormatter={(str) => str.slice(5)} />
                <YAxis tick={{fontSize: 10}} />
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <Tooltip 
                   formatter={(val: number) => [`$${val.toFixed(2)}`, 'Profit']}
                   contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Line type="monotone" dataKey="profit" stroke="#3b82f6" strokeWidth={3} dot={false} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Summary Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h3 className="font-bold text-slate-800">Daily Performance Ledger</h3>
        </div>
        <div className="max-h-96 overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 sticky top-0">
              <tr className="text-slate-500 text-xs uppercase tracking-wider">
                <th className="p-4 font-semibold">Date</th>
                <th className="p-4 font-semibold text-right">Volume</th>
                <th className="p-4 font-semibold text-right">Transactions</th>
                <th className="p-4 font-semibold text-right">Gross Profit</th>
                <th className="p-4 font-semibold text-right">Spread Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {chartData.reverse().map((day: any) => (
                <tr key={day.date} className="hover:bg-slate-50">
                  <td className="p-4 text-slate-700 font-medium">{day.date}</td>
                  <td className="p-4 text-right text-slate-900">${(day.buyVolume + day.sellVolume).toLocaleString()}</td>
                  <td className="p-4 text-right text-slate-600">N/A</td> {/* In a real app, aggregated tx count */}
                  <td className="p-4 text-right font-medium text-emerald-600">+${day.profit.toFixed(2)}</td>
                  <td className="p-4 text-right text-slate-600">${(day.profit * 0.8).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SalesPerformance;