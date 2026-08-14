import { Container, Graphics, Text, Ticker } from "pixi.js";
import type { GameState } from "../game/GameState";
import type { AppContent } from "./types";

const PADDING = 12;
const MAX_SELECTED_COMMENTS = 2;
const MAX_STORED_COMMENTS = 30;
const COMMENT_INTERVAL_MS = 1800;

const TOP_BAR_HEIGHT = 36;
const HINT_HEIGHT = 16;
const SUBTITLE_HEIGHT = 96;
const ACTION_BAR_HEIGHT = 32;

interface BroadcastComment {
  id: string;
  author: string;
  text: string;
  color: number;
  reaction: string;
}

interface BroadcastTheme {
  id: string;
  title: string;
  description: string;
  lines: string[];
  comments: BroadcastComment[];
}

const FILLER_COMMENTS = ["888888", "わこつ〜", "kwsk", "がんばれ〜", "wwww", "初配信っていいよね", "見に来たよ！", "楽しみにしてた！"];

const THEMES: BroadcastTheme[] = [
  {
    id: "first-stream",
    title: "初配信",
    description: "緊張の初配信…うまく話せるかな？",
    lines: [
      "……あ、あの、聞こえてますか？ え、映って、る…？",
      "は、はじめまして！本日から配信を始めることになりました、駆け出し配信者です！",
      "緊張して声が震えちゃってますが、温かく見守ってもらえると嬉しいです……。",
      "わあ、コメントたくさんもらえて嬉しいです……！ありがとうございます！",
      "あっという間に時間になっちゃいました。今日はこのあたりで初配信を終わりますね。",
      "最後に、もらったコメントにちょっとだけお返事させてください！",
    ],
    comments: [
      {
        id: "c1",
        author: "通りすがりの視聴者",
        text: "初配信おめでとう〜！",
        color: 0xffb648,
        reaction: "ありがとうございます……！すごく嬉しいです！",
      },
      {
        id: "c2",
        author: "猫背の民",
        text: "声かわいすぎん？",
        color: 0x4fd18b,
        reaction: "そ、そんな……照れちゃいます……！",
      },
      {
        id: "c3",
        author: "夜勤明け",
        text: "緊張してるの伝わってくるｗ",
        color: 0x5aa9e6,
        reaction: "ば、バレてました……？次はもっと堂々とします！",
      },
      {
        id: "c4",
        author: "新規さん",
        text: "これからも見に来ます！",
        color: 0xf07098,
        reaction: "本当ですか……！絶対忘れません、ありがとうございます！",
      },
    ],
  },
];

function buildThemeSelectView(width: number, onSelect: (theme: BroadcastTheme) => void): Container {
  const view = new Container();

  const header = new Text({
    text: "配信テーマを選んでください",
    style: { fill: 0x6a3347, fontSize: 15, fontWeight: "bold" },
  });
  header.x = PADDING;
  header.y = PADDING;
  view.addChild(header);

  const cardWidth = width - PADDING * 2;
  const cardHeight = 88;

  THEMES.forEach((theme, index) => {
    const card = new Container();
    card.x = PADDING;
    card.y = 44 + index * (cardHeight + 12);
    card.eventMode = "static";
    card.cursor = "pointer";

    const cardBg = new Graphics()
      .roundRect(0, 0, cardWidth, cardHeight, 10)
      .fill(0xffffff)
      .stroke({ width: 2, color: 0xffb6c8 });
    card.addChild(cardBg);

    const titleText = new Text({
      text: theme.title,
      style: { fill: 0x6a3347, fontSize: 15, fontWeight: "bold" },
    });
    titleText.x = 14;
    titleText.y = 12;
    card.addChild(titleText);

    const descText = new Text({
      text: theme.description,
      style: { fill: 0x8a6a76, fontSize: 12, wordWrap: true, wordWrapWidth: cardWidth - 28 },
    });
    descText.x = 14;
    descText.y = 36;
    card.addChild(descText);

    const startLabel = new Text({
      text: "配信を始める ▶",
      style: { fill: 0xd46a89, fontSize: 12, fontWeight: "bold" },
    });
    startLabel.x = 14;
    startLabel.y = cardHeight - 24;
    card.addChild(startLabel);

    card.on("pointertap", () => onSelect(theme));

    view.addChild(card);
  });

  return view;
}

function buildLiveView(
  container: Container,
  width: number,
  height: number,
  state: GameState,
  theme: BroadcastTheme,
  onBack: () => void,
): () => void {
  const stageTop = TOP_BAR_HEIGHT + HINT_HEIGHT;
  const stageBottom = height - SUBTITLE_HEIGHT - ACTION_BAR_HEIGHT;
  const stageHeight = Math.max(60, stageBottom - stageTop);

  const avatarAreaWidth = Math.round(width * 0.5);
  const commentsPanelX = PADDING * 2 + avatarAreaWidth;
  const commentsAreaWidth = width - commentsPanelX - PADDING;

  let phase: "talking" | "ending" = "talking";
  let lineIndex = 0;
  let endingLines: string[] = [];
  const selectedIds = new Set<string>();

  // --- top bar ---
  const liveBadge = new Container();
  const liveBadgeBg = new Graphics().roundRect(0, 0, 56, 22, 4).fill(0xffb6c8);
  const liveBadgeText = new Text({
    text: "LIVE",
    style: { fill: 0x6a3347, fontSize: 12, fontWeight: "bold" },
  });
  liveBadgeText.x = 9;
  liveBadgeText.y = 3;
  liveBadge.addChild(liveBadgeBg, liveBadgeText);
  liveBadge.x = PADDING;
  liveBadge.y = 8;
  container.addChild(liveBadge);

  const themeTitleText = new Text({
    text: theme.title,
    style: { fill: 0x6a3347, fontSize: 13, fontWeight: "bold" },
  });
  themeTitleText.anchor.set(0.5, 0);
  themeTitleText.x = width / 2;
  themeTitleText.y = 9;
  container.addChild(themeTitleText);

  const viewerText = new Text({
    text: `👁 ${Math.round(state.params.fans)}`,
    style: { fill: 0x4a4a5a, fontSize: 13 },
  });
  viewerText.anchor.set(1, 0);
  viewerText.x = width - PADDING;
  viewerText.y = 10;
  container.addChild(viewerText);

  // --- hint ---
  const commentsHint = new Text({
    text: "",
    style: { fill: 0x8a6a76, fontSize: 10, wordWrap: true, wordWrapWidth: width - PADDING * 2 },
  });
  commentsHint.x = PADDING;
  commentsHint.y = TOP_BAR_HEIGHT;
  container.addChild(commentsHint);

  function updateSelectionHint() {
    commentsHint.text = `色つきコメントをクリックすると反応するコメントに選べます（${selectedIds.size}/${MAX_SELECTED_COMMENTS} 選択中）`;
  }
  updateSelectionHint();

  // --- video frame + avatar ---
  const videoFrame = new Graphics().roundRect(PADDING, stageTop, avatarAreaWidth, stageHeight, 10).fill(0x2b2b3a);
  container.addChild(videoFrame);

  const avatarRadius = Math.min(48, avatarAreaWidth / 2 - 10, stageHeight / 2 - 10);
  const avatar = new Graphics()
    .circle(PADDING + avatarAreaWidth / 2, stageTop + stageHeight / 2, avatarRadius)
    .fill(0xffdfba);
  container.addChild(avatar);

  // --- comments panel ---
  const commentsPanelBg = new Graphics().roundRect(0, 0, commentsAreaWidth, stageHeight, 8).fill(0xffffff);
  commentsPanelBg.x = commentsPanelX;
  commentsPanelBg.y = stageTop;
  container.addChild(commentsPanelBg);

  const commentsMask = new Graphics().roundRect(0, 0, commentsAreaWidth, stageHeight, 8).fill(0xffffff);
  commentsMask.x = commentsPanelX;
  commentsMask.y = stageTop;
  container.addChild(commentsMask);

  const commentsList = new Container();
  commentsList.x = commentsPanelX + 6;
  commentsList.y = stageTop + 6;
  commentsList.mask = commentsMask;
  container.addChild(commentsList);

  const commentEntries: Container[] = [];

  function layoutComments() {
    let y = 0;
    for (const item of commentEntries) {
      item.y = y;
      y += item.height + 6;
    }
    const visibleHeight = stageHeight - 12;
    const overflow = Math.max(0, y - visibleHeight);
    commentsList.y = stageTop + 6 - overflow;
  }

  function addCommentItem(comment: BroadcastComment | null, author: string, text: string) {
    const bodyWidth = commentsAreaWidth - 12;
    const item = new Container();

    const authorText = new Text({
      text: author,
      style: { fill: comment ? 0x4a4a5a : 0x999999, fontSize: 10, fontWeight: comment ? "bold" : "normal" },
    });
    authorText.x = 6;
    authorText.y = 4;
    const bodyText = new Text({
      text,
      style: { fill: comment ? 0x333333 : 0x888888, fontSize: 12, wordWrap: true, wordWrapWidth: bodyWidth - 12 },
    });
    bodyText.x = 6;
    bodyText.y = authorText.y + authorText.height + 2;

    const bubbleHeight = bodyText.y + bodyText.height + 6;
    const bubbleBg = new Graphics();

    function drawBubble(selected: boolean) {
      bubbleBg.clear();
      if (comment) {
        bubbleBg
          .roundRect(0, 0, bodyWidth, bubbleHeight, 6)
          .fill(selected ? { color: comment.color, alpha: 0.35 } : 0xffffff)
          .stroke({ width: selected ? 3 : 2, color: comment.color });
      } else {
        bubbleBg.roundRect(0, 0, bodyWidth, bubbleHeight, 6).fill(0xf2f2f2);
      }
    }
    drawBubble(false);

    item.addChild(bubbleBg, authorText, bodyText);

    let selectedMark: Text | null = null;

    if (comment) {
      item.eventMode = "static";
      item.cursor = "pointer";
      item.on("pointertap", () => {
        if (phase !== "talking") return;
        const isSelected = selectedIds.has(comment.id);
        if (!isSelected && selectedIds.size >= MAX_SELECTED_COMMENTS) return;
        if (isSelected) {
          selectedIds.delete(comment.id);
        } else {
          selectedIds.add(comment.id);
        }
        const nowSelected = selectedIds.has(comment.id);
        drawBubble(nowSelected);
        if (nowSelected && !selectedMark) {
          selectedMark = new Text({
            text: "✓ 選択中",
            style: { fill: 0x6a3347, fontSize: 10, fontWeight: "bold" },
          });
          selectedMark.anchor.set(1, 0);
          selectedMark.x = bodyWidth - 6;
          selectedMark.y = 4;
          item.addChild(selectedMark);
        } else if (!nowSelected && selectedMark) {
          item.removeChild(selectedMark);
          selectedMark.destroy();
          selectedMark = null;
        }
        updateSelectionHint();
      });
    }

    commentsList.addChild(item);
    commentEntries.push(item);
    if (commentEntries.length > MAX_STORED_COMMENTS) {
      const removed = commentEntries.shift();
      if (removed) {
        commentsList.removeChild(removed);
        removed.destroy({ children: true });
      }
    }
    layoutComments();
  }

  const commentQueue: (BroadcastComment | null)[] = [];
  theme.comments.forEach((comment) => {
    commentQueue.push(null);
    commentQueue.push(comment);
  });
  commentQueue.push(null);
  let queueIndex = 0;
  let commentTimerMs = 0;

  const tick = (ticker: Ticker) => {
    if (phase !== "talking") return;
    commentTimerMs += ticker.deltaMS;
    if (commentTimerMs < COMMENT_INTERVAL_MS) return;
    commentTimerMs = 0;
    const entry = queueIndex < commentQueue.length ? commentQueue[queueIndex++] : null;
    if (entry) {
      addCommentItem(entry, entry.author, entry.text);
    } else {
      const fillerText = FILLER_COMMENTS[Math.floor(Math.random() * FILLER_COMMENTS.length)];
      addCommentItem(null, "視聴者", fillerText);
    }
  };
  Ticker.shared.add(tick);

  // --- subtitle box (VN style) ---
  const subtitleY = height - SUBTITLE_HEIGHT - ACTION_BAR_HEIGHT;
  const subtitleBg = new Graphics().rect(0, subtitleY, width, SUBTITLE_HEIGHT).fill({ color: 0x000000, alpha: 0.72 });
  subtitleBg.eventMode = "static";
  subtitleBg.cursor = "pointer";
  container.addChild(subtitleBg);

  const speakerLabel = new Text({
    text: "配信者",
    style: { fill: 0xffd9e8, fontSize: 12, fontWeight: "bold" },
  });
  speakerLabel.x = PADDING;
  speakerLabel.y = subtitleY + 8;
  container.addChild(speakerLabel);

  const subtitleText = new Text({
    text: "",
    style: { fill: 0xffffff, fontSize: 13, wordWrap: true, wordWrapWidth: width - PADDING * 2, lineHeight: 18 },
  });
  subtitleText.x = PADDING;
  subtitleText.y = subtitleY + 26;
  container.addChild(subtitleText);

  const advanceHint = new Text({
    text: "▼ クリックして進める",
    style: { fill: 0xffd9e8, fontSize: 10 },
  });
  advanceHint.anchor.set(1, 1);
  advanceHint.x = width - PADDING;
  advanceHint.y = subtitleY + SUBTITLE_HEIGHT - 6;
  container.addChild(advanceHint);

  // --- action button ---
  const actionButton = new Container();
  actionButton.eventMode = "static";
  actionButton.cursor = "pointer";
  const actionButtonWidth = 220;
  const actionButtonBg = new Graphics().roundRect(0, 0, actionButtonWidth, 26, 6).fill(0xffb6c8);
  const actionButtonText = new Text({
    text: "",
    style: { fill: 0x6a3347, fontSize: 12, fontWeight: "bold" },
  });
  actionButtonText.anchor.set(0.5);
  actionButtonText.x = actionButtonWidth / 2;
  actionButtonText.y = 13;
  actionButton.addChild(actionButtonBg, actionButtonText);
  actionButton.x = (width - actionButtonWidth) / 2;
  actionButton.y = height - ACTION_BAR_HEIGHT + 3;
  actionButton.visible = false;
  container.addChild(actionButton);

  actionButton.on("pointertap", () => {
    if (phase === "talking") {
      startEndingPhase();
    } else {
      onBack();
    }
  });

  function currentLines(): string[] {
    return phase === "talking" ? theme.lines : endingLines;
  }

  function showLine() {
    const lines = currentLines();
    subtitleText.text = lines[lineIndex] ?? "";
    const isLast = lineIndex >= lines.length - 1;
    advanceHint.visible = !isLast;
    if (isLast) {
      actionButtonText.text = phase === "talking" ? "コメントに反応する" : "テーマ選択に戻る";
      actionButton.visible = true;
    } else {
      actionButton.visible = false;
    }
  }

  function startEndingPhase() {
    phase = "ending";
    lineIndex = 0;
    Ticker.shared.remove(tick);

    const selectedComments = theme.comments.filter((comment) => selectedIds.has(comment.id));
    if (selectedComments.length === 0) {
      endingLines = [
        "今回はコメントに反応できなかったけど、見てくれて本当にありがとうございました！",
        "また次の配信でお会いしましょう！",
      ];
    } else {
      endingLines = selectedComments.flatMap((comment) => [`「${comment.text}」というコメントについて……`, comment.reaction]);
      endingLines.push("配信を見てくれて本当にありがとうございました！");
    }
    showLine();
  }

  subtitleBg.on("pointertap", () => {
    const lines = currentLines();
    if (lineIndex < lines.length - 1) {
      lineIndex++;
      showLine();
    }
  });

  showLine();

  return () => {
    Ticker.shared.remove(tick);
  };
}

export function createBroadcastContent(state: GameState, width: number, height: number): AppContent {
  const root = new Container();

  const bg = new Graphics().rect(0, 0, width, height).fill(0xfdebf1);
  root.addChild(bg);

  const liveView = new Container();
  liveView.visible = false;

  let disposeLive: (() => void) | null = null;

  function showThemeSelect() {
    disposeLive?.();
    disposeLive = null;
    liveView.visible = false;
    liveView.removeChildren();
    themeSelectView.visible = true;
  }

  function startTheme(theme: BroadcastTheme) {
    themeSelectView.visible = false;
    liveView.visible = true;
    liveView.removeChildren();
    disposeLive?.();
    disposeLive = buildLiveView(liveView, width, height, state, theme, showThemeSelect);
  }

  const themeSelectView = buildThemeSelectView(width, startTheme);
  root.addChild(themeSelectView, liveView);

  return {
    view: root,
    dispose: () => {
      disposeLive?.();
    },
  };
}
