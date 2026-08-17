// ===========================================================
//                  Save Manager
// ===========================================================
import type { GameParams, JineMessage, PoketterPost, TimeOfDay } from "./GameState";

export const SAVE_SLOT_COUNT = 3;

const STORAGE_KEY_PREFIX = "ai-ngo:save:";

export interface SaveData {
  params: GameParams;
  posts: PoketterPost[];
  messages: JineMessage[];
  postId: number;
  messageId: number;
  day: number;
  timeOfDay: TimeOfDay;
  drugUsesToday?: Record<string, number>;
  overdosedToday?: boolean;
  unlockedStreamTopicIds?: string[];
  broadcastedStreamTopicIds?: string[];
  usedCommandIds?: string[];
  consecutiveStreamDays?: number;
  lastStreamDay?: number | null;
  gameLevel?: number;
  experienceLevel?: number;
  impactLevel?: number;
  harumagedonLevel?: number;
  announcementDay?: number | null;
  darkStreamLockedUntilDay?: number | null;
  updatedAt: number;
}

function storageKey(slot: number): string {
  return `${STORAGE_KEY_PREFIX}${slot}`;
}

export function loadSlotData(slot: number): SaveData | null {
  try {
    const raw = localStorage.getItem(storageKey(slot));
    if (!raw) return null;
    return JSON.parse(raw) as SaveData;
  } catch {
    return null;
  }
}

export function saveSlotData(slot: number, data: SaveData): void {
  try {
    localStorage.setItem(storageKey(slot), JSON.stringify(data));
  } catch {
    // localStorage が利用できない環境では保存をスキップする
  }
}

export function resetSlotData(slot: number): void {
  try {
    localStorage.removeItem(storageKey(slot));
  } catch {
    // 削除できなくても致命的ではないため無視する
  }
}

export function loadAllSlots(): (SaveData | null)[] {
  return Array.from({ length: SAVE_SLOT_COUNT }, (_, slot) => loadSlotData(slot));
}
