import React, { useState } from 'react';
import { Terminal, Location } from '../types';
import { MapPin, AlertTriangle, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

interface CashLogisticsProps {
  terminals: Terminal[];
  locations: Location[];
}

const CashLogistics: React.FC<CashLogisticsProps> = ({ terminals, locations }) => {
  const [filterState, setFilterState] = useState<string>('ALL');

  // Enrich terminal data with location info
  const enrichedTerminals = terminals.map(term => {
    const loc = locations.find(l => l.id === term.locationId);
    return { ...term, location: loc };
  });

  const filteredTerminals = filterState === 'ALL' 
    ? enrichedTerminals 
    : enrichedTerminals.filter(t => t.location?.state === filterState);

  // States list for filter
  const states = Array.from(new Set(locations.map(l => l.state))).sort();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Cash Logistics</h2>
          <p className="text-slate-500">Monitor cash levels and replenishment needs.</p>
        </div>
        
        <div className="flex gap-2">
          <select 
            className="bg-white border border-slate-300 text-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
            value={filterState}
            onChange={(e) => setFilterState(e.target.value)}
          >
            <option value="ALL">All States</option>
            {states.map(state => <option key={state} value={state}>{state}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                <th className="p-4 font-semibold">Terminal</th>
                <th className="p-4 font-semibold">Location</th>
                <th className="p-4 font-semibold">State</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Cash on Hand</th>
                <th className="p-4 font-semibold text-center">Health</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTerminals.map((term) => {
                const isLowCash = term.cashOnHand < 3000;
                const isOffline = term.status !== 'ONLINE';
                
                return (
                  <tr key={term.sn} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="font-medium text-slate-900">{term.atmId}</div>
                      <div className="text-xs text-slate-500">{term.sn}</div>
                    </td>
                    <td className="p-4 text-slate-700">{term.location?.city}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-slate-100 rounded text-xs font-semibold text-slate-600">
                        {term.location?.state}
                      </span>
                    </td>
                    <td className="p-4">
                       <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                         term.status === 'ONLINE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                       }`}>
                         <span className={`w-1.5 h-1.5 rounded-full ${term.status === 'ONLINE' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                         {term.status}
                       </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="font-bold text-slate-800">${term.cashOnHand.toLocaleString()}</div>
                      {isLowCash && <div className="text-xs text-red-500 font-medium mt-0.5">Low Balance</div>}
                    </td>
                    <td className="p-4 text-center">
                      {(isLowCash || isOffline) ? (
                        <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-50 text-red-500">
                          <AlertTriangle size={16} />
                        </div>
                      ) : (
                        <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-50 text-green-500">
                          <MapPin size={16} />
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Visual representation of flow (Placeholder for map) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200">
             <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <ArrowDownLeft className="text-emerald-500" /> Recent Replenishments
             </h3>
             <ul className="space-y-3">
                <li className="flex justify-between text-sm">
                    <span className="text-slate-600">Miami Merchant Store</span>
                    <span className="font-medium text-emerald-600">+$15,000</span>
                </li>
                <li className="flex justify-between text-sm">
                    <span className="text-slate-600">Atlanta Hub 1</span>
                    <span className="font-medium text-emerald-600">+$8,500</span>
                </li>
             </ul>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200">
             <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <ArrowUpRight className="text-blue-500" /> Pending Pickups (Full Cassettes)
             </h3>
             <ul className="space-y-3">
                <li className="flex justify-between text-sm">
                    <span className="text-slate-600">Houston Central</span>
                    <span className="font-medium text-blue-600">$42,100 (95% Full)</span>
                </li>
             </ul>
          </div>
      </div>
    </div>
  );
};

export default CashLogistics;