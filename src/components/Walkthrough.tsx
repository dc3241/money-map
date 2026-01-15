import { useWalkthroughStore, WalkthroughTask } from '../store/useWalkthroughStore';

interface WalkthroughProps {
  currentView: 'dashboard' | 'recurring' | 'reporting' | 'accounts' | 'budgets' | 'goals' | 'debt' | 'profile';
  onNavigate: (view: 'dashboard' | 'recurring' | 'reporting' | 'accounts' | 'budgets' | 'goals' | 'debt' | 'profile') => void;
}

export default function Walkthrough({ onNavigate }: WalkthroughProps) {
  const tasks = useWalkthroughStore((state) => state.tasks);
  const isCompleted = useWalkthroughStore((state) => state.isCompleted);
  const isLoading = useWalkthroughStore((state) => state.isLoading);
  const checkTask = useWalkthroughStore((state) => state.checkTask);
  const skipWalkthrough = useWalkthroughStore((state) => state.skipWalkthrough);
  const completeWalkthrough = useWalkthroughStore((state) => state.completeWalkthrough);

  if (isLoading || isCompleted) {
    return null;
  }

  const completedCount = tasks.filter((task) => task.completed).length;
  const totalTasks = tasks.length;
  const progress = (completedCount / totalTasks) * 100;

  const handleTaskClick = (task: WalkthroughTask) => {
    if (task.completed) return;

    // Navigate based on task action
    if (task.action?.includes('accounts')) {
      onNavigate('accounts');
    } else if (task.action?.includes('recurring')) {
      onNavigate('recurring');
    } else if (task.action?.includes('budgets')) {
      onNavigate('budgets');
    } else if (task.action?.includes('goals')) {
      onNavigate('goals');
    } else if (task.action?.includes('dashboard')) {
      onNavigate('dashboard');
    }

    // Auto-complete task after navigation (or user can manually check)
    setTimeout(() => {
      checkTask(task.id);
    }, 500);
  };

  const handleCompleteAll = async () => {
    // Mark all remaining tasks as completed
    tasks.forEach((task) => {
      if (!task.completed) {
        checkTask(task.id);
      }
    });
    setTimeout(() => {
      completeWalkthrough();
    }, 500);
  };

  const handleSkip = async () => {
    try {
      await skipWalkthrough();
    } catch (error) {
      console.error('Error skipping walkthrough:', error);
    }
  };

  const handleComplete = async () => {
    try {
      await completeWalkthrough();
    } catch (error) {
      console.error('Error completing walkthrough:', error);
    }
  };

  return (
    <div className="fixed top-4 right-4 bg-white rounded-lg shadow-xl border border-slate-200 z-50 w-96 max-h-[80vh] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold">Welcome to Money Maps! 🎉</h3>
          <button
            onClick={handleSkip}
            className="text-white/80 hover:text-white transition-colors"
            aria-label="Skip walkthrough"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="text-sm text-white/90 mb-3">
          Complete these steps to get the most out of your financial journey
        </p>
        
        {/* Progress Bar */}
        <div className="w-full bg-white/20 rounded-full h-2">
          <div
            className="bg-white rounded-full h-2 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-white/80 mt-2">
          {completedCount} of {totalTasks} completed
        </p>
      </div>

      {/* Tasks List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {tasks.map((task) => (
          <div
            key={task.id}
            onClick={() => handleTaskClick(task)}
            className={`
              p-3 rounded-lg border-2 cursor-pointer transition-all
              ${
                task.completed
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-slate-50 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50'
              }
            `}
          >
            <div className="flex items-start gap-3">
              {/* Checkbox */}
              <div className="mt-0.5">
                {task.completed ? (
                  <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-slate-300 flex-shrink-0" />
                )}
              </div>

              {/* Task Content */}
              <div className="flex-1 min-w-0">
                <h4
                  className={`
                    font-semibold text-sm mb-1
                    ${task.completed ? 'text-emerald-700 line-through' : 'text-slate-900'}
                  `}
                >
                  {task.title}
                </h4>
                <p
                  className={`
                    text-xs mb-2
                    ${task.completed ? 'text-slate-500' : 'text-slate-600'}
                  `}
                >
                  {task.description}
                </p>
                {task.action && !task.completed && (
                  <span className="inline-flex items-center text-xs text-emerald-600 font-medium">
                    Click to {task.action.toLowerCase()}
                    <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-200 p-4 bg-slate-50">
        {completedCount === totalTasks ? (
          <button
            onClick={handleComplete}
            className="w-full bg-emerald-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-emerald-600 transition-colors"
          >
            Complete & Get Started! 🚀
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleCompleteAll}
              className="flex-1 bg-slate-200 text-slate-700 py-2 px-4 rounded-lg font-medium hover:bg-slate-300 transition-colors text-sm"
            >
              Mark All Complete
            </button>
            <button
              onClick={handleSkip}
              className="flex-1 bg-white text-slate-700 py-2 px-4 rounded-lg font-medium hover:bg-slate-50 transition-colors border border-slate-300 text-sm"
            >
              Skip
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

