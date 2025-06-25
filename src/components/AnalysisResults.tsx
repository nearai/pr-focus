'use client'

import { useState } from 'react'
import DiffViewer from './DiffViewer'
import { PRFile } from '@/lib/github'

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

// Convert analysis hunks to PRFile format for DiffViewer
function convertHunksToPRFiles(hunks: AnalysisHunk[]): PRFile[] {
  // Group hunks by filename
  const fileGroups = hunks.reduce((groups: Record<string, AnalysisHunk[]>, hunk) => {
    if (!groups[hunk.file]) {
      groups[hunk.file] = [];
    }
    groups[hunk.file].push(hunk);
    return groups;
  }, {});

  // Convert to PRFile format
  return Object.entries(fileGroups).map(([filename, fileHunks]) => {
    // Prepare the combined patch
    let combinedPatch = '';

    fileHunks.forEach(hunk => {
      // Check if the diff already has a proper unified diff header
      const hasHeader = /^@@ -\d+(?:,\d+)? \+\d+(?:,\d+)? @@/.test(hunk.diff);

      // If no header, add a basic one to ensure the DiffViewer can parse it
      if (!hasHeader) {
        // Count the number of lines in the diff
        const lines = hunk.diff.split('\n');
        const addedLines = lines.filter(line => line.startsWith('+')).length;
        const removedLines = lines.filter(line => line.startsWith('-')).length;
        const lineCount = Math.max(addedLines, removedLines);

        // Create a simple header (starting at line 1)
        combinedPatch += `@@ -1,${lineCount} +1,${lineCount} @@\n`;
      }

      combinedPatch += hunk.diff + '\n';
    });

    // Count additions and deletions
    const additions = (combinedPatch.match(/^\+/gm) || []).length;
    const deletions = (combinedPatch.match(/^-/gm) || []).length;

    return {
      filename,
      patch: combinedPatch,
      status: 'modified', // Default status
      additions,
      deletions,
      changes: additions + deletions,
      sha: '', // Not needed for display purposes
      contents_url: '',
      raw_url: ''
    };
  });
}

// This helper component will display a single change group with collapsible files
function ChangeGroup({ change }: { change: AnalysisChange }) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Convert hunks to PRFile format for the DiffViewer
  const files = convertHunksToPRFiles(change.hunks);

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
        <div className="bg-white p-4">
          <DiffViewer files={files} comments={[]} />
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
