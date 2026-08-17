// ===========================================================
//        Stream Topics (配信ネタ)
//  docs/broadcast.md を参照して実装する。
// ===========================================================

export type StreamGenre =
  | "chat"
  | "game"
  | "angel_explain"
  | "conspiracy"
  | "net_lore"
  | "asmr"
  | "sexy"
  | "dark"
  | "otaku"
  | "challenge"
  | "pr"
  | "internet_angel";

export const STREAM_GENRES: StreamGenre[] = [
  "chat",
  "game",
  "angel_explain",
  "conspiracy",
  "net_lore",
  "asmr",
  "sexy",
  "dark",
  "otaku",
  "challenge",
  "pr",
  "internet_angel",
];

export const STREAM_GENRE_LABEL: Record<StreamGenre, string> = {
  chat: "ざつだん",
  game: "ゲームじっきょう",
  angel_explain: "エンジェルかいせつ",
  conspiracy: "いんぼうろん",
  net_lore: "ネットロア",
  asmr: "ASMR",
  sexy: "えっちなはいしん",
  dark: "やみはいしん",
  otaku: "オタクトーク",
  challenge: "やってみた",
  pr: "PR案件",
  internet_angel: "インターネットエンジェル",
};

export type UnlockCondition =
  | { type: "start" }
  | { type: "command"; commandIds: string[] }
  | { type: "followers"; amount: number };

export interface StreamTopic {
  id: string;
  genre: StreamGenre;
  level: number;
  title: string;
  unlock: UnlockCondition;
}

/** 攻略Wiki間で差異がある「高レベルのネタのフォロワー数による進行制限」の目安（docs/broadcast.md 1.）。 */
export const LEVEL_FOLLOWER_GATE: Record<number, number> = {
  3: 10000,
  4: 100000,
  5: 250000,
};

/** やみはいしんLv3実行後、一定期間配信不能になる（docs/broadcast.md 3.8 注）。 */
export const DARK_STREAM_COOLDOWN_TRIGGER_ID = "dark-3";
export const DARK_STREAM_COOLDOWN_DAYS = 3;

function command(commandIds: string | string[]): UnlockCondition {
  return { type: "command", commandIds: Array.isArray(commandIds) ? commandIds : [commandIds] };
}

function followers(amount: number): UnlockCondition {
  return { type: "followers", amount };
}

export const STREAM_TOPICS: StreamTopic[] = [
  // ---- ざつだん ----
  { id: "chat-1", genre: "chat", level: 1, title: "初期ネタ", unlock: { type: "start" } },
  { id: "chat-2", genre: "chat", level: 2, title: "わたしの ♰黒歴史♰", unlock: command("net-board") },
  { id: "chat-3", genre: "chat", level: 3, title: "夜はネットで運動会", unlock: command("out-koen") },
  { id: "chat-4", genre: "chat", level: 4, title: "承認欲求女子", unlock: command("net-sns") },
  { id: "chat-5", genre: "chat", level: 5, title: "イマジナリー・ドリーマー", unlock: command("net-sns") },

  // ---- ゲームじっきょう ----
  { id: "game-1", genre: "game", level: 1, title: "懐かしのアレであそんじゃお！", unlock: command("play-game") },
  {
    id: "game-2",
    genre: "game",
    level: 2,
    title: "レトロゲーム買いに行ったから実況するよ",
    unlock: command("out-akihabara"),
  },
  { id: "game-3", genre: "game", level: 3, title: "人を撃つよ！", unlock: command("net-sns") },
  { id: "game-4", genre: "game", level: 4, title: "プレミアのホラーゲームであそぶよ！", unlock: command("out-nakano") },
  {
    id: "game-5",
    genre: "game",
    level: 5,
    title: "遊ぶと発狂！？電波ゲーであそんでみるよ",
    unlock: command("play-game"),
  },

  // ---- エンジェルかいせつ ----
  { id: "angel_explain-1", genre: "angel_explain", level: 1, title: "オタクとは", unlock: command("net-video") },
  {
    id: "angel_explain-2",
    genre: "angel_explain",
    level: 2,
    title: "シュレディンガーの美少女",
    unlock: command("play-comm"),
  },
  {
    id: "angel_explain-3",
    genre: "angel_explain",
    level: 3,
    title: "世界5分前仮説とは？",
    unlock: command("play-game"),
  },
  { id: "angel_explain-4", genre: "angel_explain", level: 4, title: "人はなぜ死ぬのか", unlock: command("net-sns") },
  { id: "angel_explain-5", genre: "angel_explain", level: 5, title: "神の存在証明", unlock: command("drug-stamp") },

  // ---- いんぼうろん ----
  {
    id: "conspiracy-1",
    genre: "conspiracy",
    level: 1,
    title: "オタクになるのは仕組まれたことだった！？",
    unlock: command("net-sns"),
  },
  { id: "conspiracy-2", genre: "conspiracy", level: 2, title: "30年後に世界は統一！？", unlock: command("play-game") },
  {
    id: "conspiracy-3",
    genre: "conspiracy",
    level: 3,
    title: "マイクロチップにご用心",
    unlock: command("net-video"),
  },
  { id: "conspiracy-4", genre: "conspiracy", level: 4, title: "真理に触れたよ", unlock: command("drug-stamp") },
  { id: "conspiracy-5", genre: "conspiracy", level: 5, title: "真実", unlock: command("drug-stamp") },
  {
    id: "conspiracy-6",
    genre: "conspiracy",
    level: 6,
    title: "エンディング分岐用特殊ネタ",
    unlock: command("drug-stamp"),
  },

  // ---- ネットロア ----
  { id: "net_lore-1", genre: "net_lore", level: 1, title: "配信中に人影が...", unlock: command("net-board") },
  { id: "net_lore-2", genre: "net_lore", level: 2, title: "未来からの書き込み", unlock: command("net-board") },
  { id: "net_lore-3", genre: "net_lore", level: 3, title: "知らない駅に降りた話", unlock: command("out-ichigaya") },
  { id: "net_lore-4", genre: "net_lore", level: 4, title: "恐怖を乗り越える方法", unlock: command("net-sns") },
  { id: "net_lore-5", genre: "net_lore", level: 5, title: "「超てんちゃん」", unlock: command("net-board") },

  // ---- ASMR ----
  { id: "asmr-1", genre: "asmr", level: 1, title: "超てんちゃんといっしょに 寝よ♡", unlock: command("sleep-tomorrow") },
  { id: "asmr-2", genre: "asmr", level: 2, title: "脳みそくちゅくちゅあっあっあっ♡", unlock: command("play-comm") },
  { id: "asmr-3", genre: "asmr", level: 3, title: "セリフをリクエストしてね♡", unlock: command("play-h") },
  { id: "asmr-4", genre: "asmr", level: 4, title: "（ある意味）天国へのカウントダウン", unlock: command("net-video") },
  { id: "asmr-5", genre: "asmr", level: 5, title: '"NTR"', unlock: command("net-date") },

  // ---- えっちなはいしん ----
  { id: "sexy-1", genre: "sexy", level: 1, title: "オタクちゃんを甘やかすよ♡", unlock: command("play-comm") },
  { id: "sexy-2", genre: "sexy", level: 2, title: "トゥナイト", unlock: command("play-h") },
  {
    id: "sexy-3",
    genre: "sexy",
    level: 3,
    title: "とっても長くて太いアイスを食べるよ♡",
    unlock: command("net-video"),
  },
  {
    id: "sexy-4",
    genre: "sexy",
    level: 4,
    title: "でっかいボールに乗って健康になるよ♡",
    unlock: command("out-shibuya"),
  },
  { id: "sexy-5", genre: "sexy", level: 5, title: "そういう動画に出演するよ", unlock: command("play-h") },

  // ---- やみはいしん ----
  { id: "dark-1", genre: "dark", level: 1, title: "そうだね躁だね！", unlock: command("drug-depas") },
  { id: "dark-2", genre: "dark", level: 2, title: "超てんちゃんのきもち", unlock: command("net-ego") },
  { id: "dark-3", genre: "dark", level: 3, title: "大事なお話", unlock: command("play-comm") },
  { id: "dark-4", genre: "dark", level: 4, title: "あがったりさがったり", unlock: command("drug-hyperon") },
  { id: "dark-5", genre: "dark", level: 5, title: "わたしは100%伝説", unlock: command("drug-smoke") },

  // ---- オタクトーク ----
  { id: "otaku-1", genre: "otaku", level: 1, title: "めざせ神アイドル 女児アニメの話", unlock: command("net-video") },
  {
    id: "otaku-2",
    genre: "otaku",
    level: 2,
    title: "超てんちゃんファイナルウォーズ",
    unlock: command(["net-ego", "play-comm"]),
  },
  { id: "otaku-3", genre: "otaku", level: 3, title: "「男」の映画の世界", unlock: command("sleep-evening") },
  { id: "otaku-4", genre: "otaku", level: 4, title: "キマる映画", unlock: command("drug-smoke") },
  {
    id: "otaku-5",
    genre: "otaku",
    level: 5,
    title: "好きなアニメ監督のお話",
    unlock: command(["net-video", "net-sns"]),
  },

  // ---- やってみた ----
  { id: "challenge-1", genre: "challenge", level: 1, title: "ゴスロリきてみた！", unlock: command("out-harajuku") },
  { id: "challenge-2", genre: "challenge", level: 2, title: "アンチと戦ってみた", unlock: command("net-ego") },
  { id: "challenge-3", genre: "challenge", level: 3, title: "喉がかれるまで歌ってみた", unlock: command("net-video") },
  { id: "challenge-4", genre: "challenge", level: 4, title: "出会い系やってみた", unlock: command("net-date") },
  { id: "challenge-5", genre: "challenge", level: 5, title: "最高のファンに会ってみた！", unlock: command("play-comm") },

  // ---- PR案件 ----
  {
    id: "pr-1",
    genre: "pr",
    level: 1,
    title: "【PR】新発売のジュースを飲んじゃうよ！",
    unlock: followers(30000),
  },
  { id: "pr-2", genre: "pr", level: 2, title: "【PR】化粧配信をするよ！", unlock: command("net-video") },
  { id: "pr-3", genre: "pr", level: 3, title: "【PR】超てんちゃん 参戦！？", unlock: command("play-game") },
  {
    id: "pr-4",
    genre: "pr",
    level: 4,
    title: "【PR】超てんちゃんがフィギュアになります",
    unlock: command("play-comm"),
  },
  {
    id: "pr-5",
    genre: "pr",
    level: 5,
    title: "【PR】最強のビジネスを紹介します！",
    unlock: command("net-ego"),
  },

  // ---- インターネットエンジェル ----
  {
    id: "internet_angel-1",
    genre: "internet_angel",
    level: 1,
    title: "インターネットエンジェル（フォロワー1万人記念）",
    unlock: followers(10000),
  },
  {
    id: "internet_angel-2",
    genre: "internet_angel",
    level: 2,
    title: "インターネットエンジェル（フォロワー10万人記念）",
    unlock: followers(100000),
  },
  {
    id: "internet_angel-3",
    genre: "internet_angel",
    level: 3,
    title: "インターネットエンジェル（フォロワー25万人記念）",
    unlock: followers(250000),
  },
  {
    id: "internet_angel-4",
    genre: "internet_angel",
    level: 4,
    title: "インターネットエンジェル（フォロワー50万人記念）",
    unlock: followers(500000),
  },
  {
    id: "internet_angel-5",
    genre: "internet_angel",
    level: 5,
    title: "インターネットエンジェル（フォロワー100万人記念）",
    unlock: followers(1000000),
  },
];

export function getStreamTopicById(id: string): StreamTopic | undefined {
  return STREAM_TOPICS.find((topic) => topic.id === id);
}
