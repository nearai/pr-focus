# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a GitHub Pull Request Review application built with Next.js 14, React 18, and TypeScript. 
The app allows users to enter a GitHub PR URL and displays comprehensive PR information including diffs, comments, and metadata in a clean, responsive interface.

## Development Commands

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm typecheck` - Run TypeScript type checking

## Architecture

### App Structure (Next.js 14 App Router)
- **Root page** (`src/app/page.tsx`) - Redirects to `/pr`
- **PR page** (`src/app/pr/page.tsx`) - Main PR review interface
- **API route** (`src/app/api/pr/route.ts`) - Fetches PR data from GitHub API

### Core Components
- **DiffViewer** (`src/components/DiffViewer.tsx`) - Displays file diffs with syntax highlighting, expandable files, and inline comments
- **CommentSection** (`src/components/CommentSection.tsx`) - Shows PR comments with filtering (all/general/code comments)

### GitHub Integration
- **GitHubClient** (`src/lib/github.ts`) - Octokit wrapper with methods for:
  - `getPR()` - Fetch PR metadata
  - `getPRFiles()` - Get changed files with diffs
  - `getPRComments()` - Get both review comments and issue comments
  - `parsePRUrl()` - Extract owner/repo/PR number from GitHub URLs

### Key Features
- Responsive design with mobile-first approach
- Diff parsing and visualization with line numbers
- Comment aggregation (inline code comments + general PR comments)
- File expansion/collapse functionality
- Real-time PR data fetching

## Environment Variables

The app requires a `GITHUB_TOKEN` environment variable for GitHub API authentication. This should be set in a `.env.local` file (not tracked in git).

## TypeScript Configuration

Uses strict TypeScript with path aliases (`@/*` maps to `./src/*`) for clean imports. The project follows standard Next.js TypeScript conventions.

## Styling

Uses Tailwind CSS with responsive utilities. The design follows a clean, GitHub-inspired interface with proper contrast and mobile responsiveness.