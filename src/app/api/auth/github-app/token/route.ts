import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { code, installation_id } = await request.json()

    if (!code || !installation_id) {
      return NextResponse.json({ error: 'Code and installation_id are required' }, { status: 400 })
    }

    // Exchange code for user access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_APP_CLIENT_ID,
        client_secret: process.env.GITHUB_APP_CLIENT_SECRET,
        code,
      }),
    })

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for token')
    }

    const tokenData = await tokenResponse.json()

    if (tokenData.error) {
      return NextResponse.json({ error: tokenData.error }, { status: 400 })
    }

    // Get user info with the access token
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    })

    if (!userResponse.ok) {
      throw new Error('Failed to fetch user info')
    }

    const user = await userResponse.json()

    return NextResponse.json({ 
      access_token: tokenData.access_token,
      user 
    })
  } catch (error) {
    console.error('Error exchanging code for token:', error)
    return NextResponse.json(
      { error: 'Failed to exchange code for token' },
      { status: 500 }
    )
  }
}