import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Calendar from './components/Calendar';
import SummaryBar from './components/SummaryBar';
import Recurring from './components/Recurring';
import Reporting from './components/Reporting';
import Accounts from './components/Accounts';
import { useBudgetStore } from './store/useBudgetStore';

function App() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<'dashboard' | 'recurring' | 'reporting' | 'accounts'>('dashboard');
  const [calendarViewType, setCalendarViewType] = useState<'weekly' | 'monthly'>('weekly'); // Default to weekly
  const populateRecurringForMonth = useBudgetStore((state) => state.populateRecurringForMonth);

  // Auto-populate recurring items when viewing a month
  useEffect(() => {
    if (currentView === 'dashboard') {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1; // getMonth() returns 0-11
      populateRecurringForMonth(year, month);
    }
  }, [currentDate, currentView, populateRecurringForMonth]);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Sidebar */}
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />

      {/* Main Content Area */}
      {currentView === 'dashboard' ? (
        <div className="flex-1 flex flex-col h-full">
          {/* Calendar Area (90% height) */}
          <div className="flex-[9] min-h-0">
            <Calendar 
              currentDate={currentDate} 
              onDateChange={setCurrentDate}
              viewType={calendarViewType}
              onViewTypeChange={setCalendarViewType}
            />
          </div>

          {/* Summary Bar (10% height) */}
          <div className="flex-[1] min-h-0">
            <SummaryBar currentDate={currentDate} />
          </div>
        </div>
      ) : currentView === 'recurring' ? (
        <Recurring />
      ) : currentView === 'accounts' ? (
        <Accounts />
      ) : (
        <Reporting />
      )}
    </div>
  );
}

export default App;

