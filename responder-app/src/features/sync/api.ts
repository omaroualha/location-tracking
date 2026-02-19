/**
 * Typed API layer for location sync
 * This module provides a clean interface for API operations
 * with proper typing and can be easily swapped between mock and real implementations
 */

import { LocationEntry } from '@features/queue/types';

// API Request/Response types
export interface LocationBatchRequest {
  locations: LocationEntry[];
  deviceId: string;
  sentAt: number;
}

export interface LocationBatchResponse {
  success: boolean;
  error?: string;
  processedCount?: number;
  serverTimestamp?: number;
}

// Error types for better error handling
export type ApiErrorCode =
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'SERVER_ERROR'
  | 'RATE_LIMITED'
  | 'UNAUTHORIZED'
  | 'UNKNOWN';

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  retryable: boolean;
}

// API client interface - can be implemented by mock or real client
export interface LocationApiClient {
  sendBatch(request: LocationBatchRequest): Promise<LocationBatchResponse>;
}

// Configuration for the API client
export interface ApiClientConfig {
  baseUrl?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

/**
 * Create an API error with proper typing
 */
export function createApiError(
  code: ApiErrorCode,
  message: string,
  retryable = true
): ApiError {
  return { code, message, retryable };
}

/**
 * Determines if an error is retryable
 */
export function isRetryableError(error: ApiError): boolean {
  return error.retryable;
}

/**
 * Maps error messages to error codes
 */
export function mapErrorToCode(message: string): ApiErrorCode {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('timeout')) return 'TIMEOUT';
  if (lowerMessage.includes('network')) return 'NETWORK_ERROR';
  if (lowerMessage.includes('rate limit')) return 'RATE_LIMITED';
  if (lowerMessage.includes('unauthorized') || lowerMessage.includes('401')) return 'UNAUTHORIZED';
  if (lowerMessage.includes('server') || lowerMessage.includes('500')) return 'SERVER_ERROR';

  return 'UNKNOWN';
}
