import { serveHtml } from '../../lib/serve-html';

export async function GET() {
  return serveHtml('home-services.html');
}
