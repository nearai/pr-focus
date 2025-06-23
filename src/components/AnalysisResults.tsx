'use client'

import { useState, useEffect } from 'react'

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
  analysisPromise?: Promise<Response>
  prData?: any
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

export default function AnalysisResults({ analysisPromise, prData }: AnalysisResultsProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<AnalysisResult | null>(null)
  const [rawResponse, setRawResponse] = useState<string | null>(null)

  useEffect(() => {
    if (!analysisPromise) {
      setLoading(false)
      return
    }

    let isMounted = true

    const fetchResults = async () => {
      try {
        // Wait for the promise to resolve
        const response = await analysisPromise

        if (!isMounted) return

        if (!response.ok) {
          throw new Error(`Error: ${response.status}`)
        }

        // Handle the streaming response
        const reader = response.body?.getReader()
        if (!reader) {
          throw new Error('Failed to get response reader')
        }

        // Process the stream
        let result = ''
        const decoder = new TextDecoder()

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          // Decode the chunk and append to result
          const chunk = decoder.decode(value, { stream: true })
          result += chunk

          // Store the raw response
          setRawResponse(result)
        }

        // Final decode
        const finalChunk = decoder.decode()
        if (finalChunk) {
          result += finalChunk
          setRawResponse(result)
        }

        // After the streaming is complete, try to parse the result as JSON
        try {
          const jsonData = JSON.parse(result)
          setResults(formatAnalysisResults(jsonData))
        } catch (jsonError) {
          console.error('Failed to parse JSON:', jsonError)
          throw new Error('Invalid response format. Expected JSON.')
        }

        setLoading(false)
      } catch (err) {
        if (!isMounted) return
        setError(err instanceof Error ? err.message : 'An error occurred')
        setLoading(false)
      }
    }

    fetchResults()

    return () => {
      isMounted = false
    }
  }, [analysisPromise])

  // Format the analysis results
  const formatAnalysisResults = (data: any): AnalysisResult => {
    // Ensure the data has the expected structure
    if (!data.summary || !Array.isArray(data.changes)) {
      throw new Error('Invalid analysis results format')
    }

    return data as AnalysisResult
  }

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
        {rawResponse ? (
          <div>
            <p className="mb-2">Raw response received but couldn't be parsed as valid analysis results:</p>
            <pre className="text-xs font-mono whitespace-pre-wrap overflow-x-auto bg-gray-50 p-3 rounded mt-2">
              {rawResponse}
            </pre>
          </div>
        ) : (
          <p>No analysis results available</p>
        )}
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
      {results.changes.map((change, index) => (
        <ChangeGroup key={index} change={change} />
      ))}
    </div>
  )
}
