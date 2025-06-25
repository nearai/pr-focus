'use client'

import { useState } from 'react'

// Define interfaces for the analysis results structure
interface AnalysisHunk {
  file: string
  diff: string
}

interface AnalysisChange {
  label: string
  hunks: AnalysisHunk[]
}

interface AnalysisResult {
  summary: string
  changes: AnalysisChange[]
}

// Props for the component
interface AnalysisResultsProps {
  results: AnalysisResult | null
  loading: boolean
  error: string | null
}


// This helper component will display a single change group with collapsible files
function ChangeGroup({ change }: { change: AnalysisChange }) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Group hunks by file
  const fileGroups = change.hunks.reduce((groups: Record<string, AnalysisHunk[]>, hunk) => {
    if (!groups[hunk.file]) {
      groups[hunk.file] = []
    }
    groups[hunk.file].push(hunk)
    return groups
  }, {})

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
      <div
        className="bg-gray-50 px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-100"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="font-medium text-gray-900">
          {change.label}
        </div>
        <svg
          className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>

      {isExpanded && (
        <div className="bg-white">
          {Object.entries(fileGroups).map(([file, hunks], index) => (
            <FileGroup key={index} file={file} hunks={hunks} />
          ))}
        </div>
      )}
    </div>
  )
}

// This helper component will display a single file with collapsible diffs
function FileGroup({ file, hunks }: { file: string, hunks: AnalysisHunk[] }) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="border-t border-gray-200">
      <div
        className="bg-gray-50 px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-gray-100"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="font-mono text-sm text-gray-900 truncate">
          {file}
        </div>
        <svg
          className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>

      {isExpanded && (
        <div className="bg-white">
          {hunks.map((hunk, index) => (
            <div key={index} className="px-4 py-2 border-t border-gray-100">
              <pre className="text-xs font-mono whitespace-pre-wrap overflow-x-auto bg-gray-50 p-3 rounded">
                {hunk.diff}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Loading spinner component
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      <span className="ml-3 text-gray-600">Analyzing PR...</span>
    </div>
  )
}

export default function AnalysisResults({ results, loading, error }: AnalysisResultsProps) {

  if (loading) {
    return <LoadingSpinner />
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
        Failed to load analysis: {error}
      </div>
    )
  }

  if (!results) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
        <p>No analysis results available</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded">
        <h3 className="font-medium mb-1">PR Analysis Summary</h3>
        <p>{results.summary}</p>
      </div>

      <h3 className="font-medium text-lg mt-6 mb-3">Key Changes</h3>
      {results.changes && results.changes.map((change, index) => (
        <ChangeGroup key={index} change={change} />
      ))}
    </div>
  )
}
