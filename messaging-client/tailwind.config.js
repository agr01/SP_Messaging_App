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

        "light-1":"#b0bfe6",
        "light-2":"#6c7da7",

        "accent-1":"hsl(336, 56%, 43%)",

      },
    }, 
    
  },
  plugins: [],
}