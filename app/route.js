import { serveHtml } from '../lib/serve-html';

// syncdup.tech is the agency site. Until the general home page exists, its root shows /home-services.
// Every other host (the old lead-dashboard-wheat-psi.vercel.app URL printed on school flyers,
// prentice-alston-portfolio.com, preview deploys) goes to /schools so old QR codes keep working.
const AGENCY_HOSTS = new Set(['syncdup.tech', 'www.syncdup.tech']);

export async function GET(request) {
  const host = (request.headers.get('host') || '').toLowerCase().split(':')[0];
  if (AGENCY_HOSTS.has(host)) return serveHtml('home-services.html');

  const url = new URL(request.url);
  url.pathname = '/schools';
  return Response.redirect(url, 307);
}
