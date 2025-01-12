import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Bakım modunu kontrol et
  const maintenanceMode = process.env.NEXT_PUBLIC_MAINTENANCE_MODE;
  console.log('Maintenance Mode:', maintenanceMode); // Debug için log ekledik
  
  const isMaintenanceMode = maintenanceMode === '1';
  const isMaintenancePage = request.nextUrl.pathname === '/maintenance';
  
  // API rotalarını ve statik dosyaları kontrol et
  const isApiRoute = request.nextUrl.pathname.startsWith('/api');
  const isStaticFile = request.nextUrl.pathname.match(/\.(jpg|jpeg|png|gif|ico|css|js|svg)$/);
  
  // API rotaları ve statik dosyalar için middleware'i atla
  if (isApiRoute || isStaticFile) {
    return NextResponse.next();
  }

  // Bakım modu aktifse ve maintenance sayfasında değilse yönlendir
  if (isMaintenanceMode && !isMaintenancePage) {
    return NextResponse.redirect(new URL('/maintenance', request.url));
  }

  // Bakım modu kapalıysa ve maintenance sayfasındaysa ana sayfaya yönlendir
  if (!isMaintenanceMode && isMaintenancePage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

// Middleware'in çalışacağı path'leri belirt
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 