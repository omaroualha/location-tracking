// Geographic utilities
export {
  calculateDistanceKm,
  calculateDistanceMeters,
  formatDistance,
  estimateEtaMinutes,
  formatEta,
  type Coordinates,
} from './geo';

// Routing utilities
export {
  fetchRoute,
  formatDuration,
  formatRouteDistance,
  type RouteStep,
  type RouteResult,
} from './routing';

// Error handling utilities
export {
  createError,
  getErrorMessage,
  logError,
  withErrorHandling,
  safeJsonParse,
  withRetry,
  type AppError,
  type ErrorSeverity,
} from './errorHandler';

// Navigation utilities - now exported from @features/navigation
// import { navigationRef, navigateToMap, navigateToProfile } from '@features/navigation';

// Environment utilities
export { isExpoGo } from './environment';
