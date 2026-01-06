import React from 'react';

interface BottomNavigationProps {
  currentView: 'dashboard' | 'recurring' | 'reporting' | 'accounts' | 'budgets' | 'goals' | 'debt' | 'profile';
  onViewChange: (view: 'dashboard' | 'recurring' | 'reporting' | 'accounts' | 'budgets' | 'goals' | 'debt' | 'profile') => void;
  onMoreMenuToggle: () => void;
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({ currentView, onViewChange, onMoreMenuToggle }) => {
  const primaryViews: Array<{
    id: 'dashboard' | 'accounts' | 'budgets' | 'goals';
    label: string;
    icon: React.ReactNode;
  }> = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: 'accounts',
      label: 'Accounts',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
    },
    {
      id: 'budgets',
      label: 'Budgets',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      id: 'goals',
      label: 'Goals',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      ),
    },
  ];

  // Check if current view is in the "More" menu (secondary views)
  const isMoreMenuActive = ['recurring', 'reporting', 'debt', 'profile'].includes(currentView);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {primaryViews.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`relative flex flex-col items-center justify-center flex-1 h-full px-2 transition-colors ${
                isActive
                  ? 'text-emerald-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              aria-label={item.label}
            >
              <div className={`mb-1 ${isActive ? 'text-emerald-600' : ''}`}>
                {item.icon}
              </div>
              <span className={`text-xs font-medium ${isActive ? 'text-emerald-600' : 'text-gray-600'}`}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-emerald-600 rounded-t-full" />
              )}
            </button>
          );
        })}
        
        {/* More Menu Button */}
        <button
          onClick={onMoreMenuToggle}
          className={`relative flex flex-col items-center justify-center flex-1 h-full px-2 transition-colors ${
            isMoreMenuActive
              ? 'text-emerald-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          aria-label="More"
        >
          <div className={`mb-1 ${isMoreMenuActive ? 'text-emerald-600' : ''}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </div>
          <span className={`text-xs font-medium ${isMoreMenuActive ? 'text-emerald-600' : 'text-gray-600'}`}>
            More
          </span>
          {isMoreMenuActive && (
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-emerald-600 rounded-t-full" />
          )}
        </button>
      </div>
    </nav>
  );
};

export default BottomNavigation;

