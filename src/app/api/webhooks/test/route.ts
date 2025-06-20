import { NextRequest, NextResponse } from 'next/server'

/**
 * Test endpoint to simulate GitHub webhook events
 * Useful for testing the webhook functionality without setting up actual GitHub webhooks
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const eventType = body.eventType || 'pull_request'
    
    // Create a mock GitHub webhook payload
    const mockPayload = createMockPayload(eventType, body)
    
    // Forward to the actual webhook endpoint
    const webhookUrl = new URL('/api/webhooks/github', request.url)
    const response = await fetch(webhookUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GitHub-Event': eventType,
        'X-GitHub-Delivery': `test-${Date.now()}`,
        'X-Hub-Signature-256': 'sha256=test-signature-ignore-verification'
      },
      body: JSON.stringify(mockPayload)
    })

    const result = await response.json()
    
    return NextResponse.json({
      message: 'Test webhook sent successfully',
      eventType,
      webhookResponse: result,
      status: response.status
    })
  } catch (error) {
    console.error('Error sending test webhook:', error)
    return NextResponse.json(
      { error: 'Failed to send test webhook' },
      { status: 500 }
    )
  }
}

function createMockPayload(eventType: string, customData: any = {}) {
  const basePayload = {
    action: customData.action || 'opened',
    repository: {
      id: 123456789,
      name: 'test-repo',
      full_name: 'testuser/test-repo',
      owner: {
        login: 'testuser',
        type: 'User'
      }
    },
    installation: {
      id: 12345
    },
    sender: {
      login: 'testuser',
      type: 'User'
    }
  }

  switch (eventType) {
    case 'pull_request':
      return {
        ...basePayload,
        pull_request: {
          id: 987654321,
          number: customData.number || 42,
          title: customData.title || 'Test Pull Request',
          body: 'This is a test pull request created for webhook testing.',
          state: 'open',
          user: {
            login: 'testuser',
            avatar_url: 'https://github.com/images/error/octocat_happy.gif'
          },
          head: {
            sha: 'abc123def456',
            ref: 'feature/test-branch'
          },
          base: {
            sha: 'def456abc123',
            ref: 'main'
          },
          requested_reviewers: customData.reviewers || [
            {
              login: 'reviewer1',
              avatar_url: 'https://github.com/images/error/octocat_happy.gif'
            }
          ]
        }
      }

    case 'issues':
      return {
        ...basePayload,
        issue: {
          id: 987654321,
          number: customData.number || 24,
          title: customData.title || 'Test Issue',
          body: 'This is a test issue created for webhook testing.',
          state: 'open',
          user: {
            login: 'testuser',
            avatar_url: 'https://github.com/images/error/octocat_happy.gif'
          },
          assignees: customData.assignees || []
        }
      }

    case 'issue_comment':
      return {
        ...basePayload,
        issue: {
          number: customData.number || 24,
          title: customData.title || 'Test Issue',
          pull_request: customData.isPR ? { url: 'https://api.github.com/repos/testuser/test-repo/pulls/42' } : undefined
        },
        comment: {
          id: 123456789,
          body: customData.comment || 'This is a test comment for webhook testing.',
          user: {
            login: 'commenter',
            avatar_url: 'https://github.com/images/error/octocat_happy.gif'
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      }

    case 'ping':
      return {
        zen: 'Non-blocking is better than blocking.',
        hook_id: 12345,
        hook: {
          type: 'Repository',
          id: 12345,
          events: ['push', 'pull_request']
        },
        repository: basePayload.repository
      }

    default:
      return basePayload
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Webhook test endpoint',
    usage: 'POST with eventType and optional custom data',
    examples: {
      pullRequest: {
        eventType: 'pull_request',
        action: 'opened',
        number: 42,
        title: 'My Test PR'
      },
      issue: {
        eventType: 'issues',
        action: 'opened',
        number: 24,
        title: 'My Test Issue'
      },
      comment: {
        eventType: 'issue_comment',
        action: 'created',
        number: 24,
        comment: 'This is my test comment',
        isPR: true
      }
    }
  })
}