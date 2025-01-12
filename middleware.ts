import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Bakım modunu kontrol et
  const maintenanceMode = process.env.NEXT_PUBLIC_MAINTENANCE_MODE;
  console.log('Environment Variables:', {
    NEXT_PUBLIC_MAINTENANCE_MODE: process.env.NEXT_PUBLIC_MAINTENANCE_MODE,
    NODE_ENV: process.env.NODE_ENV
  });
  
  const isMaintenanceMode = maintenanceMode === '1' || maintenanceMode === 'true';
  const isMaintenancePage = request.nextUrl.pathname === '/maintenance';
  
  // API rotalarını ve statik dosyaları kontrol et
  const isApiRoute = request.nextUrl.pathname.startsWith('/api');
  const isStaticFile = request.nextUrl.pathname.match(/\.(jpg|jpeg|png|gif|ico|css|js|svg)$/);
  
  console.log('Middleware Check:', {
    path: request.nextUrl.pathname,
    isMaintenanceMode,
    isMaintenancePage,
    isApiRoute,
    isStaticFile
  });

  // API rotaları ve statik dosyalar için middleware'i atla
  if (isApiRoute || isStaticFile) {
    return NextResponse.next();
  }

  // Bakım modu aktifse ve maintenance sayfasında değilse yönlendir
  if (isMaintenanceMode && !isMaintenancePage) {
    console.log('Redirecting to maintenance page');
    return NextResponse.redirect(new URL('/maintenance', request.url));
  }

  // Bakım modu kapalıysa ve maintenance sayfasındaysa ana sayfaya yönlendir
  if (!isMaintenanceMode && isMaintenancePage) {
    console.log('Redirecting to home page');
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