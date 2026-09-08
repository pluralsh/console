import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

/** Kapa widget backend; browser/iframe may send this Origin when requesting docs assets. */
const KAPA_WIDGET_PROXY = 'https://kapa-widget-proxy-la7dkmplpq-uc.a.run.app'

function corsAllowedOrigin(origin: string | null): string | null {
  if (!origin) {
    return null
  }
  if (origin === KAPA_WIDGET_PROXY) {
    return origin
  }
  if (origin === 'https://docs.plural.sh') {
    return origin
  }
  if (/^https:\/\/docs-pr-\d+\.plural\.sh$/.test(origin)) {
    return origin
  }
  if (origin.startsWith('http://localhost:')) {
    return origin
  }

  return null
}

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin')
  const allowOrigin = corsAllowedOrigin(origin)

  if (request.method === 'OPTIONS' && allowOrigin) {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': allowOrigin,
        'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
        'Access-Control-Allow-Headers':
          request.headers.get('access-control-request-headers') || '*',
        'Access-Control-Max-Age': '86400',
        Vary: 'Origin',
      },
    })
  }

  const res = NextResponse.next()

  if (allowOrigin) {
    res.headers.set('Access-Control-Allow-Origin', allowOrigin)
    res.headers.set('Vary', 'Origin')
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
}
