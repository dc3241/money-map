import React from 'react';
import { format } from 'date-fns';
import { useBudgetStore } from '../store/useBudgetStore';

interface WeekDayBoxProps {
  date: Date;
  onClick: () => void;
  isToday?: boolean;
}

const WeekDayBox: React.FC<WeekDayBoxProps> = ({ date, onClick, isToday = false }) => {
  const days = useBudgetStore((state) => state.days);
  const getDailyTotal = useBudgetStore((state) => state.getDailyTotal);

  const dateKey = format(date, 'yyyy-MM-dd');
  const dayData = days[dateKey] || { date: dateKey, income: [], spending: [], transfers: [] };
  const totals = getDailyTotal(dateKey);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div
      className={`
        relative bg-white border border-gray-200 rounded-lg px-2 py-1 md:p-4 min-h-0 w-full max-w-full min-w-0 cursor-pointer 
        shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 flex flex-col overflow-hidden box-border
        ${isToday ? 'ring-2 ring-blue-500' : ''}
      `}
      style={{ maxWidth: '100%', height: '100%', maxHeight: '100%' }}
      ref={(el) => {
        // #region agent log
        if (el) {
          setTimeout(() => {
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            const parent = el.parentElement;
            const parentRect = parent ? parent.getBoundingClientRect() : null;
            const logData = {location:'WeekDayBox.tsx:31',message:'Card dimensions',data:{cardWidth:rect.width,cardLeft:rect.left,cardRight:rect.right,cardOverflow:rect.right > window.innerWidth,viewportWidth:window.innerWidth,documentWidth:document.documentElement.clientWidth,computedWidth:style.width,minWidth:style.minWidth,maxWidth:style.maxWidth,paddingLeft:style.paddingLeft,paddingRight:style.paddingRight,borderLeft:style.borderLeftWidth,borderRight:style.borderRightWidth,marginLeft:style.marginLeft,marginRight:style.marginRight,boxSizing:style.boxSizing,overflowX:style.overflowX,parentWidth:parentRect?.width,parentLeft:parentRect?.left,parentRight:parentRect?.right},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B'};
            console.log('DEBUG:', logData);
            fetch('http://127.0.0.1:7242/ingest/9a5fadb7-ed49-408b-9ad5-e9f09e1cac2d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData)}).catch((e) => console.error('Log fetch failed:', e));
          }, 100);
        }
        // #endregion
      }}
      onClick={onClick}
    >
      {/* Day Header */}
      <div className="flex justify-between items-center mb-1.5 md:mb-3 pb-1 md:pb-2 border-b border-gray-200">
        <div>
          <div className="text-xs md:text-sm font-semibold text-gray-700">
            {format(date, 'EEEE')}
          </div>
          <div className="text-xs text-gray-500">
            {format(date, 'MMM d')}
          </div>
        </div>
        <div className={`text-base md:text-lg font-bold tabular-nums ${
          totals.profit >= 0 
            ? 'text-emerald-700' 
            : 'text-rose-700'
        }`}>
          {totals.profit >= 0 ? '+' : ''}{formatCurrency(totals.profit)}
        </div>
      </div>
      
      <div className="flex flex-col gap-2 md:gap-4 flex-1 min-h-0 overflow-hidden">
        {/* Income Section */}
        <div className="border-l-4 border-emerald-500 pl-1.5 md:pl-3 py-1 md:py-2 flex-1 min-h-0 flex flex-col">
          <div className="flex justify-between items-center mb-1 md:mb-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Income
            </div>
            <div className="text-xs md:text-sm font-semibold tabular-nums text-emerald-600">
              {formatCurrency(totals.income)}
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto max-h-[35vh] md:max-h-none">
            {dayData.income.length > 0 ? (
              <div className="space-y-1 md:space-y-2">
                {dayData.income.map((transaction) => (
                  <div key={transaction.id} className="bg-emerald-50 rounded p-1 md:p-2 border border-emerald-100">
                    <div className="text-xs md:text-sm font-semibold tabular-nums text-emerald-700">
                      {formatCurrency(transaction.amount)}
                    </div>
                    <div className="text-xs text-gray-600 truncate mt-0.5">
                      {transaction.description}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs md:text-sm text-gray-400 italic">No income entries</div>
            )}
          </div>
        </div>

        {/* Spending Section */}
        <div className="border-l-4 border-rose-500 pl-1.5 md:pl-3 py-1 md:py-2 flex-1 min-h-0 flex flex-col">
          <div className="flex justify-between items-center mb-1 md:mb-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Spending
            </div>
            <div className="text-xs md:text-sm font-semibold tabular-nums text-rose-600">
              {formatCurrency(totals.spending)}
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto max-h-[35vh] md:max-h-none">
            {dayData.spending.length > 0 ? (
              <div className="space-y-1 md:space-y-2">
                {dayData.spending.map((transaction) => (
                  <div key={transaction.id} className="bg-rose-50 rounded p-1 md:p-2 border border-rose-100">
                    <div className="text-xs md:text-sm font-semibold tabular-nums text-rose-700">
                      {formatCurrency(transaction.amount)}
                    </div>
                    <div className="text-xs text-gray-600 truncate mt-0.5">
                      {transaction.description}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs md:text-sm text-gray-400 italic">No spending entries</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeekDayBox;

