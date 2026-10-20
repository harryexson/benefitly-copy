// apps/web/app/globals.css is hand-written CSS with no Tailwind directives, so no PostCSS
// plugins are needed here. This file's only job is to stop Next's config loader from walking up
// to the repository-root postcss.config.js, which belongs to the legacy Vite app and is written
// as an ES module (`export default`) that a plain CJS `require()` cannot load.
module.exports = { plugins: {} };
