import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const installationId = searchParams.get('installation_id')
  const setupAction = searchParams.get('setup_action')
  const code = searchParams.get('code')

  console.log('GitHub App installation callback:', { installationId, setupAction, hasCode: !!code })

  if (setupAction === 'install') {
    if (installationId) {
      // Check if we have an OAuth code (when "Request user authorization during installation" is enabled)
      if (code) {
        // Both installation and OAuth code present - redirect to GitHub App page with both
        return NextResponse.redirect(new URL(`/github-app?installation_id=${installationId}&code=${code}&setup=complete`, request.url))
      } else {
        // Just installation - redirect to GitHub App page to start OAuth flow
        return NextResponse.redirect(new URL(`/github-app?installation_id=${installationId}&setup=complete`, request.url))
      }
    } else {
      // Installation ID missing
      return NextResponse.redirect(new URL('/github-app?error=missing_installation_id', request.url))
    }
  } else if (setupAction === 'update') {
    // App permissions were updated
    return NextResponse.redirect(new URL(`/github-app?installation_id=${installationId}&setup=updated`, request.url))
  } else {
    // Unknown setup action or installation was cancelled
    return NextResponse.redirect(new URL('/github-app?error=installation_cancelled', request.url))
  }
}