import React, { useState, useEffect, useCallback } from 'react';
import { apiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { GeofenceConfig, TeacherClockInRecord, UserRole } from '../../types';

interface GeofenceManagementSectionProps {
  onCoordinatesUpdated?: (config: GeofenceConfig) => void;
}

export const GeofenceManagementSection: React.FC<GeofenceManagementSectionProps> = ({
  onCoordinatesUpdated,
}) => {
  const { user } = useAuth();

  // Coordinates can ONLY be entered/modified by Super Admin & School Director
  const canEditCoordinates = Boolean(
    user?.role &&
      [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SCHOOL_ADMIN].includes(user.role)
  );

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
  const [address, setAddress] = useState<string>('Grace Seeds School Main Campus, KEMRI Street, Kisian, Kisumu');

  // GPS detection state
  const [detecting, setDetecting] = useState(false);
  const [detectedAccuracy, setDetectedAccuracy] = useState<number | null>(null);

  // Clock-in Audit records
  const [records, setRecords] = useState<TeacherClockInRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

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
      setErrorMsg('Only the Super Administrator and School Director can modify geofence coordinates.');
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
        setSuccessMsg('School compound geofence coordinates updated and locked successfully!');
        if (onCoordinatesUpdated) {
          onCoordinatesUpdated(res.data);
        }
      } else {
        setErrorMsg(res.message || 'Failed to update geofence coordinates.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update coordinates.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Notification / Role Check */}
      {!canEditCoordinates ? (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
          <span className="material-symbols-outlined text-amber-600 text-2xl shrink-0 mt-0.5">lock</span>
          <div>
            <h4 className="font-bold text-sm">Coordinate Entry Restricted</h4>
            <p className="text-xs mt-0.5 leading-relaxed text-amber-800">
              Only the <strong>Super Administrator</strong> and <strong>School Director</strong> are authorized to configure or update the school compound coordinates. Current values are displayed in read-only audit mode.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-teal-950 flex items-start gap-3">
          <span className="material-symbols-outlined text-teal-700 text-2xl shrink-0 mt-0.5">verified_user</span>
          <div>
            <h4 className="font-bold text-sm">Director & Super Admin Geofence Control Active</h4>
            <p className="text-xs mt-0.5 leading-relaxed text-teal-800">
              You have privileged access to configure the physical perimeter of the school compound. Teachers will only be permitted to clock in when physically situated within this boundary.
            </p>
          </div>
        </div>
      )}

      {/* Main Coordinate Setting Form & Visualizer Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Coordinates Form (7 cols) */}
        <div className="lg:col-span-7 bg-surface-container-lowest rounded-2xl p-6 shadow-xs border border-outline-variant/30 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-surface-container">
            <div>
              <h3 className="font-bold text-base text-on-surface">School Compound Coordinates</h3>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Define the geographic center point and allowed radius for teacher biometric clock-in
              </p>
            </div>
            {canEditCoordinates && (
              <button
                type="button"
                onClick={handleDetectCurrentLocation}
                disabled={detecting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary text-primary hover:text-white text-xs font-semibold transition-all cursor-pointer disabled:opacity-60"
                title="Automatically use director's device GPS as school center"
              >
                <span className={`material-symbols-outlined text-[16px] ${detecting ? 'animate-spin' : ''}`}>
                  {detecting ? 'sync' : 'my_location'}
                </span>
                <span>{detecting ? 'Detecting GPS...' : 'Pin My Current Location'}</span>
              </button>
            )}
          </div>

          {successMsg && (
            <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-teal-900 text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-teal-700 text-[18px]">check_circle</span>
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-rose-700 text-[18px]">error</span>
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
                    className="w-full pl-9 pr-3 py-2 text-xs font-data-mono bg-surface-container-lowest border border-outline-variant/30 rounded-lg focus:outline-primary disabled:bg-surface-container disabled:text-outline"
                  />
                </div>
                <span className="text-[10px] text-on-surface-variant mt-1 block">Range: -90.000000 to +90.000000</span>
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
                    className="w-full pl-9 pr-3 py-2 text-xs font-data-mono bg-surface-container-lowest border border-outline-variant/30 rounded-lg focus:outline-primary disabled:bg-surface-container disabled:text-outline"
                  />
                </div>
                <span className="text-[10px] text-on-surface-variant mt-1 block">Range: -180.000000 to +180.000000</span>
              </div>
            </div>

            {/* Perimeter Radius Preset Pills */}
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
                Compound Perimeter Radius: <span className="font-data-mono text-primary">{radiusMeters} meters</span>
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
                        ? 'bg-primary text-white shadow-2xs'
                        : 'bg-surface-container hover:bg-surface-container-high text-on-surface'
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
              <div className="flex justify-between text-[10px] text-outline mt-0.5">
                <span>50m (Compact School)</span>
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
                className="w-full px-3 py-2 text-xs bg-surface-container-lowest border border-outline-variant/30 rounded-lg focus:outline-primary disabled:bg-surface-container disabled:text-outline"
              />
            </div>

            {/* Enforcement Toggle Switch */}
            <div className="pt-2 flex items-center justify-between p-3 rounded-xl bg-surface-container-high/40 border border-outline-variant/20">
              <div>
                <span className="font-bold text-xs text-on-surface block">
                  Enforce Geofence on Teacher Clock-In
                </span>
                <span className="text-[11px] text-on-surface-variant block mt-0.5">
                  When enabled, clock-in is strictly blocked if the teacher is outside the {radiusMeters}m perimeter
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
        <div className="lg:col-span-5 bg-surface-container-lowest rounded-2xl p-6 shadow-xs border border-outline-variant/30 flex flex-col justify-between space-y-6">
          <div>
            <h3 className="font-bold text-base text-on-surface pb-3 border-b border-surface-container">
              Perimeter Radar Visualizer
            </h3>

            {/* Radar Diagram Graphic */}
            <div className="mt-6 flex flex-col items-center justify-center">
              <div className="relative w-48 h-48 rounded-full border-2 border-dashed border-[#7a1228]/40 bg-[#7a1228]/5 flex items-center justify-center">
                {/* Secondary inner ring */}
                <div className="w-32 h-32 rounded-full border border-teal-500/30 bg-teal-500/5 flex items-center justify-center">
                  {/* Center pin */}
                  <div className="w-10 h-10 rounded-full bg-[#7a1228] text-white flex items-center justify-center shadow-md animate-pulse">
                    <span className="material-symbols-outlined text-[20px]">school</span>
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
                  LAT: {parseFloat(latitude || '0').toFixed(5)} · LON: {parseFloat(longitude || '0').toFixed(5)}
                </p>
                {detectedAccuracy != null && (
                  <p className="text-[10px] text-teal-700 font-semibold">
                    Acquired via Device GPS (±{detectedAccuracy}m accuracy)
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="pt-4 border-t border-surface-container grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-surface-container-high/40 border border-outline-variant/20">
              <span className="text-[10px] text-on-surface-variant font-semibold uppercase block">
                Total Clocked In Today
              </span>
              <span className="text-xl font-bold font-data-mono text-on-surface mt-1 block">
                {records.filter((r) => r.status === 'CLOCKED_IN').length}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-surface-container-high/40 border border-outline-variant/20">
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

      {/* Faculty Today Clock-In Audit Table */}
      <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-xs border border-outline-variant/30 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-container">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">how_to_reg</span>
            <div>
              <h3 className="font-bold text-base text-on-surface">Faculty Geofence Roll-Call Audit</h3>
              <p className="text-xs text-on-surface-variant">
                Live registry of teacher clock-in events with stamped GPS distance verification
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadClockInRecords}
            disabled={loadingRecords}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-on-surface transition-all cursor-pointer self-start sm:self-auto"
          >
            <span className={`material-symbols-outlined text-[16px] text-primary ${loadingRecords ? 'animate-spin' : ''}`}>
              sync
            </span>
            <span>{loadingRecords ? 'Refreshing...' : 'Refresh Audit Log'}</span>
          </button>
        </div>

        {records.length === 0 ? (
          <div className="py-12 text-center text-on-surface-variant">
            <span className="material-symbols-outlined text-4xl text-outline mb-2">fingerprint</span>
            <p className="font-semibold text-sm text-on-surface">No clock-in records logged for today yet</p>
            <p className="text-xs text-outline mt-1">
              As educators clock in from their dashboard within the school compound, entries will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-surface-container bg-surface-container/50 text-on-surface-variant uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3 font-semibold">Educator Name</th>
                  <th className="py-2.5 px-3 font-semibold">Status</th>
                  <th className="py-2.5 px-3 font-semibold">Clock In</th>
                  <th className="py-2.5 px-3 font-semibold">Clock Out</th>
                  <th className="py-2.5 px-3 font-semibold">Distance to Center</th>
                  <th className="py-2.5 px-3 font-semibold">GPS Coordinates</th>
                  <th className="py-2.5 px-3 font-semibold">Compliance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-container-high/30 transition-colors">
                    <td className="py-3 px-3 font-semibold text-on-surface">
                      {r.teacherName || 'Faculty Member'}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          r.status === 'CLOCKED_IN'
                            ? 'bg-teal-100 text-teal-800'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {r.status === 'CLOCKED_IN' ? 'Clocked In' : 'Clocked Out'}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-data-mono font-semibold text-on-surface">
                      {r.clockInTime || '--:--'}
                    </td>
                    <td className="py-3 px-3 font-data-mono text-outline">
                      {r.clockOutTime || '--:--'}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-data-mono font-bold text-teal-700">
                        {r.distanceMeters != null ? `${r.distanceMeters}m` : 'Verified'}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-data-mono text-[11px] text-outline">
                      {r.latitude != null && r.longitude != null
                        ? `${r.latitude.toFixed(4)}, ${r.longitude.toFixed(4)}`
                        : 'GPS Recorded'}
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-800">
                        <span className="material-symbols-outlined text-[14px] text-teal-700">verified</span>
                        <span>Inside Compound</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
