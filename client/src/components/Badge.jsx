const Badge = ({ children, variant = 'neutral', className = '', ...props }) => {
  const variants = {
    // Spam: danger-soft
    spam: 'bg-danger-soft text-danger border border-danger/20',
    danger: 'bg-danger-soft text-danger border border-danger/20',

    // Not Spam: success-soft
    notSpam: 'bg-success-soft text-success border border-success/20',
    ham: 'bg-success-soft text-success border border-success/20',
    success: 'bg-success-soft text-success border border-success/20',

    // Active: success-soft
    active: 'bg-success-soft text-success border border-success/20',

    // Inactive: muted
    inactive: 'bg-surface-muted text-text-muted border border-border',
    muted: 'bg-surface-muted text-text-muted border border-border',
    neutral: 'bg-surface-muted text-text-muted border border-border',

    // Admin: primary-soft
    admin: 'bg-primary-soft text-primary border border-primary/20',
    primary: 'bg-primary-soft text-primary border border-primary/20',

    // Warning
    warning: 'bg-warning-soft text-warning border border-warning/20'
  };

  const selectedVariant = variants[variant] || variants.neutral;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium tracking-wide shadow-[0_1px_2px_rgba(0,0,0,0.03)] ${selectedVariant} ${className}`.trim()}
      {...props}
    >
      {children}
    </span>
  );
};

export default Badge;
