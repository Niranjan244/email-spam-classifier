import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

const Button = forwardRef(
  (
    {
      children,
      variant = 'primary',
      size = 'default',
      loading = false,
      disabled = false,
      type = 'button',
      className = '',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 select-none';

    const variants = {
      primary:
        'bg-primary text-white hover:bg-primary-hover shadow-sm hover:shadow active:opacity-95',
      secondary:
        'border border-border/80 bg-surface text-text hover:bg-surface-muted hover:border-border active:opacity-90',
      outline:
        'border border-border/80 bg-surface text-text hover:bg-surface-muted hover:border-border active:opacity-90',
      ghost: 'bg-transparent text-text hover:bg-surface-muted active:opacity-90',
      danger:
        'bg-danger text-white hover:opacity-90 shadow-sm hover:shadow active:opacity-95 focus:ring-danger',
      destructive:
        'bg-danger text-white hover:opacity-90 shadow-sm hover:shadow active:opacity-95 focus:ring-danger'
    };

    const sizes = {
      default: 'h-10 px-4 text-sm',
      sm: 'h-8 px-3 text-xs',
      lg: 'h-11 px-5 text-base',
      icon: 'h-10 w-10 p-0'
    };

    const variantStyles = variants[variant] || variants.primary;
    const sizeStyles = sizes[size] || sizes.default;

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={`${baseStyles} ${variantStyles} ${sizeStyles} ${className}`.trim()}
        {...props}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
