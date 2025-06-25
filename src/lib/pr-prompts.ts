// PR analysis prompts

export const systemPrompt = "You are an expert code reviewer analyzing a GitHub pull request. Your goal is to re-organize the changes in the pull request so that logical changes are together regardless of which file they occurred in."

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
Based on the above information, please output only a single YAML object with the following structure:
\`\`\`yaml
summary: A brief summary of the changes made in the PR
changes:
  - label: Key point 1 about the changes
    hunks:
      - file: FILENAME
        diff: |
          RELEVANT_HUNK_IN_DIFF_FORMAT
      - file: ANOTHER_FILENAME
        diff: |
          ANOTHER_RELEVANT_HUNK_IN_DIFF_FORMAT
  - label: Key point 2 about the changes
    hunks:
      - file: FILENAME
        diff: |
          RELEVANT_HUNK_IN_DIFF_FORMAT
\`\`\`

For example:
\`\`\`yaml
summary: Refactored user authentication flow and improved error handling
changes:
  - label: User authentication refactor
    hunks:
      - file: src/services/authService.js
        diff: |
          @@ -10,7 +10,7 @@ class AuthService {
             * Authenticates a user with credentials
             * @param {Object} credentials - User login credentials
             */
          -  authenticate(credentials) {
          +  login(credentials) {
               const { username, password } = credentials;
               return this.validateUser(username, password);
             }
      - file: src/controllers/userController.js
        diff: |
          @@ -45,6 +45,8 @@ export function initAuth() {
             // Initialize authentication module
          -  const auth = new AuthService();
          -  return auth.authenticate;
          +  const authService = new AuthService();
          +  // Use the new login method instead of authenticate
          +  return authService.login;
  - label: Improved error handling
    hunks:
      - file: src/controllers/userController.js
        diff: |
          @@ -15,7 +15,11 @@ class UserController {
             * Processes user input and validates it
             * @param {Object} formData - User submitted data
             */
          -  processFormSubmission(formData) {
          +  processFormSubmission(formData) {
          +    // Added validation before processing
          +    if (!this.validateInput(formData)) {
          +      throw new Error('Invalid form data');
          +    }
               return this.submitToAPI(formData);
             }
      - file: src/lib/logger.js
        diff: |
          @@ -120,10 +120,6 @@ export function initializeLogger() {
             // Configure logger settings
             const logger = new Logger();
             
          -  // Legacy debug mode - to be removed
          -  if (process.env.DEBUG_MODE) {
          -    logger.enableVerboseLogging();
          -  }
             
             return logger;
           }
\`\`\`
Only respond with the YAML object, do not include any additional text or explanations.
`;
}