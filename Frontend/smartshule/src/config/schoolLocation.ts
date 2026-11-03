/**
 * Centralized School Location & Directions Configuration
 * 
 * Update this file to change the school name, physical address,
 * GPS coordinates (Latitude/Longitude), map zoom, or Google Maps travel mode.
 */
export interface SchoolLocationConfig {
  schoolName: string
  physicalAddress: string
  shortAddress: string
  coordinates: {
    lat: number
    lng: number
  }
  isVerifiedCoordinates: boolean
  mapZoom: number
  travelMode: 'driving' | 'transit' | 'walking' | 'bicycling'
  contact: {
    phonePrimary: string
    phoneSecondary: string
    email: string
    workingHoursWeekday: string
    workingHoursSaturday: string
  }
}

export const SCHOOL_LOCATION_CONFIG: SchoolLocationConfig = {
  schoolName: 'Grace Seeds School',
  physicalAddress: 'Kisian, KEMRI Road, Kisumu, Kenya',
  shortAddress: 'Kisian, KEMRI Road, Kisumu',
  // Placeholder coordinates for Kisian / KEMRI Road, Kisumu (-0.0825, 34.6644)
  // Ready to be replaced when exact verified school pin is provided.
  coordinates: {
    lat: -0.0825,
    lng: 34.6644,
  },
  isVerifiedCoordinates: false,
  mapZoom: 15,
  travelMode: 'driving',
  contact: {
    phonePrimary: '+254 700 000 000',
    phoneSecondary: '+254 711 000 000',
    email: 'info@graceseeds.sc.ke',
    workingHoursWeekday: '7:30 AM – 5:00 PM',
    workingHoursSaturday: '8:00 AM – 1:00 PM',
  },
}

/**
 * Generates an official Google Maps Directions URL targeting the school coordinates.
 */
export const getGoogleMapsDirectionsUrl = (
  coords = SCHOOL_LOCATION_CONFIG.coordinates,
  mode = SCHOOL_LOCATION_CONFIG.travelMode
): string => {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${coords.lat},${coords.lng}`)}&travelmode=${encodeURIComponent(mode)}`
}

/**
 * Generates an official Google Maps Place / Search URL for the address.
 */
export const getGoogleMapsSearchUrl = (address = SCHOOL_LOCATION_CONFIG.physicalAddress): string => {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}
