import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(new URL(`/?error=${error}`, request.url))
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/?error=missing_params', request.url))
  }

  // Extract installation ID from state
  const installationId = state.split('-')[0]
  
  // Redirect to home page with the code and installation ID for client-side processing
  return NextResponse.redirect(new URL(`/?code=${code}&installation_id=${installationId}`, request.url))
}