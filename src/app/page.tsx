'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { AuthService, AuthUser } from '@/lib/auth'
import { PRSummary } from '@/lib/github'
import PRList from '@/components/PRList'

function HomeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [prs, setPRs] = useState<{
    assignedPRs: PRSummary[]
    createdPRs: PRSummary[]
  }>({ assignedPRs: [], createdPRs: [] })
  const [prsLoading, setPRsLoading] = useState(false)

  useEffect(() => {
    const initAuth = async () => {
      const code = searchParams.get('code')
      const error = searchParams.get('error')

      if (error) {
        console.error('OAuth error:', error)
        setLoading(false)
        return
      }

      if (code) {
        try {
          const authUser = await AuthService.exchangeCodeForToken(code)
          setUser(authUser)
          router.replace('/')
        } catch (error) {
          console.error('Failed to exchange code for token:', error)
        }
      } else {
        const storedUser = AuthService.getStoredAuth()
        setUser(storedUser)
      }
      
      setLoading(false)
    }

    initAuth()
  }, [searchParams, router])

  useEffect(() => {
    const fetchPRs = async () => {
      if (!user) return
      
      setPRsLoading(true)
      try {
        const response = await fetch(`/api/user/prs?token=${user.access_token}&username=${user.login}`)
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
  }, [user])

  const handleConnectGitHub = () => {
    window.location.href = AuthService.getAuthUrl()
  }

  const handleLogout = () => {
    AuthService.logout()
  }

  const handlePRClick = (owner: string, repo: string, number: number) => {
    router.push(`/pr?url=https://github.com/${owner}/${repo}/pull/${number}`)
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

  if (!user) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            PR Focus
          </h1>
          <p className="text-gray-600 mb-8">
            Connect your GitHub account to view your pull requests and reviews
          </p>
          <div className="space-y-4">
            <button
              onClick={handleConnectGitHub}
              className="bg-gray-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors flex items-center space-x-2 mx-auto"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              <span>Connect to GitHub (OAuth)</span>
            </button>
            
            <div className="text-center">
              <span className="text-gray-500 text-sm">or</span>
            </div>
            
            <button
              onClick={() => router.push('/github-app')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2 mx-auto"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              <span>Use GitHub App (Recommended)</span>
            </button>
            
            <p className="text-xs text-gray-500 text-center max-w-sm mx-auto">
              GitHub App provides more granular permissions and better security. OAuth is provided for backward compatibility.
            </p>
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
                src={user.avatar_url}
                alt={user.login}
                className="w-8 h-8 rounded-full"
              />
              <span className="text-sm font-medium text-gray-700">
                {user.name}
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
        </div>

        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Review a Specific PR
          </h2>
          <p className="text-gray-600 mb-4">
            Enter a GitHub PR URL to review it directly
          </p>
          <button
            onClick={() => router.push('/pr')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Go to PR Reviewer
          </button>
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