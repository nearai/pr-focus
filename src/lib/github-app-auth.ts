import { Octokit } from '@octokit/rest'
import { createAppAuth } from '@octokit/auth-app'

export interface GitHubAppUser {
  login: string
  name: string
  avatar_url: string
  installation_id: number
  access_token?: string
}

export interface GitHubAppInstallation {
  id: number
  account: {
    login: string
    type: 'User' | 'Organization'
    avatar_url: string
  }
  permissions: Record<string, string>
  repository_selection: 'all' | 'selected'
  repositories?: Array<{
    id: number
    name: string
    full_name: string
  }>
}

const APP_ID = process.env.NEXT_PUBLIC_GITHUB_APP_ID!
const PRIVATE_KEY = convertPKCS1ToPKCS8(process.env.GITHUB_APP_PRIVATE_KEY!)
const CLIENT_ID = process.env.GITHUB_APP_CLIENT_ID!

function convertPKCS1ToPKCS8(pkcs1Key: string): string {
  // If it's already PKCS#8, return as-is
  if (pkcs1Key.includes('BEGIN PRIVATE KEY')) {
    return pkcs1Key
  }
  
  // Convert PKCS#1 to PKCS#8 format
  if (pkcs1Key.includes('BEGIN RSA PRIVATE KEY')) {
    return pkcs1Key
      .replace('-----BEGIN RSA PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----')
      .replace('-----END RSA PRIVATE KEY-----', '-----END PRIVATE KEY-----')
  }
  
  return pkcs1Key
}

export class GitHubAppAuthService {
  private static STORAGE_KEY = 'github_app_user'

  static getStoredAuth(): GitHubAppUser | null {
    if (typeof window === 'undefined') return null
    
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      const user = stored ? JSON.parse(stored) : null
      if (user) {
        console.log('Retrieved stored GitHub App authentication:', { login: user.login, installation_id: user.installation_id })
      } else {
        console.log('No stored GitHub App authentication found')
      }
      return user
    } catch (error) {
      console.error('Error retrieving stored authentication:', error)
      return null
    }
  }

  static setStoredAuth(user: GitHubAppUser): void {
    if (typeof window === 'undefined') return
    console.log('Storing GitHub App authentication:', { login: user.login, installation_id: user.installation_id })
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user))
  }

  static clearStoredAuth(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(this.STORAGE_KEY)
  }

  static getInstallationUrl(): string {
    // GitHub will redirect to the "Setup URL" configured in the GitHub App settings
    // The Setup URL should be: https://pr-focus.vercel.app/api/auth/github-app/install
    return `https://github.com/apps/pr-focus/installations/new`
  }

  static getAuthUrl(installationId: number): string {
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: `${window.location.origin}/api/auth/github-app/callback`,
      state: `${installationId}-${Math.random().toString(36).substring(7)}`
    })
    
    return `https://github.com/login/oauth/authorize?${params.toString()}`
  }

  static async exchangeCodeForToken(code: string, installationId: number): Promise<GitHubAppUser> {
    const response = await fetch('/api/auth/github-app/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, installation_id: installationId })
    })

    if (!response.ok) {
      throw new Error('Failed to exchange code for token')
    }

    const { access_token, user } = await response.json()

    const appUser: GitHubAppUser = {
      login: user.login,
      name: user.name || user.login,
      avatar_url: user.avatar_url,
      installation_id: installationId,
      access_token
    }

    this.setStoredAuth(appUser)
    return appUser
  }

  static async getUserInstallations(userToken: string): Promise<GitHubAppInstallation[]> {
    const response = await fetch('/api/auth/github-app/installations', {
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    })

    if (!response.ok) {
      throw new Error('Failed to fetch installations')
    }

    const { installations } = await response.json()
    return installations
  }

  static logout(): void {
    this.clearStoredAuth()
    window.location.href = '/'
  }

  static createAppClient(): Octokit {
    return new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: APP_ID,
        privateKey: PRIVATE_KEY,
      },
    })
  }

  static createInstallationClient(installationId: number): Octokit {
    return new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: APP_ID,
        privateKey: PRIVATE_KEY,
        installationId: installationId,
      },
    })
  }
}