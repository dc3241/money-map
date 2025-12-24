import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Calendar from './components/Calendar';
import SummaryBar from './components/SummaryBar';
import Recurring from './components/Recurring';
import Reporting from './components/Reporting';
import Accounts from './components/Accounts';
import Budgets from './components/Budgets';
import SavingsGoals from './components/SavingsGoals';
import DebtTracking from './components/DebtTracking';
import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { useBudgetStore } from './store/useBudgetStore';
import { useAuthStore } from './store/useAuthStore';

function Dashboard() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<'dashboard' | 'recurring' | 'reporting' | 'accounts' | 'budgets' | 'goals' | 'debt'>('dashboard');
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
      ) : currentView === 'budgets' ? (
        <Budgets />
      ) : currentView === 'goals' ? (
        <SavingsGoals />
      ) : currentView === 'debt' ? (
        <DebtTracking />
      ) : (
        <Reporting />
      )}
    </div>
  );
}

function App() {
  const { user, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

