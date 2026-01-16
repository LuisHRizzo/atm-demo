import React from 'react';
import { LayoutDashboard, Truck, TrendingUp, FileText, Upload, Settings, LogOut } from 'lucide-react';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'logistics', label: 'Cash Logistics', icon: Truck },
    { id: 'sales', label: 'Sales & Performance', icon: TrendingUp },
    { id: 'accounting', label: 'Accounting & Rent', icon: FileText },
    { id: 'ingest', label: 'Data Import', icon: Upload },
  ];

  return (
    <div className="w-64 bg-slate-900 text-white flex flex-col h-screen fixed left-0 top-0 shadow-xl z-50">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-400">
          ATM Sphere
        </h1>
        <p className="text-xs text-slate-400 mt-1">Network Manager v1.0</p>
      </div>

      <nav className="flex-1 py-6 px-3 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setCurrentView(item.id)}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
              currentView === item.id
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <item.icon size={20} />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button className="flex items-center space-x-3 text-slate-400 hover:text-white w-full px-4 py-2 hover:bg-slate-800 rounded-lg transition-colors">
          <Settings size={18} />
          <span>Settings</span>
        </button>
        <button className="flex items-center space-x-3 text-red-400 hover:text-red-300 w-full px-4 py-2 mt-2 hover:bg-red-900/20 rounded-lg transition-colors">
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;