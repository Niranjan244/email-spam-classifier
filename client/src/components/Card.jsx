export const Card = ({ children, className = '', hoverable = false, ...props }) => {
  return (
    <div
      className={`bg-surface border border-border/80 rounded-xl shadow-[0_1px_3px_0_rgba(0,0,0,0.04),0_1px_2px_-1px_rgba(0,0,0,0.04)] dark:shadow-none p-5 sm:p-6 transition-all duration-200 ${
        hoverable ? 'hover:shadow-md hover:border-border' : ''
      } ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ children, title, description, action, className = '', ...props }) => {
  if (title || description || action) {
    return (
      <div
        className={`mb-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3 ${className}`.trim()}
        {...props}
      >
        <div className="min-w-0">
          {title && <h3 className="text-xl font-semibold text-text">{title}</h3>}
          {description && <p className="text-sm text-text-muted mt-1">{description}</p>}
          {children}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    );
  }

  return (
    <div className={`mb-4 ${className}`.trim()} {...props}>
      {children}
    </div>
  );
};

export const CardTitle = ({ children, className = '', ...props }) => {
  return (
    <h3 className={`text-xl font-semibold text-text tracking-tight ${className}`.trim()} {...props}>
      {children}
    </h3>
  );
};

export const CardDescription = ({ children, className = '', ...props }) => {
  return (
    <p className={`text-sm text-text-muted mt-1 ${className}`.trim()} {...props}>
      {children}
    </p>
  );
};

export const CardContent = ({ children, className = '', ...props }) => {
  return (
    <div className={`${className}`.trim()} {...props}>
      {children}
    </div>
  );
};

export const CardFooter = ({ children, className = '', ...props }) => {
  return (
    <div
      className={`mt-4 pt-4 border-t border-border flex items-center justify-end gap-3 ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
};

Card.Header = CardHeader;
Card.Title = CardTitle;
Card.Description = CardDescription;
Card.Content = CardContent;
Card.Footer = CardFooter;

export default Card;
