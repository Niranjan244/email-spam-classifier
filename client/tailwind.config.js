/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'var(--color-background)',
        surface: {
          DEFAULT: 'var(--color-surface)',
          muted: 'var(--color-surface-muted)'
        },
        'surface-muted': 'var(--color-surface-muted)',
        border: 'var(--color-border)',
        text: {
          DEFAULT: 'var(--color-text)',
          primary: 'var(--color-text)',
          secondary: 'var(--color-text-muted)',
          muted: 'var(--color-text-muted)'
        },
        'text-muted': 'var(--color-text-muted)',
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
          soft: 'var(--color-primary-soft)'
        },
        'primary-hover': 'var(--color-primary-hover)',
        'primary-soft': 'var(--color-primary-soft)',
        danger: {
          DEFAULT: 'var(--color-danger)',
          soft: 'var(--color-danger-soft)'
        },
        'danger-soft': 'var(--color-danger-soft)',
        success: {
          DEFAULT: 'var(--color-success)',
          soft: 'var(--color-success-soft)'
        },
        'success-soft': 'var(--color-success-soft)',
        warning: {
          DEFAULT: 'var(--color-warning)',
          soft: 'var(--color-warning-soft)'
        },
        'warning-soft': 'var(--color-warning-soft)',
        // Backwards compatibility mappings for smooth migration
        card: {
          DEFAULT: 'var(--color-surface)',
          border: 'var(--color-border)'
        },
        spam: {
          text: 'var(--color-danger)',
          bg: 'var(--color-danger-soft)'
        },
        notSpam: {
          text: 'var(--color-success)',
          bg: 'var(--color-success-soft)'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif']
      },
      fontSize: {
        xs: ['12px', '16px'],
        sm: ['14px', '20px'],
        base: ['16px', '24px'],
        xl: ['20px', '28px'],
        '2xl': ['24px', '32px'],
        '3xl': ['30px', '36px']
      },
      borderRadius: {
        DEFAULT: '8px',
        md: '8px',
        lg: '8px'
      }
    }
  },
  plugins: []
};
