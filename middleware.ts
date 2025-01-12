import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Check if site is in maintenance mode
  if (process.env.NEXT_PUBLIC_MAINTENANCE_MODE === '0') {
    return NextResponse.rewrite(new URL('/maintenance', request.url))
  }

  return NextResponse.next()
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - maintenance (maintenance page itself)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|maintenance).*)',
  ],
} 