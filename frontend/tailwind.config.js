/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f5f3ff',
          100: '#ede9fe',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
        },
        platform: {
          myntra:  '#FF3F6C',
          amazon:  '#FF9900',
          flipkart:'#2874F0',
          ajio:    '#222222',
          nykaa:   '#FC2779',
          meesho:  '#9B2DEE',
        }
      }
    }
  },
  plugins: []
}
