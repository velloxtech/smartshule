/**
 * -----------------------------------------------------------------------------
 * Centralized School Location Configuration for SmartShule
 * -----------------------------------------------------------------------------
 * This file contains the single source of truth for the school's location,
 * physical address, GPS coordinates, and map display settings.
 * 
 * GPS COORDINATES NOTICE:
 * The latitude and longitude below are initial placeholder coordinates for the
 * Kisian / KEMRI Road area in Kisumu, Kenya.
 * To update the school's exact location, update `latitude` and `longitude` below.
 * You do NOT need to modify the map or page components.
 * -----------------------------------------------------------------------------
 */

export interface SchoolLocationConfig {
  /** The official school name */
  schoolName: string
  /** The physical address displayed to visitors */
  physicalAddress: string
  /** Prominent landmark or direction notes */
  landmark: string
  /** Latitude coordinate (WGS84 decimal format) */
  latitude: number
  /** Longitude coordinate (WGS84 decimal format) */
  longitude: number
  /** Default zoom level for interactive map (1 - 18) */
  mapZoomLevel: number
  /** Google Maps directions travel mode */
  travelMode: 'driving' | 'walking' | 'bicycling' | 'transit'
  /** Flag indicating whether the coordinates are placeholders or verified */
  isPlaceholderCoordinates: boolean
  /** Contact phone number formatted for display */
  phone: string
  /** Contact phone number formatted for tel: links */
  phoneClean: string
  /** Admissions and inquiries email */
  email: string
  /** Campus visiting and office hours */
  visitingHours: string
  /** OpenStreetMap tile layer URL */
  tileLayerUrl: string
  /** OpenStreetMap attribution text */
  tileLayerAttribution: string
}

export const SCHOOL_LOCATION_CONFIG: SchoolLocationConfig = {
  schoolName: 'Grace Seeds School',
  physicalAddress: 'Kisian, KEMRI Road, Kisumu, Kenya',
  landmark: 'Along KEMRI Road, 800m off the Kisumu-Busia Highway',

  // ---------------------------------------------------------------------------
  // GPS COORDINATES (Easy to update here)
  // Placeholder coordinates centered on the Kisian / KEMRI Road corridor, Kisumu
  // ---------------------------------------------------------------------------
  latitude: -0.061234,
  longitude: 34.721234,

  mapZoomLevel: 15,
  travelMode: 'driving',
  isPlaceholderCoordinates: true,

  // Contact details
  phone: '0745 436312',
  phoneClean: '+254745436312',
  email: 'schoolgraceseeds@gmail.com',
  visitingHours: 'Mon – Fri: 7:30 AM – 4:30 PM | Sat: 8:30 AM – 12:30 PM',

  // OpenStreetMap Configuration (Free, open-source, no paid API keys required)
  tileLayerUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  tileLayerAttribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
}

/**
 * Helper to construct the official Google Maps Directions URL
 * Format: https://www.google.com/maps/dir/?api=1&destination=LATITUDE,LONGITUDE&travelmode=driving
 */
export function getGoogleMapsDirectionsUrl(
  lat: number = SCHOOL_LOCATION_CONFIG.latitude,
  lng: number = SCHOOL_LOCATION_CONFIG.longitude,
  mode: string = SCHOOL_LOCATION_CONFIG.travelMode
): string {
  const destination = encodeURIComponent(`${lat},${lng}`)
  const travelMode = encodeURIComponent(mode)
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=${travelMode}`
}
