import { NextRequest, NextResponse } from 'next/server'
import { GitHubClient } from '@/lib/github'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const installationId = searchParams.get('installation_id')
  const username = searchParams.get('username')

  if (!installationId || !username) {
    return NextResponse.json({ error: 'Installation ID and username are required' }, { status: 400 })
  }

  try {
    const client = GitHubClient.createWithInstallation(parseInt(installationId))
    
    const [assignedPRs, createdPRs] = await Promise.all([
      client.getUserAssignedPRs(username),
      client.getUserCreatedPRs(username)
    ])

    return NextResponse.json({
      assignedPRs,
      createdPRs
    })
  } catch (error) {
    console.error('Error fetching user PRs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user PRs' },
      { status: 500 }
    )
  }
}