// src/screens/trip/tripShared.ts
// Shared types + format/avatar helpers for the Trip Detail screen and its
// sub-components (components/). No JSX here — keeps imports one-directional
// (screen + components -> tripShared) and avoids circular deps.

// ─── Constants ─────────────────────────────────────────────────────────────────

export const OFFLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 min — tune after device QA

export const AVATAR_PALETTE = ['#7F77DD', '#D85A30', '#1D9E75', '#D4537E', '#E89B23', '#3B82F6'];

// ─── Types (mirrors backend GET /api/mobile/trips/:id) ───────────────────────────

export interface LastLocation {
  lat: number;
  lng: number;
  distanceKm: number | null;
  accuracyM: number | null;
  distanceFromLeaderKm: number | null;
  createdAt: string;
}

export interface Member {
  id: string;
  lineUserId: string;
  displayName: string;
  pictureUrl: string | null;
  isLeader: boolean;
  joinedAt: string;
  arrivedAt: string | null;
  lastLocation: LastLocation | null;
}

// Active (uncancelled) SOS event for this trip. Backend GET /:id returns these
// (aiklao_mb_local/routes/mobileTrips.js); the mobile client already receives
// them in res.data — this type just stops them being dropped. Mirrors MapScreen.
export interface ActiveSos {
  id: string;
  userId: string;
  displayName: string;
  pictureUrl: string | null;
  lat: number;
  lng: number;
  triggeredAt: string;
}

export interface TripData {
  trip: {
    id: string;
    name: string;
    status: 'active' | 'archived';
    destination: { lat: number; lng: number; name: string } | null;
    createdAt: string;
    allArrivedAt: string | null;
    endedAt: string | null;
    durationSeconds: number;
    totalDistanceKm: number | null;
  };
  members: Member[];
  activeSos: ActiveSos[];
}

// ─── Avatar helpers ──────────────────────────────────────────────────────────────

export function avatarColor(lineUserId: string): string {
  return AVATAR_PALETTE[(lineUserId.charCodeAt(1) || 0) % AVATAR_PALETTE.length];
}

export function avatarChar(displayName: string): string {
  return displayName.charAt(0) || '?';
}

// ─── Format helpers ──────────────────────────────────────────────────────────────

const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

// "8 มิ.ย. 2026 · เริ่ม 09:04"
export function formatDate(iso: string): string {
  const d = new Date(iso);
  const dateStr = `${d.getDate()} ${TH_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  const timeStr = d.toTimeString().slice(0, 5);
  return `${dateStr} · เริ่ม ${timeStr}`;
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m} นาที`;
  return `${h} ชม. ${m} นาที`;
}

// HH:MM in Bangkok time (arrival timestamp)
export function fmtTimeHHMM(iso: string): string {
  return new Date(iso).toLocaleTimeString('th-TH', {
    timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

export function formatRelativeTime(iso: string): string {
  const age = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(age / 1000);
  if (sec < 60) return `${sec} วินาทีที่แล้ว`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} นาทีที่แล้ว`;
  const hr = Math.floor(min / 60);
  return `${hr} ชม.ที่แล้ว`;
}

export function memberStatusLabel(member: Member): string {
  if (member.isLeader) return 'หัวหน้า';
  if (!member.lastLocation) return 'รอ';
  const age = Date.now() - new Date(member.lastLocation.createdAt).getTime();
  if (age > OFFLINE_THRESHOLD_MS) return 'ออฟไลน์';
  return `${member.lastLocation.distanceFromLeaderKm?.toFixed(1) ?? '?'} กม.`;
}

export function isRecent(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() < 60_000;
}

export function getBatteryColor(percent: number): string {
  if (percent >= 50) return '#0F6E56';
  if (percent >= 20) return '#854F0B';
  return '#791F1F';
}
