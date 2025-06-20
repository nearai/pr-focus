import { ProcessedEvent } from './webhook-handlers'

/**
 * Simple in-memory event store
 * In production, this would be replaced with a database
 */
class EventStore {
  private events: ProcessedEvent[] = []
  private readonly maxEvents = 1000 // Keep last 1000 events in memory

  /**
   * Store a new event
   */
  store(event: ProcessedEvent): void {
    this.events.unshift(event) // Add to beginning
    
    // Keep only the most recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(0, this.maxEvents)
    }
    
    console.log(`Stored event ${event.id} (${this.events.length} total events in store)`)
  }

  /**
   * Get recent events with optional filtering
   */
  getEvents(options: {
    limit?: number
    type?: string
    repository?: string
    installation_id?: number
  } = {}): ProcessedEvent[] {
    let filteredEvents = this.events

    // Filter by type
    if (options.type) {
      filteredEvents = filteredEvents.filter(e => e.type === options.type)
    }

    // Filter by repository
    if (options.repository) {
      filteredEvents = filteredEvents.filter(e => 
        e.repository.full_name === options.repository
      )
    }

    // Filter by installation
    if (options.installation_id) {
      filteredEvents = filteredEvents.filter(e => 
        e.installation_id === options.installation_id
      )
    }

    // Apply limit
    const limit = options.limit || 50
    return filteredEvents.slice(0, limit)
  }

  /**
   * Get event statistics
   */
  getStats(): {
    totalEvents: number
    eventsByType: Record<string, number>
    eventsByRepository: Record<string, number>
    recentActivity: ProcessedEvent[]
  } {
    const eventsByType: Record<string, number> = {}
    const eventsByRepository: Record<string, number> = {}

    for (const event of this.events) {
      // Count by type
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1
      
      // Count by repository
      const repo = event.repository.full_name
      eventsByRepository[repo] = (eventsByRepository[repo] || 0) + 1
    }

    return {
      totalEvents: this.events.length,
      eventsByType,
      eventsByRepository,
      recentActivity: this.events.slice(0, 10) // Last 10 events
    }
  }

  /**
   * Clear all events (for testing)
   */
  clear(): void {
    this.events = []
    console.log('Event store cleared')
  }
}

// Export singleton instance
export const eventStore = new EventStore()

/**
 * Event summary for dashboard display
 */
export interface EventSummary {
  id: string
  type: string
  action: string
  repository: string
  actor: string
  timestamp: string
  description: string
}

/**
 * Convert processed event to summary format
 */
export function createEventSummary(event: ProcessedEvent): EventSummary {
  let description = ''
  
  switch (event.type) {
    case 'pull_request':
      description = `PR #${event.data.pr_number}: ${event.data.pr_title}`
      break
    case 'issue':
      description = `Issue #${event.data.issue_number}: ${event.data.issue_title}`
      break
    case 'pull_request_comment':
      description = `Comment on PR #${event.data.issue_number}`
      break
    case 'issue_comment':
      description = `Comment on Issue #${event.data.issue_number}`
      break
    default:
      description = event.action
  }

  return {
    id: event.id,
    type: event.type,
    action: event.action,
    repository: event.repository.full_name,
    actor: event.actor.login,
    timestamp: event.timestamp,
    description
  }
}