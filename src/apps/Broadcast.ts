import { Container, Graphics, Text, Ticker, type FederatedPointerEvent } from "pixi.js";
import type { GameState } from "../game/GameState";
import type { AppContent } from "./types";

interface BroadcastComment {
  author: string;
  text: string;
  colored: boolean;
  reaction?: string;
}

interface BroadcastLine {
  text: string;
  comments: BroadcastComment[];
}

interface BroadcastTheme {
  id: string;
  label: string;
  description: string;
  streamerName: string;
  lines: BroadcastLine[];
  closingText: string;
}

const MAX_SELECTED_COMMENTS = 2;
const COMMENT_STAGGER_MS = 700;

const THEMES: BroadcastTheme[] = [
  {
    id: "first-stream",
    label: "初配信",
    description: "はじめての配信。緊張しながらも自己紹介から始めます。",
    streamerName: "あなた",
    lines: [
      {
        text: "……あ、映ってます？えっと、はじめまして！今日から配信を始めます！",
        comments: [
          { author: "通りすがりのリスナー", text: "見えてるよ〜！初配信おめでとう！", colored: false },
          { author: "ふわふわ雲", text: "緊張してるの可愛い", colored: false },
        ],
      },
      {
        text: "えっと、自己紹介からしますね。名前はまだ決めてなくて…みんなが呼びやすい名前でいいかな？",
        comments: [
          {
            author: "名付け親募集中",
            text: "名前、公募したら盛り上がりそう！",
            colored: true,
            reaction: "名前の公募、いいアイデアですね！今度募集してみます！",
          },
          { author: "夜更かしさん", text: "とりあえず配信頑張って！", colored: false },
        ],
      },
      {
        text: "今日は顔出しなしで、声だけでお届けします。緊張して声が震えてたらごめんなさい…！",
        comments: [{ author: "音質チェック班", text: "声すごく聞き取りやすいよ！", colored: false }],
      },
      {
        text: "実は今日のために、配信画面もちょっとだけこだわってみたんです。見てもらえて嬉しいな。",
        comments: [
          {
            author: "デザイン気になる勢",
            text: "画面のレイアウト見やすい！",
            colored: true,
            reaction: "画面、見やすいって言ってもらえてよかったです！",
          },
          { author: "ROM専", text: "静かに見てます", colored: false },
        ],
      },
      {
        text: "初めてで至らないところも多いと思うけど、これから少しずつ頑張っていきたいと思います！",
        comments: [
          {
            author: "応援団長",
            text: "応援してるよ！",
            colored: true,
            reaction: "応援ありがとうございます、すごく励みになります！",
          },
          { author: "見学者A", text: "のんびり見守るね", colored: false },
        ],
      },
      {
        text: "というわけで、記念すべき第一回の配信、これで終わりにしたいと思います。聞いてくれてありがとうございました！",
        comments: [
          { author: "名残惜しい人", text: "もう終わっちゃうの！？", colored: false },
          { author: "また来ます", text: "次回も見るね！", colored: false },
        ],
      },
    ],
    closingText: "今日はこのくらいで。また次の配信でお会いしましょう！お疲れさまでした！",
  },
];

const COLOR_BG = 0x14141c;
const COLOR_PANEL = 0xfdebf1;
const COLOR_VIDEO_BG = 0x2a2a38;
const COLOR_TEXT_LIGHT = 0xf5f5f5;
const COLOR_TEXT_DARK = 0x4a4a5a;
const COLOR_TEXT_SUB = 0x8a8a9a;
const COLOR_LIVE = 0xff5470;
const COLOR_DIALOGUE_BG = 0x000000;
const COLOR_COMMENT_COLORED_BG = 0xfff2c6;
const COLOR_COMMENT_SELECTED_BG = 0xffd97a;
const COLOR_COMMENT_BORDER = 0xf0c419;
const COLOR_BUTTON_BG = 0xa9d8f5;
const COLOR_BUTTON_TEXT = 0x2f4a63;
const COLOR_CARD_BG = 0xffffff;

const PADDING = 16;
const COMMENTS_W = 232;

export function createBroadcastContent(state: GameState, width: number, height: number): AppContent {
  const root = new Container();

  const bg = new Graphics().rect(0, 0, width, height).fill(COLOR_BG);
  root.addChild(bg);

  const videoW = width - PADDING * 3 - COMMENTS_W;
  const videoH = Math.round((videoW * 9) / 16);
  const infoY = PADDING + videoH + 10;
  const infoH = 56;
  const controlsY = infoY + infoH + 6;
  const controlsH = 44;
  const commentsX = PADDING * 2 + videoW;
  const commentsY = PADDING;
  const commentsH = height - PADDING * 2;

  // ------------------------------------------------------------------
  // Theme select screen
  // ------------------------------------------------------------------
  const selectScreen = new Container();
  root.addChild(selectScreen);

  const selectBg = new Graphics().rect(0, 0, width, height).fill(COLOR_PANEL);
  selectScreen.addChild(selectBg);

  const selectTitle = new Text({
    text: "配信テーマを選んでね",
    style: { fill: COLOR_TEXT_DARK, fontSize: 18, fontWeight: "bold" },
  });
  selectTitle.x = PADDING;
  selectTitle.y = PADDING;
  selectScreen.addChild(selectTitle);

  THEMES.forEach((theme, index) => {
    const card = new Container();
    card.eventMode = "static";
    card.cursor = "pointer";
    const cardWidth = width - PADDING * 2;
    const cardHeight = 84;
    card.x = PADDING;
    card.y = 56 + index * (cardHeight + 12);

    const cardBg = new Graphics().roundRect(0, 0, cardWidth, cardHeight, 10).fill(COLOR_CARD_BG).stroke({
      width: 2,
      color: 0xffb6c8,
    });
    card.addChild(cardBg);

    const cardLabel = new Text({
      text: theme.label,
      style: { fill: COLOR_TEXT_DARK, fontSize: 16, fontWeight: "bold" },
    });
    cardLabel.x = 16;
    cardLabel.y = 14;
    card.addChild(cardLabel);

    const cardDesc = new Text({
      text: theme.description,
      style: { fill: COLOR_TEXT_SUB, fontSize: 12, wordWrap: true, wordWrapWidth: cardWidth - 32 },
    });
    cardDesc.x = 16;
    cardDesc.y = 40;
    card.addChild(cardDesc);

    card.on("pointertap", (event: FederatedPointerEvent) => {
      event.stopPropagation();
      startBroadcast(theme);
    });

    selectScreen.addChild(card);
  });

  // ------------------------------------------------------------------
  // Live broadcast screen
  // ------------------------------------------------------------------
  const liveScreen = new Container();
  liveScreen.visible = false;
  liveScreen.eventMode = "static";
  root.addChild(liveScreen);

  const liveBg = new Graphics().rect(0, 0, width, height).fill(COLOR_BG);
  liveScreen.addChild(liveBg);
  liveScreen.on("pointertap", () => onScreenClick());

  // -- video area --
  const video = new Container();
  video.x = PADDING;
  video.y = PADDING;
  liveScreen.addChild(video);

  const videoBg = new Graphics().roundRect(0, 0, videoW, videoH, 8).fill(COLOR_VIDEO_BG);
  video.addChild(videoBg);

  const avatar = new Graphics().circle(videoW / 2, videoH / 2 - 20, 44).fill(0xffdfba);
  video.addChild(avatar);

  const liveBadge = new Container();
  const liveBadgeBg = new Graphics().roundRect(0, 0, 52, 22, 4).fill(COLOR_LIVE);
  const liveBadgeText = new Text({
    text: "LIVE",
    style: { fill: 0xffffff, fontSize: 12, fontWeight: "bold" },
  });
  liveBadgeText.x = 8;
  liveBadgeText.y = 4;
  liveBadge.addChild(liveBadgeBg, liveBadgeText);
  liveBadge.x = 10;
  liveBadge.y = 10;
  video.addChild(liveBadge);

  // dialogue box, overlaid inside the video area
  const dialogueBox = new Container();
  const dialogueBoxHeight = 78;
  dialogueBox.x = 10;
  dialogueBox.y = videoH - dialogueBoxHeight - 10;
  video.addChild(dialogueBox);

  const dialogueBg = new Graphics()
    .roundRect(0, 0, videoW - 20, dialogueBoxHeight, 8)
    .fill({ color: COLOR_DIALOGUE_BG, alpha: 0.6 });
  dialogueBox.addChild(dialogueBg);

  const dialogueName = new Text({
    text: "",
    style: { fill: 0xffd9a6, fontSize: 12, fontWeight: "bold" },
  });
  dialogueName.x = 14;
  dialogueName.y = 8;
  dialogueBox.addChild(dialogueName);

  const dialogueText = new Text({
    text: "",
    style: {
      fill: COLOR_TEXT_LIGHT,
      fontSize: 13,
      wordWrap: true,
      wordWrapWidth: videoW - 48,
      lineHeight: 18,
    },
  });
  dialogueText.x = 14;
  dialogueText.y = 28;
  dialogueBox.addChild(dialogueText);

  // -- info row (Youtube-style: avatar / title & streamer / viewer count) --
  const infoRow = new Container();
  infoRow.x = PADDING;
  infoRow.y = infoY;
  liveScreen.addChild(infoRow);

  const infoAvatar = new Graphics().circle(18, 18, 18).fill(0xffb6c8);
  infoRow.addChild(infoAvatar);

  const titleText = new Text({
    text: "",
    style: { fill: COLOR_TEXT_LIGHT, fontSize: 15, fontWeight: "bold", wordWrap: true, wordWrapWidth: videoW - 46 },
  });
  titleText.x = 46;
  titleText.y = 0;
  infoRow.addChild(titleText);

  const subtitleText = new Text({
    text: "",
    style: { fill: COLOR_TEXT_SUB, fontSize: 12 },
  });
  subtitleText.x = 46;
  subtitleText.y = 24;
  infoRow.addChild(subtitleText);

  // -- controls row (react / return buttons) --
  const controlsRow = new Container();
  controlsRow.x = PADDING;
  controlsRow.y = controlsY;
  liveScreen.addChild(controlsRow);

  function makeButton(label: string, onClick: () => void): Container {
    const button = new Container();
    button.eventMode = "static";
    button.cursor = "pointer";
    const buttonWidth = 200;
    const buttonBg = new Graphics().roundRect(0, 0, buttonWidth, controlsH, 8).fill(COLOR_BUTTON_BG);
    const buttonText = new Text({
      text: label,
      style: { fill: COLOR_BUTTON_TEXT, fontSize: 14, fontWeight: "bold" },
    });
    buttonText.anchor.set(0.5);
    buttonText.x = buttonWidth / 2;
    buttonText.y = controlsH / 2;
    button.addChild(buttonBg, buttonText);
    button.on("pointertap", (event: FederatedPointerEvent) => {
      event.stopPropagation();
      onClick();
    });
    return button;
  }

  const reactButton = makeButton("コメントに反応する", () => startReactions());
  const backButton = makeButton("テーマ選択に戻る", () => endBroadcast());
  controlsRow.addChild(reactButton, backButton);

  // -- comments panel (scrollable) --
  const commentsMask = new Graphics().roundRect(commentsX, commentsY, COMMENTS_W, commentsH, 8).fill(0xffffff);
  liveScreen.addChild(commentsMask);

  const commentsPanelBg = new Graphics().roundRect(commentsX, commentsY, COMMENTS_W, commentsH, 8).fill(0x1c1c26);
  liveScreen.addChild(commentsPanelBg);

  const commentsViewport = new Container();
  commentsViewport.x = commentsX;
  commentsViewport.y = commentsY;
  commentsViewport.mask = commentsMask;
  commentsViewport.eventMode = "static";
  liveScreen.addChild(commentsViewport);

  const commentsContent = new Container();
  commentsContent.x = 8;
  commentsContent.y = 8;
  commentsViewport.addChild(commentsContent);

  let scrollY = 0;
  let stickToBottom = true;

  function maxScroll(): number {
    return Math.max(0, commentsContent.height - (commentsH - 16));
  }

  function applyScroll() {
    const clamped = Math.min(maxScroll(), Math.max(0, scrollY));
    scrollY = clamped;
    commentsContent.y = 8 - scrollY;
  }

  commentsViewport.on("wheel", (event) => {
    event.stopPropagation();
    scrollY += event.deltaY;
    const atBottom = scrollY >= maxScroll() - 1;
    stickToBottom = atBottom;
    applyScroll();
  });

  // ------------------------------------------------------------------
  // Live state
  // ------------------------------------------------------------------
  let activeTheme: BroadcastTheme | null = null;
  let lineIndex = -1;
  let phase: "lines" | "ended" | "reacting" | "reaction-done" = "lines";
  let reactionQueue: BroadcastLine[] = [];
  let selectedComments: BroadcastComment[] = [];
  const pendingComments: { dueAt: number; comment: BroadcastComment }[] = [];
  let clockMs = 0;

  const tick = (ticker: Ticker) => {
    clockMs += ticker.deltaMS;
    while (pendingComments.length > 0 && pendingComments[0].dueAt <= clockMs) {
      const next = pendingComments.shift();
      if (next) addCommentCard(next.comment);
    }
  };

  function startBroadcast(theme: BroadcastTheme) {
    activeTheme = theme;
    lineIndex = -1;
    phase = "lines";
    reactionQueue = [];
    selectedComments = [];
    pendingComments.length = 0;
    clockMs = 0;
    commentsContent.removeChildren();
    scrollY = 0;
    stickToBottom = true;

    titleText.text = theme.label;

    selectScreen.visible = false;
    liveScreen.visible = true;
    Ticker.shared.add(tick);

    showLine(0);
    updateControls();
  }

  function endBroadcast() {
    Ticker.shared.remove(tick);
    activeTheme = null;
    liveScreen.visible = false;
    selectScreen.visible = true;
  }

  function onScreenClick() {
    if (!activeTheme) return;
    if (phase === "lines") {
      if (lineIndex < activeTheme.lines.length - 1) {
        showLine(lineIndex + 1);
      } else {
        phase = "ended";
        updateControls();
      }
    } else if (phase === "reacting") {
      if (lineIndex < reactionQueue.length - 1) {
        showLine(lineIndex + 1, reactionQueue);
      } else {
        phase = "reaction-done";
        updateControls();
      }
    }
  }

  function showLine(index: number, lines?: BroadcastLine[]) {
    if (!activeTheme) return;
    const source = lines ?? activeTheme.lines;
    lineIndex = index;
    const line = source[index];
    dialogueName.text = activeTheme.streamerName;
    dialogueText.text = line.text;

    let delay = COMMENT_STAGGER_MS;
    for (const comment of line.comments) {
      pendingComments.push({ dueAt: clockMs + delay, comment });
      delay += COMMENT_STAGGER_MS;
    }
  }

  function addCommentCard(comment: BroadcastComment) {
    const cardWidth = COMMENTS_W - 16;
    const card = new Container();

    const authorText = new Text({
      text: comment.author,
      style: { fill: 0xbfc2d1, fontSize: 11, fontWeight: "bold" },
    });
    authorText.x = 8;
    authorText.y = 6;
    card.addChild(authorText);

    const bodyText = new Text({
      text: comment.text,
      style: {
        fill: comment.colored ? COLOR_TEXT_DARK : 0xe4e4ef,
        fontSize: 12,
        wordWrap: true,
        wordWrapWidth: cardWidth - 16,
      },
    });
    bodyText.x = 8;
    bodyText.y = 22;
    card.addChild(bodyText);

    const cardHeight = 22 + bodyText.height + 8;
    const cardBg = new Graphics().roundRect(0, 0, cardWidth, cardHeight, 6).fill(comment.colored ? COLOR_COMMENT_COLORED_BG : 0x2a2a38);
    card.addChildAt(cardBg, 0);

    if (comment.colored) {
      card.eventMode = "static";
      card.cursor = "pointer";
      card.on("pointertap", (event: FederatedPointerEvent) => {
        event.stopPropagation();
        toggleCommentSelection(comment, cardBg, cardHeight);
      });
    }

    card.y = commentsContent.height > 0 ? commentsContent.height + 6 : 0;
    commentsContent.addChild(card);

    if (stickToBottom) {
      scrollY = maxScroll();
      applyScroll();
    }
  }

  function toggleCommentSelection(comment: BroadcastComment, cardBg: Graphics, cardHeight: number) {
    if (phase !== "lines") return;
    const cardWidth = COMMENTS_W - 16;
    const alreadySelected = selectedComments.includes(comment);
    if (alreadySelected) {
      selectedComments = selectedComments.filter((c) => c !== comment);
      cardBg.clear().roundRect(0, 0, cardWidth, cardHeight, 6).fill(COLOR_COMMENT_COLORED_BG);
      return;
    }
    if (selectedComments.length >= MAX_SELECTED_COMMENTS) return;
    selectedComments.push(comment);
    cardBg
      .clear()
      .roundRect(0, 0, cardWidth, cardHeight, 6)
      .fill(COLOR_COMMENT_SELECTED_BG)
      .stroke({ width: 2, color: COLOR_COMMENT_BORDER });
  }

  function startReactions() {
    if (phase !== "ended") return;
    reactionQueue = selectedComments.map((comment) => ({
      text: comment.reaction ?? "",
      comments: [],
    }));
    reactionQueue.push({ text: activeTheme!.closingText, comments: [] });
    phase = "reacting";
    showLine(0, reactionQueue);
    updateControls();
  }

  function updateControls() {
    const streamerName = activeTheme?.streamerName ?? "";
    subtitleText.text = `${streamerName} · 👁 ${Math.round(state.params.fans)}`;
    liveBadge.visible = phase === "lines" || phase === "reacting";
    reactButton.visible = phase === "ended";
    backButton.visible = phase === "reaction-done";
  }

  const onParamsChanged = () => {
    if (liveScreen.visible) updateControls();
  };
  state.onParamsChanged.on(onParamsChanged);

  return {
    view: root,
    dispose: () => {
      Ticker.shared.remove(tick);
      state.onParamsChanged.off(onParamsChanged);
    },
  };
}
