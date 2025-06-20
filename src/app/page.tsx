'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { GitHubAppAuthService, GitHubAppUser, GitHubAppInstallation } from '@/lib/github-app-auth'
import { PRSummary } from '@/lib/github'
import PRList from '@/components/PRList'
import GitHubAppInstallations from '@/components/GitHubAppInstallations'

function HomeContent() {
  const router = useRouter()
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
      // Check if we have URL parameters that indicate authentication is in progress
      const urlParams = new URLSearchParams(window.location.search)
      const hasAuthParams = urlParams.has('code') || urlParams.has('installation_id') || urlParams.has('setup')
      
      if (hasAuthParams) {
        // Authentication/installation is in progress, redirect to GitHub App page
        router.push(`/github-app${window.location.search}`)
        return
      }
      
      const storedUser = GitHubAppAuthService.getStoredAuth()
      
      if (!storedUser) {
        // No stored authentication, redirect to GitHub App page for installation
        router.push('/github-app')
        return
      }
      
      setAppUser(storedUser)
      setSelectedInstallation(storedUser.installation_id)
      setLoading(false)
    }

    initAuth()
  }, [router])

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

  const handleInstallationSelect = (installationId: number) => {
    setSelectedInstallation(installationId)
    if (appUser) {
      const updatedUser = { ...appUser, installation_id: installationId }
      GitHubAppAuthService.setStoredAuth(updatedUser)
      setAppUser(updatedUser)
    }
  }

  const handleLogout = () => {
    GitHubAppAuthService.logout()
  }

  const handlePRClick = (owner: string, repo: string, number: number) => {
    router.push(`/pr?url=https://github.com/${owner}/${repo}/pull/${number}&installation_id=${selectedInstallation}`)
  }

  const handleInstallApp = () => {
    window.location.href = GitHubAppAuthService.getInstallationUrl()
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
            Loading your dashboard...
          </p>
        </div>
      </main>
    )
  }

  if (!appUser) {
    return null // This will redirect to /github-app
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
            <h1 className="text-2xl font-bold text-gray-900">PR Focus Dashboard</h1>
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

export default function Home() {
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
      <HomeContent />
    </Suspense>
  )
}