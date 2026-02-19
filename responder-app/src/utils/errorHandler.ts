/**
 * Centralized error handling utilities for consistent error management
 */

export type ErrorSeverity = 'warning' | 'error' | 'critical';

export interface AppError {
  message: string;
  code?: string;
  severity: ErrorSeverity;
  context?: Record<string, unknown>;
  timestamp: number;
}

/**
 * Creates a standardized app error
 */
export function createError(
  message: string,
  options: {
    code?: string;
    severity?: ErrorSeverity;
    context?: Record<string, unknown>;
  } = {}
): AppError {
  return {
    message,
    code: options.code,
    severity: options.severity ?? 'error',
    context: options.context,
    timestamp: Date.now(),
  };
}

/**
 * Extracts a user-friendly message from any error type
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'An unknown error occurred';
}

/**
 * Logs an error with context (can be extended to send to crash reporting)
 */
export function logError(
  tag: string,
  error: unknown,
  context?: Record<string, unknown>
): void {
  const message = getErrorMessage(error);
  const logData = {
    tag,
    message,
    context,
    timestamp: new Date().toISOString(),
  };

  console.error(`[${tag}] Error:`, message, context ?? '');

  // Future: Send to crash reporting service
  // crashReporter.captureException(error, { extra: logData });
}

/**
 * Wraps an async function with standardized error handling
 */
export async function withErrorHandling<T>(
  tag: string,
  fn: () => Promise<T>,
  options: {
    fallback?: T;
    rethrow?: boolean;
    context?: Record<string, unknown>;
  } = {}
): Promise<T | undefined> {
  try {
    return await fn();
  } catch (error) {
    logError(tag, error, options.context);

    if (options.rethrow) {
      throw error;
    }

    return options.fallback;
  }
}

/**
 * Safe JSON parse with error handling
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Retry an async operation with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    onRetry?: (attempt: number, error: unknown) => void;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelayMs = 1000,
    maxDelayMs = 30000,
    onRetry,
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxAttempts) {
        const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
        onRetry?.(attempt, error);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
