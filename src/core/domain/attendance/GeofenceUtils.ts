/**
 * Geofencing Utilities for School Compound Verification
 * Computes Great-Circle distance using the Haversine formula
 */

export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Radius of the Earth in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export interface GeofenceCheckResult {
  isInside: boolean;
  distanceMeters: number;
  radiusMeters: number;
}

export function isWithinGeofence(
  pointLat: number,
  pointLon: number,
  centerLat: number,
  centerLon: number,
  radiusMeters: number
): GeofenceCheckResult {
  const distance = calculateDistanceMeters(pointLat, pointLon, centerLat, centerLon);
  return {
    isInside: distance <= radiusMeters,
    distanceMeters: distance,
    radiusMeters
  };
}
