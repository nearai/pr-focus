import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const installationId = searchParams.get('installation_id')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  console.log('GitHub App OAuth callback:', { code: !!code, installationId, state, error })

  if (error) {
    return NextResponse.redirect(new URL(`/github-app?error=${error}`, request.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL('/github-app?error=missing_code', request.url))
  }

  // Handle both scenarios:
  // 1. Direct installation callback with installation_id parameter
  // 2. Manual OAuth flow with installation_id in state parameter
  let finalInstallationId = installationId
  if (!finalInstallationId && state) {
    // Extract installation ID from state (manual OAuth flow)
    finalInstallationId = state.split('-')[0]
  }

  if (!finalInstallationId) {
    return NextResponse.redirect(new URL('/github-app?error=missing_installation_id', request.url))
  }
  
  // Redirect to github-app page with the code and installation ID for client-side processing
  return NextResponse.redirect(new URL(`/github-app?code=${code}&installation_id=${finalInstallationId}`, request.url))
}