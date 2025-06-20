import crypto from 'crypto'

/**
 * Verifies GitHub webhook signatures
 * @param payload - The raw payload string
 * @param signature - The signature from the X-Hub-Signature-256 header
 * @param secret - The webhook secret
 * @returns true if the signature is valid
 */
export function verifyGitHubWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!signature || !secret) {
    return false
  }

  // GitHub sends signature in format "sha256=<hash>"
  if (!signature.startsWith('sha256=')) {
    return false
  }

  const expectedSignature = signature.substring(7) // Remove "sha256=" prefix
  const computedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex')

  // Use crypto.timingSafeEqual to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(computedSignature, 'hex')
  )
}

/**
 * Event types that we handle
 */
export type GitHubEventType = 
  | 'pull_request'
  | 'pull_request_review'
  | 'pull_request_review_comment'
  | 'issues'
  | 'issue_comment'
  | 'ping'

/**
 * GitHub webhook event interface
 */
export interface GitHubWebhookEvent {
  action: string
  repository: {
    id: number
    name: string
    full_name: string
    owner: {
      login: string
      type: string
    }
  }
  installation?: {
    id: number
  }
  sender: {
    login: string
    type: string
  }
}

/**
 * Pull Request event payload
 */
export interface PullRequestEvent extends GitHubWebhookEvent {
  action: 'opened' | 'closed' | 'reopened' | 'synchronize' | 'edited' | 'assigned' | 'unassigned' | 'review_requested' | 'review_request_removed'
  pull_request: {
    id: number
    number: number
    title: string
    body: string
    state: 'open' | 'closed'
    user: {
      login: string
      avatar_url: string
    }
    head: {
      sha: string
      ref: string
    }
    base: {
      sha: string
      ref: string
    }
    requested_reviewers: Array<{
      login: string
      avatar_url: string
    }>
  }
}

/**
 * Issue event payload
 */
export interface IssueEvent extends GitHubWebhookEvent {
  action: 'opened' | 'closed' | 'reopened' | 'edited' | 'assigned' | 'unassigned'
  issue: {
    id: number
    number: number
    title: string
    body: string
    state: 'open' | 'closed'
    user: {
      login: string
      avatar_url: string
    }
    assignees: Array<{
      login: string
      avatar_url: string
    }>
  }
}

/**
 * Issue Comment event payload
 */
export interface IssueCommentEvent extends GitHubWebhookEvent {
  action: 'created' | 'edited' | 'deleted'
  issue: {
    number: number
    title: string
    pull_request?: {
      url: string
    }
  }
  comment: {
    id: number
    body: string
    user: {
      login: string
      avatar_url: string
    }
    created_at: string
    updated_at: string
  }
}