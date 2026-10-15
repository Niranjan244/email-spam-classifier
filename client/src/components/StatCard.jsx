import { Mail, AlertTriangle, CheckCircle2, Users, Activity, TrendingUp } from 'lucide-react';

const getIconAndStyle = (label = '', variant) => {
  const lower = String(label).toLowerCase();

  if (variant === 'danger' || variant === 'spam' || lower.includes('spam')) {
    return {
      Icon: AlertTriangle,
      chipClass: 'bg-danger-soft text-danger'
    };
  }

  if (
    variant === 'success' ||
    variant === 'notSpam' ||
    variant === 'ham' ||
    lower.includes('not spam') ||
    lower.includes('ham')
  ) {
    return {
      Icon: CheckCircle2,
      chipClass: 'bg-success-soft text-success'
    };
  }

  if (lower.includes('user')) {
    return {
      Icon: Users,
      chipClass: 'bg-primary-soft text-primary'
    };
  }

  if (
    lower.includes('accuracy') ||
    lower.includes('f1') ||
    lower.includes('precision') ||
    lower.includes('recall')
  ) {
    return {
      Icon: Activity,
      chipClass: 'bg-primary-soft text-primary'
    };
  }

  if (lower.includes('total') || lower.includes('classified') || lower.includes('email')) {
    return {
      Icon: Mail,
      chipClass: 'bg-primary-soft text-primary'
    };
  }

  return {
    Icon: TrendingUp,
    chipClass: 'bg-primary-soft text-primary'
  };
};

const StatCard = ({ label, value, icon: customIcon, variant, className = '', ...props }) => {
  const { Icon: defaultIcon, chipClass } = getIconAndStyle(label, variant);
  const IconComponent = customIcon || defaultIcon;

  return (
    <div
      className={`group bg-surface border border-border/80 hover:border-primary/40 rounded-xl p-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.04),0_1px_2px_-1px_rgba(0,0,0,0.04)] hover:shadow-md dark:shadow-none flex items-center justify-between gap-4 transition-all duration-200 ${className}`.trim()}
      {...props}
    >
      <div className="min-w-0">
        <p className="text-xs font-medium text-text-muted truncate">{label}</p>
        <div className="text-[28px] font-bold text-text leading-tight mt-1 tabular-nums tracking-tight">
          {value ?? 0}
        </div>
      </div>

      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-xs group-hover:scale-105 transition-transform duration-200 ${chipClass}`}
        aria-hidden="true"
      >
        <IconComponent className="w-5 h-5" />
      </div>
    </div>
  );
};

export default StatCard;
