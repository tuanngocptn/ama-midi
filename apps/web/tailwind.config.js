/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#0d1117',
        sidebar: '#1a1a2e',
        card: '#1e293b',
        input: '#374151',
        'text-primary': '#f9fafb',
        'text-secondary': '#9ca3af',
        'accent-blue': '#3B82F6',
        'accent-red': '#EF4444',
        'accent-green': '#22C55E',
        'accent-purple': '#A855F7',
        'accent-yellow': '#EAB308',
        'border-grid': '#1e293b',
        'border-subtle': '#374151',
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: '12px',
      },
    },
  },
  plugins: [],
};
