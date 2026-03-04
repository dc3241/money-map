import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import calendarDashboardImg from '../assets/screenshots/calendar-dashboard.png';
import reportsImg from '../assets/screenshots/reports.png';
import budgetsImg from '../assets/screenshots/budgets.png';
import goalsImg from '../assets/screenshots/goals.png';

export default function Home() {
  const { user } = useAuthStore();

  const features = [
    {
      icon: '📅',
      title: 'Visual Calendar',
      description: 'See your finances at a glance with a weekly calendar view. Track income and expenses day by day.',
    },
    {
      icon: '🔄',
      title: 'Recurring Transactions',
      description: 'Set up recurring bills and income. Never miss a payment or forget to track regular income streams.',
    },
    {
      icon: '💳',
      title: 'Multiple Accounts',
      description: 'Manage checking, savings, credit cards, and investment accounts all in one place.',
    },
    {
      icon: '💰',
      title: 'Smart Budgets',
      description: 'Set budgets by category and period. Track your spending against limits with real-time updates.',
    },
    {
      icon: '🎯',
      title: 'Savings Goals',
      description: 'Set and track savings goals with target dates. Watch your progress as you build towards your dreams.',
    },
    {
      icon: '📊',
      title: 'Debt Tracking',
      description: 'Monitor all your debts in one place. Track payments, interest rates, and watch your balances decrease.',
    },
    {
      icon: '📈',
      title: 'Detailed Reporting',
      description: 'Get insights into your spending patterns with comprehensive reports and visual analytics.',
    },
  ];

  const benefits = [
    'No hidden fees. Ever.',
    'No bank connections or sensitive data collected',
    'Manual tracking builds financial discipline',
    'Your data stays private and secure',
    'Access from any device',
  ];

  return (
    <div className="min-h-screen bg-bg-app">
      {/* Navigation */}
      <nav className="bg-surface-1 border-b border-border-subtle sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <svg width="40" height="40" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
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
              <span className="text-2xl font-semibold text-text-primary">Money Maps</span>
            </div>
            {user ? (
              <Link
                to="/dashboard"
                className="px-6 py-2 bg-accent text-white rounded-xl font-medium hover:opacity-90 transition-all duration-200"
              >
                Go to Dashboard
              </Link>
            ) : (
              <Link
                to="/login"
                className="px-6 py-2 bg-accent text-white rounded-xl font-medium hover:opacity-90 transition-all duration-200"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16"
        style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(79,127,255,0.12) 0%, transparent 70%)' }}
      >
        <div className="text-center">
          <div className="inline-block mb-4">
            <span className="bg-accent-glow border border-accent/30 text-accent text-xs font-medium rounded-full px-3 py-1">
              100% Free
            </span>
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-semibold text-text-primary tracking-tight mb-6 leading-tight font-serif">
            Take Control of Your
            <span className="block text-accent mt-2">Financial Future</span>
          </h1>
          <p className="text-text-secondary text-lg leading-relaxed mb-8 max-w-3xl mx-auto">
            The only budget calendar app you'll ever need. Visualize your finances, track every dollar, and achieve your goals—all for free.
          </p>
          
          {!user && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Link
                to="/login"
                className="px-6 py-3 bg-accent text-white rounded-xl font-medium hover:opacity-90 transition-all duration-200"
              >
                Get Started Free
              </Link>
              <a
                href="#features"
                className="px-6 py-3 bg-surface-2 border border-border-subtle text-text-secondary rounded-xl font-medium hover:border-border-hover hover:text-text-primary transition-all duration-200"
              >
                Learn More
              </a>
            </div>
          )}

          {/* Trust Indicators */}
          <div className="flex flex-wrap justify-center gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-income-green flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-text-secondary text-sm">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Free Banner */}
      <section className="bg-bg-app py-12 mb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-semibold text-text-primary font-serif mb-4">
            Completely Free. No Hidden Costs.
          </h2>
          <p className="text-xl text-text-secondary mb-6 max-w-2xl mx-auto">
            We believe financial tools should be accessible to everyone. That's why Money Maps is completely free—no subscriptions, no premium tiers, no catch.
          </p>
          {!user && (
            <Link
              to="/login"
              className="inline-block px-6 py-3 bg-accent text-white rounded-xl font-medium hover:opacity-90 transition-all duration-200"
            >
              Start Free Today
            </Link>
          )}
        </div>
      </section>

      {/* Privacy & Security Section */}
      <section className="bg-surface-1 py-20 mb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-block p-3 bg-surface-2 rounded-xl mb-4">
              <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-3xl md:text-4xl font-semibold text-text-primary font-serif mb-4">
              Your Privacy is Our Priority
            </h2>
            <p className="text-xl text-text-secondary max-w-3xl mx-auto">
              Money Maps is built with your privacy and financial discipline in mind.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="text-center p-6">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-surface-2 rounded-xl mb-4 text-2xl">🔒</div>
              <h3 className="text-2xl font-semibold text-text-primary mb-3">
                No Bank Connections
              </h3>
              <p className="text-text-muted text-sm leading-relaxed">
                We don't connect to your bank accounts or collect sensitive banking data. Your financial information stays private and secure—never shared with third parties.
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-surface-2 rounded-xl mb-4 text-2xl">✍️</div>
              <h3 className="text-2xl font-semibold text-text-primary mb-3">
                Manual Tracking for Discipline
              </h3>
              <p className="text-text-muted text-sm leading-relaxed">
                By entering transactions manually, you stay aware of every dollar you spend. This mindful approach builds better financial habits and keeps you in control.
              </p>
            </div>
          </div>
          
          <div className="mt-12 pt-8 border-t border-border-subtle text-center">
            <p className="text-lg text-text-secondary font-medium">
              Your data. Your control. Your discipline.
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-bg-app max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-semibold text-text-primary font-serif mb-4">
            Everything You Need to Manage Your Money
          </h2>
          <p className="text-xl text-text-secondary max-w-2xl mx-auto">
            Powerful features designed to give you complete visibility and control over your finances.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-surface-1 border border-border-subtle p-6 rounded-xl hover:border-border-hover transition-all duration-200"
            >
              <div className="bg-surface-2 rounded-xl p-3 w-fit text-2xl mb-4">{feature.icon}</div>
              <h3 className="text-text-primary font-semibold text-sm mb-3">{feature.title}</h3>
              <p className="text-text-muted text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* App Preview Section */}
      <section className="bg-surface-1 py-20 mb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-semibold text-text-primary font-serif mb-4">
              See It In Action
            </h2>
            <p className="text-xl text-text-secondary max-w-2xl mx-auto">
              Get a glimpse of how Money Maps helps you visualize and manage your finances.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {/* Preview 1: Calendar View */}
            <div className="bg-surface-2 border border-border-subtle rounded-xl overflow-hidden">
              <div className="bg-surface-3 px-4 py-3 border-b border-border-subtle">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="ml-4 text-sm text-text-secondary">Calendar Dashboard</span>
                </div>
              </div>
              <div className="aspect-video bg-surface-3 flex items-center justify-center relative">
                <img 
                  src={calendarDashboardImg} 
                  alt="Calendar Dashboard View"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const placeholder = e.currentTarget.parentElement?.querySelector('.image-placeholder');
                    if (placeholder) placeholder.classList.remove('hidden');
                  }}
                />
                <div className="hidden image-placeholder flex-col items-center justify-center text-text-muted p-8 text-center">
                  <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm">Add screenshot: /public/screenshots/calendar-dashboard.png</p>
                </div>
              </div>
              <div className="p-6 bg-surface-2">
                <h3 className="text-text-primary font-semibold mb-2">Visual Calendar</h3>
                <p className="text-text-muted text-sm">Track your income and expenses day by day with our intuitive calendar interface.</p>
              </div>
            </div>

            {/* Preview 2: Reports View */}
            <div className="bg-surface-2 border border-border-subtle rounded-xl overflow-hidden">
              <div className="bg-surface-3 px-4 py-3 border-b border-border-subtle">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="ml-4 text-sm text-text-secondary">Reports & Analytics</span>
                </div>
              </div>
              <div className="aspect-video bg-surface-3 flex items-center justify-center relative">
                <img 
                  src={reportsImg} 
                  alt="Reports View"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const placeholder = e.currentTarget.parentElement?.querySelector('.image-placeholder');
                    if (placeholder) placeholder.classList.remove('hidden');
                  }}
                />
                <div className="hidden image-placeholder flex-col items-center justify-center text-text-muted p-8 text-center">
                  <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <p className="text-sm">Add screenshot: /public/screenshots/reports.png</p>
                </div>
              </div>
              <div className="p-6 bg-surface-2">
                <h3 className="text-text-primary font-semibold mb-2">Detailed Reports</h3>
                <p className="text-text-muted text-sm">Get insights into your spending patterns with comprehensive visual analytics.</p>
              </div>
            </div>
          </div>

          {/* Optional: Add more previews in a second row */}
          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto mt-8">
            {/* Preview 3: Budgets View */}
            <div className="bg-surface-2 border border-border-subtle rounded-xl overflow-hidden">
              <div className="bg-surface-3 px-4 py-3 border-b border-border-subtle">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="ml-4 text-sm text-text-secondary">Budget Tracking</span>
                </div>
              </div>
              <div className="aspect-video bg-surface-3 flex items-center justify-center relative">
                <img 
                  src={budgetsImg} 
                  alt="Budgets View"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const placeholder = e.currentTarget.parentElement?.querySelector('.image-placeholder');
                    if (placeholder) placeholder.classList.remove('hidden');
                  }}
                />
                <div className="hidden image-placeholder flex-col items-center justify-center text-text-muted p-8 text-center">
                  <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <p className="text-sm">Add screenshot: /public/screenshots/budgets.png</p>
                </div>
              </div>
              <div className="p-6 bg-surface-2">
                <h3 className="text-text-primary font-semibold mb-2">Smart Budgets</h3>
                <p className="text-text-muted text-sm">Set budgets by category and track your spending against limits in real-time.</p>
              </div>
            </div>

            {/* Preview 4: Goals View */}
            <div className="bg-surface-2 border border-border-subtle rounded-xl overflow-hidden">
              <div className="bg-surface-3 px-4 py-3 border-b border-border-subtle">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="ml-4 text-sm text-text-secondary">Savings Goals</span>
                </div>
              </div>
              <div className="aspect-video bg-surface-3 flex items-center justify-center relative">
                <img 
                  src={goalsImg} 
                  alt="Savings Goals View"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const placeholder = e.currentTarget.parentElement?.querySelector('.image-placeholder');
                    if (placeholder) placeholder.classList.remove('hidden');
                  }}
                />
                <div className="hidden image-placeholder flex-col items-center justify-center text-text-muted p-8 text-center">
                  <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                  <p className="text-sm">Add screenshot: /public/screenshots/goals.png</p>
                </div>
              </div>
              <div className="p-6 bg-surface-2">
                <h3 className="text-text-primary font-semibold mb-2">Savings Goals</h3>
                <p className="text-text-muted text-sm">Set and track your savings goals with target dates and watch your progress.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!user && (
        <section className="bg-bg-app max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="bg-surface-1 border border-border-subtle rounded-xl p-12 md:p-16 text-center">
            <h2 className="text-4xl md:text-5xl font-semibold text-text-primary font-serif mb-6">
              Ready to Take Control?
            </h2>
            <p className="text-xl text-text-secondary mb-8 max-w-2xl mx-auto">
              Join thousands of users who are already mapping their way to financial freedom.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/login"
                className="px-6 py-3 bg-accent text-white rounded-xl font-medium hover:opacity-90 transition-all duration-200"
              >
                Create Free Account
              </Link>
            </div>
            <p className="mt-6 text-text-muted text-sm">
              No credit card required • Set up in under 2 minutes
            </p>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-surface-1 border-t border-border-subtle py-8 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <svg width="32" height="32" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
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
              <span className="text-xl font-semibold text-text-primary">Money Maps</span>
            </div>
            <p className="text-text-muted text-sm">
              © {new Date().getFullYear()} Money Maps. 100% Free.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

