import React from 'react';
import { useAuthStore } from '../store/useAuthStore';

interface SidebarProps {
  currentView: 'dashboard' | 'recurring' | 'reporting' | 'accounts' | 'budgets' | 'goals' | 'debt';
  onViewChange: (view: 'dashboard' | 'recurring' | 'reporting' | 'accounts' | 'budgets' | 'goals' | 'debt') => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange }) => {
  const { logout, user } = useAuthStore();

  return (
    <div className="w-16 bg-slate-900 text-slate-100 h-full flex flex-col items-center py-4 shadow-lg relative group">
      <div className="mb-6">
        <svg width="40" height="40" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10">
          {/* Money Map Logo - Slate + Emerald */}
          <rect width="120" height="120" fill="#334155" rx="20"/>
          <g transform="translate(30, 30)">
            <rect x="0" y="0" width="18" height="18" fill="rgba(16, 185, 129, 0.2)" rx="2"/>
            <rect x="21" y="0" width="18" height="18" fill="#10B981" rx="2"/>
            <rect x="42" y="0" width="18" height="18" fill="rgba(16, 185, 129, 0.2)" rx="2"/>
            <rect x="0" y="21" width="18" height="18" fill="#10B981" rx="2"/>
            <rect x="21" y="21" width="18" height="18" fill="rgba(16, 185, 129, 0.2)" rx="2"/>
            <rect x="42" y="21" width="18" height="18" fill="#10B981" rx="2"/>
            <rect x="0" y="42" width="18" height="18" fill="#10B981" rx="2"/>
            <rect x="21" y="42" width="18" height="18" fill="rgba(16, 185, 129, 0.2)" rx="2"/>
            <rect x="42" y="42" width="18" height="18" fill="#10B981" rx="2"/>
          </g>
        </svg>
      </div>
      <nav className="flex flex-col space-y-3 w-full px-2">
        <button
          onClick={() => onViewChange('dashboard')}
          className={`relative px-3 py-3 rounded-lg transition-all duration-200 flex items-center justify-center group/button ${
            currentView === 'dashboard'
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          {/* Calendar Icon */}
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          
          {/* Tooltip */}
          <span className="absolute left-full ml-3 px-3 py-1.5 bg-slate-800 text-white text-sm rounded-lg whitespace-nowrap opacity-0 group-hover/button:opacity-100 pointer-events-none transition-all duration-200 transform translate-x-[-8px] group-hover/button:translate-x-0 z-50 shadow-lg">
            Dashboard
            <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-800"></span>
          </span>
        </button>
        
        <button
          onClick={() => onViewChange('recurring')}
          className={`relative px-3 py-3 rounded-lg transition-all duration-200 flex items-center justify-center group/button ${
            currentView === 'recurring'
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          {/* Recurring/Repeat Icon */}
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          
          {/* Tooltip */}
          <span className="absolute left-full ml-3 px-3 py-1.5 bg-slate-800 text-white text-sm rounded-lg whitespace-nowrap opacity-0 group-hover/button:opacity-100 pointer-events-none transition-all duration-200 transform translate-x-[-8px] group-hover/button:translate-x-0 z-50 shadow-lg">
            Recurring
            <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-800"></span>
          </span>
        </button>
        
        <button
          onClick={() => onViewChange('accounts')}
          className={`relative px-3 py-3 rounded-lg transition-all duration-200 flex items-center justify-center group/button ${
            currentView === 'accounts'
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          {/* Wallet/Account Icon */}
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
            />
          </svg>
          
          {/* Tooltip */}
          <span className="absolute left-full ml-3 px-3 py-1.5 bg-slate-800 text-white text-sm rounded-lg whitespace-nowrap opacity-0 group-hover/button:opacity-100 pointer-events-none transition-all duration-200 transform translate-x-[-8px] group-hover/button:translate-x-0 z-50 shadow-lg">
            Accounts
            <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-800"></span>
          </span>
        </button>
        
        <button
          onClick={() => onViewChange('budgets')}
          className={`relative px-3 py-3 rounded-lg transition-all duration-200 flex items-center justify-center group/button ${
            currentView === 'budgets'
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span className="absolute left-full ml-3 px-3 py-1.5 bg-slate-800 text-white text-sm rounded-lg whitespace-nowrap opacity-0 group-hover/button:opacity-100 pointer-events-none transition-all duration-200 transform translate-x-[-8px] group-hover/button:translate-x-0 z-50 shadow-lg">
            Budgets
            <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-800"></span>
          </span>
        </button>
        
        <button
          onClick={() => onViewChange('goals')}
          className={`relative px-3 py-3 rounded-lg transition-all duration-200 flex items-center justify-center group/button ${
            currentView === 'goals'
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
          <span className="absolute left-full ml-3 px-3 py-1.5 bg-slate-800 text-white text-sm rounded-lg whitespace-nowrap opacity-0 group-hover/button:opacity-100 pointer-events-none transition-all duration-200 transform translate-x-[-8px] group-hover/button:translate-x-0 z-50 shadow-lg">
            Goals
            <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-800"></span>
          </span>
        </button>
        
        <button
          onClick={() => onViewChange('debt')}
          className={`relative px-3 py-3 rounded-lg transition-all duration-200 flex items-center justify-center group/button ${
            currentView === 'debt'
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="absolute left-full ml-3 px-3 py-1.5 bg-slate-800 text-white text-sm rounded-lg whitespace-nowrap opacity-0 group-hover/button:opacity-100 pointer-events-none transition-all duration-200 transform translate-x-[-8px] group-hover/button:translate-x-0 z-50 shadow-lg">
            Debt
            <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-800"></span>
          </span>
        </button>
        
        <button
          onClick={() => onViewChange('reporting')}
          className={`relative px-3 py-3 rounded-lg transition-all duration-200 flex items-center justify-center group/button ${
            currentView === 'reporting'
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
        >
          {/* Chart/Report Icon */}
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          
          {/* Tooltip */}
          <span className="absolute left-full ml-3 px-3 py-1.5 bg-slate-800 text-white text-sm rounded-lg whitespace-nowrap opacity-0 group-hover/button:opacity-100 pointer-events-none transition-all duration-200 transform translate-x-[-8px] group-hover/button:translate-x-0 z-50 shadow-lg">
            Reports
            <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-800"></span>
          </span>
        </button>
      </nav>
      
      {/* Logout Button */}
      <div className="mt-auto w-full px-2">
        <button
          onClick={logout}
          className="w-full px-3 py-3 rounded-lg transition-all duration-200 flex items-center justify-center group/button text-slate-300 hover:bg-red-900/20 hover:text-red-400"
          title={user?.email || 'Logout'}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          
          {/* Tooltip */}
          <span className="absolute left-full ml-3 px-3 py-1.5 bg-slate-800 text-white text-sm rounded-lg whitespace-nowrap opacity-0 group-hover/button:opacity-100 pointer-events-none transition-all duration-200 transform translate-x-[-8px] group-hover/button:translate-x-0 z-50 shadow-lg">
            Logout
            <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-800"></span>
          </span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;

