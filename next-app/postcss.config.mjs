// postcss.config.mjs
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    '@tailwindcss/postcss': {}, // <= به این حالت برگردون
    autoprefixer: {},
  },
};

export default config;