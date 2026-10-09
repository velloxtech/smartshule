import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { GeofenceConfig, TeacherClockInRecord, UserRole } from '../../types';
import { TeacherGeofenceClockInCard } from './TeacherGeofenceClockInCard';
import { FacultyAttendanceRosterCard } from './FacultyAttendanceRosterCard';

interface GeofenceViewProps {
  onNavigateTab?: (tabId: string) => void;
}

export const GeofenceView: React.FC<GeofenceViewProps> = ({ onNavigateTab }) => {
  const { user } = useAuth();

  // Coordinates can ONLY be entered/modified by Super Admin & School Director
  const canEditCoordinates = Boolean(
    user?.role &&
      [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN].includes(user.role)
  );

  const isTeacher = user?.role === UserRole.TEACHER;

  const [geofence, setGeofence] = useState<GeofenceConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [latitude, setLatitude] = useState<string>('-0.061234');
  const [longitude, setLongitude] = useState<string>('34.721234');
  const [radiusMeters, setRadiusMeters] = useState<number>(250);
  const [isEnabled, setIsEnabled] = useState<boolean>(true);
  const [address, setAddress] = useState<string>(
    'Grace Seeds School Main Campus, KEMRI Street, Kisian, Kisumu'
  );

  // GPS detection state
  const [detecting, setDetecting] = useState(false);
  const [detectedAccuracy, setDetectedAccuracy] = useState<number | null>(null);

  // Clock-in Audit records
  const [records, setRecords] = useState<TeacherClockInRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CLOCKED_IN' | 'CLOCKED_OUT'>('ALL');

  const loadGeofenceData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiService.getGeofenceConfig();
      if (res.success && res.data) {
        setGeofence(res.data);
        setLatitude(String(res.data.latitude ?? -0.061234));
        setLongitude(String(res.data.longitude ?? 34.721234));
        setRadiusMeters(res.data.geofenceRadius ?? 250);
        setIsEnabled(res.data.geofenceEnabled !== false);
        if (res.data.address) setAddress(res.data.address);
      }
    } catch (err: any) {
      console.error('Failed to load geofence config:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadClockInRecords = useCallback(async () => {
    try {
      setLoadingRecords(true);
      const res = await apiService.getGeofenceClockInRecords();
      if (res.success && Array.isArray(res.data)) {
        setRecords(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load teacher clock-in records:', err);
    } finally {
      setLoadingRecords(false);
    }
  }, []);

  useEffect(() => {
    loadGeofenceData();
    loadClockInRecords();
  }, [loadGeofenceData, loadClockInRecords]);

  // Capture Director's Live GPS Coordinates
  const handleDetectCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser.');
      return;
    }

    setDetecting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setDetectedAccuracy(Math.round(pos.coords.accuracy));
        setDetecting(false);
        setSuccessMsg(
          `Acquired current device coordinates: ${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)} (Accuracy ±${Math.round(pos.coords.accuracy)}m). Click "Save Coordinates" to commit.`
        );
      },
      (err) => {
        setDetecting(false);
        setErrorMsg(
          `Unable to acquire GPS coordinates: ${err.message}. Please verify device location permissions.`
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  // Submit Geofence Configuration
  const handleSaveCoordinates = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditCoordinates) {
      setErrorMsg(
        'Only the Super Administrator and School Director can modify geofence coordinates.'
      );
      return;
    }

    const latNum = parseFloat(latitude);
    const lonNum = parseFloat(longitude);

    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      setErrorMsg('Invalid latitude. Value must be between -90 and 90.');
      return;
    }
    if (isNaN(lonNum) || lonNum < -180 || lonNum > 180) {
      setErrorMsg('Invalid longitude. Value must be between -180 and 180.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await apiService.updateGeofenceConfig({
        latitude: latNum,
        longitude: lonNum,
        geofenceRadius: radiusMeters,
        geofenceEnabled: isEnabled,
        address: address.trim(),
      });

      if (res.success && res.data) {
        setGeofence(res.data);
        setSuccessMsg(
          'School compound geofence coordinates updated and locked successfully!'
        );
      } else {
        setErrorMsg(res.message || 'Failed to update geofence coordinates.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update coordinates.');
    } finally {
      setSaving(false);
    }
  };

  // Filtered audit records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchSearch =
        searchFilter.trim() === '' ||
        (r.teacherName &&
          r.teacherName.toLowerCase().includes(searchFilter.toLowerCase())) ||
        (r.teacherId && r.teacherId.toLowerCase().includes(searchFilter.toLowerCase()));

      const matchStatus =
        statusFilter === 'ALL' || r.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [records, searchFilter, statusFilter]);

  const clockedInCount = records.filter((r) => r.status === 'CLOCKED_IN').length;
  const clockedOutCount = records.filter((r) => r.status === 'CLOCKED_OUT').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Standalone Page Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#500b1b] via-[#7a1228] to-[#991b36] p-6 sm:p-8 text-white shadow-md">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20 text-white border border-white/30 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px]">share_location</span>
                Compound Perimeter
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-500/20 text-teal-200 border border-teal-400/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
                {isEnabled ? 'Strict Geofence Active' : 'Geofence Standby'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              School Compound Geofencing
            </h1>
            <p className="text-sm text-rose-100 max-w-2xl leading-relaxed">
              Real-time GPS perimeter boundary enforcement for faculty clock-in. Teachers
              must be physically inside the school compound to clock in. Coordinates are
              strictly maintained by the Super Administrator and School Director.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('teachers-staff')}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 flex items-center gap-2 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">badge</span>
                <span>Faculty Directory</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                loadGeofenceData();
                loadClockInRecords();
              }}
              disabled={loading || loadingRecords}
              className="px-4 py-2.5 rounded-xl bg-white text-[#7a1228] hover:bg-rose-50 font-bold text-xs shadow-sm flex items-center gap-2 transition-all cursor-pointer disabled:opacity-70"
            >
              <span
                className={`material-symbols-outlined text-[18px] ${
                  loading || loadingRecords ? 'animate-spin' : ''
                }`}
              >
                sync
              </span>
              <span>Refresh Status</span>
            </button>
          </div>
        </div>
      </div>

      {/* Role Permission Banner */}
      {!canEditCoordinates ? (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
          <span className="material-symbols-outlined text-amber-600 text-2xl shrink-0 mt-0.5">
            lock
          </span>
          <div>
            <h4 className="font-bold text-sm">Coordinate Entry Restricted</h4>
            <p className="text-xs mt-0.5 leading-relaxed text-amber-800">
              Only the <strong>Super Administrator</strong> and <strong>School Director</strong> are
              authorized to configure or update the school compound coordinates. Current values are
              displayed in read-only audit mode.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-teal-950 flex items-start gap-3">
          <span className="material-symbols-outlined text-teal-700 text-2xl shrink-0 mt-0.5">
            verified_user
          </span>
          <div>
            <h4 className="font-bold text-sm">
              Director & Super Admin Coordinate Management Active
            </h4>
            <p className="text-xs mt-0.5 leading-relaxed text-teal-800">
              You are authorized to configure the physical GPS perimeter of the school compound.
              Teachers outside the {radiusMeters}m radius boundary will be strictly blocked from
              clocking in.
            </p>
          </div>
        </div>
      )}

      {/* Top 4 KPI Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Campus Coordinates */}
        <div className="p-5 rounded-2xl bg-white border border-outline-variant/30 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
              School Center GPS
            </span>
            <span className="material-symbols-outlined text-rose-800 text-[22px]">
              fmd_good
            </span>
          </div>
          <div className="mt-2">
            <span className="text-base font-bold font-data-mono text-on-surface block truncate">
              {parseFloat(latitude || '0').toFixed(5)}, {parseFloat(longitude || '0').toFixed(5)}
            </span>
            <span className="text-[11px] text-on-surface-variant mt-1 block">
              Grace Seeds Main Campus
            </span>
          </div>
        </div>

        {/* Metric 2: Compound Radius */}
        <div className="p-5 rounded-2xl bg-white border border-outline-variant/30 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
              Perimeter Boundary
            </span>
            <span className="material-symbols-outlined text-teal-700 text-[22px]">
              radar
            </span>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold font-data-mono text-teal-800 block">
              {radiusMeters} meters
            </span>
            <span className="text-[11px] text-on-surface-variant mt-1 block">
              Coverage: ~{((Math.PI * radiusMeters * radiusMeters) / 10000).toFixed(1)} hectares
            </span>
          </div>
        </div>

        {/* Metric 3: Enforcement State */}
        <div className="p-5 rounded-2xl bg-white border border-outline-variant/30 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
              Boundary Enforcement
            </span>
            <span className="material-symbols-outlined text-primary text-[22px]">
              gavel
            </span>
          </div>
          <div className="mt-2">
            <span
              className={`text-lg font-bold block ${
                isEnabled ? 'text-teal-700' : 'text-gray-500'
              }`}
            >
              {isEnabled ? 'Strictly Enforced' : 'Unrestricted'}
            </span>
            <span className="text-[11px] text-on-surface-variant mt-1 block">
              Haversine formula verified
            </span>
          </div>
        </div>

        {/* Metric 4: Clocked In Today */}
        <div className="p-5 rounded-2xl bg-white border border-outline-variant/30 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
              Faculty Clocked In Today
            </span>
            <span className="material-symbols-outlined text-purple-700 text-[22px]">
              how_to_reg
            </span>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold font-data-mono text-purple-900 block">
              {clockedInCount}
            </span>
            <span className="text-[11px] text-on-surface-variant mt-1 block">
              {clockedOutCount} clocked out
            </span>
          </div>
        </div>
      </div>

      {/* Teacher Clock-In Section (Visible for Teachers or as Live Demonstration) */}
      {(isTeacher || true) && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-rose-800 text-[20px]">
                my_location
              </span>
              <h3 className="font-bold text-sm text-on-surface">
                {isTeacher ? 'My Live Geofence Clock-In' : 'Teacher Clock-In Station Preview'}
              </h3>
            </div>
            <span className="text-[11px] text-on-surface-variant font-medium">
              GPS Verification Station
            </span>
          </div>
          <TeacherGeofenceClockInCard
            teacherName={user?.name || user?.email || 'Faculty Educator'}
            onClockInChange={() => {
              loadClockInRecords();
            }}
          />
        </div>
      )}

      {/* Main Coordinate Setting Form & Visualizer Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Coordinates Form (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 shadow-xs border border-outline-variant/30 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-surface-container">
            <div>
              <h3 className="font-bold text-base text-on-surface">
                School Compound Coordinates
              </h3>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Define the geographic center point and allowed radius for teacher biometric clock-in
              </p>
            </div>
            {canEditCoordinates && (
              <button
                type="button"
                onClick={handleDetectCurrentLocation}
                disabled={detecting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-900 text-xs font-semibold transition-all cursor-pointer disabled:opacity-60"
                title="Automatically use director's device GPS as school center"
              >
                <span
                  className={`material-symbols-outlined text-[16px] ${
                    detecting ? 'animate-spin' : ''
                  }`}
                >
                  {detecting ? 'sync' : 'my_location'}
                </span>
                <span>{detecting ? 'Detecting GPS...' : 'Pin My Current Location'}</span>
              </button>
            )}
          </div>

          {successMsg && (
            <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-teal-900 text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-teal-700 text-[18px]">
                check_circle
              </span>
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-rose-700 text-[18px]">
                error
              </span>
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSaveCoordinates} className="space-y-4">
            {/* Latitude & Longitude Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
                  Center Latitude <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 material-symbols-outlined text-outline text-[18px]">
                    explore
                  </span>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    disabled={!canEditCoordinates || saving}
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    placeholder="e.g. -0.061234"
                    className="w-full pl-9 pr-3 py-2 text-xs font-data-mono bg-white border border-outline-variant/30 rounded-lg focus:outline-primary disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </div>
                <span className="text-[10px] text-on-surface-variant mt-1 block">
                  Range: -90.000000 to +90.000000
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
                  Center Longitude <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 material-symbols-outlined text-outline text-[18px]">
                    explore
                  </span>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    disabled={!canEditCoordinates || saving}
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    placeholder="e.g. 34.721234"
                    className="w-full pl-9 pr-3 py-2 text-xs font-data-mono bg-white border border-outline-variant/30 rounded-lg focus:outline-primary disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </div>
                <span className="text-[10px] text-on-surface-variant mt-1 block">
                  Range: -180.000000 to +180.000000
                </span>
              </div>
            </div>

            {/* Perimeter Radius Preset Pills */}
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
                Compound Perimeter Radius:{' '}
                <span className="font-data-mono text-rose-800 font-bold">{radiusMeters} meters</span>
              </label>

              <div className="flex items-center gap-2 flex-wrap mb-2">
                {[100, 200, 250, 350, 500, 1000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    disabled={!canEditCoordinates || saving}
                    onClick={() => setRadiusMeters(preset)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:opacity-60 ${
                      radiusMeters === preset
                        ? 'bg-[#7a1228] text-white shadow-2xs'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                    }`}
                  >
                    {preset}m
                  </button>
                ))}
              </div>

              <input
                type="range"
                min="50"
                max="2000"
                step="25"
                disabled={!canEditCoordinates || saving}
                value={radiusMeters}
                onChange={(e) => setRadiusMeters(Number(e.target.value))}
                className="w-full accent-[#7a1228] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-gray-500 mt-0.5">
                <span>50m (Compact School)</span>
                <span>250m (Grace Seeds Default)</span>
                <span>500m (Standard Compound)</span>
                <span>2000m (Large Campus)</span>
              </div>
            </div>

            {/* Compound Address */}
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
                School Campus / Compound Location Description
              </label>
              <input
                type="text"
                disabled={!canEditCoordinates || saving}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Grace Seeds School, Kisian, Kisumu"
                className="w-full px-3 py-2 text-xs bg-white border border-outline-variant/30 rounded-lg focus:outline-primary disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>

            {/* Enforcement Toggle Switch */}
            <div className="pt-2 flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200">
              <div>
                <span className="font-bold text-xs text-on-surface block">
                  Enforce Geofence on Teacher Clock-In
                </span>
                <span className="text-[11px] text-on-surface-variant block mt-0.5">
                  When enabled, clock-in is strictly blocked if the teacher is outside the{' '}
                  {radiusMeters}m perimeter
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  disabled={!canEditCoordinates || saving}
                  checked={isEnabled}
                  onChange={(e) => setIsEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#7a1228]"></div>
              </label>
            </div>

            {/* Submit Button */}
            {canEditCoordinates && (
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving || loading}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#7a1228] hover:bg-[#5e0d1e] text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-60"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {saving ? 'sync' : 'save'}
                  </span>
                  <span>{saving ? 'Saving Coordinates...' : 'Save Geofence Coordinates'}</span>
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Right Column: Visualizer & Radar Card (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 shadow-xs border border-outline-variant/30 flex flex-col justify-between space-y-6">
          <div>
            <h3 className="font-bold text-base text-on-surface pb-3 border-b border-surface-container">
              Perimeter Radar Visualizer
            </h3>

            {/* Radar Diagram Graphic */}
            <div className="mt-6 flex flex-col items-center justify-center">
              <div className="relative w-52 h-52 rounded-full border-2 border-dashed border-[#7a1228]/40 bg-[#7a1228]/5 flex items-center justify-center">
                {/* Secondary inner ring */}
                <div className="w-36 h-36 rounded-full border border-teal-500/30 bg-teal-500/5 flex items-center justify-center">
                  {/* Center pin */}
                  <div className="w-12 h-12 rounded-full bg-[#7a1228] text-white flex items-center justify-center shadow-md animate-pulse">
                    <span className="material-symbols-outlined text-[24px]">school</span>
                  </div>
                </div>

                {/* Boundary tag */}
                <span className="absolute -top-3 px-2 py-0.5 rounded-full bg-white border border-[#7a1228] text-[#7a1228] text-[10px] font-bold shadow-2xs">
                  Boundary: {radiusMeters}m
                </span>

                {/* Verified tag */}
                <span className="absolute -bottom-3 px-2 py-0.5 rounded-full bg-teal-600 text-white text-[10px] font-bold shadow-2xs">
                  {isEnabled ? 'Enforcement Active' : 'Geofence Standby'}
                </span>
              </div>

              <div className="mt-6 text-center space-y-1">
                <p className="text-xs font-bold text-on-surface">Grace Seeds School Compound</p>
                <p className="text-[11px] font-data-mono text-outline">
                  LAT: {parseFloat(latitude || '0').toFixed(5)} · LON:{' '}
                  {parseFloat(longitude || '0').toFixed(5)}
                </p>
                {detectedAccuracy != null && (
                  <p className="text-[10px] text-teal-700 font-semibold">
                    Acquired via Device GPS (±{detectedAccuracy}m accuracy)
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Haversine Metric Explanation Box */}
          <div className="p-3.5 rounded-xl bg-surface-container-high/40 border border-outline-variant/20 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-on-surface">
              <span className="material-symbols-outlined text-rose-800 text-[16px]">
                straighten
              </span>
              <span>Geodesic Boundary Enforcement</span>
            </div>
            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              Distances are computed using the Haversine Great-Circle metric across Earth&apos;s
              curvature ($R = 6,371$ km). Clock-in attempts outside the {radiusMeters}m perimeter
              are rejected both client-side and server-side with an HTTP 403 Forbidden.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="pt-4 border-t border-surface-container grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
              <span className="text-[10px] text-on-surface-variant font-semibold uppercase block">
                Total Clocked In Today
              </span>
              <span className="text-xl font-bold font-data-mono text-on-surface mt-1 block">
                {clockedInCount}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
              <span className="text-[10px] text-on-surface-variant font-semibold uppercase block">
                Compound Compliance
              </span>
              <span className="text-xl font-bold font-data-mono text-teal-700 mt-1 block">
                100%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Comprehensive Faculty Attendance & Clock-In Roster */}
      <FacultyAttendanceRosterCard
        onNavigateTab={onNavigateTab}
        showFullPageLink={false}
      />
    </div>
  );
};
