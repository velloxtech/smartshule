import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin, Navigation, ExternalLink, School } from 'lucide-react'
import {
  SCHOOL_LOCATION_CONFIG,
  getGoogleMapsDirectionsUrl
} from '../../config/schoolLocation'

// Fix default Leaflet marker icon issue in bundled Vite / React environments
const createSchoolIcon = () => {
  return L.divIcon({
    className: 'custom-school-leaflet-marker',
    html: `
      <div style="
        background: #800000;
        width: 38px;
        height: 38px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 14px rgba(128, 0, 0, 0.45);
        border: 2.5px solid #ffffff;
      ">
        <svg style="transform: rotate(45deg); width: 18px; height: 18px; color: #ffffff;" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 21s-7-4.5-7-10a7 7 0 1114 0c0 5.5-7 10-7 10z" />
          <circle cx="12" cy="11" r="2.5" fill="#ffffff" />
        </svg>
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 38],
    popupAnchor: [0, -38],
  })
}

interface SchoolInteractiveMapProps {
  className?: string
  height?: string
}

export const SchoolInteractiveMap: React.FC<SchoolInteractiveMapProps> = ({
  className = '',
  height = '480px',
}) => {
  const [mapReady, setMapReady] = useState(false)
  const [hasError, setHasError] = useState(false)
  const { coordinates, schoolName, physicalAddress, mapZoom } = SCHOOL_LOCATION_CONFIG

  useEffect(() => {
    try {
      setMapReady(true)
    } catch {
      setHasError(true)
    }
  }, [])

  if (hasError) {
    return (
      <div
        style={{ height }}
        className={`w-full bg-slate-100 flex flex-col items-center justify-center p-6 text-center text-slate-600 rounded-2xl border border-slate-200 ${className}`}
      >
        <MapPin className="w-10 h-10 text-rose-700 mb-2" />
        <p className="font-bold text-slate-800 text-sm">Interactive map could not be loaded</p>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          You can still navigate directly using Google Maps directions.
        </p>
        <a
          href={getGoogleMapsDirectionsUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-[#800000] text-white rounded-xl text-xs font-bold"
        >
          <Navigation className="w-3.5 h-3.5" /> Open Google Maps Directions
        </a>
      </div>
    )
  }

  return (
    <div className={`relative w-full overflow-hidden rounded-2xl ${className}`} style={{ height }}>
      {mapReady && (
        <MapContainer
          center={[coordinates.lat, coordinates.lng]}
          zoom={mapZoom}
          scrollWheelZoom={false}
          style={{ width: '100%', height: '100%', zIndex: 1 }}
          className="rounded-2xl"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
          <Marker position={[coordinates.lat, coordinates.lng]} icon={createSchoolIcon()}>
            <Popup className="school-custom-popup">
              <div className="p-1 max-w-[240px]">
                <div className="flex items-center gap-1.5 text-[#800000] font-black text-xs uppercase tracking-wide mb-1">
                  <School className="w-4 h-4 text-[#800000]" />
                  <span>{schoolName}</span>
                </div>
                <p className="text-[12px] text-slate-700 leading-snug font-medium mb-2.5">
                  {physicalAddress}
                </p>
                <a
                  href={getGoogleMapsDirectionsUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 w-full py-1.5 px-3 bg-[#800000] hover:bg-[#660000] text-white rounded-lg text-[11px] font-bold no-underline transition-colors"
                >
                  <Navigation className="w-3 h-3" />
                  <span>Get Directions</span>
                  <ExternalLink className="w-3 h-3 opacity-80" />
                </a>
              </div>
            </Popup>
          </Marker>
        </MapContainer>
      )}

      {/* Floating control overlay pill */}
      <div className="absolute top-3 right-3 z-[1000] bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full shadow-md border border-slate-200/80 text-[11px] font-semibold text-slate-700 flex items-center gap-1.5 pointer-events-none">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span>Interactive OpenStreetMap</span>
      </div>
    </div>
  )
}

export default SchoolInteractiveMap
