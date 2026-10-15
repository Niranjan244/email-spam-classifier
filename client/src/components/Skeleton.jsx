const Skeleton = ({ className = '', ...props }) => {
  return (
    <div
      role="status"
      aria-label="Loading content"
      className={`animate-pulse bg-surface-muted rounded-lg ${className}`.trim()}
      {...props}
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
};

export default Skeleton;
