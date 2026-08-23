// ===========================================================
//                  Endings
//  docs/ending.md を参照して実装する。
// ===========================================================
import type { GameState } from "./GameState";

export type EndingTrigger = "after_command" | "after_broadcast" | "end_of_day" | "day30";

export interface EndingDefinition {
  id: string;
  title: string;
  trigger: EndingTrigger;
  /** 数値が小さいほど優先。docs/ending.md 5. の判定優先順位に対応する。 */
  priority: number;
  terminal: boolean;
  condition: (state: GameState) => boolean;
}

/** 攻略情報間で回数に揺れがあるため設定値化（docs/ending.md 1.）。 */
const NYMPHOMANIA_THRESHOLD = 8;
const RAINBOW_GIRL_THRESHOLD = 5;
const UNREAD_JINE_THRESHOLD = 8;

/** docs/ending.md 1〜4 のうち、既存の状態から機械的に判定できるエンディング。 */
const IMMEDIATE_ENDINGS: EndingDefinition[] = [
  {
    id: "healthy_party",
    title: "Healthy Party",
    trigger: "after_command",
    priority: 10,
    terminal: true,
    condition: (state) => state.sicknessJustDroppedToZero,
  },
  {
    id: "nymphomania",
    title: "Nymphomania",
    trigger: "after_command",
    priority: 11,
    terminal: true,
    condition: (state) => (state.totalCommandUses["play-h"] ?? 0) >= NYMPHOMANIA_THRESHOLD,
  },
  {
    id: "os_alien",
    title: "Os-Alien",
    trigger: "after_command",
    priority: 12,
    terminal: true,
    condition: (state) => state.params.affection >= 100,
  },
  {
    id: "netorare",
    title: "NeToRare",
    trigger: "after_command",
    priority: 13,
    terminal: true,
    condition: (state) => state.params.affection <= 0,
  },
  {
    id: "bomber_girl",
    title: "Bomber Girl",
    trigger: "after_command",
    priority: 14,
    terminal: true,
    condition: (state) => state.stressCap() >= 120 && state.params.stress >= 120,
  },
  {
    id: "rainbow_girl",
    title: "Rainbow Girl",
    trigger: "after_command",
    priority: 15,
    terminal: true,
    condition: (state) => (state.totalCommandUses["drug-stamp"] ?? 0) >= RAINBOW_GIRL_THRESHOLD,
  },
  {
    id: "crossing_the_line",
    title: "Crossing the line",
    trigger: "after_command",
    priority: 16,
    terminal: true,
    condition: (state) => state.unreadJineStreak >= UNREAD_JINE_THRESHOLD,
  },
  {
    id: "milky_way_train",
    title: "Milky Way Train",
    trigger: "after_command",
    priority: 17,
    terminal: true,
    condition: (state) => state.usedCommandIds.has("out-galaxy-station"),
  },

  {
    id: "angel_fall_down",
    title: "Angel Fall Down",
    trigger: "after_broadcast",
    priority: 20,
    terminal: true,
    condition: (state) => state.lastBroadcastTopicId === "sexy-5",
  },
  {
    id: "brain_future",
    title: "脳Future",
    trigger: "after_broadcast",
    priority: 21,
    terminal: true,
    condition: (state) => state.lastBroadcastTopicId === "dark-5",
  },
  {
    id: "welcome_to_my_religion",
    title: "Welcome To My Religion",
    trigger: "after_broadcast",
    priority: 22,
    terminal: true,
    condition: (state) => state.lastBroadcastTopicId === "conspiracy-6",
  },
  {
    id: "dark_angel",
    title: "DARK ANGEL",
    trigger: "after_broadcast",
    priority: 23,
    terminal: true,
    condition: (state) => state.lastBroadcastTopicId === "internet_angel-dark",
  },

  {
    id: "die_set_down",
    title: "Die Set Down",
    trigger: "end_of_day",
    priority: 30,
    terminal: true,
    // DAY10終了（=DAY11到達）時点でフォロワー1万人未満。
    condition: (state) => state.day === 11 && state.params.fans < 10000,
  },
  {
    id: "internet_overdose",
    title: "INTERNET OVERDOSE",
    trigger: "end_of_day",
    priority: 31,
    terminal: true,
    condition: (state) => state.day >= 25 && state.stressCap() >= 120 && state.params.stress >= 80,
  },

  {
    id: "the_internet_angel_be_invoked",
    title: "THE INTERNET ANGEL Be INVOKED",
    trigger: "end_of_day",
    priority: 40,
    terminal: true,
    condition: (state) => state.params.fans >= 9999999,
  },
];

/** docs/ending.md 3. DAY30 通常分岐。途中エンドが発生せずDAY30を迎えた場合に判定する。 */
function resolveDay30Ending(state: GameState): EndingDefinition {
  const { fans, affection, sickness } = state.params;

  let id: string;
  let title: string;
  if (fans < 500000) {
    if (affection < 60 && sickness < 60) {
      id = "catastrophe";
      title = "Catastrophe";
    } else if (affection < 60) {
      id = "there_is_no_angel";
      title = "There Is No Angel";
    } else if (sickness < 60) {
      id = "labor_is_evil";
      title = "Labor is Evil";
    } else {
      id = "needy_girl_overdose";
      title = "NEEDY GIRL OVERDOSE";
    }
  } else if (fans < 1000000) {
    if (affection < 80) {
      id = "angry_otaku_needy_girl";
      title = "Angry Otaku Needy Girl";
    } else {
      id = "utopian_parody";
      title = "Utopian Parody";
    }
  } else if (affection < 80) {
    // docs/ending.md 3.3はフォロワー100万人以上・好感度80以上のみを定義しているため、
    // それ未満は3.2の枠を踏襲する（実機検証で確定するまでの暫定仕様）。
    id = "angry_otaku_needy_girl";
    title = "Angry Otaku Needy Girl";
  } else if (sickness < 80) {
    id = "unhappy_end_world";
    title = "(Un)Happy End World";
  } else {
    id = "do_you_love_me";
    title = "Do You Love Me?";
  }

  return { id, title, trigger: "day30", priority: 50, terminal: true, condition: () => true };
}

/** 現在の状態から成立しているエンディングを1つ返す。複数成立時はpriorityが最も小さいものを優先する。 */
export function evaluateEndings(state: GameState): EndingDefinition | null {
  const matched = IMMEDIATE_ENDINGS.filter((ending) => ending.condition(state)).sort(
    (a, b) => a.priority - b.priority,
  );
  if (matched.length > 0) return matched[0];

  if (state.day >= 30) return resolveDay30Ending(state);

  return null;
}
