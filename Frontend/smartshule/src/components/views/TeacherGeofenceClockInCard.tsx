import React, { useState, useEffect, useCallback } from 'react';
import { apiService } from '../../services/api';
import { GeofenceConfig, TeacherClockInRecord } from '../../types';

interface TeacherGeofenceClockInCardProps {
  teacherName?: string;
  onClockInChange?: (record: TeacherClockInRecord) => void;
}

function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Radius of Earth in meters
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

export const TeacherGeofenceClockInCard: React.FC<TeacherGeofenceClockInCardProps> = ({
  teacherName,
  onClockInChange,
}) => {
  const [geofence, setGeofence] = useState<GeofenceConfig | null>(null);
  const [clockInRecord, setClockInRecord] = useState<TeacherClockInRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Geolocation state
  const [userCoords, setUserCoords] = useState<{
    latitude: number;
    longitude: number;
    accuracy?: number;
  } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Load geofence config and today's clock in status
  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const [geoRes, todayRes] = await Promise.all([
        apiService.getGeofenceConfig().catch(() => null),
        apiService.getMyTodayClockIn().catch(() => null),
      ]);

      if (geoRes?.data) {
        setGeofence(geoRes.data);
      }
      if (todayRes?.data) {
        setClockInRecord(todayRes.data);
      }
    } catch (err: any) {
      console.error('Failed to load geofence data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Acquire live GPS coordinates via browser Geolocation API
  const acquireLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    setLocating(true);
    setLocationError(null);
    setActionError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError(
            'GPS location access was denied. Please allow location permissions in your browser or device settings to verify you are within the school compound.'
          );
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setLocationError('Location position is unavailable. Please check your device GPS signal.');
        } else if (err.code === err.TIMEOUT) {
          setLocationError('Location request timed out. Please tap "Refresh Location" to try again.');
        } else {
          setLocationError(err.message || 'Unable to detect GPS position.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 5000,
      }
    );
  }, []);

  useEffect(() => {
    loadInitialData();
    acquireLocation();
  }, [loadInitialData, acquireLocation]);

  // Distance computation
  const targetLat = geofence?.latitude ?? -0.061234;
  const targetLon = geofence?.longitude ?? 34.721234;
  const radiusMeters = geofence?.geofenceRadius ?? 250;
  const isGeofenceActive = geofence?.geofenceEnabled !== false;

  const distance =
    userCoords != null
      ? calculateHaversineDistance(
          userCoords.latitude,
          userCoords.longitude,
          targetLat,
          targetLon
        )
      : null;

  const isInsideCompound =
    !isGeofenceActive || (distance != null && distance <= radiusMeters);

  const isClockedIn = clockInRecord?.status === 'CLOCKED_IN';

  // Handle Clock In / Clock Out
  const handleClockToggle = async (action: 'CLOCK_IN' | 'CLOCK_OUT') => {
    setActionError(null);
    setActionSuccess(null);

    // If geofencing is enabled, ensure we have location and are inside compound
    if (isGeofenceActive && action === 'CLOCK_IN') {
      if (!userCoords) {
        setActionError(
          'Device GPS location is required to verify you are within the school compound. Please enable location permissions.'
        );
        acquireLocation();
        return;
      }

      if (!isInsideCompound) {
        setActionError(
          `Clock-in blocked: You are currently outside the school compound (${distance}m away). The maximum permitted perimeter radius is ${radiusMeters}m. Teacher clock-in cannot be accessed outside the compound.`
        );
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await apiService.clockInTeacher({
        action,
        latitude: userCoords?.latitude,
        longitude: userCoords?.longitude,
        accuracy: userCoords?.accuracy,
      });

      if (res.success && res.data) {
        setClockInRecord(res.data);
        if (onClockInChange) {
          onClockInChange(res.data);
        }
        setActionSuccess(
          action === 'CLOCK_IN'
            ? `Successfully clocked in! Location verified inside school compound (${res.data.distanceMeters ?? distance ?? 0}m from center).`
            : 'Successfully clocked out for today.'
        );
      } else {
        setActionError(res.message || 'Clock-in action failed.');
      }
    } catch (err: any) {
      setActionError(
        err.message ||
          'Failed to record clock-in. Ensure you are physically inside the school compound.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 space-y-5">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-container">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white shadow-sm ${
              isInsideCompound ? 'bg-teal-700' : 'bg-rose-700'
            }`}
          >
            <span className="material-symbols-outlined text-2xl">
              {isInsideCompound ? 'share_location' : 'wrong_location'}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-on-surface">
                School Compound Geofence Clock-In
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-900 border border-purple-200">
                TSC Art. 237 Biometric
              </span>
            </div>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Strict location verification: Educators must be physically inside the school compound perimeter to clock in.
            </p>
          </div>
        </div>

        {/* Live Radar Pill */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={acquireLocation}
            disabled={locating}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-on-surface transition-all cursor-pointer disabled:opacity-60"
            title="Refresh current GPS position"
          >
            <span
              className={`material-symbols-outlined text-[16px] text-primary ${
                locating ? 'animate-spin' : ''
              }`}
            >
              sync
            </span>
            <span>{locating ? 'Locating...' : 'Refresh GPS'}</span>
          </button>
        </div>
      </div>

      {/* Geofence Radar Status Card */}
      <div
        className={`rounded-xl p-4 border transition-all ${
          locating
            ? 'bg-amber-50/70 border-amber-200 text-amber-900'
            : isInsideCompound
            ? 'bg-teal-50/80 border-teal-300 text-teal-950'
            : 'bg-rose-50/90 border-rose-300 text-rose-950'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 relative">
              <span
                className={`material-symbols-outlined text-3xl ${
                  locating
                    ? 'text-amber-600'
                    : isInsideCompound
                    ? 'text-teal-700'
                    : 'text-rose-700'
                }`}
              >
                {locating
                  ? 'satellite_alt'
                  : isInsideCompound
                  ? 'verified'
                  : 'gpp_bad'}
              </span>
              {isInsideCompound && !locating && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-500"></span>
                </span>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold">
                  {locating
                    ? 'Acquiring High-Precision GPS Coordinates...'
                    : isInsideCompound
                    ? 'Authorized: You are Within the School Compound'
                    : 'Access Denied: You are Outside the School Compound'}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    isInsideCompound
                      ? 'bg-teal-700 text-white'
                      : 'bg-rose-700 text-white'
                  }`}
                >
                  {isInsideCompound ? 'Within Compound' : 'Outside Boundary'}
                </span>
              </div>

              <p className="text-xs mt-1 leading-relaxed">
                {locating ? (
                  'Communicating with device satellite/network receivers to verify your proximity to the school compound...'
                ) : isInsideCompound ? (
                  <>
                    Your position is <strong>{distance ?? 0}m</strong> from the school compound center (boundary radius is <strong>{radiusMeters}m</strong>). Clock-in is unlocked.
                  </>
                ) : (
                  <>
                    You are currently <strong>{distance ?? 'unknown'}m away</strong> from the school grounds.
                    Clock-in is strictly locked and cannot be accessed outside the compound.
                  </>
                )}
              </p>

              {/* Coordinates Info Chips */}
              <div className="mt-2.5 flex items-center gap-2 flex-wrap text-[11px] font-data-mono">
                <span className="px-2 py-1 rounded bg-white/70 border border-current/15">
                  🏫 Center: {targetLat.toFixed(5)}, {targetLon.toFixed(5)} (±{radiusMeters}m)
                </span>
                {userCoords && (
                  <span className="px-2 py-1 rounded bg-white/70 border border-current/15">
                    📍 My GPS: {userCoords.latitude.toFixed(5)}, {userCoords.longitude.toFixed(5)}
                    {userCoords.accuracy ? ` (±${Math.round(userCoords.accuracy)}m)` : ''}
                  </span>
                )}
                {distance != null && (
                  <span
                    className={`px-2 py-1 rounded font-bold ${
                      isInsideCompound
                        ? 'bg-teal-200 text-teal-900'
                        : 'bg-rose-200 text-rose-900'
                    }`}
                  >
                    📏 Distance: {distance} meters
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Trigger in Banner */}
          <div className="shrink-0 flex flex-col sm:flex-row items-center gap-2">
            {!isClockedIn ? (
              <button
                onClick={() => handleClockToggle('CLOCK_IN')}
                disabled={submitting || locating || !isInsideCompound}
                className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm cursor-pointer disabled:cursor-not-allowed ${
                  isInsideCompound && !submitting
                    ? 'bg-teal-700 hover:bg-teal-800 text-white hover:shadow-md'
                    : 'bg-gray-300 text-gray-500 opacity-80'
                }`}
                title={
                  !isInsideCompound
                    ? 'Clock-in locked: You must be inside the school compound to clock in'
                    : 'Clock in with GPS verification'
                }
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isInsideCompound ? 'login' : 'lock'}
                </span>
                <span>
                  {submitting
                    ? 'Verifying...'
                    : !isInsideCompound
                    ? 'Clock-In Locked (Outside)'
                    : 'Clock In (GPS Verified)'}
                </span>
              </button>
            ) : (
              <button
                onClick={() => handleClockToggle('CLOCK_OUT')}
                disabled={submitting}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-rose-700 hover:bg-rose-800 text-white transition-all shadow-sm cursor-pointer disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
                <span>{submitting ? 'Updating...' : 'Clock Out for Today'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Feedback Messages */}
      {locationError && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-amber-600 text-[18px]">warning</span>
          <span>{locationError}</span>
        </div>
      )}

      {actionError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-rose-600 text-[18px]">block</span>
          <span>{actionError}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-teal-900 text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-teal-600 text-[18px]">check_circle</span>
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Clock-In Log Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
        {/* Card 1: Today Attendance Status */}
        <div className="p-4 rounded-xl bg-surface-container-high/40 border border-outline-variant/20 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-on-surface-variant font-semibold">
              <span>Today's Status</span>
              <span className="material-symbols-outlined text-[18px] text-primary">badge</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full ${
                  isClockedIn ? 'bg-teal-600' : 'bg-gray-400'
                }`}
              ></span>
              <span className="text-sm font-bold text-on-surface">
                {isClockedIn
                  ? 'Clocked In'
                  : clockInRecord?.status === 'CLOCKED_OUT'
                  ? 'Clocked Out'
                  : 'Not Clocked In Yet'}
              </span>
            </div>
          </div>
          <div className="mt-3 text-[11px] text-on-surface-variant font-data-mono">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </div>
        </div>

        {/* Card 2: Clock In Timestamp */}
        <div className="p-4 rounded-xl bg-surface-container-high/40 border border-outline-variant/20 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-on-surface-variant font-semibold">
              <span>Clock-In Timestamp</span>
              <span className="material-symbols-outlined text-[18px] text-teal-700">schedule</span>
            </div>
            <div className="mt-2 text-lg font-bold font-data-mono text-on-surface">
              {clockInRecord?.clockInTime || '--:--'}
            </div>
          </div>
          <div className="mt-3 text-[11px] text-on-surface-variant flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-teal-700">verified</span>
            <span>Compound Geofence Verified</span>
          </div>
        </div>

        {/* Card 3: Clock Out Timestamp */}
        <div className="p-4 rounded-xl bg-surface-container-high/40 border border-outline-variant/20 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-on-surface-variant font-semibold">
              <span>Clock-Out Timestamp</span>
              <span className="material-symbols-outlined text-[18px] text-rose-700">timer_off</span>
            </div>
            <div className="mt-2 text-lg font-bold font-data-mono text-on-surface">
              {clockInRecord?.clockOutTime || '--:--'}
            </div>
          </div>
          <div className="mt-3 text-[11px] text-on-surface-variant">
            {clockInRecord?.clockOutTime ? 'Shift completed' : 'Active on duty'}
          </div>
        </div>
      </div>
    </div>
  );
};
