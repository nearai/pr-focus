import { NextRequest, NextResponse } from 'next/server'
import { GitHubClient, parsePRUrl } from '@/lib/github'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')
  const installationId = searchParams.get('installation_id')

  if (!url) {
    return NextResponse.json({ error: 'PR URL is required' }, { status: 400 })
  }

  if (!installationId) {
    return NextResponse.json({ error: 'Installation ID is required' }, { status: 400 })
  }

  const parsed = parsePRUrl(url)
  if (!parsed) {
    return NextResponse.json({ error: 'Invalid GitHub PR URL' }, { status: 400 })
  }

  try {
    const client = GitHubClient.createWithInstallation(parseInt(installationId))
    const { owner, repo, pullNumber } = parsed

    const [pr, files, comments] = await Promise.all([
      client.getPR(owner, repo, pullNumber),
      client.getPRFiles(owner, repo, pullNumber),
      client.getPRComments(owner, repo, pullNumber),
    ])

    return NextResponse.json({
      pr,
      files,
      comments,
    })
  } catch (error) {
    console.error('Error fetching PR data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch PR data' },
      { status: 500 }
    )
  }
}