import React, { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { SCHOOL_LOCATION_CONFIG } from '../../config/schoolLocation'

// Fix standard Leaflet default marker icons in Vite/bundler environments
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Custom branded pin marker for Grace Seeds School
const schoolMarkerIcon = L.divIcon({
  className: 'school-custom-marker',
  html: `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      transform: translate(-50%, -100%);
      filter: drop-shadow(0 4px 8px rgba(0,0,0,0.35));
    ">
      <div style="
        background: #7b1c35;
        border: 2.5px solid #f5c84a;
        color: white;
        padding: 6px;
        border-radius: 9999px;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 42px;
        height: 42px;
        box-shadow: 0 4px 12px rgba(123, 28, 53, 0.45);
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f5c84a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
          <path d="M6 12v5c3 3 9 3 12 0v-5"/>
        </svg>
      </div>
      <div style="
        width: 0;
        height: 0;
        border-left: 7px solid transparent;
        border-right: 7px solid transparent;
        border-top: 9px solid #7b1c35;
        margin-top: -1px;
      "></div>
      <div style="
        width: 12px;
        height: 5px;
        background: rgba(0, 0, 0, 0.28);
        border-radius: 50%;
        margin-top: 2px;
      "></div>
    </div>
  `,
  iconSize: [44, 56],
  iconAnchor: [22, 56],
  popupAnchor: [0, -56],
})

/**
 * Ensures Leaflet correctly recalculates container dimensions upon mounting and resizing
 */
const MapAutoResizer: React.FC = () => {
  const map = useMap()
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize()
    }, 250)
    const handleResize = () => map.invalidateSize()
    window.addEventListener('resize', handleResize)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', handleResize)
    }
  }, [map])
  return null
}

/**
 * Marker with automatic popup display on initial render
 */
const MarkerWithAutoPopup: React.FC<{
  position: [number, number]
  schoolName: string
  address: string
  lat: number
  lng: number
  directionsUrl: string
}> = ({ position, schoolName, address, lat, lng, directionsUrl }) => {
  const markerRef = useRef<L.Marker>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (markerRef.current) {
        markerRef.current.openPopup()
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <Marker ref={markerRef} position={position} icon={schoolMarkerIcon}>
      <Popup className="school-map-popup" maxWidth={280}>
        <div className="p-1 font-sans text-left">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#7b1c35] shrink-0" />
            <h4 className="font-bold text-[#5a1226] text-sm leading-tight m-0">
              {schoolName}
            </h4>
          </div>
          <p className="text-gray-600 text-xs leading-snug m-0">
            {address}
          </p>
          <div className="mt-2.5 pt-2 border-t border-gray-200 flex items-center justify-between text-[11px]">
            <span className="font-mono text-gray-500">
              {lat.toFixed(5)}, {lng.toFixed(5)}
            </span>
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#7b1c35] hover:text-[#5a1226] font-bold underline"
            >
              Directions →
            </a>
          </div>
        </div>
      </Popup>
    </Marker>
  )
}

export interface SchoolLocationMapProps {
  latitude?: number
  longitude?: number
  zoomLevel?: number
  schoolName?: string
  address?: string
  height?: string
  directionsUrl?: string
  className?: string
}

export const SchoolLocationMap: React.FC<SchoolLocationMapProps> = ({
  latitude = SCHOOL_LOCATION_CONFIG.latitude,
  longitude = SCHOOL_LOCATION_CONFIG.longitude,
  zoomLevel = SCHOOL_LOCATION_CONFIG.mapZoomLevel,
  schoolName = SCHOOL_LOCATION_CONFIG.schoolName,
  address = SCHOOL_LOCATION_CONFIG.physicalAddress,
  height = '100%',
  directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${latitude},${longitude}`)}&travelmode=driving`,
  className = '',
}) => {
  return (
    <div
      style={{ height, width: '100%' }}
      className={`relative overflow-hidden bg-[#f0eee9] ${className}`}
    >
      <MapContainer
        center={[latitude, longitude]}
        zoom={zoomLevel}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <MapAutoResizer />
        <TileLayer
          attribution={SCHOOL_LOCATION_CONFIG.tileLayerAttribution}
          url={SCHOOL_LOCATION_CONFIG.tileLayerUrl}
        />
        <MarkerWithAutoPopup
          position={[latitude, longitude]}
          schoolName={schoolName}
          address={address}
          lat={latitude}
          lng={longitude}
          directionsUrl={directionsUrl}
        />
      </MapContainer>
    </div>
  )
}

export default SchoolLocationMap
