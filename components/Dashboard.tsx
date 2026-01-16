import React, { useState, useMemo } from 'react';
import { Terminal, Transaction, Location, StateSummary } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { DollarSign, Activity, AlertCircle, Sparkles, Map, Filter } from 'lucide-react';
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

  // --- Filter State ---
  const now = new Date();
  const currentYear = now.getFullYear().toString();
  const currentQuarter = `Q${Math.ceil((now.getMonth() + 1) / 3)}`;

  const [selectedYear, setSelectedYear] = useState<string>(currentYear);
  const [selectedQuarter, setSelectedQuarter] = useState<string>(currentQuarter);

  // Generate Year Options (Current - 2 years)
  const years = [currentYear, (parseInt(currentYear) - 1).toString(), (parseInt(currentYear) - 2).toString()];
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4', 'ALL'];

  // --- Filtering Logic ---
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const date = new Date(t.timestamp);
      const txYear = date.getFullYear().toString();
      const txQuarter = `Q${Math.ceil((date.getMonth() + 1) / 3)}`;

      if (txYear !== selectedYear) return false;
      if (selectedQuarter !== 'ALL' && txQuarter !== selectedQuarter) return false;
      
      return true;
    });
  }, [transactions, selectedYear, selectedQuarter]);

  // --- Calculations based on Filtered Data ---
  const totalVolume = filteredTransactions
    .filter(t => t.status === 'COMPLETED')
    .reduce((sum, t) => sum + t.amountCash, 0);

  const totalGrossProfit = filteredTransactions
    .filter(t => t.status === 'COMPLETED')
    .reduce((sum, t) => sum + t.grossProfit, 0);

  const activeTerminals = terminals.filter(t => t.status === 'ONLINE').length;
  
  // Top 10 Terminals Logic (Filtered)
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
    .filter(t => t.volume > 0) // Only show active terminals for this period
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 10);
  }, [terminals, filteredTransactions]);

  // State Breakdown Logic (Filtered)
  const stateStats = useMemo(() => {
    return locations.reduce((acc, loc) => {
      if (!acc[loc.state]) {
        acc[loc.state] = { state: loc.state, totalVolume: 0, activeTerminals: 0, cashOnHand: 0 };
      }
      
      // Terminals are static assets, so we count them if they exist in location
      // But we could filter activeTerminals based on if they had transactions too. 
      // For now, keeping static count for "presence", but cash/volume is dynamic.
      const locTerminals = terminals.filter(t => t.locationId === loc.id);
      acc[loc.state].activeTerminals += locTerminals.length;
      acc[loc.state].cashOnHand += locTerminals.reduce((sum, t) => sum + t.cashOnHand, 0);

      // Filter transactions for this location AND time period
      const locTxns = filteredTransactions.filter(t => {
        const term = terminals.find(term => term.sn === t.terminalSn);
        return term?.locationId === loc.id && t.status === 'COMPLETED';
      });
      acc[loc.state].totalVolume += locTxns.reduce((sum, t) => sum + t.amountCash, 0);

      return acc;
    }, {} as Record<string, StateSummary>);
  }, [locations, terminals, filteredTransactions]);
  
  const stateData = Object.values(stateStats);

  // --- Handlers ---
  const handleAiAnalysis = async () => {
    setIsLoadingAi(true);
    const topTermData = terminalPerformance[0];
    const topTerminal = terminals.find(t => t.sn === topTermData?.sn);

    // Pass the period context to the AI
    const periodContext = `${selectedYear} ${selectedQuarter === 'ALL' ? 'Full Year' : selectedQuarter}`;
    
    // Now passing periodContext correctly to the service
    const report = await generateStrategicReport(stateData, topTerminal, totalVolume, totalGrossProfit, periodContext);
    
    // We add a header for clarity in the UI
    setAiReport(`**Strategic Analysis for ${periodContext}**\n\n` + report);
    setIsLoadingAi(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Executive Dashboard</h2>
          <p className="text-slate-500">Network performance metrics and strategic overview.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Filters */}
          <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
            <div className="px-3 flex items-center gap-2 text-slate-500 border-r border-slate-200">
               <Filter size={16} />
               <span className="text-sm font-medium">Period</span>
            </div>
            <select 
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent text-sm font-semibold text-slate-700 outline-none cursor-pointer py-1.5 px-2 hover:bg-slate-50 rounded"
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select 
              value={selectedQuarter}
              onChange={(e) => setSelectedQuarter(e.target.value)}
              className="bg-transparent text-sm font-semibold text-slate-700 outline-none cursor-pointer py-1.5 px-2 hover:bg-slate-50 rounded"
            >
              {quarters.map(q => <option key={q} value={q}>{q}</option>)}
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
            <span>{isLoadingAi ? "Analyzing..." : "AI Strategic Report"}</span>
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard 
          title={`Total Volume (${selectedQuarter})`} 
          value={`$${totalVolume.toLocaleString()}`} 
          trend={totalVolume > 0 ? "Data Loaded" : "No Data"} 
          icon={DollarSign} 
          color="blue"
        />
        <KPICard 
          title="Gross Profit" 
          value={`$${totalGrossProfit.toLocaleString()}`} 
          trend={`${((totalGrossProfit / (totalVolume || 1)) * 100).toFixed(1)}% Margin`} 
          icon={Activity} 
          color="emerald"
        />
        <KPICard 
          title="Active Terminals" 
          value={`${activeTerminals} / ${terminals.length}`} 
          trend="Real-time Status" 
          icon={Activity} 
          color="violet"
        />
        <KPICard 
          title="Period Alerts" 
          value={filteredTransactions.filter(t => t.status === 'ERROR' || t.status === 'CANCELLED').length.toString()}
          trend="Failed / Cancelled" 
          icon={AlertCircle} 
          color="amber"
        />
      </div>

      {/* Main Charts & Map Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* US Heatmap - Takes 2 columns */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Map size={20} className="text-slate-400" />
                Geographic Performance Heatmap ({selectedYear} {selectedQuarter})
            </h3>
            <div className="flex-1 min-h-[300px]">
                <USAMap data={stateData} />
            </div>
        </div>

        {/* State Breakdown Table - Takes 1 column */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Volume by State</h3>
          <div className="space-y-4 max-h-[350px] overflow-y-auto custom-scrollbar pr-2">
            {stateData.sort((a,b) => b.totalVolume - a.totalVolume).map((state) => (
              <div key={state.state} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-700 font-bold rounded-full text-xs shadow-sm">
                    {state.state}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-900">Total Volume</p>
                    <p className="text-xs text-slate-500">{state.activeTerminals} ATMs</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-800">${state.totalVolume.toLocaleString()}</p>
                  <div className="w-16 h-1.5 bg-slate-200 rounded-full mt-1 ml-auto overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full" 
                        style={{ width: `${Math.min((state.totalVolume / (stateData[0]?.totalVolume || 1)) * 100, 100)}%` }}
                      ></div>
                  </div>
                </div>
              </div>
            ))}
            {stateData.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                    No transaction data for this period.
                </div>
            )}
          </div>
        </div>

        {/* Top 10 Terminals - Full Width Row */}
        <div className="lg:col-span-3 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Top Performing ATMs ({selectedYear} {selectedQuarter})</h3>
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
                    {terminalPerformance.map((_, index) => (
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
          <span className={trend.includes('No Data') || trend.includes('Failed') ? 'text-amber-500' : 'text-emerald-500'}>
            {trend}
          </span>
          {/* <span className="text-slate-400 ml-1">vs last period</span> */}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;