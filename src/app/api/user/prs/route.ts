import { NextRequest, NextResponse } from 'next/server'
import { GitHubClient } from '@/lib/github'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  const username = searchParams.get('username')

  if (!token || !username) {
    return NextResponse.json({ error: 'Token and username are required' }, { status: 400 })
  }

  try {
    const client = new GitHubClient(token)
    
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