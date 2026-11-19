import { readFileSync } from 'fs';
import path from 'path';

// Serves a static HTML page from /public as the full response.
export function serveHtml(file) {
  const html = readFileSync(path.join(process.cwd(), 'public', file), 'utf-8');
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
