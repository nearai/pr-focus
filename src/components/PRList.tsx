'use client'

import { PRSummary } from '@/lib/github'

interface PRListProps {
  title: string
  prs: PRSummary[]
  onPRClick: (owner: string, repo: string, number: number) => void
}

export default function PRList({ title, prs, onPRClick }: PRListProps) {
  if (prs.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{title}</h2>
        <p className="text-gray-500 text-center py-8">No pull requests found</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">{title}</h2>
      <div className="space-y-3">
        {prs.map((pr) => (
          <div
            key={pr.id}
            className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
            onClick={() => onPRClick(pr.repository.owner.login, pr.repository.name, pr.number)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-gray-900 truncate">
                  {pr.title}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {pr.repository.full_name} #{pr.number}
                </p>
              </div>
              <div className="flex items-center space-x-2 ml-4">
                <img
                  src={pr.user.avatar_url}
                  alt={pr.user.login}
                  className="w-6 h-6 rounded-full"
                />
                <span className="text-xs text-gray-500">{pr.user.login}</span>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
              <span>
                Updated {new Date(pr.updated_at).toLocaleDateString()}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                pr.state === 'open' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {pr.state}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}