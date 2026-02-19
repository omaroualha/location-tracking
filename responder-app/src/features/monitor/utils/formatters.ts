export function formatTime(timestamp: number | null): string {
  if (!timestamp) return 'N/A';
  return new Date(timestamp).toLocaleTimeString();
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

export function formatAge(timestamp: number | null): string {
  if (!timestamp) return 'N/A';
  const age = Date.now() - timestamp;
  return formatDuration(age) + ' ago';
}

export function formatCoord(value: number | null | undefined): string {
  if (value == null) return 'N/A';
  return value.toFixed(6);
}
