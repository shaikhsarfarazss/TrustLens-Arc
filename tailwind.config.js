/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        petrol: {
          950: '#070E11',
          900: '#0B1519',
          850: '#0E1A1E',
          800: '#122228',
          700: '#1B313A',
          600: '#26444F',
          500: '#345B69',
        },
        terracotta: {
          50: '#FFF7F3',
          100: '#FFE9DF',
          200: '#FED2C0',
          300: '#FCAE8F',
          400: '#FA9468',
          500: '#EE8656', // Reference image primary copper/terracotta accent
          600: '#DE6E3C',
          700: '#BA5325',
          800: '#94411C',
          900: '#7A3517',
        },
        cream: {
          50: '#FFFDF9',
          100: '#FAF7F0', // Reference image warm porcelain cream card
          200: '#F3EFE4',
          300: '#E6E0D2',
          400: '#D5CCBC',
        },
        navy: {
          950: '#0B0F19',
          900: '#0F172A',
          800: '#1E293B',
          700: '#334155',
        },
        threat: {
          50: '#FFF1F2',
          500: '#F43F5E',
          600: '#E11D48',
          700: '#BE123C',
        },
        verified: {
          50: '#ECFDF5',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
        },
        steel: {
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        editorial: ['Cormorant Garamond', 'Playfair Display', 'Georgia', 'serif'],
        serif: ['Cormorant Garamond', 'Playfair Display', 'Georgia', 'serif'],
      }
    },
  },
  plugins: [],
}
