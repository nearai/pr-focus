'use client'

import { useState, useEffect, Suspense, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { PRData, PRFile, PRComment } from '@/lib/github'
import { GitHubAppAuthService, GitHubAppUser } from '@/lib/github-app-auth'
import DiffViewer from '@/components/DiffViewer'
import CommentSection from '@/components/CommentSection'
import AnalysisResults from '@/components/AnalysisResults'
import yaml from 'js-yaml'


function extractYamlContent(text: string): string {
  // Look for YAML content markers like ```yaml or ---
  const yamlBlockRegex = /```(?:yaml)?\s*([\s\S]*?)(?:```|$)/;
  const yamlMatch = yamlBlockRegex.exec(text);
  if (yamlMatch) {
    return yamlMatch[1].trim();
  }

  // Try to find content between --- markers (common YAML format)
  const yamlDocumentRegex = /^---\s*$([\s\S]*?)^---\s*$/m;
  const yamlDocMatch = yamlDocumentRegex.exec(text);
  if (yamlDocMatch) {
    return yamlDocMatch[1].trim();
  }

  // If no markers found, assume the entire text is YAML
  return text;
}

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
  const [analysisPromise, setAnalysisPromise] = useState<Promise<Response> | undefined>(undefined)
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult | null>(null)
  const [analysisError, setAnalysisError] = useState<string>('')
  const analysisTriggeredForCurrentPR = useRef(false)

  // Format the analysis results
  const formatAnalysisResults = (data: any): AnalysisResult => {
    // Ensure the data has the expected structure
    if (!data.summary || !Array.isArray(data.changes)) {
      throw new Error('Invalid analysis results format')
    }

    console.log('Formatted analysis results:', data.summary)
    return data as AnalysisResult
  }

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

  // Automatically trigger AI analysis when PR data is loaded
  useEffect(() => {
    // Only run this effect when prData changes
    if (!prData) return;

    // Skip if we're already analyzing or have triggered analysis for this PR
    if (analyzing || analysisTriggeredForCurrentPR.current) return;

    // If we have a promise or results, we've already initiated analysis
    if (analysisPromise || analysisResults) return;

    console.log('[DEBUG] Auto-triggering AI analysis for PR:', prData.pr.number);
    analysisTriggeredForCurrentPR.current = true;
    handleAnalyzePR(false); // false means don't force a new analysis
  }, [prData])

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
    // Reset analysis state when loading a new PR
    analysisTriggeredForCurrentPR.current = false;
    setAnalysisPromise(undefined);
    setAnalysisResults(null);
    setAnalysisError('');

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

  const handleAnalyzePR = async (forceNewAnalysis = true) => {
    if (!prData) return

    // Prevent initiating another analysis if one is already in progress
    if (analyzing && !forceNewAnalysis) {
      console.log('[DEBUG] Analysis already in progress, not starting another one')
      return
    }

    console.log('[DEBUG] Starting AI analysis for PR:', prData.pr.number)
    console.log('[DEBUG] PR title:', prData.pr.title)
    console.log('[DEBUG] Number of files changed:', prData.files.length)

    // Get the commit SHA from the PR data
    const commitSha = prData.pr.head.sha;
    console.log('[DEBUG] Commit SHA:', commitSha);

    // Check if we have cached results for this commit SHA
    if (!forceNewAnalysis) {
      try {
        const cachedDataString = localStorage.getItem(`pr-analysis-${commitSha}`);
        if (cachedDataString) {
          try {
            const cachedData = JSON.parse(cachedDataString);
            console.log('[DEBUG] Found cached analysis results for commit:', commitSha);

            // Use the cached results
            setAnalysisResults(cachedData);
            analysisTriggeredForCurrentPR.current = true;
            return;
          } catch (parseError) {
            console.error('[DEBUG] Error parsing cached data:', parseError);
            // Continue with the analysis if there's an error parsing the cached data
          }
        }
      } catch (error) {
        console.error('[DEBUG] Error reading from local storage:', error);
        // Continue with the analysis if there's an error reading from local storage
      }
    }

    setAnalyzing(true);
    setAnalysisError('');

    // Prepare data for analysis
    const prDescription = prData.pr.body || prData.pr.title
    const changedFiles = prData.files.map(file => file.filename)

    // Collect file changes (up to 5000 lines)
    const fileChanges = prData.files
      .filter(file => file.patch)
      .map(file => `File: ${file.filename}\n${file.patch}`)
      .join('\n\n')

    console.log('[DEBUG] Prepared analysis data:', {
      descriptionLength: prDescription.length,
      numChangedFiles: changedFiles.length,
      fileChangesLength: fileChanges.length
    })

    const requestData = {
      prDescription,
      changedFiles,
      fileChanges
    };

    console.log('[DEBUG] Submitting PR for AI analysis')

    try {
      // Create the promise for the analysis results
      const promise = fetch('/api/ai/analyze-pr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      // Mark that we've triggered analysis for this PR
      analysisTriggeredForCurrentPR.current = true;

      // Store the promise for use by AnalysisResults component
      setAnalysisPromise(promise);
      // Clear any previous results when starting a new analysis
      if (forceNewAnalysis) {
        setAnalysisResults(null);
      }

      // Wait for the promise to complete to handle errors
      const response = await promise;
      console.log('[DEBUG] API call response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API call failed with status ${response.status}: ${errorText}`);
      }

      // Clone the response to read it twice (once for error handling, once for the AnalysisResults component)
      const responseClone = response.clone();

      // Read and parse the response
      const responseText = await responseClone.text();
      try {
        // Check if the response contains an error message
        if (responseText.toLowerCase().includes('error') &&
           (responseText.toLowerCase().includes('analysis') || responseText.toLowerCase().includes('fail'))) {
          throw new Error(responseText);
        }

        // Parse the response
        const json = JSON.parse(responseText);
        const content = json.content || json.data || json;
        const message = content.choices?.[0]?.message?.content || content.choices?.[0]?.text || content;

        console.log('[DEBUG] Raw content to parse:', message);
        const cleanedYamlText = extractYamlContent(message);
        console.log('[DEBUG] Extracted YAML content:', cleanedYamlText);

        const yamlData = yaml.load(cleanedYamlText);
        const formattedResults = formatAnalysisResults(yamlData);

        // Store the formatted results in local storage
        localStorage.setItem(`pr-analysis-${commitSha}`, JSON.stringify(formattedResults));
        console.log('[DEBUG] Stored formatted analysis results in local storage for commit:', commitSha);

        // Update the state with the formatted results
        setAnalysisResults(formattedResults);

        console.log('[DEBUG] AI analysis completed successfully');
      } catch (jsonError) {
        console.error('[DEBUG] Error in analysis response:', jsonError);
        setAnalysisError(jsonError instanceof Error ? jsonError.message : 'Invalid analysis response');
      }
    } catch (error) {
      console.error('[DEBUG] Error during AI analysis:', error);
      setAnalysisError(error instanceof Error ? error.message : 'Failed to analyze PR. Please try again.');
    } finally {
      setAnalyzing(false);
      // Note: We intentionally DO NOT reset analysisPromise here to prevent re-triggering useEffect
    }
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
            </div>

            {/* PR Description */}
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              {prData.pr.body && (
                <div className="prose max-w-none">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    PR Description
                  </h3>
                  <div className="whitespace-pre-wrap text-gray-700">
                    {prData.pr.body}
                  </div>
                </div>
              )}
            </div>

            {/* Analysis Results */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  AI Analysis
                </h3>
                <button
                  onClick={() => handleAnalyzePR()}
                  disabled={analyzing}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {analyzing ? 'Analyzing...' : 'Re-Analyze PR'}
                </button>
              </div>
              <div className="p-4 sm:p-6">
                {analysisError ? (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
                    <p className="font-medium mb-1">Error in AI analysis:</p>
                    <p className="whitespace-pre-wrap">{analysisError}</p>
                  </div>
                ) : analyzing && !analysisResults ? (
                  <div className="text-gray-500 text-center py-8">
                    <div className="flex flex-col items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                      <p>Analyzing PR content...</p>
                    </div>
                  </div>
                ) : !analysisResults && !analyzing ? (
                  <div className="text-gray-500 text-center py-8">
                    <p>Click "Analyze PR" to get AI-powered insights about this pull request.</p>
                  </div>
                ) : (
                  <AnalysisResults
                    results={analysisResults}
                    loading={false}
                    error={null}
                  />
                )}
              </div>
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
