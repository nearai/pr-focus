'use client'

import { GitHubAppInstallation } from '@/lib/github-app-auth'

interface GitHubAppInstallationsProps {
  installations: GitHubAppInstallation[]
  onInstallationSelect: (installationId: number) => void
  selectedInstallation?: number
}

export default function GitHubAppInstallations({ 
  installations, 
  onInstallationSelect, 
  selectedInstallation 
}: GitHubAppInstallationsProps) {
  if (installations.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          No GitHub App Installations Found
        </h2>
        <p className="text-gray-600 mb-4">
          You need to install the PR Focus app to your repositories first.
        </p>
        <a
          href={`https://github.com/apps/pr-focus/installations/new?redirect_uri=${encodeURIComponent(process.env.NEXT_SITE_URL || 'http://localhost:3001')}/api/auth/github/callback`}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors inline-block"
        >
          Install GitHub App
        </a>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Select GitHub App Installation
      </h2>
      <div className="space-y-3">
        {installations.map((installation) => (
          <div
            key={installation.id}
            className={`border rounded-lg p-4 cursor-pointer transition-colors ${
              selectedInstallation === installation.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:bg-gray-50'
            }`}
            onClick={() => onInstallationSelect(installation.id)}
          >
            <div className="flex items-center space-x-3">
              <img
                src={installation.account.avatar_url}
                alt={installation.account.login}
                className="w-8 h-8 rounded-full"
              />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-900">
                  {installation.account.login}
                </h3>
                <p className="text-xs text-gray-500">
                  {installation.account.type} • {installation.repository_selection} repositories
                </p>
              </div>
              {installation.repositories && (
                <span className="text-xs text-gray-500">
                  {installation.repositories.length} repos
                </span>
              )}
            </div>
            {installation.repositories && installation.repositories.length > 0 && (
              <div className="mt-2 pl-11">
                <div className="text-xs text-gray-500 space-y-1">
                  {installation.repositories.slice(0, 3).map((repo) => (
                    <div key={repo.id}>{repo.full_name}</div>
                  ))}
                  {installation.repositories.length > 3 && (
                    <div>+ {installation.repositories.length - 3} more...</div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}