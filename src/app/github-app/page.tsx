'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { GitHubAppAuthService, GitHubAppUser, GitHubAppInstallation } from '@/lib/github-app-auth'
import { PRSummary } from '@/lib/github'
import PRList from '@/components/PRList'
import GitHubAppInstallations from '@/components/GitHubAppInstallations'

function GitHubAppContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [appUser, setAppUser] = useState<GitHubAppUser | null>(null)
  const [installations, setInstallations] = useState<GitHubAppInstallation[]>([])
  const [selectedInstallation, setSelectedInstallation] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [prs, setPRs] = useState<{
    assignedPRs: PRSummary[]
    createdPRs: PRSummary[]
  }>({ assignedPRs: [], createdPRs: [] })
  const [prsLoading, setPRsLoading] = useState(false)

  useEffect(() => {
    const initAuth = async () => {
      const code = searchParams.get('code')
      const installationId = searchParams.get('installation_id')
      const setup = searchParams.get('setup')
      const error = searchParams.get('error')

      if (error) {
        console.error('GitHub App error:', error)
        setLoading(false)
        return
      }

      // Handle installation completion
      if (setup === 'complete' && installationId) {
        console.log('GitHub App installation completed:', installationId)
        // Clear URL params and proceed to authorize the user
        router.replace('/github-app')
        const authUrl = GitHubAppAuthService.getAuthUrl(parseInt(installationId))
        window.location.href = authUrl
        return
      }

      // Handle OAuth code exchange
      if (code && installationId) {
        try {
          const authUser = await GitHubAppAuthService.exchangeCodeForToken(code, parseInt(installationId))
          setAppUser(authUser)
          setSelectedInstallation(authUser.installation_id)
          router.replace('/github-app')
        } catch (error) {
          console.error('Failed to exchange code for token:', error)
        }
      } else {
        const storedUser = GitHubAppAuthService.getStoredAuth()
        setAppUser(storedUser)
        if (storedUser) {
          setSelectedInstallation(storedUser.installation_id)
        }
      }
      
      setLoading(false)
    }

    initAuth()
  }, [searchParams, router])

  useEffect(() => {
    const fetchInstallations = async () => {
      if (!appUser?.access_token) return
      
      try {
        const userInstallations = await GitHubAppAuthService.getUserInstallations(appUser.access_token)
        setInstallations(userInstallations)
      } catch (error) {
        console.error('Failed to fetch installations:', error)
      }
    }

    fetchInstallations()
  }, [appUser])

  useEffect(() => {
    const fetchPRs = async () => {
      if (!appUser || !selectedInstallation) return
      
      setPRsLoading(true)
      try {
        const response = await fetch(`/api/github-app/user/prs?installation_id=${selectedInstallation}&username=${appUser.login}`)
        if (response.ok) {
          const data = await response.json()
          setPRs(data)
        }
      } catch (error) {
        console.error('Failed to fetch PRs:', error)
      } finally {
        setPRsLoading(false)
      }
    }

    fetchPRs()
  }, [appUser, selectedInstallation])

  const handleInstallApp = () => {
    window.location.href = GitHubAppAuthService.getInstallationUrl()
  }

  const handleInstallationSelect = (installationId: number) => {
    setSelectedInstallation(installationId)
    if (appUser) {
      const updatedUser = { ...appUser, installation_id: installationId }
      GitHubAppAuthService.setStoredAuth(updatedUser)
      setAppUser(updatedUser)
    }
  }

  const handleAuthorize = (installationId: number) => {
    window.location.href = GitHubAppAuthService.getAuthUrl(installationId)
  }

  const handleLogout = () => {
    GitHubAppAuthService.logout()
  }

  const handlePRClick = (owner: string, repo: string, number: number) => {
    router.push(`/pr?url=https://github.com/${owner}/${repo}/pull/${number}&installation_id=${selectedInstallation}`)
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md mx-auto text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            PR Focus
          </h1>
          <p className="text-gray-600">
            Loading...
          </p>
        </div>
      </main>
    )
  }

  if (!appUser) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            PR Focus GitHub App
          </h1>
          <p className="text-gray-600 mb-8">
            Install the PR Focus GitHub App to get started with granular permissions
          </p>
          
          <div className="space-y-4">
            <button
              onClick={handleInstallApp}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2 mx-auto"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              <span>Install GitHub App</span>
            </button>
            
            <button
              onClick={() => router.push('/')}
              className="text-gray-500 hover:text-gray-700 transition-colors text-sm"
            >
              ← Back to OAuth login
            </button>
          </div>
        </div>
      </main>
    )
  }

  if (installations.length === 0) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <h1 className="text-2xl font-bold text-gray-900">PR Focus</h1>
              <div className="flex items-center space-x-4">
                <img
                  src={appUser.avatar_url}
                  alt={appUser.login}
                  className="w-8 h-8 rounded-full"
                />
                <span className="text-sm font-medium text-gray-700">
                  {appUser.name}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              No App Installations Found
            </h2>
            <p className="text-gray-600 mb-6">
              You need to install the PR Focus app to your repositories first.
            </p>
            <button
              onClick={handleInstallApp}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Install GitHub App
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">PR Focus</h1>
            <div className="flex items-center space-x-4">
              <img
                src={appUser.avatar_url}
                alt={appUser.login}
                className="w-8 h-8 rounded-full"
              />
              <span className="text-sm font-medium text-gray-700">
                {appUser.name}
              </span>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div>
            <GitHubAppInstallations
              installations={installations}
              onInstallationSelect={handleInstallationSelect}
              selectedInstallation={selectedInstallation || undefined}
            />
          </div>
          
          <div className="lg:col-span-2">
            {selectedInstallation ? (
              <div className="space-y-8">
                <div>
                  {prsLoading ? (
                    <div className="bg-white rounded-lg shadow p-6 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading PRs...</p>
                    </div>
                  ) : (
                    <PRList
                      title="Pull Requests to Review"
                      prs={prs.assignedPRs}
                      onPRClick={handlePRClick}
                    />
                  )}
                </div>
                
                <div>
                  {prsLoading ? (
                    <div className="bg-white rounded-lg shadow p-6 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading PRs...</p>
                    </div>
                  ) : (
                    <PRList
                      title="Your Pull Requests"
                      prs={prs.createdPRs}
                      onPRClick={handlePRClick}
                    />
                  )}
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Review a Specific PR
                  </h2>
                  <p className="text-gray-600 mb-4">
                    Enter a GitHub PR URL to review it directly
                  </p>
                  <button
                    onClick={() => router.push(`/pr?installation_id=${selectedInstallation}`)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    Go to PR Reviewer
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-6 text-center">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Select an Installation
                </h2>
                <p className="text-gray-600">
                  Choose a GitHub App installation from the left to view your PRs.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

export default function GitHubAppPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md mx-auto text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            PR Focus
          </h1>
          <p className="text-gray-600">
            Loading...
          </p>
        </div>
      </main>
    }>
      <GitHubAppContent />
    </Suspense>
  )
}