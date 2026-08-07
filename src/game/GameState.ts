// ===========================================================
//                  Game State
// ===========================================================
import { delay, getTime } from "../async-utils";

export interface GameParams {
  fans: number;
  mental: number;
  money: number;
}

export interface PoketterPost {
  id: number;
  author: string;
  text: string;
  time: number;
}

export interface JineMessage {
  id: number;
  sender: "user" | "friend";
  text: string;
  time: number;
}

export interface ActionDef {
  id: string;
  label: string;
  effects: Partial<GameParams>;
  postText: (params: GameParams) => string;
  replyDelay: number;
  reply: ((params: GameParams) => string) | null;
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

export const ACTIONS: ActionDef[] = [
  {
    id: "stream",
    label: "配信する",
    effects: { fans: 40, mental: -10, money: 20 },
    postText: () => "今日も配信やるよ〜！みんな見てね📺",
    replyDelay: 2,
    reply: () => "配信見てたよ！今日も面白かった！",
  },
  {
    id: "sleep",
    label: "寝る",
    effects: { mental: 20 },
    postText: () => "ねむい…もう寝る…おやすみ🌙",
    replyDelay: 3,
    reply: () => "ちゃんと休んでね、おやすみ",
  },
  {
    id: "work",
    label: "バイトする",
    effects: { money: 200, mental: -5 },
    postText: () => "今日はバイト頑張った！えらい！",
    replyDelay: 2,
    reply: () => "お疲れ様！無理しないでね",
  },
  {
    id: "sns",
    label: "SNSを見る",
    effects: { mental: 5, fans: 5 },
    postText: () => "みんなのポケッター見てるよ〜😊",
    replyDelay: 0,
    reply: null,
  },
  {
    id: "game",
    label: "ゲームする",
    effects: { mental: 15, money: -50 },
    postText: () => "今日はゲームで息抜き！たのしい〜🎮",
    replyDelay: 2,
    reply: () => "何のゲームしてるの？私も混ぜて！",
  },
];

export class GameState {
  params: GameParams = { fans: 0, mental: 70, money: 500 };
  posts: PoketterPost[] = [];
  messages: JineMessage[] = [];
  performing = false;

  readonly onParamsChanged = new EventEmitter<GameParams>();
  readonly onPostAdded = new EventEmitter<PoketterPost>();
  readonly onMessageAdded = new EventEmitter<JineMessage>();
  readonly onBusyChanged = new EventEmitter<boolean>();

  private postId = 0;
  private messageId = 0;

  async doAction(action: ActionDef) {
    if (this.performing) return;
    this.performing = true;
    this.onBusyChanged.emit(true);
    try {
      this.applyEffects(action.effects);

      const post: PoketterPost = {
        id: this.postId++,
        author: "あなた",
        text: action.postText(this.params),
        time: getTime(),
      };
      this.posts.unshift(post);
      this.onPostAdded.emit(post);

      if (action.reply) {
        await delay(action.replyDelay);
        const text = action.reply(this.params);
        const message: JineMessage = {
          id: this.messageId++,
          sender: "friend",
          text,
          time: getTime(),
        };
        this.messages.push(message);
        this.onMessageAdded.emit(message);
      }
    } finally {
      this.performing = false;
      this.onBusyChanged.emit(false);
    }
  }

  private applyEffects(effects: Partial<GameParams>) {
    for (const key of Object.keys(effects) as (keyof GameParams)[]) {
      const delta = effects[key];
      if (delta === undefined) continue;
      this.params[key] += delta;
    }
    this.params.mental = Math.max(0, Math.min(100, this.params.mental));
    this.params.fans = Math.max(0, this.params.fans);
    this.params.money = Math.max(0, this.params.money);
    this.onParamsChanged.emit(this.params);
  }
}
