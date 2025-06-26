'use client'

import { PRComment } from '@/lib/github'
import { useState } from 'react'

interface CommentSectionProps {
  comments: PRComment[]
}

type FilterType = 'all' | 'general' | 'inline' | string

interface AIReviewer {
  name: string
  displayName: string
  comments: PRComment[]
}

export default function CommentSection({ comments }: CommentSectionProps) {
  const [filter, setFilter] = useState<FilterType>('all')
  const [expandedAIComments, setExpandedAIComments] = useState<Record<string, Set<number>>>({})
  
  // AI Reviewer detection patterns
  const isAIReviewer = (username: string): boolean => {
    const aiPatterns = [
      /^copilot$/i,
      /^claude$/i,
      /^github-copilot\[bot\]$/i,
      /^github-actions\[bot\]$/i,
      /.*\[bot\]$/i,
      /^dependabot$/i,
      /^renovate$/i,
    ]
    return aiPatterns.some(pattern => pattern.test(username))
  }

  const getAIReviewerDisplayName = (username: string): string => {
    if (/^copilot$/i.test(username) || /^github-copilot\[bot\]$/i.test(username)) {
      return 'Copilot'
    }
    if (/^claude$/i.test(username)) {
      return 'Claude'
    }
    if (/^github-actions\[bot\]$/i.test(username)) {
      return 'GitHub Actions'
    }
    if (/^dependabot$/i.test(username)) {
      return 'Dependabot'
    }
    if (/^renovate$/i.test(username)) {
      return 'Renovate'
    }
    // Generic bot name cleanup
    return username.replace(/\[bot\]$/i, '').replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  // Group comments by AI reviewers
  const aiReviewers: AIReviewer[] = []
  const aiCommentsByReviewer: Record<string, PRComment[]> = {}

  comments.forEach(comment => {
    if (isAIReviewer(comment.user.login)) {
      const reviewerKey = comment.user.login.toLowerCase()
      if (!aiCommentsByReviewer[reviewerKey]) {
        aiCommentsByReviewer[reviewerKey] = []
      }
      aiCommentsByReviewer[reviewerKey].push(comment)
    }
  })

  // Create AI reviewer objects, sorted by most recent comment
  Object.entries(aiCommentsByReviewer).forEach(([reviewerKey, reviewerComments]) => {
    const sortedComments = reviewerComments.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    aiReviewers.push({
      name: reviewerKey,
      displayName: getAIReviewerDisplayName(reviewerComments[0].user.login),
      comments: sortedComments
    })
  })

  // Sort AI reviewers by most recent comment
  aiReviewers.sort((a, b) => 
    new Date(b.comments[0].created_at).getTime() - new Date(a.comments[0].created_at).getTime()
  )

  const generalComments = comments.filter(comment => !comment.path)
  const inlineComments = comments.filter(comment => comment.path)

  // Toggle expanded state for AI comments
  const toggleAIComment = (reviewerName: string, commentId: number) => {
    setExpandedAIComments(prev => {
      const newState = { ...prev }
      if (!newState[reviewerName]) {
        newState[reviewerName] = new Set()
      }
      if (newState[reviewerName].has(commentId)) {
        newState[reviewerName].delete(commentId)
      } else {
        newState[reviewerName].add(commentId)
      }
      if (newState[reviewerName].size === 0) {
        delete newState[reviewerName]
      }
      return newState
    })
  }
  
  // Get filtered comments based on selected tab
  const getFilteredComments = (): PRComment[] => {
    if (filter === 'general') return generalComments
    if (filter === 'inline') return inlineComments
    if (filter === 'all') return comments
    
    // Check if it's an AI reviewer filter
    const aiReviewer = aiReviewers.find(reviewer => reviewer.name === filter)
    return aiReviewer ? aiReviewer.comments : comments
  }

  const filteredComments = getFilteredComments()
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  
  return (
    <div>
      {/* Filter tabs */}
      <div className="flex flex-wrap gap-1 mb-6 border-b border-gray-200">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            filter === 'all' 
              ? 'border-blue-500 text-blue-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          All ({comments.length})
        </button>
        <button
          onClick={() => setFilter('general')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            filter === 'general' 
              ? 'border-blue-500 text-blue-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          General ({generalComments.length})
        </button>
        <button
          onClick={() => setFilter('inline')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            filter === 'inline' 
              ? 'border-blue-500 text-blue-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Code ({inlineComments.length})
        </button>
        
        {/* AI Reviewer tabs */}
        {aiReviewers.map((aiReviewer) => (
          <button
            key={aiReviewer.name}
            onClick={() => setFilter(aiReviewer.name)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              filter === aiReviewer.name 
                ? 'border-purple-500 text-purple-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
            {aiReviewer.displayName} ({aiReviewer.comments.length})
          </button>
        ))}
      </div>
      
      {/* Comments list */}
      <div className="space-y-4">
        {filteredComments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No {filter === 'all' ? '' : filter + ' '}comments found
          </div>
        ) : (
          filteredComments.map((comment, index) => {
            const isAIReviewerTab = aiReviewers.some(reviewer => reviewer.name === filter)
            const isFirstComment = index === 0
            const isExpanded = isAIReviewerTab ? 
              expandedAIComments[filter]?.has(comment.id) || isFirstComment :
              true
            const showCollapsibleHeader = isAIReviewerTab && filteredComments.length > 1

            return (
              <div key={comment.id}>
                {/* Collapsible header for AI reviewer tabs */}
                {showCollapsibleHeader && (
                  <button
                    onClick={() => toggleAIComment(filter, comment.id)}
                    className="w-full text-left mb-2 p-2 bg-purple-50 rounded-t-lg border border-purple-200 hover:bg-purple-100 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-purple-700">
                        Comment {index + 1} - {formatDate(comment.created_at)}
                      </span>
                      {comment.path && (
                        <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded">
                          Code comment
                        </span>
                      )}
                    </div>
                    <div className="text-purple-600">
                      {isExpanded ? '−' : '+'}
                    </div>
                  </button>
                )}
                
                {/* Comment content */}
                {isExpanded && (
                  <div className={`border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow ${
                    showCollapsibleHeader ? 'rounded-t-none border-t-0' : ''
                  }`}>
                    {/* Comment header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={comment.user.avatar_url}
                          alt={comment.user.login}
                          className="w-8 h-8 rounded-full"
                        />
                        <div>
                          <div className="font-medium text-gray-900">
                            {comment.user.login}
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatDate(comment.created_at)}
                          </div>
                        </div>
                      </div>
                      
                      {/* Inline comment badge - only show in non-AI tabs */}
                      {comment.path && !isAIReviewerTab && (
                        <div className="flex flex-col items-end gap-1">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                            Code comment
                          </span>
                          <div className="text-xs text-gray-500 text-right">
                            <div className="font-mono">{comment.path}</div>
                            {comment.line && (
                              <div>Line {comment.line}</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Comment body */}
                    <div className="prose prose-sm max-w-none">
                      <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                        {comment.body}
                      </div>
                    </div>
                    
                    {/* File path for AI reviewer tabs */}
                    {isAIReviewerTab && comment.path && (
                      <div className="mt-3 text-xs text-gray-500 bg-gray-50 rounded p-2">
                        <div className="font-mono">{comment.path}</div>
                        {comment.line && (
                          <div>Line {comment.line}</div>
                        )}
                      </div>
                    )}
                    
                    {/* Updated indicator */}
                    {comment.updated_at !== comment.created_at && (
                      <div className="text-xs text-gray-400 mt-2">
                        Updated {formatDate(comment.updated_at)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
      
      {/* Summary stats */}
      {comments.length > 0 && (
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className={`grid gap-4 text-center ${
            aiReviewers.length > 0 
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' 
              : 'grid-cols-1 md:grid-cols-3'
          }`}>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-900">{comments.length}</div>
              <div className="text-sm text-gray-600">Total Comments</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-900">{generalComments.length}</div>
              <div className="text-sm text-gray-600">General Comments</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-900">{inlineComments.length}</div>
              <div className="text-sm text-gray-600">Code Comments</div>
            </div>
            {aiReviewers.length > 0 && (
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-purple-900">
                  {aiReviewers.reduce((total, reviewer) => total + reviewer.comments.length, 0)}
                </div>
                <div className="text-sm text-purple-600">AI Reviewer Comments</div>
              </div>
            )}
          </div>
          
          {/* AI Reviewers breakdown */}
          {aiReviewers.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">AI Reviewers:</h4>
              <div className="flex flex-wrap gap-2">
                {aiReviewers.map((reviewer) => (
                  <div key={reviewer.name} className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">
                    {reviewer.displayName}: {reviewer.comments.length} comment{reviewer.comments.length !== 1 ? 's' : ''}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}