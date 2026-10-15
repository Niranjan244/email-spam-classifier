import { forwardRef } from 'react';

export const Input = forwardRef(
  (
    {
      id,
      name,
      label,
      type = 'text',
      error,
      helperText,
      disabled = false,
      required = false,
      className = '',
      rightElement,
      ...props
    },
    ref
  ) => {
    const inputId = id || name;
    const errorId = inputId ? `${inputId}-error` : undefined;
    const helperId = inputId ? `${inputId}-helper` : undefined;

    const baseInputStyles =
      'w-full h-10 px-3.5 text-sm rounded-lg bg-surface text-text border transition-all duration-150 focus:outline-none placeholder:text-text-muted/70 disabled:bg-surface-muted disabled:cursor-not-allowed disabled:text-text-muted shadow-[0_1px_2px_rgba(0,0,0,0.02)]';

    const borderStyles = error
      ? 'border-danger focus:ring-2 focus:ring-danger/20 focus:border-danger'
      : 'border-border/80 hover:border-border focus:ring-2 focus:ring-primary/20 focus:border-primary';

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-text mb-1.5">
            {label}
            {required && <span className="text-danger ml-0.5">*</span>}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            name={name}
            type={type}
            disabled={disabled}
            required={required}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            className={`${baseInputStyles} ${rightElement ? 'pr-10' : ''} ${borderStyles} ${className}`.trim()}
            {...props}
          />
          {rightElement && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">{rightElement}</div>
          )}
        </div>
        {error && (
          <p id={errorId} className="text-xs text-danger mt-1.5">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={helperId} className="text-xs text-text-muted mt-1.5">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

export const Select = forwardRef(
  (
    {
      id,
      name,
      label,
      error,
      helperText,
      disabled = false,
      required = false,
      children,
      className = '',
      ...props
    },
    ref
  ) => {
    const inputId = id || name;
    const errorId = inputId ? `${inputId}-error` : undefined;
    const helperId = inputId ? `${inputId}-helper` : undefined;

    const baseSelectStyles =
      'w-full h-10 px-3.5 text-sm rounded-lg bg-surface text-text border transition-all duration-150 focus:outline-none placeholder:text-text-muted/70 disabled:bg-surface-muted disabled:cursor-not-allowed disabled:text-text-muted shadow-[0_1px_2px_rgba(0,0,0,0.02)]';

    const borderStyles = error
      ? 'border-danger focus:ring-2 focus:ring-danger/20 focus:border-danger'
      : 'border-border/80 hover:border-border focus:ring-2 focus:ring-primary/20 focus:border-primary';

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-text mb-1.5">
            {label}
            {required && <span className="text-danger ml-0.5">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={inputId}
          name={name}
          disabled={disabled}
          required={required}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={`${baseSelectStyles} ${borderStyles} ${className}`.trim()}
          {...props}
        >
          {children}
        </select>
        {error && (
          <p id={errorId} className="text-xs text-danger mt-1.5">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={helperId} className="text-xs text-text-muted mt-1.5">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

export const Textarea = forwardRef(
  (
    {
      id,
      name,
      label,
      error,
      helperText,
      disabled = false,
      required = false,
      rows = 4,
      className = '',
      ...props
    },
    ref
  ) => {
    const inputId = id || name;
    const errorId = inputId ? `${inputId}-error` : undefined;
    const helperId = inputId ? `${inputId}-helper` : undefined;

    const baseTextareaStyles =
      'w-full p-3.5 text-sm rounded-lg bg-surface text-text border transition-all duration-150 focus:outline-none placeholder:text-text-muted/70 disabled:bg-surface-muted disabled:cursor-not-allowed disabled:text-text-muted shadow-[0_1px_2px_rgba(0,0,0,0.02)]';

    const borderStyles = error
      ? 'border-danger focus:ring-2 focus:ring-danger/20 focus:border-danger'
      : 'border-border/80 hover:border-border focus:ring-2 focus:ring-primary/20 focus:border-primary';

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-text mb-1.5">
            {label}
            {required && <span className="text-danger ml-0.5">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          name={name}
          rows={rows}
          disabled={disabled}
          required={required}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={`${baseTextareaStyles} ${borderStyles} ${className}`.trim()}
          {...props}
        />
        {error && (
          <p id={errorId} className="text-xs text-danger mt-1.5">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={helperId} className="text-xs text-text-muted mt-1.5">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
Select.displayName = 'Select';
Textarea.displayName = 'Textarea';

Input.Select = Select;
Input.Textarea = Textarea;

export default Input;
