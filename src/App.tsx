import { useState, useEffect, lazy, Suspense, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import BottomNavigation from './components/BottomNavigation';
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const populateRecurringForMonth = useBudgetStore((state) => state.populateRecurringForMonth);
  const cleanupPastRecurringTransactions = useBudgetStore((state) => state.cleanupPastRecurringTransactions);
  const initializeBudgetData = useBudgetStore((state) => state.initializeBudgetData);
  const { user } = useAuthStore();
  const { initializeWalkthrough, isCompleted, isLoading } = useWalkthroughStore();
  const hasInitialized = useRef(false);
  const budgetInitialized = useRef(false);

  // Reset initialization flag when user logs out
  useEffect(() => {
    if (!user) {
      budgetInitialized.current = false;
      hasInitialized.current = false;
      useBudgetStore.setState({ isInitialized: false });
      // Reset walkthrough store state on logout - initializeWalkthrough will load from Firestore for new user
      useWalkthroughStore.setState({ 
        isCompleted: false, 
        isLoading: true
      });
    }
  }, [user]);

  // Initialize budget data when user is loaded (only once per session)
  useEffect(() => {
    if (user && !budgetInitialized.current) {
      budgetInitialized.current = true;
      initializeBudgetData();
    }
  }, [user, initializeBudgetData]);

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

  // Auto-populate recurring items for current month on app load/initialization
  // This ensures transactions are created when the day changes or app is opened
  useEffect(() => {
    if (user) {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1; // getMonth() returns 0-11
      populateRecurringForMonth(year, month);
    }
  }, [user, populateRecurringForMonth]);

  // Auto-populate recurring items when viewing a month
  useEffect(() => {
    if (currentView === 'dashboard') {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1; // getMonth() returns 0-11
      populateRecurringForMonth(year, month);
    }
  }, [currentDate, currentView, populateRecurringForMonth]);

  // Force weekly view on mobile when component mounts or screen size changes
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768 && calendarViewType === 'monthly') {
        setCalendarViewType('weekly');
      }
    };
    
    handleResize(); // Check on mount
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [calendarViewType]);

  const handleViewChange = (view: typeof currentView) => {
    setCurrentView(view);
    // Close mobile menu when a view is selected
    if (isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 relative overflow-x-hidden">
      {/* Left Sidebar */}
      <Sidebar 
        currentView={currentView} 
        onViewChange={handleViewChange}
        isMobileMenuOpen={isMobileMenuOpen}
        onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      {/* Main Content Area */}
      <Suspense fallback={<LoadingSpinner />}>
        {currentView === 'dashboard' ? (
          <div className="flex-1 flex flex-col h-full md:ml-0 pb-16 md:pb-0" ref={(el) => {
            // #region agent log
            if (el) {
              setTimeout(() => {
                const rect = el.getBoundingClientRect();
                const logData = {location:'App.tsx:133',message:'Dashboard container dimensions',data:{dashboardWidth:rect.width,dashboardLeft:rect.left,dashboardRight:rect.right,viewportWidth:window.innerWidth},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'};
                console.log('DEBUG:', logData);
                fetch('http://127.0.0.1:7242/ingest/9a5fadb7-ed49-408b-9ad5-e9f09e1cac2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData)}).catch((e) => console.error('Log fetch failed:', e));
              }, 100);
            }
            // #endregion
          }}>
            {/* Calendar Area (84% height on mobile, 90% on desktop) */}
            <div className="flex-[84] md:flex-[9] min-h-0">
              <Calendar 
                currentDate={currentDate} 
                onDateChange={setCurrentDate}
                viewType={calendarViewType}
                onViewTypeChange={setCalendarViewType}
              />
            </div>

            {/* Summary Bar (16% height on mobile, 10% on desktop) */}
            <div className="flex-[16] md:flex-[1] min-h-0 mb-16 md:mb-0">
              <SummaryBar currentDate={currentDate} />
            </div>
          </div>
        ) : currentView === 'recurring' ? (
          <div className="flex-1 flex flex-col h-full pb-16 md:pb-0">
            <Recurring />
          </div>
        ) : currentView === 'accounts' ? (
          <div className="flex-1 flex flex-col h-full pb-16 md:pb-0">
            <Accounts />
          </div>
        ) : currentView === 'budgets' ? (
          <div className="flex-1 flex flex-col h-full pb-16 md:pb-0 overflow-x-hidden w-full max-w-full min-w-0">
            <Budgets />
          </div>
        ) : currentView === 'goals' ? (
          <div className="flex-1 flex flex-col h-full pb-16 md:pb-0">
            <SavingsGoals />
          </div>
        ) : currentView === 'debt' ? (
          <div className="flex-1 flex flex-col h-full pb-16 md:pb-0">
            <DebtTracking />
          </div>
        ) : currentView === 'profile' ? (
          <div className="flex-1 flex flex-col h-full pb-16 md:pb-0">
            <Profile />
          </div>
        ) : (
          <div className="flex-1 flex flex-col h-full pb-16 md:pb-0">
            <Reporting />
          </div>
        )}
      </Suspense>

      {/* Walkthrough Overlay */}
      {!isCompleted && !isLoading && (
        <Suspense fallback={null}>
          <Walkthrough currentView={currentView} onNavigate={setCurrentView} />
        </Suspense>
      )}

      {/* Bottom Navigation (Mobile only) */}
      <BottomNavigation
        currentView={currentView}
        onViewChange={handleViewChange}
        onMoreMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />
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

