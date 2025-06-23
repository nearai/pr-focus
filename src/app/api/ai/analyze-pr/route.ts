import { NextRequest, NextResponse } from 'next/server'
import { createAIStream } from '@/lib/ai-config'
import { createPRAnalysisPrompt } from '@/lib/pr-prompts'

// Maximum number of lines to include in the analysis
const MAX_LINES = 5000

export async function POST(req: NextRequest) {
  console.log('[DEBUG] Received PR analysis request')
  console.log('[DEBUG] Request URL:', req.url)
  console.log('[DEBUG] Request method:', req.method)

  try {
    // Log the entire request body
    const body = await req.json()
    console.log('[DEBUG] PR analysis request body:', body)

    // Extract the data from the request body
    // The data might be in body.data, body.messages[0].content, or directly in body
    let prDescription, changedFiles, fileChanges;

    if (body.data) {
      // Data is in body.data
      ({ prDescription, changedFiles, fileChanges } = body.data);
    } else if (body.messages && body.messages.length > 0 && typeof body.messages[0].content === 'string') {
      // Data is in body.messages[0].content as a JSON string
      try {
        const content = JSON.parse(body.messages[0].content);
        ({ prDescription, changedFiles, fileChanges } = content);
      } catch (e) {
        console.error('[DEBUG] Error parsing message content:', e);
      }
    } else {
      // Data is directly in body
      ({ prDescription, changedFiles, fileChanges } = body);
    }

    console.log('[DEBUG] PR analysis request data:', {
      descriptionLength: prDescription?.length || 0,
      numChangedFiles: changedFiles?.length || 0,
      fileChangesLength: fileChanges?.length || 0
    })

    // Validate input
    if (!prDescription || !changedFiles || !fileChanges) {
      console.log('[DEBUG] PR analysis validation failed: Missing required fields')
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Limit file changes to MAX_LINES
    const limitedFileChanges = fileChanges
      .split('\n')
      .slice(0, MAX_LINES)
      .join('\n')

    console.log('[DEBUG] Limited file changes to', MAX_LINES, 'lines')

    // Create the prompt
    console.log('[DEBUG] Creating PR analysis prompt')
    const prompt = createPRAnalysisPrompt(
      prDescription,
      changedFiles,
      limitedFileChanges
    )
    console.log('[DEBUG] PR analysis prompt created, length:', prompt.length)

    // Create messages for the AI
    const messages = [
      {
        role: 'system',
        content: 'You are an expert code reviewer providing analysis of pull requests.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ]

    // Create the AI stream
    console.log('[DEBUG] Creating AI stream for PR analysis')
    return await createAIStream(messages)

  } catch (error) {
    console.error('Error analyzing PR:', error)
    return NextResponse.json(
      { error: 'Failed to analyze PR' },
      { status: 500 }
    )
  }
}
