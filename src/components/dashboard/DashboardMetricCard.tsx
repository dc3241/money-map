import React from 'react';

interface DashboardMetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  variant: 'income' | 'spending' | 'net';
  positive?: boolean; // for net: true = green, false = red
}

const DashboardMetricCard: React.FC<DashboardMetricCardProps> = ({
  title,
  value,
  subtitle,
  variant,
  positive,
}) => {
  const valueColor =
    variant === 'income'
      ? 'text-income-green'
      : variant === 'spending'
        ? 'text-spending-red'
        : positive
          ? 'text-income-green'
          : positive === false
            ? 'text-spending-red'
            : 'text-text-primary';

  return (
    <div className="bg-surface-2 border border-border-subtle rounded-xl p-4 md:p-5 flex flex-col min-h-0">
      <div className="text-text-muted text-xs uppercase tracking-widest font-medium mb-1">
        {title}
      </div>
      <div className={`text-xl md:text-2xl font-bold tabular-nums ${valueColor}`}>
        {value}
      </div>
      {subtitle && (
        <div className="text-text-muted text-xs mt-1">{subtitle}</div>
      )}
      {variant === 'net' && positive !== undefined && (
        <div className={`text-xs font-medium mt-1 ${positive ? 'text-income-green' : 'text-spending-red'}`}>
          {positive ? 'Positive cash flow' : 'Negative cash flow'}
        </div>
      )}
    </div>
  );
};

export default DashboardMetricCard;
