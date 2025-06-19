import { Octokit } from '@octokit/rest'
import { createOAuthUserAuth } from '@octokit/auth-oauth-user'

export interface AuthUser {
  login: string
  name: string
  avatar_url: string
  access_token: string
}

const CLIENT_ID = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID!

export class AuthService {
  private static STORAGE_KEY = 'github_auth_user'

  static getStoredAuth(): AuthUser | null {
    if (typeof window === 'undefined') return null
    
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  }

  static setStoredAuth(user: AuthUser): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user))
  }

  static clearStoredAuth(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(this.STORAGE_KEY)
  }

  static getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: `${window.location.origin}/api/auth/callback`,
      scope: 'repo user',
      state: Math.random().toString(36).substring(7)
    })
    
    return `https://github.com/login/oauth/authorize?${params.toString()}`
  }

  static async exchangeCodeForToken(code: string): Promise<AuthUser> {
    const response = await fetch('/api/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    })

    if (!response.ok) {
      throw new Error('Failed to exchange code for token')
    }

    const { access_token } = await response.json()
    
    // Get user info with the access token
    const octokit = new Octokit({ auth: access_token })
    const { data: user } = await octokit.rest.users.getAuthenticated()

    const authUser: AuthUser = {
      login: user.login,
      name: user.name || user.login,
      avatar_url: user.avatar_url,
      access_token
    }

    this.setStoredAuth(authUser)
    return authUser
  }

  static logout(): void {
    this.clearStoredAuth()
    window.location.href = '/'
  }

  static createAuthenticatedClient(user: AuthUser): Octokit {
    return new Octokit({ auth: user.access_token })
  }
}