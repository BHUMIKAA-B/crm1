/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        body: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        vs: {
          bg: 'rgb(var(--vs-bg-rgb) / <alpha-value>)',
          surface: 'rgb(var(--vs-surface-rgb) / <alpha-value>)',
          primary: 'rgb(var(--vs-primary-rgb) / <alpha-value>)',
          'primary-hover': 'rgb(var(--vs-primary-hover-rgb) / <alpha-value>)',
          secondary: 'rgb(var(--vs-secondary-rgb) / <alpha-value>)',
          text: {
            primary: 'rgb(var(--vs-text-primary-rgb) / <alpha-value>)',
            secondary: 'rgb(var(--vs-text-secondary-rgb) / <alpha-value>)',
            muted: 'rgb(var(--vs-text-muted-rgb) / <alpha-value>)',
          },
          border: 'rgb(var(--vs-border-rgb) / <alpha-value>)',
          gold: 'rgb(var(--vs-primary-rgb) / <alpha-value>)',
        },
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        xs: '0.125rem',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '30': '7.5rem',
        '38': '9.5rem',
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.75rem', letterSpacing: '0.1em' }],
      },
      letterSpacing: {
        'widest': '0.2em',
        'ultra': '0.25em',
      },
      transitionDuration: {
        '400': '400ms',
        '600': '600ms',
        '800': '800ms',
      },
      transitionTimingFunction: {
        'luxury': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      boxShadow: {
        'luxury': '0 12px 32px -12px rgba(23, 23, 23, 0.12)',
        'luxury-lg': '0 20px 48px -16px rgba(23, 23, 23, 0.16)',
        'glow': '0 0 30px rgba(120, 175, 207, 0.25)',
        'glow-sm': '0 0 15px rgba(120, 175, 207, 0.18)',
        'premium-xs': '0 1px 2px rgba(23, 23, 23, 0.04)',
        'premium-sm': '0 2px 8px rgba(23, 23, 23, 0.06)',
        'premium-md': '0 8px 24px -8px rgba(23, 23, 23, 0.10)',
        'premium-lg': '0 20px 40px -20px rgba(23, 23, 23, 0.16)',
        'premium-xl': '0 30px 60px -24px rgba(23, 23, 23, 0.20)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-gold': 'linear-gradient(135deg, #78AFCF 0%, #A9CBE3 100%)',
        'gradient-dark': 'linear-gradient(to bottom, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.4) 50%, #FFFFFF 100%)',
        'gradient-surface': 'linear-gradient(to bottom, #F4F6F8 0%, #FFFFFF 100%)',
        'gradient-hero': 'linear-gradient(135deg, #F4F6F8 0%, #FFFFFF 55%, #EAF1F6 100%)',
        'gradient-primary-soft': 'linear-gradient(135deg, rgba(120,175,207,0.12) 0%, rgba(120,175,207,0.02) 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease forwards',
        'fade-in-up': 'fadeInUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'shimmer': 'shimmer 1.5s infinite',
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'page-fade': 'pageFadeIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pageFadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(120, 175, 207, 0.35)' },
          '50%': { boxShadow: '0 0 0 8px rgba(120, 175, 207, 0)' },
        },
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' }
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' }
        }
      },
    }
  },
  plugins: [require("tailwindcss-animate")],
};
