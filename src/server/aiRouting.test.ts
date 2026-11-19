import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampTokensForModel,
  shouldBlacklistModelOnError,
  isMaxTokensError,
  isPayloadOrContextError,
  isPermanentAuthKeyError,
  compactSystemPrompt,
  compactMessagesForRetry,
} from './aiRouting';

test('clampTokensForModel prevents oversized tier maxTokens from hitting provider limits', () => {
  // Firestore VIP/Premium caps can be 409600 or 1800000
  assert.equal(clampTokensForModel('groq', 'qwen/qwen3.8-27b', 409600), 16384);
  assert.equal(clampTokensForModel('groq', 'openai/gpt-oss-120b', 1800000), 16384);
  assert.equal(clampTokensForModel('groq', 'allam-2-7b', 100000), 4096);
  assert.equal(clampTokensForModel('cohere', 'command-r-plus-08-2024', 409600), 4096);
  assert.equal(clampTokensForModel('gemini', 'gemini-2.5-flash', 409600), 16384);
  assert.equal(clampTokensForModel('gemini', 'gemini-2.5-flash-lite', 50000), 8192);
  assert.equal(clampTokensForModel('groq', 'qwen/qwen3.8-27b', 1200), 1200);
  assert.equal(clampTokensForModel('groq', 'qwen/qwen3.8-27b', 50), 256);
});

test('shouldBlacklistModelOnError only returns true for non-existent or decommissioned models', () => {
  // Never blacklist on 400 max_tokens, 413 payload too large, or 429 rate limits
  assert.equal(shouldBlacklistModelOnError(400, 'max_tokens must be <= 16384'), false);
  assert.equal(shouldBlacklistModelOnError(413, 'Request too large for model'), false);
  assert.equal(shouldBlacklistModelOnError(429, 'Rate limit exceeded'), false);

  // Only blacklist on 404 or explicit decommission errors
  assert.equal(shouldBlacklistModelOnError(404, 'Not Found'), true);
  assert.equal(shouldBlacklistModelOnError(400, 'The model `llama-3.3-70b-versatile` has been decommissioned'), true);
  assert.equal(shouldBlacklistModelOnError(400, 'model_not_found: unknown model'), true);
});

test('error classifiers distinguish max_tokens, payload/context, and permanent auth errors', () => {
  assert.equal(isMaxTokensError('Invalid value for max_tokens: must be less than 16384'), true);
  assert.equal(isPayloadOrContextError(413, 'Payload too large'), true);
  assert.equal(isPayloadOrContextError(400, 'context_length_exceeded: reduce the length'), true);
  assert.equal(isPermanentAuthKeyError(401, 'Invalid API Key'), true);
  assert.equal(isPermanentAuthKeyError(429, 'Too many requests'), false);
});

test('compactSystemPrompt deduplicates repeated sections and clamps length cleanly', () => {
  const repeated = [
    'IDENTITY: You are NOVA Muse assistant.',
    'IDENTITY:   You are NOVA Muse assistant.',
    'RULES: Always write clean TypeScript.',
  ].join('\n\n');

  const deduped = compactSystemPrompt(repeated, 2000);
  assert.equal(deduped.split('IDENTITY:').length - 1, 1);

  const huge = Array.from({ length: 120 }, (_, i) => `Directive block ${i}: ${'x'.repeat(120)}`).join('\n\n');
  const compacted = compactSystemPrompt(huge, 1500);
  assert.ok(compacted.length <= 1510);
  assert.ok(compacted.includes('[...context compacted...]'));
});

test('compactMessagesForRetry slices older history and truncates oversized messages', () => {
  const longMsg = 'a'.repeat(4000);
  const msgs = Array.from({ length: 12 }, (_, i) => ({
    role: i % 2 === 0 ? 'user' : 'assistant',
    text: i === 11 ? longMsg : `message ${i}`,
  }));

  const retried = compactMessagesForRetry(msgs, 6, 500);
  assert.equal(retried.length, 6);
  assert.equal(retried[0].text, 'message 6');
  assert.ok((retried[5].text || '').length <= 510);
  assert.ok((retried[5].text || '').includes('[...truncated for context...]'));
});
