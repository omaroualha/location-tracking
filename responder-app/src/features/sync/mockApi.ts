/**
 * Mock API implementation for development and testing
 * Simulates realistic network behavior including latency and failures
 */

import {
  LocationApiClient,
  LocationBatchRequest,
  LocationBatchResponse,
  ApiErrorCode,
} from './api';

const TAG = 'MockApi';

interface MockApiConfig {
  minLatencyMs: number;
  maxLatencyMs: number;
  failureRate: number;
}

const DEFAULT_CONFIG: MockApiConfig = {
  minLatencyMs: 100,
  maxLatencyMs: 500,
  failureRate: 0.1,
};

let config: MockApiConfig = { ...DEFAULT_CONFIG };

export function configureMockApi(newConfig: Partial<MockApiConfig>): void {
  config = { ...config, ...newConfig };
  console.log(`[${TAG}] Configured:`, config);
}

export function resetMockApi(): void {
  config = { ...DEFAULT_CONFIG };
}

function randomLatency(): number {
  return (
    config.minLatencyMs +
    Math.random() * (config.maxLatencyMs - config.minLatencyMs)
  );
}

function shouldFail(): boolean {
  return Math.random() < config.failureRate;
}

// Simulated error scenarios with their codes
const ERROR_SCENARIOS: Array<{ code: ApiErrorCode; message: string }> = [
  { code: 'TIMEOUT', message: 'Network timeout' },
  { code: 'SERVER_ERROR', message: 'Server unavailable' },
  { code: 'RATE_LIMITED', message: 'Rate limited' },
  { code: 'SERVER_ERROR', message: 'Internal server error' },
];

function getRandomError(): { code: ApiErrorCode; message: string } {
  return ERROR_SCENARIOS[Math.floor(Math.random() * ERROR_SCENARIOS.length)];
}

/**
 * Send a batch of locations to the mock API
 */
export async function sendLocationBatch(
  payload: LocationBatchRequest
): Promise<LocationBatchResponse> {
  const latency = randomLatency();

  await new Promise((resolve) => setTimeout(resolve, latency));

  if (shouldFail()) {
    const error = getRandomError();

    console.log(
      `[${TAG}] Failed after`,
      Math.round(latency),
      'ms:',
      error.message,
      '- Batch size:',
      payload.locations.length
    );

    return {
      success: false,
      error: error.message,
    };
  }

  console.log(
    `[${TAG}] Success after`,
    Math.round(latency),
    'ms - Batch size:',
    payload.locations.length
  );

  return {
    success: true,
    processedCount: payload.locations.length,
    serverTimestamp: Date.now(),
  };
}

/**
 * Mock API client implementation
 */
export const mockApiClient: LocationApiClient = {
  sendBatch: sendLocationBatch,
};
