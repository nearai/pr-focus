// PR analysis prompts

/**
 * Prompt for analyzing a pull request
 * @param prDescription - The description of the pull request
 * @param changedFiles - List of changed files
 * @param fileChanges - The content of the file changes (up to 5000 lines)
 * @returns The formatted prompt
 */
export function createPRAnalysisPrompt(
  prDescription: string,
  changedFiles: string[],
  fileChanges: string
): string {
  return `
You are an expert code reviewer analyzing a GitHub pull request. 
Your goal is to re-organize the changes in the pull request so that logical changes are together regardless of which
file they occurred in.

## PR Description
${prDescription}

## Files Changed
${changedFiles.join('\n')}

## Code Changes
\`\`\`
${fileChanges}
\`\`\`

Your analysis should be thorough but concise, focusing on the most important aspects of the code changes.
All hunks in the file changes should be included in the output.
Based on the above information, please output only a JSON object with the following structure:
\`\`\`json
{
  "summary": "A brief summary of the changes made in the PR",
  "changes": [
    {"label": "Key point 1 about the changes", "hunks": ["RELEVANT_HUNK_IN_DIFF_FORMAT", "ANOTHER_RELEVANT_HUNK_IN_DIFF_FORMAT"], },
    {"label": "Key point 2 about the changes", "hunks": ["RELEVANT_HUNK_IN_DIFF_FORMAT", "ANOTHER_RELEVANT_HUNK_IN_DIFF_FORMAT"], },
  ],
}
\`\`\`

For example:
\`\`\`json
{
  "summary": "Refactored user authentication flow and improved error handling",
  "changes": [
    {
      "label": "User authentication refactor",
      "hunks": [
        {
          "file": "src/services/authService.js", 
          "diff": "@@ -10,7 +10,7 @@ class AuthService {\n   * Authenticates a user with credentials\n   * @param {Object} credentials - User login credentials\n   */\n-  authenticate(credentials) {\n+  login(credentials) {\n     const { username, password } = credentials;\n     return this.validateUser(username, password);\n   }"
        },
        {
          "file": "src/controllers/userController.js", 
          "diff": "@@ -45,6 +45,8 @@ export function initAuth() {\n   // Initialize authentication module\n-  const auth = new AuthService();\n-  return auth.authenticate;\n+  const authService = new AuthService();\n+  // Use the new login method instead of authenticate\n+  return authService.login;\n "
         }
      ]
    },
    {
      "label": "Improved error handling",
      "hunks": [
        {
          "file": "src/controllers/userController.js", 
          "diff": "@@ -15,7 +15,11 @@ class UserController {\n   * Processes user input and validates it\n   * @param {Object} formData - User submitted data\n   */\n-  processFormSubmission(formData) {\n+  processFormSubmission(formData) {\n+    // Added validation before processing\n+    if (!this.validateInput(formData)) {\n+      throw new Error('Invalid form data');\n+    }\n     return this.submitToAPI(formData);\n   }"
       },
        {
          "file": "src/lib/logger.js", 
          "diff": "@@ -120,10 +120,6 @@ export function initializeLogger() {\n   // Configure logger settings\n   const logger = new Logger();\n   \n-  // Legacy debug mode - to be removed\n-  if (process.env.DEBUG_MODE) {\n-    logger.enableVerboseLogging();\n-  }\n   \n   return logger;\n }"
        }
    }
  ]
}
`;
}
