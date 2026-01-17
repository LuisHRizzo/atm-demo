import React, { useMemo, useState } from 'react';
import { Transaction, Location, Terminal } from '../types';
import { TrendingDown, TrendingUp, DollarSign, Store, ChevronDown, ChevronUp, Search } from 'lucide-react';

interface AccountingProps {
  transactions: Transaction[];
  locations: Location[];
  terminals: Terminal[];
}

const Accounting: React.FC<AccountingProps> = ({ transactions, locations, terminals }) => {
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);
  const [filterSource, setFilterSource] = useState<string>('ALL');

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

  // Global Totals
  const totalGrossProfit = profitabilityReport.reduce((sum, r) => sum + r.grossProfit, 0);
  const totalRent = profitabilityReport.reduce((sum, r) => sum + r.rentExpense, 0);
  const totalNetIncome = profitabilityReport.reduce((sum, r) => sum + r.netIncome, 0);

  // Filter for Ledger
  const filteredTransactions = transactions.filter(t => filterSource === 'ALL' || t.source === filterSource);

  const toggleExpand = (id: string) => {
    setExpandedTxId(expandedTxId === id ? null : id);
  };

  return (
    <div className="space-y-8">
      
      {/* 1. Executive P&L Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
             <div className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-1">Total Crypto Gross Profit</div>
             <div className="text-3xl font-bold text-emerald-600">+${totalGrossProfit.toLocaleString()}</div>
             <div className="text-xs text-slate-400 mt-2">Revenue from Spreads & Fees (Transactions)</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
             <div className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-1">Total Rent & Overhead</div>
             <div className="text-3xl font-bold text-amber-600">-${totalRent.toLocaleString()}</div>
             <div className="text-xs text-slate-400 mt-2">Fixed & Variable Location Costs (System)</div>
          </div>
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-xl shadow-lg text-white">
             <div className="text-slate-300 text-sm font-medium uppercase tracking-wider mb-1">Net Operating Income</div>
             <div className={`text-3xl font-bold ${totalNetIncome >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                ${totalNetIncome.toLocaleString()}
             </div>
             <div className="text-xs text-slate-400 mt-2">Actual Profitability</div>
          </div>
      </div>

      {/* 2. Location Profitability Table (P&L per Site) */}
      <div>
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Store className="text-slate-400" /> Site Profitability
        </h3>
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
                    <th className="p-4 text-center">Trend</th>
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
        </div>
      </div>

      {/* 3. Detailed General Ledger (Transactions & Metadata) */}
      <div>
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <DollarSign className="text-slate-400" /> General Ledger
            </h2>
            <select 
                value={filterSource} 
                onChange={e => setFilterSource(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
                <option value="ALL">All Sources</option>
                <option value="GB">General Bytes</option>
                <option value="BP">BitPay</option>
                <option value="OTC">OTC Desk</option>
            </select>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase">
                    <tr>
                        <th className="p-4 w-8"></th>
                        <th className="p-4">Date / Source</th>
                        <th className="p-4">Location / Terminal</th>
                        <th className="p-4">Type</th>
                        <th className="p-4 text-right">Cash Vol</th>
                        <th className="p-4 text-right">Crypto Vol</th>
                        <th className="p-4 text-right">Rate</th>
                        <th className="p-4 text-right">Gross Profit</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredTransactions.slice(0, 50).map(t => (
                        <React.Fragment key={t.id}>
                        <tr 
                            onClick={() => toggleExpand(t.id)} 
                            className={`hover:bg-slate-50 cursor-pointer transition-colors ${expandedTxId === t.id ? 'bg-blue-50/50' : ''}`}
                        >
                            <td className="p-4 text-slate-400">
                                {expandedTxId === t.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </td>
                            <td className="p-4">
                                <div className="font-medium text-slate-900">{t.timestamp.split('T')[0]}</div>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                        {t.source}
                                    </span>
                                    <span className="text-[10px] text-slate-400">{t.timestamp.split('T')[1].substring(0,5)}</span>
                                </div>
                            </td>
                            <td className="p-4">
                                <div className="text-slate-700">{t.terminalSn}</div>
                                <div className="text-xs text-slate-400">ID: {t.id.slice(-6)}</div>
                            </td>
                            <td className="p-4">
                                <span className={`font-bold text-xs ${t.type === 'BUY' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {t.type}
                                </span>
                            </td>
                            <td className="p-4 text-right font-medium text-slate-900">${t.amountCash.toLocaleString()}</td>
                            <td className="p-4 text-right text-slate-600">{t.amountCrypto.toFixed(6)}</td>
                            <td className="p-4 text-right text-slate-500 text-xs">${t.exchangePrice.toLocaleString()}</td>
                            <td className="p-4 text-right text-emerald-600 font-bold">+${t.grossProfit.toFixed(2)}</td>
                        </tr>
                        {expandedTxId === t.id && (
                            <tr className="bg-slate-50/50">
                                <td colSpan={8} className="p-4 pl-16 border-t border-slate-100 shadow-inner">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                                        <div>
                                            <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2">
                                                <Search size={14} /> Source Metadata
                                            </h4>
                                            <div className="space-y-1 text-slate-600 bg-white p-3 rounded border border-slate-200">
                                                {Object.entries(t.metadata || {}).map(([key, val]) => (
                                                    <div key={key} className="flex justify-between border-b border-slate-100 py-1 last:border-0">
                                                        <span className="text-slate-400 capitalize text-xs">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                                        <span className="font-mono text-xs select-all text-right ml-4 break-all">{String(val)}</span>
                                                    </div>
                                                ))}
                                                {(!t.metadata || Object.keys(t.metadata).length === 0) && (
                                                    <span className="text-slate-400 italic">No extra metadata available for this record.</span>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-700 mb-2">Profit Breakdown</h4>
                                            <div className="space-y-1 text-slate-600 bg-white p-3 rounded border border-slate-200">
                                                <div className="flex justify-between py-1">
                                                    <span>Transaction Volume:</span>
                                                    <span>${t.amountCash.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between py-1">
                                                    <span>Fixed Fee:</span>
                                                    <span>${t.fixedFee.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between py-1">
                                                    <span>Mark-up:</span>
                                                    <span>{t.markupPercent ? (t.markupPercent * 100).toFixed(2) : 0}%</span>
                                                </div>
                                                <div className="flex justify-between py-1 font-bold text-emerald-600 border-t border-slate-100 pt-1 mt-1">
                                                    <span>Calculated Gross Profit:</span>
                                                    <span>${t.grossProfit.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        )}
                        </React.Fragment>
                    ))}
                </tbody>
             </table>
             {filteredTransactions.length === 0 && (
                 <div className="p-8 text-center text-slate-400">No transactions found.</div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Accounting;