const AuthBackground = () => {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden select-none"
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, var(--auth-bg-base-start) 0%, var(--auth-bg-base-end) 100%)'
        }}
      />

      <div
        className="absolute -top-[120px] -left-[120px] w-[480px] h-[480px] sm:w-[800px] sm:h-[800px] rounded-full"
        style={{
          background:
            'radial-gradient(ellipse at center, var(--auth-glow-top-left) 0%, transparent 70%)'
        }}
      />
      <div
        className="absolute -top-[100px] -right-[100px] w-[420px] h-[420px] sm:w-[700px] sm:h-[700px] rounded-full"
        style={{
          background:
            'radial-gradient(ellipse at center, var(--auth-glow-top-right) 0%, transparent 70%)'
        }}
      />
      <div
        className="absolute -bottom-[150px] left-1/2 -translate-x-1/2 w-[360px] h-[360px] sm:w-[600px] sm:h-[600px] rounded-full"
        style={{
          background:
            'radial-gradient(ellipse at center, var(--auth-glow-bottom) 0%, transparent 70%)'
        }}
      />

      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(to right, var(--auth-grid-color) 1px, transparent 1px), linear-gradient(to bottom, var(--auth-grid-color) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          WebkitMaskImage:
            'radial-gradient(ellipse 70% 60% at 50% 45%, black 20%, transparent 80%)',
          maskImage: 'radial-gradient(ellipse 70% 60% at 50% 45%, black 20%, transparent 80%)'
        }}
      />

      <div
        className="absolute top-0 left-0 right-0 h-[1px]"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, var(--auth-top-accent) 50%, transparent 100%)'
        }}
      />

      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at center, transparent 60%, var(--auth-vignette) 100%)'
        }}
      />
    </div>
  );
};

export default AuthBackground;
