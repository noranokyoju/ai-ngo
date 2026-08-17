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
export type CommandGenre = "play" | "sleep" | "medicine" | "internet" | "outing";

export const GENRE_LABELS: Record<CommandGenre, string> = {
  play: "あそぶ",
  sleep: "ねる",
  medicine: "おくすり",
  internet: "いんたーねっと",
  outing: "おでかけ",
};

export interface CommandDef {
  id: string;
  genre: CommandGenre;
  label: string;
  effects: Partial<GameParams>;
  postText: (params: GameParams) => string;
  replyDelay: number;
  /** メッセージと選択肢が順番に再生される会話の台本。 */
  conversation: ConversationEntry[];
  /** 会話の最後のメッセージの後にスタンプを送ると届く「既読がわりの返信」。 */
  stampReply: ((params: GameParams) => string) | null;
  /** このコマンドを行うと経過するターン数。1ターンで時間帯が1つ進む。現在の状態に応じて動的に決まる場合は関数を指定する。 */
  turns: number | ((state: GameState) => number);
  /** 現在の状態でこのコマンドを選択できるかどうか。省略時は常に選択可能。 */
  availableWhen?: (state: GameState) => boolean;
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

/** 指定した時間帯になるまでの経過ターン数を返す。 */
function turnsUntil(target: TimeOfDay): (state: GameState) => number {
  return (state) => {
    const currentIndex = TIME_OF_DAY_SEQUENCE.indexOf(state.timeOfDay);
    const targetIndex = TIME_OF_DAY_SEQUENCE.indexOf(target);
    const diff = targetIndex - currentIndex;
    return diff > 0 ? diff : diff + TIME_OF_DAY_SEQUENCE.length;
  };
}

/** 翌日（昼）になるまでの経過ターン数を返す。 */
function turnsUntilTomorrow(state: GameState): number {
  return TIME_OF_DAY_SEQUENCE.length - TIME_OF_DAY_SEQUENCE.indexOf(state.timeOfDay);
}

function outingCommand(id: string, label: string, effects: Partial<GameParams>, postText: string): CommandDef {
  return {
    id,
    genre: "outing",
    label,
    effects,
    postText: () => postText,
    replyDelay: 0,
    conversation: [],
    stampReply: null,
    turns: 1,
  };
}

const OUTING_LOCATIONS: CommandDef[] = [
  outingCommand("outing-kichijoji", "きちじょうじ", { fans: 3, affection: 3, stress: -10 }, "きちじょうじをぶらぶらしてきた〜"),
  outingCommand("outing-hospital", "びょういん", { sickness: -20, stress: 5 }, "病院に行ってきた…ちょっと安心した"),
  outingCommand("outing-park", "こうえん", { affection: 5, stress: -12 }, "公園でのんびりしてきた〜🌳"),
  outingCommand("outing-nakano", "なかの", { fans: 3, affection: 3, stress: -10 }, "中野をふらふら散策してきたよ"),
  outingCommand(
    "outing-shimokitazawa",
    "しもきたざわ",
    { fans: 3, affection: 5, stress: -10 },
    "下北沢で古着屋めぐりしてきた〜",
  ),
  outingCommand("outing-ikebukuro", "いけぶくろ", { fans: 4, affection: 3, stress: -10 }, "池袋を歩いてきたよ〜"),
  outingCommand("outing-shinjuku", "しんじゅく", { fans: 5, affection: 3, stress: -8 }, "新宿は人が多くて疲れた…でも楽しかった"),
  outingCommand("outing-harajuku", "はらじゅく", { fans: 5, affection: 5, stress: -10 }, "原宿でかわいいもの見てきた〜✨"),
  outingCommand("outing-shibuya", "しぶや", { fans: 5, affection: 3, stress: -10 }, "渋谷をぶらぶらしてきたよ〜"),
  outingCommand("outing-ichigaya", "いちがや", { fans: 2, affection: 2, stress: -8 }, "市ケ谷の方まで足を伸ばしてきた"),
  outingCommand(
    "outing-jimbocho",
    "じんぼうちょう",
    { affection: 4, stress: -8 },
    "神保町で古本を眺めてきた〜📚",
  ),
  outingCommand(
    "outing-akihabara",
    "あきはばら",
    { fans: 4, affection: 4, stress: -10 },
    "秋葉原でオタ活してきた！たのしい〜",
  ),
  outingCommand("outing-ueno", "うえの", { fans: 3, affection: 3, stress: -10 }, "上野で動物園に寄ってきたよ〜🐼"),
  outingCommand("outing-asakusa", "あさくさ", { fans: 3, affection: 4, stress: -10 }, "浅草で観光気分を味わってきた〜"),
  outingCommand(
    "outing-blackland",
    "◾️◾️◾️ランド",
    { fans: 10, affection: 15, stress: -25 },
    "夢の国に行ってきた…！最高だった✨",
  ),
  outingCommand("outing-toyosu", "とよす", { fans: 3, affection: 2, stress: -10 }, "豊洲でおいしいものを食べてきた〜"),
];

export const COMMANDS: CommandDef[] = [
  // ---- あそぶ ----
  {
    id: "play-game",
    genre: "play",
    label: "ゲーム",
    turns: 1,
    effects: { stress: -15, sickness: 5, affection: 5 },
    postText: () => "今日はゲームで息抜き！たのしい〜🎮",
    replyDelay: 2,
    conversation: [
      { kind: "friend", text: "何のゲームしてるの？私も混ぜて！" },
      { kind: "choices", options: ["一緒にやろう！", "今度誘うね", "実況見て応援して！"] },
      { kind: "friend", text: "楽しみにしてるね！" },
    ],
    stampReply: () => "既読ありがとう、今度一緒にやろうね",
  },
  {
    id: "play-communication",
    genre: "play",
    label: "こみゅにけーしょん",
    turns: 1,
    effects: { stress: -10, affection: 15 },
    postText: () => "ちょっとおしゃべりしてた〜😊",
    replyDelay: 1,
    conversation: [
      { kind: "friend", text: "話せて嬉しかった！またしようね" },
      { kind: "choices", options: ["うん、また話そうね", "楽しかった！", "ありがとう"] },
      { kind: "friend", text: "またいつでも話しかけてね" },
    ],
    stampReply: () => "既読ありがとう、また話そうね",
  },
  {
    id: "play-ecchi",
    genre: "play",
    label: "えっちなこと",
    turns: 1,
    effects: { stress: -20, sickness: 10, affection: 10 },
    postText: () => "今日はちょっと大人な気分…（ないしょ）",
    replyDelay: 0,
    conversation: [],
    stampReply: null,
  },

  // ---- ねる ----
  {
    id: "sleep-evening",
    genre: "sleep",
    label: "夕方まで寝る",
    turns: turnsUntil("夕方"),
    availableWhen: (state) => state.timeOfDay === "昼",
    effects: { stress: -15, sickness: -5 },
    postText: () => "ちょっと休憩…夕方まで寝ちゃおう😴",
    replyDelay: 0,
    conversation: [],
    stampReply: null,
  },
  {
    id: "sleep-night",
    genre: "sleep",
    label: "夜まで寝る",
    turns: turnsUntil("夜"),
    availableWhen: (state) => state.timeOfDay === "昼" || state.timeOfDay === "夕方",
    effects: { stress: -20, sickness: -8 },
    postText: () => "少し眠いから夜まで寝るね…おやすみ🌙",
    replyDelay: 0,
    conversation: [],
    stampReply: null,
  },
  {
    id: "sleep-tomorrow",
    genre: "sleep",
    label: "明日まで寝る",
    turns: turnsUntilTomorrow,
    effects: { stress: -30, sickness: -15 },
    postText: () => "今日はもう寝る…おやすみ🌙",
    replyDelay: 3,
    conversation: [
      { kind: "friend", text: "ちゃんと休んでね、おやすみ" },
      { kind: "friend", text: "今日も一日お疲れ様、ゆっくり寝てね" },
      { kind: "choices", options: ["おやすみ〜", "ありがとう、おやすみ", "また明日ね！"] },
    ],
    stampReply: () => "おやすみ〜、いい夢見てね",
  },

  // ---- おくすり ----
  {
    id: "medicine-depas",
    genre: "medicine",
    label: "ディパス",
    turns: 1,
    effects: { stress: -20, sickness: 5 },
    postText: () => "ディパスを飲んで少し落ち着いた…",
    replyDelay: 0,
    conversation: [],
    stampReply: null,
  },
  {
    id: "medicine-hypololon",
    genre: "medicine",
    label: "ハイポロン",
    turns: 1,
    effects: { stress: -10, sickness: 3 },
    postText: () => "ハイポロンでちょっと楽になった気がする",
    replyDelay: 0,
    conversation: [],
    stampReply: null,
  },
  {
    id: "medicine-smoke",
    genre: "medicine",
    label: "まほうのけむり",
    turns: 1,
    effects: { stress: -25, sickness: 15, affection: -5 },
    postText: () => "ふぅ…頭がふわふわする…",
    replyDelay: 0,
    conversation: [],
    stampReply: null,
  },
  {
    id: "medicine-stamp",
    genre: "medicine",
    label: "まほうのきって",
    turns: 1,
    effects: { stress: -35, sickness: 25, affection: -10 },
    postText: () => "世界がキラキラして見える…",
    replyDelay: 0,
    conversation: [],
    stampReply: null,
  },

  // ---- いんたーねっと ----
  {
    id: "internet-sns",
    genre: "internet",
    label: "SNS",
    turns: 1,
    effects: { fans: 5, affection: 5, stress: -5 },
    postText: () => "みんなのポケッター見てるよ〜😊",
    replyDelay: 0,
    conversation: [],
    stampReply: null,
  },
  {
    id: "internet-egosearch",
    genre: "internet",
    label: "エゴサ",
    turns: 1,
    effects: { fans: 2, affection: 8, stress: 10 },
    postText: () => "自分の名前で検索しちゃった…えへへ",
    replyDelay: 0,
    conversation: [],
    stampReply: null,
  },
  {
    id: "internet-video",
    genre: "internet",
    label: "動画サイト",
    turns: 1,
    effects: { stress: -10, sickness: 2 },
    postText: () => "動画見て時間溶かしちゃった〜",
    replyDelay: 0,
    conversation: [],
    stampReply: null,
  },
  {
    id: "internet-board",
    genre: "internet",
    label: "けいじばん",
    turns: 1,
    effects: { stress: 15, sickness: 10, affection: -5 },
    postText: () => "掲示板見てたら心がざわざわする…",
    replyDelay: 0,
    conversation: [],
    stampReply: null,
  },
  {
    id: "internet-deai",
    genre: "internet",
    label: "であい",
    turns: 1,
    effects: { affection: 15, sickness: 10, stress: -5 },
    postText: () => "知らない人とちょっとお話しした…",
    replyDelay: 0,
    conversation: [],
    stampReply: null,
  },

  // ---- おでかけ ----
  ...OUTING_LOCATIONS,
];

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
    if (command.availableWhen && !command.availableWhen(this)) return;
    this.performing = true;
    this.onBusyChanged.emit(true);
    try {
      this.applyEffects(command.effects);
      const turns = typeof command.turns === "function" ? command.turns(this) : command.turns;
      this.advanceTime(turns);

      const { likes, retweets } = randomEngagement();
      const post: PoketterPost = {
        id: this.postId++,
        author: "あなた",
        authorId: PLAYER_ACCOUNT_ID,
        text: command.postText(this.params),
        time: getTime(),
        likes,
        retweets,
        hasImage: false,
      };
      this.posts.unshift(post);
      this.onPostAdded.emit(post);

      if (command.conversation.length > 0) {
        await delay(command.replyDelay);
        await this.runConversation(command);
      }
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

  private async runConversation(command: CommandDef) {
    const queue = [...command.conversation];
    this.stampReply = command.stampReply;
    this.awaitingReadStamp = false;
    this.onConversationChanged.emit();

    while (queue.length > 0) {
      const entry = queue.shift()!;
      if (entry.kind === "choices") {
        this.pendingChoices = entry.options;
        this.onConversationChanged.emit();
        const text = await this.waitForChoice();
        this.pushMessage("user", text, false);
      } else {
        await this.waitOrAdvance(2 + entry.text.length * 0.1);
        this.pushMessage("friend", entry.text, false);
      }
    }

    this.awaitingReadStamp = this.stampReply !== null;
    this.onConversationChanged.emit();
  }

  private waitForChoice(): Promise<string> {
    return new Promise((resolve) => {
      this.choiceResolve = resolve;
    });
  }

  private waitOrAdvance(seconds: number): Promise<void> {
    return new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        this.advanceResolve = null;
        resolve();
      };
      this.advanceResolve = finish;
      void delay(seconds).then(finish);
    });
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
  }

  /** ターン数の分だけ時間帯を進める。夜から昼に戻るタイミングで日付が1つ進む。 */
  private advanceTime(turns: number) {
    for (let i = 0; i < turns; i++) {
      const index = TIME_OF_DAY_SEQUENCE.indexOf(this.timeOfDay);
      const nextIndex = (index + 1) % TIME_OF_DAY_SEQUENCE.length;
      if (nextIndex === 0) this.day += 1;
      this.timeOfDay = TIME_OF_DAY_SEQUENCE[nextIndex];
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
