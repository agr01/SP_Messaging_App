/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        "dark-1":"#111620", // darkest
        "dark-2":"#161C29",
        "dark-3":"#151b2a", 
        "dark-4":"#1a202f", // lightest
        "light-1":"#b0bfe6", //abbeed
        "light-2":"#6c7da7",
      },
    }, 
    
  },
  plugins: [],
}

