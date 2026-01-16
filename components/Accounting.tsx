import React, { useMemo } from 'react';
import { Transaction, Location, Terminal } from '../types';
import { TrendingDown, TrendingUp, DollarSign, Store } from 'lucide-react';

interface AccountingProps {
  transactions: Transaction[];
  locations: Location[];
  terminals: Terminal[];
}

const Accounting: React.FC<AccountingProps> = ({ transactions, locations, terminals }) => {
  
  // P&L Logic: Aggregate Gross Profit and Deduct Rent Expenses
  const profitabilityReport = useMemo(() => {
    return locations.map(loc => {
      // 1. Identify terminals at this location
      const locTerminals = terminals.filter(t => t.locationId === loc.id);
      const locTerminalSns = locTerminals.map(t => t.sn);

      // 2. Filter transactions for these terminals
      const locTxs = transactions.filter(t => 
        t.status === 'COMPLETED' && locTerminalSns.includes(t.terminalSn)
      );

      // 3. Calculate Financials
      const totalVolume = locTxs.reduce((sum, t) => sum + t.amountCash, 0);
      const grossProfit = locTxs.reduce((sum, t) => sum + t.grossProfit, 0);

      // 4. Calculate Rent Expense (Fixed + Variable)
      let rentExpense = loc.baseRent;
      let variableRent = 0;
      
      // Example Tiered Logic: 1% commission if volume > $10,000
      // In a real app, these thresholds would be in the Location metadata
      if (loc.rentModel === 'VOLUME_TIER' && totalVolume > 10000) {
        variableRent = (totalVolume - 10000) * 0.01;
        rentExpense += variableRent;
      }

      const netIncome = grossProfit - rentExpense;
      const margin = totalVolume > 0 ? (netIncome / totalVolume) * 100 : 0;

      return {
        ...loc,
        txCount: locTxs.length,
        totalVolume,
        grossProfit,
        rentExpense,
        variableRent,
        netIncome,
        margin
      };
    }).sort((a, b) => a.netIncome - b.netIncome); // Sort by Net Income (Ascending) to see losers first
  }, [locations, terminals, transactions]);

  const totalNetIncome = profitabilityReport.reduce((sum, r) => sum + r.netIncome, 0);

  return (
    <div className="space-y-8">
      
      {/* Summary Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-8 text-white shadow-lg flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
           <h2 className="text-3xl font-bold flex items-center gap-3">
             <Store className="text-blue-400" /> Location Profitability
           </h2>
           <p className="text-slate-400 mt-2">Net Income Analysis (Gross Profit - Rent Expenses)</p>
        </div>
        <div className="text-right bg-white/10 p-4 rounded-lg border border-white/10">
           <p className="text-sm text-slate-300 uppercase tracking-wider font-semibold">Total Network Net Income</p>
           <p className={`text-3xl font-bold ${totalNetIncome >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              ${totalNetIncome.toLocaleString()}
           </p>
        </div>
      </div>

      {/* Profitability Table */}
      <div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left">
             <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase">
                <tr>
                    <th className="p-4">Location</th>
                    <th className="p-4">Model</th>
                    <th className="p-4 text-right">Volume</th>
                    <th className="p-4 text-right text-emerald-700">Gross Profit (GP)</th>
                    <th className="p-4 text-right text-amber-700">Rent Cost</th>
                    <th className="p-4 text-right">Net Income</th>
                    <th className="p-4 text-center">Status</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-100 text-sm">
                {profitabilityReport.map(loc => (
                    <tr key={loc.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4">
                            <div className="font-bold text-slate-900">{loc.name}</div>
                            <div className="text-xs text-slate-500">{loc.city}, {loc.state}</div>
                        </td>
                        <td className="p-4">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                loc.rentModel === 'FIXED' ? 'bg-slate-100 text-slate-600' : 'bg-purple-100 text-purple-700'
                            }`}>
                                {loc.rentModel}
                            </span>
                            {loc.variableRent > 0 && <span className="block text-[10px] text-slate-400 mt-1">+{loc.variableRent.toFixed(0)} var</span>}
                        </td>
                        <td className="p-4 text-right text-slate-600 font-mono">
                           ${loc.totalVolume.toLocaleString()}
                        </td>
                        <td className="p-4 text-right text-emerald-600 font-bold font-mono">
                           +${loc.grossProfit.toLocaleString(undefined, {minimumFractionDigits: 2})}
                        </td>
                        <td className="p-4 text-right text-amber-600 font-mono">
                           -${loc.rentExpense.toLocaleString(undefined, {minimumFractionDigits: 2})}
                        </td>
                        <td className="p-4 text-right">
                           <div className={`font-bold text-base font-mono ${loc.netIncome >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
                               {loc.netIncome >= 0 ? '$' : '-$'}{Math.abs(loc.netIncome).toLocaleString(undefined, {minimumFractionDigits: 2})}
                           </div>
                           <div className="text-[10px] text-slate-400 mt-1">
                              Margin: {loc.margin.toFixed(1)}%
                           </div>
                        </td>
                        <td className="p-4 text-center">
                            {loc.netIncome > 0 ? (
                                <span className="inline-flex items-center justify-center w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full">
                                   <TrendingUp size={16} />
                                </span>
                            ) : (
                                <span className="inline-flex items-center justify-center w-8 h-8 bg-red-100 text-red-600 rounded-full animate-pulse">
                                   <TrendingDown size={16} />
                                </span>
                            )}
                        </td>
                    </tr>
                ))}
             </tbody>
          </table>
          {profitabilityReport.length === 0 && (
             <div className="p-8 text-center text-slate-400">
                No location data available for calculation.
             </div>
          )}
        </div>
      </div>

      {/* General Ledger (Detailed) */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <DollarSign className="text-slate-400" /> Global Transaction Ledger
        </h2>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase">
                    <tr>
                        <th className="p-4">Date</th>
                        <th className="p-4">Source</th>
                        <th className="p-4">Terminal</th>
                        <th className="p-4 text-right">Amount</th>
                        <th className="p-4 text-right">GP</th>
                        <th className="p-4 text-center">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                    {transactions.slice(0, 15).map(t => (
                        <tr key={t.id} className="hover:bg-slate-50">
                            <td className="p-4 text-slate-700">
                                <div className="font-medium">{t.timestamp.split('T')[0]}</div>
                                <div className="text-xs text-slate-400">{t.timestamp.split('T')[1].substring(0,5)}</div>
                            </td>
                            <td className="p-4">
                                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                                    {t.source}
                                </span>
                            </td>
                            <td className="p-4 text-slate-700">{t.terminalSn}</td>
                            <td className="p-4 text-right font-medium text-slate-900">${t.amountCash.toFixed(2)}</td>
                            <td className="p-4 text-right text-emerald-600 font-medium">+${t.grossProfit.toFixed(2)}</td>
                            <td className="p-4 text-center">
                                <span className={`px-2 py-0.5 rounded text-xs ${
                                    t.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                }`}>
                                    {t.status}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
             </table>
             <div className="p-4 text-center border-t border-slate-100 bg-slate-50">
                <span className="text-xs text-slate-400">Showing last 15 transactions of {transactions.length}</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Accounting;