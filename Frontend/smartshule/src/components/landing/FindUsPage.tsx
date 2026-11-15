import React, { useState } from 'react'
import {
  MapPin,
  Navigation,
  Phone,
  Mail,
  Clock,
  Copy,
  Check,
  ExternalLink,
  MessageCircle,
  Building,
  Car,
  Bus,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import SchoolLocationMap from '../common/SchoolLocationMap'
import {
  SCHOOL_LOCATION_CONFIG,
  getGoogleMapsDirectionsUrl,
} from '../../config/schoolLocation'

const logo = '/logo.jpg'

export interface FindUsPageProps {
  onNavigateHome: () => void
  onNavigateAdmissions?: () => void
  onNavigateApplySlot?: () => void
  customCoordinates?: { lat: number; lng: number }
  customAddress?: string
}

export default function FindUsPage({
  onNavigateHome,
  customCoordinates,
  customAddress,
}: FindUsPageProps) {
  const [copied, setCopied] = useState(false)

  const activeLat = customCoordinates?.lat ?? SCHOOL_LOCATION_CONFIG.latitude
  const activeLng = customCoordinates?.lng ?? SCHOOL_LOCATION_CONFIG.longitude
  const displayAddress = customAddress || SCHOOL_LOCATION_CONFIG.physicalAddress
  const schoolName = SCHOOL_LOCATION_CONFIG.schoolName

  // Official Google Maps directions URL with encoded parameters
  const directionsUrl = getGoogleMapsDirectionsUrl(
    activeLat,
    activeLng,
    SCHOOL_LOCATION_CONFIG.travelMode
  )

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(displayAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2200)
  }

  return (
    <div className="min-h-screen bg-[#fdfaf6] text-[#1f0a10]">
      {/* Top Navigation & Title Bar */}
      <div className="max-w-6xl mx-auto px-6 lg:px-12 pt-6 sm:pt-8 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#eedad7]/70">
          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateHome}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5a1226] hover:text-[#7b1c35] bg-white border border-[#eedad7] hover:border-[#7b1c35] px-3.5 py-1.5 rounded-full transition-all cursor-pointer shadow-xs"
            >
              ← Back to Home
            </button>
            <span className="text-gray-300">/</span>
            <h1
              style={{ fontFamily: 'Fraunces, serif' }}
              className="text-xl sm:text-2xl font-bold text-[#5a1226]"
            >
              Find Our School
            </h1>
          </div>

          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="self-start sm:self-auto inline-flex items-center gap-2 bg-[#e8a92a] hover:bg-[#f5c84a] text-[#5a1226] font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-sm transition-all hover:scale-105 cursor-pointer"
          >
            <Navigation className="w-4 h-4 fill-current" />
            <span>Get Directions</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-70" />
          </a>
        </div>
      </div>

      {/* Main Content Layout - Symmetrically Aligned Cards */}
      <main className="max-w-6xl mx-auto px-6 lg:px-12 pt-2 pb-16 space-y-8">
        <div className="grid lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
          {/* Card 1: Interactive Live Location Map Card (7 cols) */}
          <section className="lg:col-span-7 bg-white rounded-3xl border border-[#eedad7] shadow-lg overflow-hidden flex flex-col h-full">
            {/* Header Bar */}
            <div className="bg-[#7b1c35] text-white px-6 py-4 flex items-center justify-between border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold tracking-wider uppercase">
                  Live School Location Pin
                </span>
              </div>
              <span className="text-white/70 text-xs font-medium">
                OpenStreetMap Interactive
              </span>
            </div>

            {/* Interactive Map Surface */}
            <div className="relative flex-1 min-h-[380px] sm:min-h-[460px] w-full bg-[#f0eee9]">
              <SchoolLocationMap
                latitude={activeLat}
                longitude={activeLng}
                zoomLevel={SCHOOL_LOCATION_CONFIG.mapZoomLevel}
                schoolName={schoolName}
                address={displayAddress}
                height="100%"
                className="w-full h-full"
                directionsUrl={directionsUrl}
              />
            </div>

            {/* Footer Bar */}
            <div className="px-6 py-3.5 bg-[#faf5f1] border-t border-[#eedad7] flex flex-wrap items-center justify-between gap-3 text-xs text-gray-600 shrink-0">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#7b1c35] shrink-0" />
                <span className="font-semibold text-gray-800">GPS Coordinates:</span>
                <span className="font-mono text-gray-700 bg-white px-2 py-0.5 rounded border border-gray-200">
                  {activeLat.toFixed(5)}, {activeLng.toFixed(5)}
                </span>
              </div>

              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[#7b1c35] hover:text-[#5a1226] font-bold hover:underline"
              >
                <span>Navigate on Google Maps</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </section>

          {/* Card 2: School Information & Direct Contacts Card (5 cols) */}
          <section className="lg:col-span-5 bg-white rounded-3xl border border-[#eedad7] shadow-lg overflow-hidden flex flex-col h-full">
            {/* Header Bar */}
            <div className="bg-[#7b1c35] text-white px-6 py-4 flex items-center justify-between border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-3.5 h-3.5 text-[#f5c84a]" />
                <span className="text-xs font-bold tracking-wider uppercase">
                  Campus Details & Contacts
                </span>
              </div>
              <span className="text-[#f5c84a] text-xs font-bold bg-white/10 px-2 py-0.5 rounded-full border border-white/20">
                Visitor Welcome
              </span>
            </div>

            {/* Card Body */}
            <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between">
              <div>
                {/* School Branding */}
                <div className="flex items-center gap-3.5 pb-5 mb-5 border-b border-[#eedad7]">
                  <img
                    src={logo}
                    alt={schoolName}
                    className="w-14 h-14 rounded-2xl object-contain bg-white p-1 border border-gray-200 shadow-sm shrink-0"
                  />
                  <div>
                    <h2
                      style={{ fontFamily: 'Fraunces, serif' }}
                      className="text-xl font-bold text-[#5a1226] leading-tight"
                    >
                      {schoolName}
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                      <Building className="w-3.5 h-3.5 text-[#e8a92a]" />
                      <span>Main Campus & Admissions Desk</span>
                    </p>
                  </div>
                </div>

                {/* Key Details Rows */}
                <div className="space-y-4 text-xs">
                  {/* Physical Address */}
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#5a1226]/10 text-[#5a1226] flex items-center justify-center shrink-0 mt-0.5">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-900 text-xs">Physical Address</p>
                      <p className="text-gray-700 text-xs mt-0.5 leading-relaxed font-medium">
                        {displayAddress}
                      </p>
                      <p className="text-gray-500 text-[11px] mt-0.5">
                        {SCHOOL_LOCATION_CONFIG.landmark}
                      </p>
                      <button
                        onClick={handleCopyAddress}
                        className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-[#7b1c35] hover:underline cursor-pointer"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700 font-bold">Address Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Physical Address</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Visiting Hours */}
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#5a1226]/10 text-[#5a1226] flex items-center justify-center shrink-0 mt-0.5">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-xs">Office & Visiting Hours</p>
                      <p className="text-gray-700 text-xs mt-0.5 leading-relaxed">
                        {SCHOOL_LOCATION_CONFIG.visitingHours}
                      </p>
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#5a1226]/10 text-[#5a1226] flex items-center justify-center shrink-0 mt-0.5">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-xs">Telephone Inquiries</p>
                      <a
                        href={`tel:${SCHOOL_LOCATION_CONFIG.phoneClean}`}
                        className="text-[#7b1c35] font-bold text-sm hover:underline mt-0.5 block"
                      >
                        {SCHOOL_LOCATION_CONFIG.phone}
                      </a>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#5a1226]/10 text-[#5a1226] flex items-center justify-center shrink-0 mt-0.5">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-xs">Official Email Desk</p>
                      <a
                        href={`mailto:${SCHOOL_LOCATION_CONFIG.email}`}
                        className="text-gray-700 hover:text-[#7b1c35] hover:underline break-all mt-0.5 block"
                      >
                        {SCHOOL_LOCATION_CONFIG.email}
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-6 mt-6 border-t border-[#eedad7] space-y-2.5">
                {/* Prominent Google Maps Button */}
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#5a1226] hover:bg-[#7b1c35] text-white font-bold text-xs sm:text-sm py-3.5 px-4 rounded-2xl shadow-md transition-all cursor-pointer group"
                >
                  <Navigation className="w-4 h-4 text-[#f5c84a] group-hover:scale-110 transition-transform" />
                  <span>Get Directions (Google Maps)</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                </a>

                {/* WhatsApp Route Assistance */}
                <a
                  href={`https://wa.me/254745436312?text=Hello%20Grace%20Seeds%20School,%20I%20am%20inquiring%20about%20directions%20to%20your%20campus.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-4 rounded-2xl shadow transition-all cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Chat on WhatsApp for Route Help</span>
                </a>
              </div>
            </div>
          </section>
        </div>

        {/* Travel & Arrival Guide (3 Symmetrical Summary Tiles) */}
        <section className="bg-white rounded-3xl border border-[#eedad7] p-6 sm:p-8 shadow-sm">
          <h3
            style={{ fontFamily: 'Fraunces, serif' }}
            className="text-lg sm:text-xl font-bold text-[#5a1226] mb-4 flex items-center gap-2"
          >
            <span>Getting to Grace Seeds School</span>
          </h3>

          <div className="grid sm:grid-cols-3 gap-5">
            {/* Tile 1: Driving */}
            <div className="bg-[#faf6f0] p-4.5 rounded-2xl border border-[#eedad7]/60">
              <div className="w-9 h-9 rounded-xl bg-[#5a1226] text-white flex items-center justify-center mb-3">
                <Car className="w-4 h-4 text-[#f5c84a]" />
              </div>
              <h4 className="font-bold text-gray-900 text-xs sm:text-sm mb-1">
                Driving from Kisumu CBD
              </h4>
              <p className="text-gray-600 text-xs leading-relaxed">
                Take Kisumu-Busia Highway (A104/B1) past Otonglo to Kisian Junction (~12 km). Turn onto KEMRI Road; school is 800m ahead.
              </p>
            </div>

            {/* Tile 2: Public Transport */}
            <div className="bg-[#faf6f0] p-4.5 rounded-2xl border border-[#eedad7]/60">
              <div className="w-9 h-9 rounded-xl bg-[#5a1226] text-white flex items-center justify-center mb-3">
                <Bus className="w-4 h-4 text-[#f5c84a]" />
              </div>
              <h4 className="font-bold text-gray-900 text-xs sm:text-sm mb-1">
                Public Matatu / Boda-boda
              </h4>
              <p className="text-gray-600 text-xs leading-relaxed">
                Board any Kisian/Maseno matatu from Kisumu town. Alight at Kisian Stage (KEMRI Junction), followed by a 1-min ride or 5-min walk.
              </p>
            </div>

            {/* Tile 3: Security & Visitor Parking */}
            <div className="bg-[#faf6f0] p-4.5 rounded-2xl border border-[#eedad7]/60">
              <div className="w-9 h-9 rounded-xl bg-[#5a1226] text-white flex items-center justify-center mb-3">
                <ShieldCheck className="w-4 h-4 text-[#f5c84a]" />
              </div>
              <h4 className="font-bold text-gray-900 text-xs sm:text-sm mb-1">
                Gate Check-in & Free Parking
              </h4>
              <p className="text-gray-600 text-xs leading-relaxed">
                Ample secured visitor parking is available on campus. Security sign-in with National ID or driver’s license is required at the gate.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#3d0c1a] py-6 text-center text-white/50 text-xs border-t border-white/10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} {schoolName}. All rights reserved.</p>
          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateHome}
              className="hover:text-[#f5c84a] transition-colors cursor-pointer"
            >
              Home
            </button>
            <span>•</span>
            <span className="text-white/80">{displayAddress}</span>
            <span>•</span>
            <a href={`tel:${SCHOOL_LOCATION_CONFIG.phoneClean}`} className="hover:text-[#f5c84a]">
              {SCHOOL_LOCATION_CONFIG.phone}
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
