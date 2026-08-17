// ===========================================================
//                  Game State
// ===========================================================
import { delay, getTime } from "../async-utils";
import type { SaveData } from "./SaveManager";

export interface GameParams {
  /** フォロワー数 */
  fans: number;
  /** ストレス（0〜100） */
  stress: number;
  /** 好感度（0〜100） */
  affection: number;
  /** 病み度（0〜100） */
  sickness: number;
}

export type TimeOfDay = "昼" | "夕方" | "夜";

export const TIME_OF_DAY_SEQUENCE: TimeOfDay[] = ["昼", "夕方", "夜"];

export const TIME_OF_DAY_EMOJI: Record<TimeOfDay, string> = {
  昼: "☀️",
  夕方: "🌇",
  夜: "🌙",
};

export interface PoketterPost {
  id: number;
  author: string;
  authorId: string;
  text: string;
  time: number;
  likes: number;
  retweets: number;
  hasImage: boolean;
}

export interface JineMessage {
  id: number;
  sender: "user" | "friend";
  text: string;
  time: number;
  isStamp?: boolean;
  readAt?: number | null;
}

export type ConversationEntry = { kind: "friend"; text: string } | { kind: "choices"; options: string[] };

/** コマンドのジャンル。 */
export type CommandGenre = "あそぶ" | "ねる" | "おくすり" | "いんたーねっと" | "おでかけ";

export const COMMAND_GENRES: CommandGenre[] = ["あそぶ", "ねる", "おくすり", "いんたーねっと", "おでかけ"];

/** コマンドを実行した結果、実際に適用される効果。状況によって分岐するコマンドがあるため実行時に決定する。 */
export interface CommandOutcome {
  /** Poketterへの投稿文・行動の結果を表すフレーバーテキスト。 */
  text: string;
  effects: Partial<GameParams>;
  /** このコマンドで経過するターン数。1ターンで時間帯が1つ進む。 */
  turns: number;
  /** おくすりのGO!状態が発生したかどうか。同日中の「えっちなこと」の内容分岐に使う。 */
  overdose?: boolean;
}

export interface CommandDef {
  id: string;
  label: string;
  genre: CommandGenre;
  /** 現在の状態でこのコマンドを選択できるかどうか（おくすりの解放条件・ねるの時間帯制約など）。 */
  isAvailable: (state: GameState) => boolean;
  resolve: (state: GameState) => CommandOutcome;
}

type Listener<T> = (value: T) => void;

class EventEmitter<T> {
  private listeners: Listener<T>[] = [];

  on(listener: Listener<T>) {
    this.listeners.push(listener);
  }

  off(listener: Listener<T>) {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  emit(value: T) {
    for (const listener of [...this.listeners]) {
      listener(value);
    }
  }
}

export const FRIEND_NAME = "ゆき";
export const PLAYER_ACCOUNT_ID = "@you";

function randomEngagement(): { likes: number; retweets: number } {
  const likes = Math.floor(Math.random() * 480) + 20;
  const retweets = Math.floor(Math.random() * Math.max(1, likes * 0.4));
  return { likes, retweets };
}

const SLEEP_TARGETS = ["evening", "night", "tomorrow"] as const;
type SleepTarget = (typeof SLEEP_TARGETS)[number];
const SLEEP_TARGET_LABEL: Record<SleepTarget, string> = {
  evening: "夕方まで寝る",
  night: "夜まで寝る",
  tomorrow: "明日まで寝る",
};

/** docs/command.md「3. ねる」の表。開始時間帯ごとに選べる目的地とその効果。 */
const SLEEP_TABLE: Record<TimeOfDay, Partial<Record<SleepTarget, { turns: number; stress: number; sickness: number }>>> = {
  昼: {
    evening: { turns: 1, stress: -3, sickness: -1 },
    night: { turns: 2, stress: -9, sickness: -2 },
    tomorrow: { turns: 3, stress: -18, sickness: -4 },
  },
  夕方: {
    night: { turns: 1, stress: -3, sickness: -1 },
    tomorrow: { turns: 2, stress: -9, sickness: -2 },
  },
  夜: {
    tomorrow: { turns: 1, stress: -6, sickness: -2 },
  },
};

function sleepCommand(target: SleepTarget): CommandDef {
  const label = SLEEP_TARGET_LABEL[target];
  return {
    id: `sleep-${target}`,
    label,
    genre: "ねる",
    isAvailable: (state) => SLEEP_TABLE[state.timeOfDay][target] !== undefined,
    resolve: (state) => {
      const entry = SLEEP_TABLE[state.timeOfDay][target]!;
      return {
        text: `${label}…おやすみ🌙`,
        effects: { stress: entry.stress, sickness: entry.sickness },
        turns: entry.turns,
      };
    },
  };
}

/** docs/command.md「4. おくすり」。適量では控えめに、同日2回目以降はGO!状態になり大きく効く弱い薬。 */
function weakDrugCommand(id: string, label: string, isAvailable: (state: GameState) => boolean): CommandDef {
  return {
    id,
    label,
    genre: "おくすり",
    isAvailable,
    resolve: (state) => {
      const usedToday = state.drugUsesToday[id] ?? 0;
      if (usedToday === 0) {
        return { text: `${label}を適量……ちょっと落ち着いた`, effects: { stress: -1, sickness: -1 }, turns: 1 };
      }
      return { text: `${label}をキメすぎた……GO!!!`, effects: { stress: -12, sickness: 6 }, turns: 2, overdose: true };
    },
  };
}

/** 強制的にGO!状態になる強い薬。 */
function strongDrugCommand(id: string, label: string, isAvailable: (state: GameState) => boolean): CommandDef {
  return {
    id,
    label,
    genre: "おくすり",
    isAvailable,
    resolve: () => ({
      text: `${label}で強制GO!!!……`,
      effects: { stress: -18, sickness: 8 },
      turns: 2,
      overdose: true,
    }),
  };
}

/** docs/command.md「6. おでかけ」の通常のおでかけ地。 */
function outingCommand(id: string, label: string): CommandDef {
  return {
    id: `out-${id}`,
    label,
    genre: "おでかけ",
    isAvailable: () => true,
    resolve: () => ({
      text: `${label}に行ってきた！`,
      effects: { stress: -10, affection: 6 },
      turns: 2,
    }),
  };
}

export const COMMANDS: CommandDef[] = [
  // --- あそぶ ---
  {
    id: "play-game",
    label: "ゲーム",
    genre: "あそぶ",
    isAvailable: () => true,
    resolve: () => ({ text: "息抜きにゲームしてます🎮", effects: { stress: -4, affection: 2 }, turns: 1 }),
  },
  {
    id: "play-comm",
    label: "こみゅにけーしょん",
    genre: "あそぶ",
    isAvailable: () => true,
    resolve: (state) => {
      const affection = state.params.affection;
      if (affection < 40) {
        return { text: "ゆきとトークしてた〜", effects: { stress: -3, affection: 2 }, turns: 1 };
      }
      if (affection < 80) {
        return { text: "ゆきといちゃついてた♡", effects: { stress: -6, affection: 4, sickness: -1 }, turns: 1 };
      }
      return { text: "ゆきと傷のなめあいしてた…", effects: { stress: -10, affection: 6 }, turns: 1 };
    },
  },
  {
    id: "play-h",
    label: "えっちなこと",
    genre: "あそぶ",
    isAvailable: () => true,
    resolve: (state) => {
      if (state.overdosedToday) {
        return {
          text: "……ハイになったままえっちなことしちゃった",
          effects: { stress: -12, affection: 20, sickness: 6 },
          turns: 1,
        };
      }
      return { text: "ゆきとえっちなことしてた……♡", effects: { stress: -12, affection: 15, sickness: -6 }, turns: 1 };
    },
  },

  // --- ねる ---
  sleepCommand("evening"),
  sleepCommand("night"),
  sleepCommand("tomorrow"),

  // --- おくすり ---
  weakDrugCommand("drug-depas", "ディパス", () => true),
  weakDrugCommand("drug-hyperon", "ハイポロン", (state) => state.params.sickness >= 40),
  strongDrugCommand("drug-smoke", "まほうのけむり", (state) => state.params.sickness >= 60),
  strongDrugCommand("drug-stamp", "まほうのきって", (state) => state.params.sickness >= 80),

  // --- いんたーねっと ---
  {
    id: "net-sns",
    label: "SNS",
    genre: "いんたーねっと",
    isAvailable: () => true,
    resolve: (state) => {
      const { fans, sickness } = state.params;
      if (fans < 10000) {
        if (sickness < 20) {
          return { text: "今日も元気につぶやくよ〜📱", effects: { stress: 2, fans: 20 }, turns: 1 };
        }
        return { text: "……もうやだ、消えたい……", effects: { stress: -4, sickness: 3 }, turns: 1 };
      }
      if (fans < 100000) {
        if (sickness < 40) {
          return { text: "宣伝ツイート、みんな見てね！", effects: { stress: 5, fans: 100 }, turns: 1 };
        }
        if (sickness < 60) {
          return { text: "……もうやだ、消えたい……", effects: { stress: -4, sickness: 3 }, turns: 1 };
        }
        return { text: "裏アカでこっそり愚痴ってる……", effects: { stress: -8, sickness: 5 }, turns: 1 };
      }
      return { text: "ポエムを投稿した。", effects: { stress: 2, fans: 500 }, turns: 1 };
    },
  },
  {
    id: "net-video",
    label: "動画サイト",
    genre: "いんたーねっと",
    isAvailable: () => true,
    resolve: () => ({ text: "動画サイトを見て時間を潰してた", effects: { stress: -4 }, turns: 1 }),
  },
  {
    id: "net-ego",
    label: "エゴサ",
    genre: "いんたーねっと",
    isAvailable: () => true,
    resolve: () => ({ text: "エゴサしてしまった……", effects: { stress: 0, affection: -2, sickness: 1 }, turns: 1 }),
  },
  {
    id: "net-board",
    label: "けいじばん",
    genre: "いんたーねっと",
    isAvailable: () => true,
    resolve: (state) => {
      const sickness = state.params.sickness;
      if (sickness < 40) {
        return { text: "掲示板で評判を見てた", effects: { stress: 2, affection: -2, sickness: 2 }, turns: 1 };
      }
      if (sickness < 60) {
        return { text: "掲示板で自演してしまった", effects: { stress: 2, affection: -2, sickness: 4 }, turns: 1 };
      }
      return { text: "掲示板で執拗に他人を叩いてしまった", effects: { stress: -2, affection: -2, sickness: 6 }, turns: 1 };
    },
  },
  {
    id: "net-date",
    label: "であい",
    genre: "いんたーねっと",
    isAvailable: () => true,
    resolve: () => ({ text: "であい系サイトを覗いてしまった……", effects: { stress: -8, affection: -10, sickness: 4 }, turns: 2 }),
  },

  // --- おでかけ ---
  outingCommand("kichijoji", "きちじょうじ"),
  {
    id: "out-hospital",
    label: "びょういん",
    genre: "おでかけ",
    isAvailable: () => true,
    resolve: () => ({ text: "びょういんに行ってきた", effects: { stress: -10, affection: 6, sickness: -10 }, turns: 2 }),
  },
  outingCommand("koen", "こうえん"),
  outingCommand("nakano", "なかの"),
  outingCommand("shimokitazawa", "しもきたざわ"),
  outingCommand("ikebukuro", "いけぶくろ"),
  outingCommand("shinjuku", "しんじゅく"),
  outingCommand("harajuku", "はらじゅく"),
  outingCommand("shibuya", "しぶや"),
  outingCommand("ichigaya", "いちがや"),
  outingCommand("jinbocho", "じんぼうちょう"),
  outingCommand("akihabara", "あきはばら"),
  outingCommand("ueno", "うえの"),
  outingCommand("asakusa", "あさくさ"),
  outingCommand("dreamland", "◾️◾️◾️ランド"),
  outingCommand("toyosu", "とよす"),
];

export function getCommandsByGenre(genre: CommandGenre): CommandDef[] {
  return COMMANDS.filter((command) => command.genre === genre);
}

const GENRE_REPLIES: Record<CommandGenre, string[]> = {
  あそぶ: ["楽しそうだね！", "いいね、私も混ぜて〜"],
  ねる: ["ちゃんと休んでね、おやすみ", "ゆっくり寝てね"],
  おくすり: ["無理しないでね……", "ちゃんと休んでね"],
  いんたーねっと: ["既読ありがとう", "ほどほどにね"],
  おでかけ: ["気をつけてね！", "お土産話聞かせて〜"],
};

function pickGenreReply(genre: CommandGenre): string {
  const replies = GENRE_REPLIES[genre];
  return replies[Math.floor(Math.random() * replies.length)];
}

/** JINEのスタンプ欄に並ぶスタンプ（絵文字。後日画像に置き換え予定）。 */
export const JINE_STAMPS: string[] = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🎉", "👀"];

export class GameState {
  params: GameParams = { fans: 0, stress: 30, affection: 50, sickness: 0 };
  posts: PoketterPost[] = [];
  messages: JineMessage[] = [];
  performing = false;

  /** 現在の日付（1始まり）。 */
  day = 1;
  /** 現在の時間帯。 */
  timeOfDay: TimeOfDay = "昼";

  /** 現在提示中の選択肢。nullでなければスタンプ欄がメッセージ選択画面になる。 */
  pendingChoices: string[] | null = null;
  /** 会話が最後まで進み、「既読がわりのスタンプ」を送れる状態かどうか。 */
  awaitingReadStamp = false;

  /** その日のうちに使ったおくすりコマンドの回数（コマンドidごと）。日付が変わるとリセットされる。 */
  drugUsesToday: Record<string, number> = {};
  /** その日のうちにおくすりでGO!状態になったかどうか。「えっちなこと」の内容分岐に使う。 */
  overdosedToday = false;

  readonly onParamsChanged = new EventEmitter<GameParams>();
  readonly onPostAdded = new EventEmitter<PoketterPost>();
  readonly onMessageAdded = new EventEmitter<JineMessage>();
  readonly onMessageRead = new EventEmitter<JineMessage>();
  readonly onBusyChanged = new EventEmitter<boolean>();
  readonly onConversationChanged = new EventEmitter<void>();
  readonly onTimeChanged = new EventEmitter<void>();

  private postId = 0;
  private messageId = 0;
  private stampReply: ((params: GameParams) => string) | null = null;
  private advanceResolve: (() => void) | null = null;
  private choiceResolve: ((text: string) => void) | null = null;

  async doCommand(command: CommandDef) {
    if (this.performing) return;
    if (!command.isAvailable(this)) return;
    this.performing = true;
    this.onBusyChanged.emit(true);
    try {
      const outcome = command.resolve(this);

      if (command.genre === "おくすり") {
        this.drugUsesToday[command.id] = (this.drugUsesToday[command.id] ?? 0) + 1;
      }
      if (outcome.overdose) this.overdosedToday = true;

      this.applyEffects(outcome.effects);
      this.advanceTime(outcome.turns);

      const { likes, retweets } = randomEngagement();
      const post: PoketterPost = {
        id: this.postId++,
        author: "あなた",
        authorId: PLAYER_ACCOUNT_ID,
        text: outcome.text,
        time: getTime(),
        likes,
        retweets,
        hasImage: false,
      };
      this.posts.unshift(post);
      this.onPostAdded.emit(post);

      await delay(1.5);
      this.pushMessage("friend", pickGenreReply(command.genre), false);
    } finally {
      this.performing = false;
      this.onBusyChanged.emit(false);
    }
  }

  /** メッセージ表示部分をクリックした際に呼ばれ、次のメッセージの待ち時間をスキップする。 */
  requestAdvance() {
    if (!this.advanceResolve) return;
    const resolve = this.advanceResolve;
    this.advanceResolve = null;
    resolve();
  }

  /** メッセージ選択画面で選択肢が選ばれた際に呼ばれる。 */
  selectChoice(text: string) {
    if (!this.choiceResolve) return;
    const resolve = this.choiceResolve;
    this.choiceResolve = null;
    this.pendingChoices = null;
    this.onConversationChanged.emit();
    resolve(text);
  }

  /** スタンプ欄からスタンプが送信された際に呼ばれる。 */
  sendStamp(emoji: string) {
    this.pushMessage("user", emoji, true);
    if (this.awaitingReadStamp && this.stampReply) {
      this.awaitingReadStamp = false;
      const replyFn = this.stampReply;
      this.stampReply = null;
      this.onConversationChanged.emit();
      void this.deliverStampReply(replyFn);
    }
  }

  private async deliverStampReply(replyFn: (params: GameParams) => string) {
    this.performing = true;
    this.onBusyChanged.emit(true);
    try {
      await delay(1.5);
      this.pushMessage("friend", replyFn(this.params), false);
    } finally {
      this.performing = false;
      this.onBusyChanged.emit(false);
    }
  }

  private pushMessage(sender: "user" | "friend", text: string, isStamp: boolean): JineMessage {
    const message: JineMessage = { id: this.messageId++, sender, text, time: getTime(), isStamp, readAt: null };
    this.messages.push(message);
    this.onMessageAdded.emit(message);
    if (sender === "user") {
      void this.scheduleReadReceipt(message);
    }
    return message;
  }

  private async scheduleReadReceipt(message: JineMessage) {
    await delay(2 + Math.random() * 2);
    message.readAt = getTime();
    this.onMessageRead.emit(message);
  }

  serialize(): SaveData {
    return {
      params: { ...this.params },
      posts: this.posts.map((post) => ({ ...post })),
      messages: this.messages.map((message) => ({ ...message })),
      postId: this.postId,
      messageId: this.messageId,
      day: this.day,
      timeOfDay: this.timeOfDay,
      drugUsesToday: { ...this.drugUsesToday },
      overdosedToday: this.overdosedToday,
      updatedAt: getTime(),
    };
  }

  loadFromSave(data: SaveData) {
    this.params = { ...data.params };
    this.posts = data.posts.map((post) => ({
      ...post,
    }));
    this.messages = data.messages.map((message) => ({ ...message, readAt: message.readAt ?? null }));
    this.postId = data.postId;
    this.messageId = data.messageId;
    this.day = data.day ?? 1;
    this.timeOfDay = data.timeOfDay ?? "昼";
    this.pendingChoices = null;
    this.awaitingReadStamp = false;
    this.stampReply = null;
    this.drugUsesToday = { ...(data.drugUsesToday ?? {}) };
    this.overdosedToday = data.overdosedToday ?? false;
  }

  /** ターン数の分だけ時間帯を進める。夜から昼に戻るタイミングで日付が1つ進む。日付が変わるとその日限りの状態をリセットする。 */
  private advanceTime(turns: number) {
    const startDay = this.day;
    for (let i = 0; i < turns; i++) {
      const index = TIME_OF_DAY_SEQUENCE.indexOf(this.timeOfDay);
      const nextIndex = (index + 1) % TIME_OF_DAY_SEQUENCE.length;
      if (nextIndex === 0) this.day += 1;
      this.timeOfDay = TIME_OF_DAY_SEQUENCE[nextIndex];
    }
    if (this.day !== startDay) {
      this.drugUsesToday = {};
      this.overdosedToday = false;
    }
    this.onTimeChanged.emit();
  }

  private applyEffects(effects: Partial<GameParams>) {
    for (const key of Object.keys(effects) as (keyof GameParams)[]) {
      const delta = effects[key];
      if (delta === undefined) continue;
      this.params[key] += delta;
    }
    this.params.stress = Math.max(0, Math.min(100, this.params.stress));
    this.params.affection = Math.max(0, Math.min(100, this.params.affection));
    this.params.sickness = Math.max(0, Math.min(100, this.params.sickness));
    this.params.fans = Math.max(0, this.params.fans);
    this.onParamsChanged.emit(this.params);
  }
}
