import React, { useState, useMemo, useEffect } from 'react';
import { Terminal, Transaction, Location, StateSummary } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { DollarSign, Activity, AlertCircle, Sparkles, Map, Filter, Bitcoin, Wallet, TrendingUp } from 'lucide-react';
import { generateStrategicReport } from '../services/geminiService';
import USAMap from './USAMap';

interface DashboardProps {
  terminals: Terminal[];
  transactions: Transaction[];
  locations: Location[];
}

const Dashboard: React.FC<DashboardProps> = ({ terminals, transactions, locations }) => {
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [btcPrice, setBtcPrice] = useState<string | null>(null);

  // --- Filter State (Defaults to Current Month) ---
  const now = new Date();
  const currentYear = now.getFullYear().toString();
  const currentMonth = now.getMonth().toString(); // 0-11

  const [selectedYear, setSelectedYear] = useState<string>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);

  const years = [currentYear, (parseInt(currentYear) - 1).toString(), (parseInt(currentYear) - 2).toString()];
  const months = [
    { val: '0', label: 'January' }, { val: '1', label: 'February' }, { val: '2', label: 'March' },
    { val: '3', label: 'April' }, { val: '4', label: 'May' }, { val: '5', label: 'June' },
    { val: '6', label: 'July' }, { val: '7', label: 'August' }, { val: '8', label: 'September' },
    { val: '9', label: 'October' }, { val: '10', label: 'November' }, { val: '11', label: 'December' },
    { val: 'ALL', label: 'Full Year' }
  ];

  // --- Fetch BTC Price (Coinbase) ---
  useEffect(() => {
    const fetchBtcPrice = async () => {
      try {
        const response = await fetch('https://api.coinbase.com/v2/prices/BTC-USD/spot');
        const data = await response.json();
        if (data?.data?.amount) {
          setBtcPrice(parseFloat(data.data.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
        }
      } catch (error) {
        console.error("Failed to fetch BTC price", error);
      }
    };

    fetchBtcPrice();
    const interval = setInterval(fetchBtcPrice, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  // --- Filtering Logic ---
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const date = new Date(t.timestamp);
      const txYear = date.getFullYear().toString();
      const txMonth = date.getMonth().toString();

      if (txYear !== selectedYear) return false;
      if (selectedMonth !== 'ALL' && txMonth !== selectedMonth) return false;
      
      return true;
    });
  }, [transactions, selectedYear, selectedMonth]);

  // --- KPI Calculations ---
  
  // 1. Total Sales (Completed)
  const completedTx = filteredTransactions.filter(t => t.status === 'COMPLETED');
  const totalVolume = completedTx.reduce((sum, t) => sum + t.amountCash, 0);
  const totalGrossProfit = completedTx.reduce((sum, t) => sum + t.grossProfit, 0);

  // 2. Pending / Incomplete Sales (Initiated but not Completed)
  // In this data model, we treat ERROR/CANCELLED as 'Pending/Failed' sales for the period
  const pendingTx = filteredTransactions.filter(t => t.status !== 'COMPLETED');
  const totalPendingVolume = pendingTx.reduce((sum, t) => sum + t.amountCash, 0);

  // 3. Average Transaction
  const avgTransactionValue = completedTx.length > 0 ? totalVolume / completedTx.length : 0;

  // 4. Cash Available (Real-time, not filtered by date)
  const totalCashAvailable = terminals.reduce((sum, t) => sum + t.cashOnHand, 0);

  const activeTerminals = terminals.filter(t => t.status === 'ONLINE').length;
  
  // --- Top 10 Terminals Logic ---
  const terminalPerformance = useMemo(() => {
    return terminals.map(term => {
      const termVol = filteredTransactions
        .filter(t => t.terminalSn === term.sn && t.status === 'COMPLETED')
        .reduce((sum, t) => sum + t.amountCash, 0);
      return {
        name: term.atmId,
        sn: term.sn,
        volume: termVol,
        cashOnHand: term.cashOnHand
      };
    })
    .filter(t => t.volume > 0)
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 10);
  }, [terminals, filteredTransactions]);

  // --- State Breakdown Logic (Cash & Volume) ---
  const stateStats = useMemo(() => {
    return locations.reduce((acc, loc) => {
      if (!acc[loc.state]) {
        acc[loc.state] = { state: loc.state, totalVolume: 0, activeTerminals: 0, cashOnHand: 0 };
      }
      
      const locTerminals = terminals.filter(t => t.locationId === loc.id);
      acc[loc.state].activeTerminals += locTerminals.length;
      // Cash is real-time sum
      acc[loc.state].cashOnHand += locTerminals.reduce((sum, t) => sum + t.cashOnHand, 0);

      // Volume is based on filtered time period
      const locTxns = filteredTransactions.filter(t => {
        const term = terminals.find(term => term.sn === t.terminalSn);
        return term?.locationId === loc.id && t.status === 'COMPLETED';
      });
      acc[loc.state].totalVolume += locTxns.reduce((sum, t) => sum + t.amountCash, 0);

      return acc;
    }, {} as Record<string, StateSummary>);
  }, [locations, terminals, filteredTransactions]);
  
  const stateData = Object.values(stateStats) as StateSummary[];

  // --- Handlers ---
  const handleAiAnalysis = async () => {
    setIsLoadingAi(true);
    const topTermData = terminalPerformance[0];
    const topTerminal = terminals.find(t => t.sn === topTermData?.sn);
    const monthName = months.find(m => m.val === selectedMonth)?.label || 'All Months';
    const periodContext = `${monthName} ${selectedYear}`;
    
    const report = await generateStrategicReport(stateData, topTerminal, totalVolume, totalGrossProfit, periodContext);
    
    setAiReport(`**Strategic Analysis for ${periodContext}**\n\n` + report);
    setIsLoadingAi(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Executive Dashboard</h2>
          <p className="text-slate-500">Real-time cash positions and sales performance.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Filters */}
          <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
            <div className="px-3 flex items-center gap-2 text-slate-500 border-r border-slate-200">
               <Filter size={16} />
               <span className="text-sm font-medium">Date Range</span>
            </div>
            <select 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-sm font-semibold text-slate-700 outline-none cursor-pointer py-1.5 px-2 hover:bg-slate-50 rounded"
            >
              {months.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
            </select>
            <select 
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent text-sm font-semibold text-slate-700 outline-none cursor-pointer py-1.5 px-2 hover:bg-slate-50 rounded"
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <button 
            onClick={handleAiAnalysis}
            disabled={isLoadingAi}
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {isLoadingAi ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <Sparkles size={18} />
            )}
            <span>{isLoadingAi ? "Analyzing..." : "AI Insight"}</span>
          </button>
        </div>
      </div>

      {/* AI Report Section */}
      {aiReport && (
        <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 p-6 rounded-xl shadow-sm relative overflow-hidden animate-fade-in">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Sparkles size={100} className="text-indigo-600" />
          </div>
          <h3 className="text-lg font-semibold text-indigo-900 mb-2 flex items-center gap-2">
            <Sparkles size={16} className="text-indigo-600" />
            Gemini Strategic Analysis
          </h3>
          <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-line">
            {aiReport}
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* 1. Real-time BTC Price */}
        <div className="bg-slate-900 p-6 rounded-xl shadow-lg border border-slate-800 text-white relative overflow-hidden">
           <div className="absolute right-0 top-0 p-6 opacity-10">
              <Bitcoin size={64} />
           </div>
           <div className="flex items-center gap-2 mb-2 text-slate-400">
              <Activity size={18} />
              <span className="text-sm font-medium">Bitcoin Price (Coinbase)</span>
           </div>
           <div className="text-3xl font-bold flex items-baseline gap-2">
              {btcPrice ? `$${btcPrice}` : <span className="text-lg text-slate-500">Loading...</span>}
           </div>
           <div className="text-xs text-slate-500 mt-2 flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div> Live Feed
           </div>
        </div>

        {/* 2. Network Cash Available */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
             <h4 className="text-sm font-medium text-slate-500">Total Network Cash</h4>
             <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <Wallet size={20} />
             </div>
          </div>
          <div>
            <span className="text-3xl font-bold text-slate-800">${totalCashAvailable.toLocaleString()}</span>
            <div className="flex items-center mt-1 text-sm text-slate-500">
               Across {activeTerminals} active terminals
            </div>
          </div>
        </div>

        {/* 3. Total Sales (Period) */}
        <KPICard 
          title="Total Sales (Selected Period)" 
          value={`$${totalVolume.toLocaleString()}`} 
          trend="Completed Revenue" 
          icon={DollarSign} 
          color="blue"
        />

        {/* 4. Pending Sales */}
        <KPICard 
          title="Pending / Incomplete Sales" 
          value={`$${totalPendingVolume.toLocaleString()}`} 
          trend="Initiated but not completed" 
          icon={AlertCircle} 
          color="amber"
        />

        {/* 5. Average Transaction */}
        <KPICard 
          title="Avg Transaction Value" 
          value={`$${avgTransactionValue.toFixed(2)}`} 
          trend={`${completedTx.length} Transactions`} 
          icon={TrendingUp} 
          color="violet"
        />

        {/* 6. Active ATMs */}
        <KPICard 
          title="Active ATMs" 
          value={`${activeTerminals} / ${terminals.length}`} 
          trend={`${((activeTerminals/terminals.length)*100).toFixed(0)}% Uptime`} 
          icon={Activity} 
          color="emerald"
        />
      </div>

      {/* Main Charts & Map Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* US Heatmap - Takes 2 columns */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Map size={20} className="text-slate-400" />
                Performance Heatmap ({selectedYear} {months.find(m => m.val === selectedMonth)?.label})
            </h3>
            <div className="flex-1 min-h-[300px]">
                <USAMap data={stateData} />
            </div>
        </div>

        {/* State Breakdown Table - Takes 1 column */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Cash & Sales by State</h3>
          <div className="space-y-4 max-h-[350px] overflow-y-auto custom-scrollbar pr-2">
            {stateData.sort((a,b) => b.cashOnHand - a.cashOnHand).map((state) => (
              <div key={state.state} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-700 font-bold rounded-full text-xs shadow-sm">
                    {state.state}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">{state.activeTerminals} ATMs</span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                   <div>
                      <p className="text-[10px] uppercase text-slate-400 font-bold">Cash Available</p>
                      <p className="font-mono font-bold text-emerald-600">${state.cashOnHand.toLocaleString()}</p>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] uppercase text-slate-400 font-bold">Sales Vol</p>
                      <p className="font-mono font-bold text-slate-700">${state.totalVolume.toLocaleString()}</p>
                   </div>
                </div>
              </div>
            ))}
            {stateData.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                    No data available.
                </div>
            )}
          </div>
        </div>

        {/* Top 10 Terminals - Full Width Row */}
        <div className="lg:col-span-3 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Top 10 Performing ATMs (Volume)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              {terminalPerformance.length > 0 ? (
                <BarChart data={terminalPerformance} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{fontSize: 12}} />
                  <YAxis tickFormatter={(val) => `$${val/1000}k`} />
                  <Tooltip 
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Volume']}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="volume" radius={[4, 4, 0, 0]}>
                    {terminalPerformance.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index < 3 ? '#3b82f6' : '#94a3b8'} />
                    ))}
                  </Bar>
                </BarChart>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400">
                    No performance data available for selected filters.
                </div>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

const KPICard = ({ title, value, trend, icon: Icon, color }: any) => {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    violet: 'bg-violet-50 text-violet-600',
    amber: 'bg-amber-50 text-amber-600',
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-medium text-slate-500">{title}</h4>
        <div className={`p-2 rounded-lg ${colors[color]}`}>
          <Icon size={20} />
        </div>
      </div>
      <div>
        <span className="text-2xl font-bold text-slate-800">{value}</span>
        <div className="flex items-center mt-1 text-sm">
          <span className={trend.includes('No Data') || trend.includes('Failed') || trend.includes('Incomplete') ? 'text-amber-500' : 'text-emerald-500'}>
            {trend}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;