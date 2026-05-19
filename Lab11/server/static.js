import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '..', 'public');

const contentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8']
]);

export async function tryServeStatic(req, res, pathname) {
  if (req.method !== 'GET') return false;

  const filePath = pathname === '/' ? '/index.html' : pathname;
  const normalizedPath = path.normalize(filePath).replace(/^([.][.][/\\])+/, '');
  const absolutePath = path.join(publicDir, normalizedPath);

  if (!absolutePath.startsWith(publicDir)) return false;

  try {
    const data = await readFile(absolutePath);
    const extension = path.extname(absolutePath);
    res.statusCode = 200;
    res.setHeader('Content-Type', contentTypes.get(extension) ?? 'application/octet-stream');
    res.end(data);
    return true;
  } catch {
    return false;
  }
}
