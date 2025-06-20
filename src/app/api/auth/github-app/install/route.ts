import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const installationId = searchParams.get('installation_id')
  const setupAction = searchParams.get('setup_action')

  console.log('GitHub App installation callback:', { installationId, setupAction })

  if (setupAction === 'install') {
    if (installationId) {
      // Successful installation - redirect to GitHub App page with installation ID
      return NextResponse.redirect(new URL(`/github-app?installation_id=${installationId}&setup=complete`, request.url))
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