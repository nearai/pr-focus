import { NextRequest, NextResponse } from 'next/server'
import { GitHubAppAuthService } from '@/lib/github-app-auth'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization token required' }, { status: 401 })
    }

    const userToken = authHeader.substring(7)

    // Get user's app installations
    const installationsResponse = await fetch('https://api.github.com/user/installations', {
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    })

    if (!installationsResponse.ok) {
      throw new Error('Failed to fetch installations')
    }

    const installationsData = await installationsResponse.json()

    // Filter installations for this app
    const appId = process.env.NEXT_PUBLIC_GITHUB_APP_ID
    const appInstallations = installationsData.installations.filter(
      (installation: any) => installation.app_id.toString() === appId
    )

    // Get detailed info for each installation
    const appClient = GitHubAppAuthService.createAppClient()
    const installations = await Promise.all(
      appInstallations.map(async (installation: any) => {
        try {
          const installationClient = GitHubAppAuthService.createInstallationClient(installation.id)
          
          // Get repositories for this installation
          const { data: repos } = await installationClient.rest.apps.listReposAccessibleToInstallation()
          
          return {
            id: installation.id,
            account: {
              login: installation.account.login,
              type: installation.account.type,
              avatar_url: installation.account.avatar_url,
            },
            permissions: installation.permissions,
            repository_selection: installation.repository_selection,
            repositories: repos.repositories.map(repo => ({
              id: repo.id,
              name: repo.name,
              full_name: repo.full_name,
            }))
          }
        } catch (error) {
          console.error(`Error fetching repos for installation ${installation.id}:`, error)
          return {
            id: installation.id,
            account: {
              login: installation.account.login,
              type: installation.account.type,
              avatar_url: installation.account.avatar_url,
            },
            permissions: installation.permissions,
            repository_selection: installation.repository_selection,
            repositories: []
          }
        }
      })
    )

    return NextResponse.json({ installations })
  } catch (error) {
    console.error('Error fetching installations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch installations' },
      { status: 500 }
    )
  }
}