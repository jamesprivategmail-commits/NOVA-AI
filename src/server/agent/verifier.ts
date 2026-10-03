import { VerificationResult } from './types';

export class CodeVerifier {
  /**
   * Verify a set of files for syntax errors, unbalanced tokens, and broken imports
   */
  public verifyCodeFiles(files: { path: string; content: string }[]): VerificationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const file of files) {
      const ext = file.path.split('.').pop()?.toLowerCase();
      if (!['ts', 'tsx', 'js', 'jsx', 'json'].includes(ext || '')) {
        continue;
      }

      if (ext === 'json') {
        try {
          JSON.parse(file.content);
        } catch (e: any) {
          errors.push(`JSON Syntax Error in ${file.path}: ${e.message}`);
        }
        continue;
      }

      // Syntax / token checks for TS/JS/TSX
      const lines = file.content.split('\n');

      // 1. Bracket balancing check
      const stack: { char: string; line: number }[] = [];
      let inMultiLineComment = false;
      let inTemplateString = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let inSingleLineComment = false;
        let inSingleQuote = false;
        let inDoubleQuote = false;

        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          const prev = j > 0 ? line[j - 1] : '';

          if (inMultiLineComment) {
            if (prev === '*' && char === '/') inMultiLineComment = false;
            continue;
          }

          if (inSingleLineComment) break;

          if (char === '/' && line[j + 1] === '*' && !inSingleQuote && !inDoubleQuote && !inTemplateString) {
            inMultiLineComment = true;
            j++;
            continue;
          }

          if (char === '/' && line[j + 1] === '/' && !inSingleQuote && !inDoubleQuote && !inTemplateString) {
            inSingleLineComment = true;
            break;
          }

          if (char === '`' && prev !== '\\') {
            inTemplateString = !inTemplateString;
            continue;
          }

          if (inTemplateString) continue;

          if (char === "'" && prev !== '\\' && !inDoubleQuote) {
            inSingleQuote = !inSingleQuote;
            continue;
          }

          if (char === '"' && prev !== '\\' && !inSingleQuote) {
            inDoubleQuote = !inDoubleQuote;
            continue;
          }

          if (inSingleQuote || inDoubleQuote) continue;

          if (char === '{' || char === '(' || char === '[') {
            stack.push({ char, line: i + 1 });
          } else if (char === '}' || char === ')' || char === ']') {
            if (stack.length === 0) {
              errors.push(`Unmatched closing '${char}' at line ${i + 1} in ${file.path}`);
            } else {
              const last = stack.pop()!;
              const expected = last.char === '{' ? '}' : last.char === '(' ? ')' : ']';
              if (char !== expected) {
                errors.push(`Mismatched bracket at line ${i + 1} in ${file.path}: expected '${expected}', got '${char}' (opened at line ${last.line})`);
              }
            }
          }
        }
      }

      if (stack.length > 0) {
        const unclosed = stack[stack.length - 1];
        errors.push(`Unclosed '${unclosed.char}' opened at line ${unclosed.line} in ${file.path}`);
      }

      if (inTemplateString) {
        errors.push(`Unterminated template string (\`) in ${file.path}`);
      }

      // 2. Common React/TS import checks
      if (ext === 'tsx' || ext === 'jsx') {
        if (file.content.includes('useState') && !file.content.includes("from 'react'") && !file.content.includes('from "react"')) {
          warnings.push(`'useState' used without React import in ${file.path}`);
        }
        if (file.content.includes('useEffect') && !file.content.includes("from 'react'") && !file.content.includes('from "react"')) {
          warnings.push(`'useEffect' used without React import in ${file.path}`);
        }
      }
    }

    const passed = errors.length === 0;

    return {
      passed,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      message: passed
        ? 'Verification succeeded: All code files passed syntax and structure validation.'
        : `Verification failed with ${errors.length} error(s).`
    };
  }

  /**
   * Format error fix instructions for feeding back into the autonomous agent loop
   */
  public generateErrorFeedbackPrompt(
    task: string,
    errors: string[],
    attempt: number,
    maxAttempts: number = 3
  ): string {
    return [
      `[LIVE ERROR LOOP — VERIFICATION ATTEMPT ${attempt}/${maxAttempts} FAILED]:`,
      `Task: ${task}`,
      `The code changes failed automatic verification with the following errors:`,
      ...errors.map((e) => `  - ${e}`),
      '',
      'INSTRUCTIONS FOR AUTO-FIX:',
      '1. Review the exact error lines and unclosed structures.',
      '2. Fix the identified issues in the corresponding files.',
      '3. Ensure all brackets, braces, and imports are fully closed and valid.',
      '4. Output the complete corrected files in the structured coding activity block with status: "fixing".'
    ].join('\n');
  }
}

export const codeVerifier = new CodeVerifier();
