import { readFile } from 'node:fs/promises';

await import('./build.mjs');

const projectRoot = new URL('../', import.meta.url);
const [sourceHtml, javascript, pagesHtml, standaloneHtml] = await Promise.all([
  readFile(new URL('src/index.html', projectRoot), 'utf8'),
  readFile(new URL('src/scripts/app.js', projectRoot), 'utf8'),
  readFile(new URL('dist/index.html', projectRoot), 'utf8'),
  readFile(new URL('dist/通知校编器.html', projectRoot), 'utf8')
]);

new Function(javascript);

const sourceReferences = [
  '<link rel="stylesheet" href="./styles/app.css">',
  '<script src="./scripts/app.js"></script>'
];

for (const reference of sourceReferences) {
  if (!sourceHtml.includes(reference)) {
    throw new Error(`开发入口缺少资源引用：${reference}`);
  }
  if (pagesHtml.includes(reference) || standaloneHtml.includes(reference)) {
    throw new Error(`发布文件仍然包含外部资源引用：${reference}`);
  }
}

if (pagesHtml !== standaloneHtml) {
  throw new Error('GitHub Pages 入口与单文件版本内容不一致。');
}

const ids = [...sourceHtml.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);

if (duplicateIds.length > 0) {
  throw new Error(`HTML 中存在重复 id：${[...new Set(duplicateIds)].join(', ')}`);
}

console.log('检查通过：JavaScript 语法、资源引用、单文件构建和 HTML id 均正常。');
