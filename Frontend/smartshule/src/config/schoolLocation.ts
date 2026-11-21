/**
 * -----------------------------------------------------------------------------
 * Centralized School Location Configuration for SmartShule
 * -----------------------------------------------------------------------------
 * This file contains the single source of truth for the school's location,
 * physical address, GPS coordinates, and map display settings.
 * 
 * Supports both leaflet map components and Google Maps directions.
 * -----------------------------------------------------------------------------
 */

export interface SchoolLocationConfig {
  /** The official school name */
  schoolName: string
  /** The physical address displayed to visitors */
  physicalAddress: string
  /** Short physical address */
  shortAddress: string
  /** Prominent landmark or direction notes */
  landmark: string
  /** Latitude coordinate (WGS84 decimal format) */
  latitude: number
  /** Longitude coordinate (WGS84 decimal format) */
  longitude: number
  /** Coordinates object */
  coordinates: {
    lat: number
    lng: number
  }
  /** Default zoom level for interactive map */
  mapZoom: number
  mapZoomLevel: number
  /** Google Maps directions travel mode */
  travelMode: 'driving' | 'walking' | 'bicycling' | 'transit'
  /** Flag indicating whether the coordinates are placeholders or verified */
  isPlaceholderCoordinates: boolean
  isVerifiedCoordinates: boolean
  /** Contact phone number formatted for display */
  phone: string
  /** Contact phone number formatted for tel: links */
  phoneClean: string
  /** Admissions and inquiries email */
  email: string
  /** Campus visiting and office hours */
  visitingHours: string
  contact: {
    phonePrimary: string
    phoneSecondary: string
    email: string
    workingHoursWeekday: string
    workingHoursSaturday: string
  }
  /** OpenStreetMap tile layer URL */
  tileLayerUrl: string
  /** OpenStreetMap attribution text */
  tileLayerAttribution: string
}

export const SCHOOL_LOCATION_CONFIG: SchoolLocationConfig = {
  schoolName: 'Grace Seeds School',
  physicalAddress: 'Kisian, KEMRI Road, Kisumu, Kenya',
  shortAddress: 'Kisian, KEMRI Road, Kisumu',
  landmark: 'Along KEMRI Road, 800m off the Kisumu-Busia Highway',

  // GPS COORDINATES (Easy to update here)
  latitude: -0.061234,
  longitude: 34.721234,
  coordinates: {
    lat: -0.061234,
    lng: 34.721234,
  },

  mapZoom: 15,
  mapZoomLevel: 15,
  travelMode: 'driving',
  isPlaceholderCoordinates: true,
  isVerifiedCoordinates: false,

  // Contact details
  phone: '0745 436312',
  phoneClean: '+254745436312',
  email: 'schoolgraceseeds@gmail.com',
  visitingHours: 'Mon – Fri: 7:30 AM – 4:30 PM | Sat: 8:30 AM – 12:30 PM',
  contact: {
    phonePrimary: '0745 436312',
    phoneSecondary: '+254 745 436312',
    email: 'schoolgraceseeds@gmail.com',
    workingHoursWeekday: '7:30 AM – 4:30 PM',
    workingHoursSaturday: '8:30 AM – 12:30 PM',
  },

  // OpenStreetMap Configuration (Free, open-source, no paid API keys required)
  tileLayerUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  tileLayerAttribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
}

/**
 * Helper to construct the official Google Maps Directions URL
 * Supports either (lat, lng, mode) or (coordsObj, mode)
 */
export function getGoogleMapsDirectionsUrl(
  latOrCoords?: number | { lat: number; lng: number },
  lngOrMode?: number | string,
  modeArg?: string
): string {
  let lat = SCHOOL_LOCATION_CONFIG.latitude
  let lng = SCHOOL_LOCATION_CONFIG.longitude
  let mode: string = SCHOOL_LOCATION_CONFIG.travelMode

  if (typeof latOrCoords === 'object' && latOrCoords !== null) {
    lat = latOrCoords.lat
    lng = latOrCoords.lng
    if (typeof lngOrMode === 'string') {
      mode = lngOrMode
    }
  } else if (typeof latOrCoords === 'number') {
    lat = latOrCoords
    if (typeof lngOrMode === 'number') {
      lng = lngOrMode
    }
    if (typeof modeArg === 'string') {
      mode = modeArg
    }
  }

  const destination = encodeURIComponent(`${lat},${lng}`)
  const travelMode = encodeURIComponent(mode)
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=${travelMode}`
}

/**
 * Generates an official Google Maps Place / Search URL for the address.
 */
export const getGoogleMapsSearchUrl = (address = SCHOOL_LOCATION_CONFIG.physicalAddress): string => {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}
