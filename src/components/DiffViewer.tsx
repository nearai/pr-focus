'use client'

import { useState } from 'react'
import { PRFile, PRComment } from '@/lib/github'

interface DiffViewerProps {
  files: PRFile[]
  comments: PRComment[]
}

interface ParsedDiff {
  oldStart: number
  oldLines: number
  newStart: number
  newLines: number
  lines: DiffLine[]
}

interface DiffLine {
  type: 'add' | 'remove' | 'context'
  oldNumber?: number
  newNumber?: number
  content: string
}

function parseDiff(patch: string): ParsedDiff[] {
  const hunks: ParsedDiff[] = []
  const lines = patch.split('\n')
  
  let currentHunk: ParsedDiff | null = null
  let oldLineNumber = 0
  let newLineNumber = 0
  
  for (const line of lines) {
    if (line.startsWith('@@')) {
      // New hunk header
      const match = line.match(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/)
      if (match) {
        if (currentHunk) {
          hunks.push(currentHunk)
        }
        
        const oldStart = parseInt(match[1])
        const oldLines = match[2] ? parseInt(match[2]) : 1
        const newStart = parseInt(match[3])
        const newLines = match[4] ? parseInt(match[4]) : 1
        
        currentHunk = {
          oldStart,
          oldLines,
          newStart,
          newLines,
          lines: []
        }
        
        oldLineNumber = oldStart
        newLineNumber = newStart
      }
    } else if (currentHunk) {
      if (line.startsWith('-')) {
        currentHunk.lines.push({
          type: 'remove',
          oldNumber: oldLineNumber++,
          content: line.slice(1)
        })
      } else if (line.startsWith('+')) {
        currentHunk.lines.push({
          type: 'add',
          newNumber: newLineNumber++,
          content: line.slice(1)
        })
      } else if (line.startsWith(' ')) {
        currentHunk.lines.push({
          type: 'context',
          oldNumber: oldLineNumber++,
          newNumber: newLineNumber++,
          content: line.slice(1)
        })
      }
    }
  }
  
  if (currentHunk) {
    hunks.push(currentHunk)
  }
  
  return hunks
}

function getFileComments(file: PRFile, comments: PRComment[]): PRComment[] {
  return comments.filter(comment => comment.path === file.filename)
}

export default function DiffViewer({ files, comments }: DiffViewerProps) {
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set())
  
  const toggleFile = (filename: string) => {
    const newExpanded = new Set(expandedFiles)
    if (newExpanded.has(filename)) {
      newExpanded.delete(filename)
    } else {
      newExpanded.add(filename)
    }
    setExpandedFiles(newExpanded)
  }
  
  return (
    <div className="space-y-4">
      {files.map((file) => {
        const isExpanded = expandedFiles.has(file.filename)
        const fileComments = getFileComments(file, comments)
        const hunks = file.patch ? parseDiff(file.patch) : []
        
        return (
          <div key={file.filename} className="border border-gray-200 rounded-lg overflow-hidden">
            <div 
              className="bg-gray-50 px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-100"
              onClick={() => toggleFile(file.filename)}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <span className="text-sm font-mono text-gray-900 break-all">
                  {file.filename}
                </span>
                <div className="flex items-center gap-2 text-xs flex-wrap">
                  <span className={`px-2 py-1 rounded text-xs ${
                    file.status === 'added' ? 'bg-green-100 text-green-800' :
                    file.status === 'removed' ? 'bg-red-100 text-red-800' :
                    file.status === 'modified' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {file.status}
                  </span>
                  {file.additions > 0 && (
                    <span className="text-green-600">+{file.additions}</span>
                  )}
                  {file.deletions > 0 && (
                    <span className="text-red-600">-{file.deletions}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {fileComments.length > 0 && (
                  <span className="text-xs text-gray-500 hidden sm:inline">
                    {fileComments.length} comment{fileComments.length !== 1 ? 's' : ''}
                  </span>
                )}
                <svg 
                  className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
            
            {isExpanded && (
              <div className="bg-white">
                {hunks.map((hunk, hunkIndex) => (
                  <div key={hunkIndex} className="border-t border-gray-200">
                    <div className="bg-gray-50 px-4 py-2 text-xs text-gray-600 font-mono">
                      @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
                    </div>
                    <div className="divide-y divide-gray-100">
                      {hunk.lines.map((line, lineIndex) => (
                        <div 
                          key={lineIndex}
                          className={`flex ${
                            line.type === 'add' ? 'bg-green-50' :
                            line.type === 'remove' ? 'bg-red-50' :
                            ''
                          }`}
                        >
                          <div className="flex-shrink-0 w-12 sm:w-16 px-1 sm:px-2 py-1 text-xs text-gray-500 text-right border-r border-gray-200">
                            {line.oldNumber || ''}
                          </div>
                          <div className="flex-shrink-0 w-12 sm:w-16 px-1 sm:px-2 py-1 text-xs text-gray-500 text-right border-r border-gray-200">
                            {line.newNumber || ''}
                          </div>
                          <div className="flex-shrink-0 w-6 sm:w-8 px-1 sm:px-2 py-1 text-center border-r border-gray-200">
                            {line.type === 'add' ? (
                              <span className="text-green-600">+</span>
                            ) : line.type === 'remove' ? (
                              <span className="text-red-600">-</span>
                            ) : (
                              <span className="text-gray-400"></span>
                            )}
                          </div>
                          <div className="flex-1 px-2 py-1 text-xs sm:text-sm font-mono whitespace-pre-wrap break-all overflow-hidden">
                            {line.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                
                {fileComments.length > 0 && (
                  <div className="border-t border-gray-200 p-4 bg-gray-50">
                    <h4 className="font-medium text-sm text-gray-900 mb-3">
                      Comments on this file:
                    </h4>
                    <div className="space-y-3">
                      {fileComments.map((comment) => (
                        <div key={comment.id} className="bg-white p-3 rounded border">
                          <div className="flex items-center gap-2 mb-2">
                            <img
                              src={comment.user.avatar_url}
                              alt={comment.user.login}
                              className="w-5 h-5 rounded-full"
                            />
                            <span className="text-sm font-medium">{comment.user.login}</span>
                            {comment.line && (
                              <span className="text-xs text-gray-500">
                                Line {comment.line}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-700">
                            {comment.body}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}