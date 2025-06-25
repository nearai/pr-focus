// Define our own versions of the missing components
// These are simplified implementations that match the original API
type StreamingResponse = ReadableStream<Uint8Array>

function AnthropicStream(response: Response): StreamingResponse {
  return response.body as StreamingResponse
}

function GoogleGenerativeAIStream(response: Response): StreamingResponse {
  return response.body as StreamingResponse
}

function OpenAIStream(response: Response): StreamingResponse {
  return response.body as StreamingResponse
}

class StreamingTextResponse extends Response {
  constructor(stream: StreamingResponse) {
    super(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    })
  }
}

// Define the supported AI providers
export type AIProvider = 'anthropic' | 'google' | 'openai' | 'near'

// Configuration interface for AI providers
export interface AIConfig {
  provider: AIProvider
  apiKey: string
  model: string
}

// Default configuration
const defaultConfig: AIConfig = {
  provider: 'openai', // Default provider
  apiKey: process.env.OPENAI_API_KEY || '',
  model: 'gpt-4o',
}

// Get configuration based on environment variables
export function getAIConfig(): AIConfig {
  const provider = (process.env.AI_PROVIDER as AIProvider) || defaultConfig.provider

  switch (provider) {
    case 'anthropic':
      return {
        provider,
        apiKey: process.env.ANTHROPIC_API_KEY || '',
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
      }
    case 'google':
      return {
        provider,
        apiKey: process.env.GOOGLE_API_KEY || '',
        model: process.env.GOOGLE_MODEL || 'gemini-2.5-flash',
      }
    case 'near':
      // NEAR AI is OpenAI compatible, so we use the same stream
      return {
        provider,
        apiKey: process.env.NEAR_API_KEY || '',
        model: process.env.NEAR_MODEL || 'qwen3-235b-a22b',
      }
    case 'openai':
    default:
      return {
        provider: 'openai',
        apiKey: process.env.OPENAI_API_KEY || '',
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      }
  }
}

// Create a streaming or non-streaming response based on the configured provider
export async function createAIResponse(
  messages: any[],
  stream: boolean,
  config: AIConfig = getAIConfig(),
  max_tokens: number = 64000
): Promise<Response> {
  console.log('[DEBUG] Creating AI response with provider and model:', config.provider, config.model)

  let url: string
  let headers: Record<string, string>
  let body: Record<string, any>

  switch (config.provider) {
    case 'anthropic':
      url = 'https://api.anthropic.com/v1/messages'
      headers = {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
      }
      body = {
        model: config.model,
        messages,
        stream,
        max_tokens,
      }
      break
    case 'google':
      url = `https://generativelanguage.googleapis.com/v1beta/models/${
        config.model
      }:${stream ? 'streamGenerateContent' : 'generateContent'}`
      headers = {
        'Content-Type': 'application/json',
        'x-goog-api-key': config.apiKey,
      }
      body = {
        contents: messages.map(message => ({
          role: message.role,
          parts: [{ text: message.content }],
        })),
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: max_tokens,
        },
      }
      break
    case 'near':
      url = 'https://api.near.ai/v1/chat/completions'
      headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      }
      body = {
        model: config.model,
        messages,
        stream,
        max_tokens,
      }
      break
    case 'openai':
    default:
      url = 'https://api.openai.com/v1/chat/completions'
      headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      }
      body = {
        model: config.model,
        messages,
        stream,
        max_tokens,
      }
      break
  }

  console.log(`[DEBUG] Making request to ${url}`)
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  console.log(`[DEBUG] API response status: ${response.status}`)

  if (stream) {
    switch (config.provider) {
      case 'anthropic':
        return new StreamingTextResponse(AnthropicStream(response))
      case 'google':
        return new StreamingTextResponse(GoogleGenerativeAIStream(response))
      case 'near':
      case 'openai':
      default:
        return new StreamingTextResponse(OpenAIStream(response))
    }
  } else {
    // In a non-streaming response, just return the JSON
    const json = await response.json()
    return new Response(JSON.stringify(json), {
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export async function createAIStream(
  messages: any[],
  config: AIConfig = getAIConfig(),
  max_tokens: number = 64000
): Promise<Response> {
  return createAIResponse(messages, true, config, max_tokens)
}
