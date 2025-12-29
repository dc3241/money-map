import { useState, useEffect, lazy, Suspense, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import SummaryBar from './components/SummaryBar';
import ProtectedRoute from './components/ProtectedRoute';
import { useBudgetStore } from './store/useBudgetStore';
import { useAuthStore } from './store/useAuthStore';
import { useWalkthroughStore } from './store/useWalkthroughStore';
import { useWalkthroughAutoComplete } from './hooks/useWalkthroughAutoComplete';

// Lazy load components that aren't immediately needed
const Calendar = lazy(() => import('./components/Calendar'));
const Recurring = lazy(() => import('./components/Recurring'));
const Reporting = lazy(() => import('./components/Reporting'));
const Accounts = lazy(() => import('./components/Accounts'));
const Budgets = lazy(() => import('./components/Budgets'));
const SavingsGoals = lazy(() => import('./components/SavingsGoals'));
const DebtTracking = lazy(() => import('./components/DebtTracking'));
const Login = lazy(() => import('./components/Login'));
const Home = lazy(() => import('./components/Home'));
const Walkthrough = lazy(() => import('./components/Walkthrough'));
const Profile = lazy(() => import('./components/Profile'));

// Loading component
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-gray-600">Loading...</div>
  </div>
);

function Dashboard() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<'dashboard' | 'recurring' | 'reporting' | 'accounts' | 'budgets' | 'goals' | 'debt' | 'profile'>('dashboard');
  const [calendarViewType, setCalendarViewType] = useState<'weekly' | 'monthly'>('weekly'); // Default to weekly
  const populateRecurringForMonth = useBudgetStore((state) => state.populateRecurringForMonth);
  const cleanupPastRecurringTransactions = useBudgetStore((state) => state.cleanupPastRecurringTransactions);
  const { user } = useAuthStore();
  const { initializeWalkthrough, isCompleted, isLoading } = useWalkthroughStore();
  const hasInitialized = useRef(false);

  // Initialize walkthrough when user is loaded (only once per session)
  useEffect(() => {
    if (user && !hasInitialized.current) {
      hasInitialized.current = true;
      initializeWalkthrough();
    }
  }, [user]); // Removed initializeWalkthrough from deps to prevent re-runs

  // Cleanup past recurring transactions once when user loads
  useEffect(() => {
    if (user) {
      const removedCount = cleanupPastRecurringTransactions();
      if (removedCount > 0) {
        console.log(`Cleaned up ${removedCount} past recurring transactions`);
      }
    }
  }, [user, cleanupPastRecurringTransactions]);

  // Auto-complete tasks based on user actions
  useWalkthroughAutoComplete();

  // Auto-populate recurring items when viewing a month
  useEffect(() => {
    if (currentView === 'dashboard') {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1; // getMonth() returns 0-11
      populateRecurringForMonth(year, month);
    }
  }, [currentDate, currentView, populateRecurringForMonth]);

  return (
    <div className="flex h-screen bg-gray-50 relative">
      {/* Left Sidebar */}
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />

      {/* Main Content Area */}
      <Suspense fallback={<LoadingSpinner />}>
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
        ) : currentView === 'profile' ? (
          <Profile />
        ) : (
          <Reporting />
        )}
      </Suspense>

      {/* Walkthrough Overlay */}
      {!isCompleted && !isLoading && (
        <Suspense fallback={null}>
          <Walkthrough currentView={currentView} onNavigate={setCurrentView} />
        </Suspense>
      )}
    </div>
  );
}

function App() {
  const { user, loading } = useAuthStore();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/" 
          element={
            <Suspense fallback={<LoadingSpinner />}>
              <Home />
            </Suspense>
          } 
        />
        <Route 
          path="/login" 
          element={
            user ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Suspense fallback={<LoadingSpinner />}>
                <Login />
              </Suspense>
            )
          } 
        />
        <Route
          path="/dashboard"
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

