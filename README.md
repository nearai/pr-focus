# PR Focus

PR Review app for the Age of AI. This application helps you review GitHub pull requests with the assistance of AI.

Use at https://pr-focus.vercel.app/

## Features

- Connect to GitHub using GitHub App authentication
- View pull request details, files changed, and comments
- AI-powered analysis of pull requests
- Support for multiple AI providers (OpenAI, Anthropic, Google, NEAR AI)
- Only stores data locally in local storage: 
    - cached analysis results

## Overview
The goal of this project is not to perform the PR reviews themselves but to organize AI reviews.

### Planned Features
 - Organize Copilot and Claude reviews, track actionable items.
 - Extract expected behavior from linked Issues, organize the analysis around the expected behavior.

## Development

### Prerequisites

- Node.js 18+
- pnpm (or npm/yarn)
- GitHub App credentials
- API keys for at least one AI provider

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   pnpm install
   ```
3. Copy the `.env` file and fill in your credentials:
   ```
   cp .env.example .env
   ```
4. Start the development server:
   ```
   pnpm dev
   ```

## AI Provider Configuration

PR Focus supports multiple AI providers for PR analysis. You can configure which provider to use in the `.env` file:

```
# Set the AI provider to use: 'anthropic', 'google', 'openai', or 'near'
AI_PROVIDER=openai
```

### OpenAI Configuration

```
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4o
```

### Anthropic Configuration

```
ANTHROPIC_API_KEY=your-anthropic-api-key
ANTHROPIC_MODEL=claude-3-opus-20240229
```

### Google Configuration

```
GOOGLE_API_KEY=your-google-api-key
GOOGLE_MODEL=gemini-1.5-pro
```

### NEAR AI Configuration (OpenAI compatible)

```
NEAR_API_KEY=your-near-api-key
NEAR_MODEL=near-small
```

## Usage

1. Connect your GitHub account using the GitHub App
2. Enter a GitHub PR URL in the input field
3. Click "Review PR" to load the PR details
4. Click "Analyze PR" to get AI-powered insights about the PR

The AI analysis will include:
- A summary of the changes
- Potential issues or bugs
- Suggestions for improvements
- Security concerns
- Overall assessment of the PR quality
