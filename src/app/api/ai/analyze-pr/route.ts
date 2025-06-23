import { NextRequest, NextResponse } from 'next/server'
import { createAIStream } from '@/lib/ai-config'
import { createPRAnalysisPrompt } from '@/lib/pr-prompts'

// Maximum number of lines to include in the analysis
const MAX_LINES = 5000

export async function POST(req: NextRequest) {
  console.log('[DEBUG] Received PR analysis request')

  try {
    const { prDescription, changedFiles, fileChanges } = await req.json()

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
