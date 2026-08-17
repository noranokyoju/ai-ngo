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

export interface ActionDef {
  id: string;
  label: string;
  effects: Partial<GameParams>;
  postText: (params: GameParams) => string;
  replyDelay: number;
  /** メッセージと選択肢が順番に再生される会話の台本。 */
  conversation: ConversationEntry[];
  /** 会話の最後のメッセージの後にスタンプを送ると届く「既読がわりの返信」。 */
  stampReply: ((params: GameParams) => string) | null;
  /** この行動を行うと経過するターン数。1ターンで時間帯が1つ進む。 */
  turns: number;
  /** 夜（配信）にしか行えない行動かどうか。 */
  nightOnly?: boolean;
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

export const ACTIONS: ActionDef[] = [
  {
    id: "stream",
    label: "配信する",
    turns: 2,
    nightOnly: true,
    effects: { fans: 40, stress: 15, affection: 5, sickness: 5 },
    postText: () => "今日も配信やるよ〜！みんな見てね📺",
    replyDelay: 2,
    conversation: [
      { kind: "friend", text: "配信見てたよ！今日も面白かった！" },
      { kind: "friend", text: "特に後半のトーク、すごく良かったな〜" },
      { kind: "choices", options: ["ありがとう！嬉しい！", "えへへ、照れるね", "次はもっと頑張るよ！"] },
      { kind: "friend", text: "その調子でこれからも頑張って！応援してるよ" },
    ],
    stampReply: () => "既読ありがとう！また今度話そうね",
  },
  {
    id: "sleep",
    label: "寝る",
    turns: 1,
    effects: { stress: -25, sickness: -10 },
    postText: () => "ねむい…もう寝る…おやすみ🌙",
    replyDelay: 3,
    conversation: [
      { kind: "friend", text: "ちゃんと休んでね、おやすみ" },
      { kind: "friend", text: "今日も一日お疲れ様、ゆっくり寝てね" },
      { kind: "choices", options: ["おやすみ〜", "ありがとう、おやすみ", "また明日ね！"] },
    ],
    stampReply: () => "おやすみ〜、いい夢見てね",
  },
  {
    id: "work",
    label: "バイトする",
    turns: 2,
    effects: { fans: 5, stress: 10, sickness: -5 },
    postText: () => "今日はバイト頑張った！えらい！",
    replyDelay: 2,
    conversation: [
      { kind: "friend", text: "お疲れ様！無理しないでね" },
      { kind: "friend", text: "ちゃんとご飯食べた？" },
      { kind: "choices", options: ["食べたよ！", "これから食べる！", "忘れてた…"] },
      { kind: "friend", text: "ならよかった！ちゃんと栄養とってね" },
    ],
    stampReply: () => "既読ありがとう、また連絡するね",
  },
  {
    id: "sns",
    label: "SNSを見る",
    turns: 1,
    effects: { fans: 5, affection: 5, stress: -5 },
    postText: () => "みんなのポケッター見てるよ〜😊",
    replyDelay: 0,
    conversation: [],
    stampReply: null,
  },
  {
    id: "game",
    label: "ゲームする",
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

  async doAction(action: ActionDef) {
    if (this.performing) return;
    if (action.nightOnly && this.timeOfDay !== "夜") return;
    this.performing = true;
    this.onBusyChanged.emit(true);
    try {
      this.applyEffects(action.effects);
      this.advanceTime(action.turns);

      const { likes, retweets } = randomEngagement();
      const post: PoketterPost = {
        id: this.postId++,
        author: "あなた",
        authorId: PLAYER_ACCOUNT_ID,
        text: action.postText(this.params),
        time: getTime(),
        likes,
        retweets,
        hasImage: action.id === "stream",
      };
      this.posts.unshift(post);
      this.onPostAdded.emit(post);

      if (action.conversation.length > 0) {
        await delay(action.replyDelay);
        await this.runConversation(action);
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

  private async runConversation(action: ActionDef) {
    const queue = [...action.conversation];
    this.stampReply = action.stampReply;
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
