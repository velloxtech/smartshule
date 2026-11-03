import React, { useState } from 'react'
import {
  MapPin,
  Navigation,
  Compass,
  Phone,
  Mail,
  Clock,
  ArrowLeft,
  Share2,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Car,
  Bus,
  Footprints,
} from 'lucide-react'
import {
  SCHOOL_LOCATION_CONFIG,
  getGoogleMapsDirectionsUrl,
  getGoogleMapsSearchUrl
} from '../../config/schoolLocation'
import SchoolInteractiveMap from './SchoolInteractiveMap'


export interface FindUsPageProps {
  onNavigateHome: () => void
  onNavigateApplySlot?: () => void
}

export const FindUsPage: React.FC<FindUsPageProps> = ({
  onNavigateHome,
  onNavigateApplySlot,
}) => {
  const [copied, setCopied] = useState(false)
  const [activeTransport, setActiveTransport] = useState<'driving' | 'transit' | 'walking'>('driving')

  const {
    schoolName,
    physicalAddress,
    coordinates,
    isVerifiedCoordinates,
    contact
  } = SCHOOL_LOCATION_CONFIG

  const directionsUrl = getGoogleMapsDirectionsUrl()
  const searchUrl = getGoogleMapsSearchUrl()

  const handleOpenDirections = () => {
    window.open(directionsUrl, '_blank', 'noopener,noreferrer')
  }

  const handleOpenSearch = () => {
    window.open(searchUrl, '_blank', 'noopener,noreferrer')
  }

  const handleShareLocation = () => {
    if (navigator.share) {
      navigator.share({
        title: `${schoolName} Location`,
        text: `Visit ${schoolName} at: ${physicalAddress}`,
        url: directionsUrl,
      }).catch(() => {})
    } else {
      navigator.clipboard.writeText(`${schoolName}\n${physicalAddress}\nGoogle Maps Directions: ${directionsUrl}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    }
  }

  return (
    <div className="min-h-screen bg-[#fdfaf6] text-[#1f0a10]">
      {/* Header Banner */}
      <section className="bg-gradient-to-r from-[#5a1226] via-[#7b1c35] to-[#800000] text-white py-14 px-6 lg:px-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#e8a92a]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-6xl mx-auto relative z-10">
          <button
            onClick={onNavigateHome}
            className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-5 text-sm font-semibold transition-colors cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </button>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-[#f5c84a] text-xs font-bold uppercase tracking-wider mb-3">
            <Compass className="w-3.5 h-3.5" />
            Campus Directions &amp; Live Location
          </div>

          <h1 style={{ fontFamily: 'Fraunces, serif' }} className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-3">
            Find Our School
          </h1>
          <p className="text-white/85 text-base max-w-2xl leading-relaxed">
            Welcome to {schoolName}. Explore our interactive campus map, find turn-by-turn driving directions from your location, and plan your school visit.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-6xl mx-auto px-6 lg:px-12 py-10">
        <div className="grid lg:grid-cols-3 gap-8 items-start">
          
          {/* Left Column: Location Card & Transport Details */}
          <div className="space-y-6">
            <div className="bg-white border border-[#7b1c35]/15 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-[#5a1226] flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[#800000]" />
                  Campus Location
                </h2>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live Pin
                </span>
              </div>
              
              <div className="space-y-4 text-sm text-[#40000e]">
                <div>
                  <p className="font-bold text-[#1f0a10] text-base">{schoolName}</p>
                  <p className="text-[#8a6470] mt-1 font-medium leading-snug">{physicalAddress}</p>
                  <p className="text-[11px] font-mono text-slate-500 mt-1.5">
                    GPS: {coordinates.lat.toFixed(4)}, {coordinates.lng.toFixed(4)}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-2.5">
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-[#800000] shrink-0" />
                    <span className="text-xs sm:text-sm">{contact.phonePrimary} / {contact.phoneSecondary}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-[#800000] shrink-0" />
                    <span className="text-xs sm:text-sm">{contact.email}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="w-4 h-4 text-[#800000] shrink-0 mt-0.5" />
                    <span className="text-xs text-slate-600">
                      Mon – Fri: {contact.workingHoursWeekday}<br />
                      Sat: {contact.workingHoursSaturday}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Get Directions & Share */}
              <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col gap-2.5">
                <button
                  onClick={handleOpenDirections}
                  className="w-full bg-[#800000] hover:bg-[#660000] text-white font-bold py-3 px-4 rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-md hover:scale-[1.02] cursor-pointer"
                  title="Calculate directions in Google Maps from your current location"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Get Directions</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                </button>

                <button
                  onClick={handleOpenSearch}
                  className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#800000]" />
                  <span>Search in Google Maps</span>
                </button>

                <button
                  onClick={handleShareLocation}
                  className="w-full bg-white hover:bg-rose-50 text-[#800000] border border-[#800000]/30 font-semibold py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>{copied ? 'Location Copied to Clipboard!' : 'Share Campus Location'}</span>
                </button>
              </div>
            </div>

            {/* Transport Options */}
            <div className="bg-white border border-[#7b1c35]/15 rounded-2xl p-6 shadow-sm">
              <h3 className="text-base font-bold text-[#5a1226] mb-3">Directions &amp; Transport</h3>
              <div className="flex gap-2 p-1 bg-slate-100 rounded-xl mb-4">
                <button
                  onClick={() => setActiveTransport('driving')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    activeTransport === 'driving' ? 'bg-[#800000] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Car className="w-3.5 h-3.5" /> Driving
                </button>
                <button
                  onClick={() => setActiveTransport('transit')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    activeTransport === 'transit' ? 'bg-[#800000] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Bus className="w-3.5 h-3.5" /> School Bus
                </button>
                <button
                  onClick={() => setActiveTransport('walking')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    activeTransport === 'walking' ? 'bg-[#800000] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Footprints className="w-3.5 h-3.5" /> Walking
                </button>
              </div>

              {activeTransport === 'driving' && (
                <p className="text-xs text-[#8a6470] leading-relaxed">
                  Located along KEMRI Road in Kisian, easily reachable from the Kisumu-Busia Highway. Dedicated secure drop-off and visitor parking available inside the school gates.
                </p>
              )}
              {activeTransport === 'transit' && (
                <p className="text-xs text-[#8a6470] leading-relaxed">
                  Grace Seeds School operates fully monitored school bus routes across surrounding Kisian, Kisumu West, and nearby estates with trained chaperones.
                </p>
              )}
              {activeTransport === 'walking' && (
                <p className="text-xs text-[#8a6470] leading-relaxed">
                  Dedicated pedestrian walkways and zebra crossings supervised during morning arrival (7:00 – 8:00 AM) and evening dismissal (3:30 – 4:30 PM).
                </p>
              )}
            </div>

            {/* Admission Tour CTA */}
            {onNavigateApplySlot && (
              <div className="bg-gradient-to-br from-[#800000] to-[#5a1226] text-white rounded-2xl p-6 shadow-md">
                <h4 className="font-bold text-base mb-1">Planning a School Tour?</h4>
                <p className="text-white/80 text-xs mb-4">
                  Book a slot with our admissions office to tour classrooms, labs, sports fields, and meet our teachers.
                </p>
                <button
                  onClick={onNavigateApplySlot}
                  className="w-full bg-[#e8a92a] hover:bg-[#f5c84a] text-[#5a1226] font-bold py-2.5 px-4 rounded-xl text-xs transition-transform hover:scale-105 cursor-pointer shadow"
                >
                  Book Admission Tour
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Interactive Leaflet Map */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-[#7b1c35]/15 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Interactive School Map
                  </span>
                </div>
                <button
                  onClick={handleOpenDirections}
                  className="text-xs text-[#800000] hover:text-[#660000] font-bold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  Get Directions in Google Maps
                </button>
              </div>

              {/* Map Container */}
              <div className="p-3">
                <SchoolInteractiveMap height="460px" />

              </div>

              {/* Highlights below map */}
              <div className="p-4 bg-white border-t border-slate-100 grid sm:grid-cols-3 gap-4 text-center">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <ShieldCheck className="w-5 h-5 text-[#800000] mx-auto mb-1" />
                  <p className="text-xs font-bold text-slate-800">Secure Gated Campus</p>
                  <p className="text-[11px] text-slate-500">24/7 Security &amp; CCTV</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                  <p className="text-xs font-bold text-slate-800">Visitor Parking</p>
                  <p className="text-[11px] text-slate-500">Free On-site Parking</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <Navigation className="w-5 h-5 text-[#e8a92a] mx-auto mb-1" />
                  <p className="text-xs font-bold text-slate-800">Easy Highway Access</p>
                  <p className="text-[11px] text-slate-500">Kisian / KEMRI Road</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>
    </div>
  )
}

export default FindUsPage
