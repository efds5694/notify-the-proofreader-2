import { mkdir, readFile, writeFile } from 'node:fs/promises';

const projectRoot = new URL('../', import.meta.url);
const sourceHtmlPath = new URL('src/index.html', projectRoot);
const sourceCssPath = new URL('src/styles/app.css', projectRoot);
const sourceJsPath = new URL('src/scripts/app.js', projectRoot);
const outputDirectory = new URL('dist/', projectRoot);
const pagesOutputPath = new URL('index.html', outputDirectory);
const standaloneOutputPath = new URL('通知校编器.html', outputDirectory);

const [html, css, javascript] = await Promise.all([
  readFile(sourceHtmlPath, 'utf8'),
  readFile(sourceCssPath, 'utf8'),
  readFile(sourceJsPath, 'utf8')
]);

const stylesheetTag = '  <link rel="stylesheet" href="./styles/app.css">';
const scriptTag = '  <script src="./scripts/app.js"></script>';

if (!html.includes(stylesheetTag) || !html.includes(scriptTag)) {
  throw new Error('src/index.html 缺少预期的样式或脚本引用，无法构建。');
}

const bundledHtml = html
  .replace(stylesheetTag, `  <style>\n${css.trimEnd()}\n  </style>`)
  .replace(scriptTag, `  <script>\n${javascript.trimEnd()}\n  </script>`);

await mkdir(outputDirectory, { recursive: true });
await Promise.all([
  writeFile(pagesOutputPath, bundledHtml),
  writeFile(standaloneOutputPath, bundledHtml)
]);

console.log(`已生成 ${decodeURIComponent(pagesOutputPath.pathname)}`);
console.log(`已生成 ${decodeURIComponent(standaloneOutputPath.pathname)}`);
