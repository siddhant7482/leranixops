// This app uses plain CSS — no PostCSS plugins. Declaring an (empty) config here
// also stops postcss-load-config from walking up and picking up the parent
// Learnix app's Tailwind PostCSS config (which isn't installed in ops/).
const config = { plugins: {} };
export default config;
