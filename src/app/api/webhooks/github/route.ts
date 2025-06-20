import { NextRequest, NextResponse } from 'next/server'
import { 
  verifyGitHubWebhookSignature, 
  GitHubEventType,
  PullRequestEvent,
  IssueEvent,
  IssueCommentEvent
} from '@/lib/webhook-verification'
import { WebhookEventProcessor } from '@/lib/webhook-handlers'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Get the raw body for signature verification
    const body = await request.text()
    const signature = request.headers.get('x-hub-signature-256')
    const eventType = request.headers.get('x-github-event') as GitHubEventType
    const deliveryId = request.headers.get('x-github-delivery')

    console.log(`Received GitHub webhook: ${eventType} (${deliveryId})`)

    // Verify webhook signature (skip for test requests)
    const isTestRequest = signature === 'sha256=test-signature-ignore-verification'
    
    if (!isTestRequest) {
      const secret = process.env.GITHUB_WEBHOOK_SECRET
      if (!secret) {
        console.error('GITHUB_WEBHOOK_SECRET is not configured')
        return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
      }

      if (!signature) {
        console.error('Missing signature header')
        return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
      }

      if (!verifyGitHubWebhookSignature(body, signature, secret)) {
        console.error('Invalid webhook signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    } else {
      console.log('⚠️ Test webhook request detected - skipping signature verification')
    }

    // Parse the JSON payload
    let payload: any
    try {
      payload = JSON.parse(body)
    } catch (error) {
      console.error('Invalid JSON payload:', error)
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    // Handle ping event (GitHub sends this to test webhook)
    if (eventType === 'ping') {
      console.log('Webhook ping received successfully')
      return NextResponse.json({ message: 'pong' })
    }

    // Process the event based on type
    await processWebhookEvent(eventType, payload, deliveryId)

    return NextResponse.json({ message: 'Event processed successfully' })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function processWebhookEvent(
  eventType: GitHubEventType,
  payload: any,
  deliveryId: string | null
) {
  const id = deliveryId || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  console.log(`Processing ${eventType} event:`, {
    action: payload.action,
    repository: payload.repository?.full_name,
    sender: payload.sender?.login,
    deliveryId: id
  })

  let processedEvent
  
  try {
    switch (eventType) {
      case 'pull_request':
        processedEvent = await WebhookEventProcessor.processPullRequestEvent(
          payload as PullRequestEvent, 
          id
        )
        break
      
      case 'pull_request_review':
        console.log(`PR Review ${payload.action}: Review on #${payload.pull_request.number}`)
        console.log(`Review state: ${payload.review.state} by ${payload.review.user.login}`)
        // TODO: Implement review event processing
        break
      
      case 'pull_request_review_comment':
        console.log(`PR Review Comment ${payload.action}: Comment on #${payload.pull_request.number}`)
        console.log(`Comment by ${payload.comment.user.login}`)
        // TODO: Implement review comment processing
        break
      
      case 'issues':
        processedEvent = await WebhookEventProcessor.processIssueEvent(
          payload as IssueEvent, 
          id
        )
        break
      
      case 'issue_comment':
        processedEvent = await WebhookEventProcessor.processIssueCommentEvent(
          payload as IssueCommentEvent, 
          id
        )
        break
      
      default:
        console.log(`Unhandled event type: ${eventType}`)
        return
    }

    // Store the processed event for analytics/history
    if (processedEvent) {
      await WebhookEventProcessor.storeEvent(processedEvent)
    }
    
  } catch (error) {
    console.error(`Error processing ${eventType} event:`, error)
    throw error
  }
}