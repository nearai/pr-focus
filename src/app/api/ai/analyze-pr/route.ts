import { NextRequest, NextResponse } from 'next/server'
import { createAIResponse } from '@/lib/ai-config'
import { createPRAnalysisPrompt, systemPrompt } from '@/lib/pr-prompts'

// Maximum number of lines to include in the analysis
const MAX_LINES = 50000

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
    let prDescription, changedFiles, fileChanges, stream, max_tokens

    if (body.data) {
      // Data is in body.data
      ;({ prDescription, changedFiles, fileChanges, stream, max_tokens } = body.data)
    } else if (
      body.messages &&
      body.messages.length > 0 &&
      typeof body.messages[0].content === 'string'
    ) {
      // Data is in body.messages[0].content as a JSON string
      try {
        const content = JSON.parse(body.messages[0].content)
        ;({ prDescription, changedFiles, fileChanges, stream, max_tokens } = content)
      } catch (e) {
        console.error('[DEBUG] Error parsing message content:', e)
      }
    } else {
      // Data is directly in body
      ;({ prDescription, changedFiles, fileChanges, stream, max_tokens } = body)
    }

    // Default stream to false if not provided
    const useStream = stream === true
    // Default max_tokens to 64000 if not provided
    const useMaxTokens = max_tokens || 64000

    console.log('[DEBUG] PR analysis request data:', {
      descriptionLength: prDescription?.length || 0,
      numChangedFiles: changedFiles?.length || 0,
      fileChangesLength: fileChanges?.length || 0,
      stream: useStream,
      max_tokens: useMaxTokens,
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
        content: systemPrompt,
      },
      {
        role: 'user',
        content: prompt,
      },
    ]

    // Create the AI stream
    console.log('[DEBUG] Creating AI stream for PR analysis')
    return await createAIResponse(messages, useStream, undefined, useMaxTokens)
  } catch (error) {
    console.error('Error analyzing PR:', error)
    return NextResponse.json(
      { error: 'Failed to analyze PR' },
      { status: 500 }
    )
  }
}
