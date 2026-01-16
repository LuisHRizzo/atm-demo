import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import CashLogistics from './components/CashLogistics';
import SalesPerformance from './components/SalesPerformance';
import Accounting from './components/Accounting';
import DataIngest from './components/DataIngest';
import { fetchData } from './services/apiService';
import { Terminal, Transaction, Location } from './types';
import { generateLocations, generateTerminals, generateTransactions } from './services/mockData';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  
  const [locations, setLocations] = useState<Location[]>([]);
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbConnected, setDbConnected] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const data = await fetchData();
    if (data) {
      setLocations(data.locations);
      setTerminals(data.terminals);
      setTransactions(data.transactions);
      setDbConnected(true);
    } else {
      console.warn("Could not connect to API. Falling back to Mock Data.");
      setDbConnected(false);
      // Fallback
      const locs = generateLocations();
      const terms = generateTerminals(locs);
      const txs = generateTransactions(terms, 100);
      setLocations(locs);
      setTerminals(terms);
      setTransactions(txs);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center gap-4">
             <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
             <p className="text-slate-500">Connecting to Database...</p>
          </div>
        </div>
      );
    }

    switch (currentView) {
      case 'dashboard':
        return <Dashboard terminals={terminals} transactions={transactions} locations={locations} />;
      case 'logistics':
        return <CashLogistics terminals={terminals} locations={locations} />;
      case 'sales':
        return <SalesPerformance transactions={transactions} />;
      case 'accounting':
        return <Accounting transactions={transactions} locations={locations} terminals={terminals} />;
      case 'ingest':
        return <DataIngest onDataLoaded={loadData} />;
      default:
        return <Dashboard terminals={terminals} transactions={transactions} locations={locations} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
      
      <main className="ml-64 flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-8 gap-4">
          <div>
             {!dbConnected && (
               <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold border border-orange-200">
                 Running in Demo Mode (Mock Data)
               </span>
             )}
             {dbConnected && (
               <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-200">
                 Connected to MySQL
               </span>
             )}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-bold text-slate-800">Admin User</p>
              <p className="text-xs text-slate-500">ATM Ops Manager</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold border-2 border-white shadow-sm">
              AU
            </div>
          </div>
        </header>

        <div className="animate-in fade-in duration-500">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;