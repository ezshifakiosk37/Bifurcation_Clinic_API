import { NextRequest, NextResponse } from 'next/server'

export function proxy(request: NextRequest) {
  console.log("--- MIDDLEWARE IS RUNNING ON PATH:", request.nextUrl.pathname);
  const session = request.cookies.get('user_session')
  const { pathname } = request.nextUrl

  // 1. Define pages that should be accessible WITHOUT logging in
  const isPublicPage = pathname === '/sign-in' || pathname === '/sign-up'
  const isApiAuth = pathname.startsWith('/api/auth')

  console.log("Path:", pathname, "Session exists:", !!session);

  // 2. Logic: If no session and trying to access a private page
  if (!session && !isPublicPage && !isApiAuth) {
    return NextResponse.redirect(new URL('/sign-in', request.url))
  }

  if (pathname.startsWith('/researchCenter')) {
    if (session?.value !== 'Admin') {
      console.log(`Access Denied: ${session?.value} tried to access Research Center`);
      // Redirect unauthorized users to the home page or an error page
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // 3. Logic: If ALREADY logged in, don't let them go to the login page
  if (session && isPublicPage) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  // This matcher catches everything except static files (images, css, etc.)
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}