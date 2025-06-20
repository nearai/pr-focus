import { Octokit } from '@octokit/rest'
import { createAppAuth } from '@octokit/auth-app'

export interface PRData {
  number: number
  title: string
  body: string
  state: 'open' | 'closed' | 'merged'
  user: {
    login: string
    avatar_url: string
  }
  created_at: string
  updated_at: string
  head: {
    sha: string
    ref: string
  }
  base: {
    sha: string
    ref: string
  }
}

export interface PRFile {
  filename: string
  status: 'added' | 'removed' | 'modified' | 'renamed'
  additions: number
  deletions: number
  changes: number
  patch?: string
}

export interface PRComment {
  id: number
  user: {
    login: string
    avatar_url: string
  }
  body: string
  created_at: string
  updated_at: string
  path?: string
  position?: number
  line?: number
  commit_id?: string
}

export interface PRSummary {
  id: number
  number: number
  title: string
  state: 'open' | 'closed' | 'merged'
  user: {
    login: string
    avatar_url: string
  }
  created_at: string
  updated_at: string
  repository: {
    name: string
    full_name: string
    owner: {
      login: string
    }
  }
  requested_reviewers: Array<{
    login: string
    avatar_url: string
  }>
}

export class GitHubClient {
  private octokit: Octokit

  private constructor(octokit: Octokit) {
    this.octokit = octokit
  }

  static createWithInstallation(installationId: number): GitHubClient {
    const octokit = new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: process.env.NEXT_PUBLIC_GITHUB_APP_ID!,
        privateKey: process.env.GITHUB_APP_PRIVATE_KEY!,
        installationId: installationId,
      },
    })
    
    return new GitHubClient(octokit)
  }

  async getPR(owner: string, repo: string, pullNumber: number): Promise<PRData> {
    const { data } = await this.octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: pullNumber,
    })

    return {
      number: data.number,
      title: data.title,
      body: data.body || '',
      state: data.state as 'open' | 'closed' | 'merged',
      user: {
        login: data.user?.login || '',
        avatar_url: data.user?.avatar_url || '',
      },
      created_at: data.created_at,
      updated_at: data.updated_at,
      head: {
        sha: data.head.sha,
        ref: data.head.ref,
      },
      base: {
        sha: data.base.sha,
        ref: data.base.ref,
      },
    }
  }

  async getPRFiles(owner: string, repo: string, pullNumber: number): Promise<PRFile[]> {
    const { data } = await this.octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: pullNumber,
    })

    return data.map(file => ({
      filename: file.filename,
      status: file.status as 'added' | 'removed' | 'modified' | 'renamed',
      additions: file.additions,
      deletions: file.deletions,
      changes: file.changes,
      patch: file.patch,
    }))
  }

  async getPRComments(owner: string, repo: string, pullNumber: number): Promise<PRComment[]> {
    const [reviewComments, issueComments] = await Promise.all([
      this.octokit.rest.pulls.listReviewComments({
        owner,
        repo,
        pull_number: pullNumber,
      }),
      this.octokit.rest.issues.listComments({
        owner,
        repo,
        issue_number: pullNumber,
      }),
    ])

    const comments: PRComment[] = []

    // Add review comments (inline comments on code)
    reviewComments.data.forEach(comment => {
      comments.push({
        id: comment.id,
        user: {
          login: comment.user?.login || '',
          avatar_url: comment.user?.avatar_url || '',
        },
        body: comment.body,
        created_at: comment.created_at,
        updated_at: comment.updated_at,
        path: comment.path,
        position: comment.position || undefined,
        line: comment.line || undefined,
        commit_id: comment.commit_id,
      })
    })

    // Add issue comments (general PR comments)
    issueComments.data.forEach(comment => {
      comments.push({
        id: comment.id,
        user: {
          login: comment.user?.login || '',
          avatar_url: comment.user?.avatar_url || '',
        },
        body: comment.body || '',
        created_at: comment.created_at,
        updated_at: comment.updated_at,
      })
    })

    return comments.sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
  }

  async getUserAssignedPRs(username: string): Promise<PRSummary[]> {
    const { data } = await this.octokit.rest.search.issuesAndPullRequests({
      q: `is:pr is:open review-requested:${username}`,
      sort: 'updated',
      order: 'desc',
      per_page: 50
    })

    return data.items.map(item => {
      const repoUrl = item.repository_url || item.html_url.split('/pull/')[0]
      const repoParts = repoUrl.split('/').slice(-2)
      
      return {
        id: item.id,
        number: item.number,
        title: item.title,
        state: item.state as 'open' | 'closed',
        user: {
          login: item.user?.login || '',
          avatar_url: item.user?.avatar_url || '',
        },
        created_at: item.created_at,
        updated_at: item.updated_at,
        repository: {
          name: repoParts[1] || '',
          full_name: repoParts.join('/'),
          owner: {
            login: repoParts[0] || '',
          }
        },
        requested_reviewers: []
      }
    })
  }

  async getUserCreatedPRs(username: string): Promise<PRSummary[]> {
    const { data } = await this.octokit.rest.search.issuesAndPullRequests({
      q: `is:pr is:open author:${username}`,
      sort: 'updated',
      order: 'desc',
      per_page: 50
    })

    return data.items.map(item => {
      const repoUrl = item.repository_url || item.html_url.split('/pull/')[0]
      const repoParts = repoUrl.split('/').slice(-2)
      
      return {
        id: item.id,
        number: item.number,
        title: item.title,
        state: item.state as 'open' | 'closed',
        user: {
          login: item.user?.login || '',
          avatar_url: item.user?.avatar_url || '',
        },
        created_at: item.created_at,
        updated_at: item.updated_at,
        repository: {
          name: repoParts[1] || '',
          full_name: repoParts.join('/'),
          owner: {
            login: repoParts[0] || '',
          }
        },
        requested_reviewers: []
      }
    })
  }
}

export function parsePRUrl(url: string): { owner: string; repo: string; pullNumber: number } | null {
  const regex = /github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/
  const match = url.match(regex)
  
  if (!match) return null
  
  return {
    owner: match[1],
    repo: match[2],
    pullNumber: parseInt(match[3], 10),
  }
}