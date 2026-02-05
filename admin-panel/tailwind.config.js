/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sidebar: {
          bg: '#2c3e50',
          hover: '#34495e',
          active: '#1a252f',
          text: '#ecf0f1',
        },
        header: {
          blue: '#3498db',
          darker: '#2980b9',
        },
        table: {
          head: '#4a5568',
          rowAlt: '#f7fafc',
        },
      },
    },
  },
  plugins: [],
}
