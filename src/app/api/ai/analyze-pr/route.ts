import { NextRequest, NextResponse } from 'next/server'
import { createAIStream } from '@/lib/ai-config'
import { createPRAnalysisPrompt } from '@/lib/pr-prompts'

// Maximum number of lines to include in the analysis
const MAX_LINES = 5000

export async function POST(req: NextRequest) {
  try {
    const { prDescription, changedFiles, fileChanges } = await req.json()

    // Validate input
    if (!prDescription || !changedFiles || !fileChanges) {
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

    // Create the prompt
    const prompt = createPRAnalysisPrompt(
      prDescription,
      changedFiles,
      limitedFileChanges
    )

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
    return await createAIStream(messages)
    
  } catch (error) {
    console.error('Error analyzing PR:', error)
    return NextResponse.json(
      { error: 'Failed to analyze PR' },
      { status: 500 }
    )
  }
}