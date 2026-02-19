/**
 * Real API implementation for location sync
 * Sends location batches to the backend server
 */

import {
  LocationApiClient,
  LocationBatchRequest,
  LocationBatchResponse,
} from "./api";

const TAG = "RealApi";

// Configure your backend URL here
// Use your computer's local IP address (not localhost) when testing on a physical device
// Run: ipconfig getifaddr en0 (macOS) or ip addr show wlan0 (Linux) to find your IP
const API_BASE_URL = __DEV__
  ? "http://192.168.178.34:3001"
  : "https://your-production-url.com";

const TIMEOUT_MS = 30000;

/**
 * Send a batch of locations to the real backend
 */
export async function sendLocationBatch(
  payload: LocationBatchRequest,
): Promise<LocationBatchResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    console.log(
      `[${TAG}] Sending ${payload.locations.length} locations to ${API_BASE_URL}`,
    );

    const response = await fetch(`${API_BASE_URL}/api/locations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.log(`[${TAG}] HTTP ${response.status}: ${errorText}`);

      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText}`,
      };
    }

    const result: LocationBatchResponse = await response.json();

    console.log(
      `[${TAG}] Success - processed ${result.processedCount} locations`,
    );

    return result;
  } catch (error) {
    clearTimeout(timeoutId);

    const message =
      error instanceof Error
        ? error.name === "AbortError"
          ? "Request timeout"
          : error.message
        : "Network error";

    console.log(`[${TAG}] Failed: ${message}`);

    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Real API client implementation
 */
export const realApiClient: LocationApiClient = {
  sendBatch: sendLocationBatch,
};

/**
 * Update the API base URL at runtime
 * Useful for switching between environments or setting IP dynamically
 */
export function setApiBaseUrl(url: string): void {
  console.log(`[${TAG}] API URL updated to: ${url}`);
  // Note: This would need to be stored in a module-level variable
  // For now, edit API_BASE_URL directly
}
