/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        "dark-1":"#121212", // darkest
        "dark-2":"#161616",
        "dark-3":"#1e1e1e",
        "dark-4":"#272727", 
        "dark-5":"#303030",  // lightest

        "light-1":"#b0bfe6", //abbeed
        "light-2":"#6c7da7",

        "accent-1":"hsl(180, 60%, 70%)",
        "accent-2":"#d8b4fe"

      },
    }, 
    
  },
  plugins: [],
}

// Blue background colors
// "dark-1":"#111620", // darkest
// "dark-2":"#161C29",
// "dark-3":"#151b2a", 
// "dark-4":"#1a202f", 
// "dark-5":"#546694", // lightest