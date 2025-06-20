import { NextRequest, NextResponse } from 'next/server'
import { eventStore, createEventSummary } from '@/lib/event-store'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const limit = parseInt(searchParams.get('limit') || '50')
    const type = searchParams.get('type') || undefined
    const repository = searchParams.get('repository') || undefined
    const installation_id = searchParams.get('installation_id') 
      ? parseInt(searchParams.get('installation_id')!) 
      : undefined
    const stats = searchParams.get('stats') === 'true'

    // Return statistics if requested
    if (stats) {
      const statistics = eventStore.getStats()
      return NextResponse.json({
        stats: statistics,
        recentEvents: statistics.recentActivity.map(createEventSummary)
      })
    }

    // Get filtered events
    const events = eventStore.getEvents({
      limit,
      type,
      repository,
      installation_id
    })

    // Convert to summary format for easier consumption
    const eventSummaries = events.map(createEventSummary)

    return NextResponse.json({
      events: eventSummaries,
      total: events.length,
      filters: {
        limit,
        type,
        repository,
        installation_id
      }
    })
  } catch (error) {
    console.error('Error fetching events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    )
  }
}

// DELETE endpoint to clear events (useful for testing)
export async function DELETE() {
  try {
    eventStore.clear()
    return NextResponse.json({ message: 'Events cleared successfully' })
  } catch (error) {
    console.error('Error clearing events:', error)
    return NextResponse.json(
      { error: 'Failed to clear events' },
      { status: 500 }
    )
  }
}