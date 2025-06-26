/**
 * Utility functions for detecting and extracting preview deployment links from comments
 */

export interface PreviewLink {
  url: string
  commentId: number
  createdAt: string
}

// Common preview deployment domains and patterns
const PREVIEW_DOMAINS = [
  'vercel.app',
  'netlify.app',
  'surge.sh',
  'heroku.com',
  'railway.app',
  'render.com',
  'fly.io',
  'pages.dev', // Cloudflare Pages
  'azurewebsites.net',
  'github.io',
  'gitpod.io',
  'stackblitz.com',
  'codesandbox.io'
]

// Patterns that often indicate preview deployments
const PREVIEW_PATTERNS = [
  /https?:\/\/[^\/]*\.vercel\.app[^\s]*/gi,
  /https?:\/\/[^\/]*\.netlify\.app[^\s]*/gi,
  /https?:\/\/[^\/]*\.surge\.sh[^\s]*/gi,
  /https?:\/\/[^\/]*\.herokuapp\.com[^\s]*/gi,
  /https?:\/\/[^\/]*\.railway\.app[^\s]*/gi,
  /https?:\/\/[^\/]*\.onrender\.com[^\s]*/gi,
  /https?:\/\/[^\/]*\.fly\.dev[^\s]*/gi,
  /https?:\/\/[^\/]*\.pages\.dev[^\s]*/gi,
  /https?:\/\/[^\/]*\.azurewebsites\.net[^\s]*/gi,
  /https?:\/\/[^\/]*\.github\.io[^\s]*/gi,
  /https?:\/\/[^\/]*\.gitpod\.io[^\s]*/gi,
  /https?:\/\/[^\/]*\.stackblitz\.com[^\s]*/gi,
  /https?:\/\/[^\/]*\.csb\.app[^\s]*/gi,
  // Generic pattern for any URL that might be a preview
  /https?:\/\/[a-zA-Z0-9-]+--[a-zA-Z0-9-]+\.[a-zA-Z0-9.-]+[^\s]*/gi // Branch/PR specific URLs
]

/**
 * Extract preview deployment URLs from a comment body
 */
export function extractPreviewLinks(commentBody: string): string[] {
  const urls: string[] = []
  
  // First try specific patterns
  for (const pattern of PREVIEW_PATTERNS) {
    const matches = commentBody.match(pattern)
    if (matches) {
      urls.push(...matches)
    }
  }
  
  // Also look for any URL containing preview domains
  const urlPattern = /https?:\/\/[^\s]+/gi
  const allUrls = commentBody.match(urlPattern) || []
  
  for (const url of allUrls) {
    for (const domain of PREVIEW_DOMAINS) {
      if (url.includes(domain) && !urls.includes(url)) {
        urls.push(url)
      }
    }
  }
  
  // Clean up URLs (remove trailing punctuation)
  return urls.map(url => url.replace(/[.,!?;]$/, ''))
}

/**
 * Check if a comment contains preview deployment links
 */
export function hasPreviewLinks(commentBody: string): boolean {
  return extractPreviewLinks(commentBody).length > 0
}

/**
 * Extract all preview links from an array of comments, sorted by most recent
 */
export function getPreviewLinksFromComments(comments: { id: number, body: string, created_at: string }[]): PreviewLink[] {
  const previewLinks: PreviewLink[] = []
  
  for (const comment of comments) {
    const urls = extractPreviewLinks(comment.body)
    for (const url of urls) {
      previewLinks.push({
        url,
        commentId: comment.id,
        createdAt: comment.created_at
      })
    }
  }
  
  // Sort by creation date (most recent first)
  return previewLinks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

/**
 * Get the most recent preview link from comments
 */
export function getMostRecentPreviewLink(comments: { id: number, body: string, created_at: string }[]): string | null {
  const previewLinks = getPreviewLinksFromComments(comments)
  return previewLinks.length > 0 ? previewLinks[0].url : null
}