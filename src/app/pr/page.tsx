'use client'

import { useState } from 'react'
import { PRData, PRFile, PRComment } from '@/lib/github'
import DiffViewer from '@/components/DiffViewer'
import CommentSection from '@/components/CommentSection'

interface PRResponse {
  pr: PRData
  files: PRFile[]
  comments: PRComment[]
}

export default function PRPage() {
  const [prUrl, setPrUrl] = useState('')
  const [prData, setPrData] = useState<PRResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prUrl.trim()) return

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/pr?url=${encodeURIComponent(prUrl)}`)
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">PR Reviewer</h1>
        
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
          </div>
        )}
      </div>
    </div>
  )
}