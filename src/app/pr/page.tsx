'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { PRData, PRFile, PRComment } from '@/lib/github'
import { GitHubAppAuthService, GitHubAppUser } from '@/lib/github-app-auth'
import DiffViewer from '@/components/DiffViewer'
import CommentSection from '@/components/CommentSection'
import { useChat } from 'ai/react'

interface PRResponse {
  pr: PRData
  files: PRFile[]
  comments: PRComment[]
}

function PRPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<GitHubAppUser | null>(null)
  const [prUrl, setPrUrl] = useState('')
  const [prData, setPrData] = useState<PRResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [analyzing, setAnalyzing] = useState(false)

  // AI chat integration
  const { messages, input: _input, handleInputChange: _handleInputChange, handleSubmit: handleChatSubmit, isLoading: isAiLoading } = useChat({
    api: '/api/ai/analyze-pr',
    onResponse: () => {
      setAnalyzing(false)
    }
  })

  useEffect(() => {
    const storedUser = GitHubAppAuthService.getStoredAuth()
    setUser(storedUser)

    // Auto-load PR if URL is in search params
    const urlParam = searchParams.get('url')
    if (urlParam) {
      setPrUrl(urlParam)
      handleSubmitWithUrl(urlParam, storedUser)
    }
  }, [searchParams])

  const handleSubmitWithUrl = async (url: string, appUser: GitHubAppUser | null) => {
    if (!url.trim()) return

    // Require installation ID for GitHub App
    const installationId = searchParams.get('installation_id') || appUser?.installation_id
    if (!installationId) {
      setError('Installation ID is required. Please go through the GitHub App authentication flow.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const params = new URLSearchParams({ 
        url,
        installation_id: installationId.toString()
      })

      const response = await fetch(`/api/github-app/pr?${params.toString()}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch PR data')
      }

      setPrData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await handleSubmitWithUrl(prUrl, user)
  }

  const handleConnectGitHub = () => {
    router.push('/github-app')
  }

  const handleLogout = () => {
    GitHubAppAuthService.logout()
  }

  const handleAnalyzePR = async () => {
    if (!prData) return

    setAnalyzing(true)

    // Prepare data for analysis
    const prDescription = prData.pr.body || prData.pr.title
    const changedFiles = prData.files.map(file => file.filename)

    // Collect file changes (up to 5000 lines)
    const fileChanges = prData.files
      .filter(file => file.patch)
      .map(file => `File: ${file.filename}\n${file.patch}`)
      .join('\n\n')

    // Submit for analysis using the chat API
    const formEvent = new Event('submit') as any
    formEvent.preventDefault = () => {}

    handleChatSubmit(formEvent, {
      data: {
        prDescription,
        changedFiles,
        fileChanges
      }
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow mb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/')}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                ← Back to Dashboard
              </button>
              <h1 className="text-2xl font-bold text-gray-900">PR Reviewer</h1>
            </div>
            {user ? (
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
            ) : (
              <button
                onClick={handleConnectGitHub}
                className="bg-gray-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-800 transition-colors text-sm"
              >
                Connect GitHub App
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 sm:p-6">

        <form onSubmit={handleSubmit} className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="url"
              value={prUrl}
              onChange={(e) => setPrUrl(e.target.value)}
              placeholder="Enter GitHub PR URL (e.g., https://github.com/owner/repo/pull/123)"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !prUrl.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap text-sm sm:text-base"
            >
              {loading ? 'Loading...' : 'Review PR'}
            </button>
          </div>
        </form>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}

        {prData && (
          <div className="space-y-6">
            {/* PR Header */}
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 gap-4">
                <div className="flex-1">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-2 break-words">
                    {prData.pr.title}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-2">
                      <img
                        src={prData.pr.user.avatar_url}
                        alt={prData.pr.user.login}
                        className="w-6 h-6 rounded-full"
                      />
                      <span className="break-all">{prData.pr.user.login}</span>
                    </span>
                    <span>#{prData.pr.number}</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      prData.pr.state === 'open' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {prData.pr.state}
                    </span>
                  </div>
                </div>
              </div>

              {prData.pr.body && (
                <div className="prose max-w-none">
                  <div className="whitespace-pre-wrap text-gray-700">
                    {prData.pr.body}
                  </div>
                </div>
              )}
            </div>

            {/* Files Changed */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Files Changed ({prData.files.length})
                </h3>
              </div>
              <div className="p-4 sm:p-6">
                <DiffViewer files={prData.files} comments={prData.comments} />
              </div>
            </div>

            {/* Comments */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Comments ({prData.comments.length})
                </h3>
              </div>
              <div className="p-4 sm:p-6">
                <CommentSection comments={prData.comments} />
              </div>
            </div>

            {/* AI Analysis */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  AI Analysis
                </h3>
                <button
                  onClick={handleAnalyzePR}
                  disabled={analyzing || isAiLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {analyzing || isAiLoading ? 'Analyzing...' : 'Analyze PR'}
                </button>
              </div>
              <div className="p-4 sm:p-6">
                {messages.length > 0 ? (
                  <div className="prose max-w-none">
                    <div className="whitespace-pre-wrap text-gray-700">
                      {messages[messages.length - 1].content}
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500 text-center py-8">
                    {analyzing || isAiLoading ? (
                      <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                        <p>Analyzing PR content...</p>
                      </div>
                    ) : (
                      <p>Click "Analyze PR" to get AI-powered insights about this pull request.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function PRPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md mx-auto text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            PR Focus
          </h1>
          <p className="text-gray-600">
            Loading...
          </p>
        </div>
      </div>
    }>
      <PRPageContent />
    </Suspense>
  )
}
