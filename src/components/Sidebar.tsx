import React from 'react';

interface SidebarProps {
  currentView: 'dashboard' | 'recurring' | 'reporting' | 'accounts';
  onViewChange: (view: 'dashboard' | 'recurring' | 'reporting' | 'accounts') => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange }) => {
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
    </div>
  );
};

export default Sidebar;

