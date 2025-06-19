'use client'

import { PRComment } from '@/lib/github'
import { useState } from 'react'

interface CommentSectionProps {
  comments: PRComment[]
}

export default function CommentSection({ comments }: CommentSectionProps) {
  const [filter, setFilter] = useState<'all' | 'general' | 'inline'>('all')
  
  const generalComments = comments.filter(comment => !comment.path)
  const inlineComments = comments.filter(comment => comment.path)
  
  const filteredComments = 
    filter === 'general' ? generalComments :
    filter === 'inline' ? inlineComments :
    comments
  
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
      <div className="flex gap-1 mb-6 border-b border-gray-200">
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
      </div>
      
      {/* Comments list */}
      <div className="space-y-4">
        {filteredComments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No {filter === 'all' ? '' : filter + ' '}comments found
          </div>
        ) : (
          filteredComments.map((comment) => (
            <div key={comment.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
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
                
                {/* Inline comment badge */}
                {comment.path && (
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
              
              {/* Updated indicator */}
              {comment.updated_at !== comment.created_at && (
                <div className="text-xs text-gray-400 mt-2">
                  Updated {formatDate(comment.updated_at)}
                </div>
              )}
            </div>
          ))
        )}
      </div>
      
      {/* Summary stats */}
      {comments.length > 0 && (
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
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
          </div>
        </div>
      )}
    </div>
  )
}