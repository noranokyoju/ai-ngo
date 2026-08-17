import { Container, Graphics, Rectangle, Text, Ticker } from "pixi.js";
import type { GameState } from "../game/GameState";
import type { AppContent } from "./types";

function isNight(state: GameState): boolean {
  return state.timeOfDay === "夜";
}

const PADDING = 16;
const STREAMER_NAME = "配信者";

interface BroadcastComment {
  id: string;
  author: string;
  text: string;
  colored: boolean;
  reply?: string;
}

interface BroadcastLine {
  text: string;
  comments: BroadcastComment[];
}

interface BroadcastTheme {
  id: string;
  title: string;
  summary: string;
  lines: BroadcastLine[];
  closingText: string;
}

interface DialogueStep {
  text: string;
  quote: { author: string; text: string } | null;
  onComplete?: () => void;
}

const THEMES: BroadcastTheme[] = [
  {
    id: "first-stream",
    title: "初配信",
    summary: "はじめての配信にチャレンジ！緊張しながらも自己紹介をします。",
    lines: [
      {
        text: "……あ、あー、聞こえてますか？えっと、初めまして、今日から配信を始めます！",
        comments: [
          { id: "c1", author: "通りすがりA", text: "見えてるよー！", colored: false },
          {
            id: "c2",
            author: "ふぁん1号",
            text: "わあ、初配信だ！応援してる！",
            colored: true,
            reply: "わあ、ありがとうございます…！すごく嬉しいです！",
          },
        ],
      },
      {
        text: "緊張してるんですけど、頑張って喋っていくので、よろしくお願いします！",
        comments: [
          { id: "c3", author: "名無し", text: "がんばれー", colored: false },
          {
            id: "c4",
            author: "通りすがりB",
            text: "声かわいい",
            colored: true,
            reply: "え、そ、そうですか…？ありがとうございます、照れます……",
          },
        ],
      },
      {
        text: "自己紹介、何を話せばいいのか全然わからなくて……えっと、猫が好きです！",
        comments: [
          { id: "c5", author: "猫好きさん", text: "猫かわいいよね！うちにも2匹いる", colored: false },
          {
            id: "c6",
            author: "のんびり視聴者",
            text: "猫の話もっと聞きたい！",
            colored: true,
            reply: "今度は飼ってる子の写真も持ってきますね！",
          },
        ],
      },
      {
        text: "今日はこの辺で終わろうと思います。次はもっと上手に話せるようにがんばります！",
        comments: [
          { id: "c7", author: "常連さん", text: "お疲れ様でした！", colored: false },
          {
            id: "c8",
            author: "新規リスナー",
            text: "また見に来ます！",
            colored: true,
            reply: "はい、絶対また配信するので見に来てください……！",
          },
        ],
      },
    ],
    closingText: "見てくれて本当にありがとうございました……！また次の配信でお会いしましょう！",
  },
];

function startTypewriter(text: string, textObj: Text, onComplete: () => void) {
  const CHARS_PER_FRAME = 0.5;
  let shown = 0;
  let progress = 0;
  let finished = false;

  function finish() {
    if (finished) return;
    finished = true;
    textObj.text = text;
    Ticker.shared.remove(tick);
    onComplete();
  }

  function tick(ticker: Ticker) {
    progress += ticker.deltaTime * CHARS_PER_FRAME;
    const next = Math.min(text.length, Math.floor(progress));
    if (next !== shown) {
      shown = next;
      textObj.text = text.slice(0, shown);
    }
    if (shown >= text.length) finish();
  }

  Ticker.shared.add(tick);

  return {
    get finished() {
      return finished;
    },
    skip: finish,
    stop() {
      if (!finished) {
        finished = true;
        Ticker.shared.remove(tick);
      }
    },
  };
}

export function createBroadcastContent(state: GameState, width: number, height: number): AppContent {
  const root = new Container();

  const bg = new Graphics().rect(0, 0, width, height).fill(0xfdebf1);
  root.addChild(bg);

  // ---- Layout ----
  const commentsWidth = Math.min(240, Math.round(width * 0.28));
  const videoX = PADDING;
  const videoY = PADDING;
  const videoWidth = width - PADDING * 3 - commentsWidth;
  const videoHeight = Math.round(videoWidth * 0.577);
  const infoY = videoY + videoHeight + 12;
  const commentsX = videoX + videoWidth + PADDING;
  const commentsY = PADDING;
  const commentsHeight = height - PADDING * 2;

  const dialogMargin = 10;
  const dialogWidth = videoWidth - dialogMargin * 2;
  const dialogHeight = Math.min(110, Math.round(videoHeight * 0.36));
  const dialogX = dialogMargin;
  const dialogY = videoHeight - dialogHeight - dialogMargin;
  const dialogTextPadding = 14;

  // ---- Theme select screen ----
  const themeSelectScreen = new Container();
  root.addChild(themeSelectScreen);

  const selectTitle = new Text({
    text: "配信テーマを選んでください",
    style: { fill: 0x4a4a5a, fontSize: 18, fontWeight: "bold" },
  });
  selectTitle.x = PADDING;
  selectTitle.y = PADDING;
  themeSelectScreen.addChild(selectTitle);

  const nightHintText = new Text({
    text: "※配信は夜（🌙）にしか行えません",
    style: { fill: 0xd6336c, fontSize: 12, fontWeight: "bold" },
  });
  nightHintText.x = PADDING;
  nightHintText.y = PADDING + selectTitle.height + 4;
  themeSelectScreen.addChild(nightHintText);

  const CARD_WIDTH = 220;
  const CARD_HEIGHT = 150;
  const themeCards: Container[] = [];
  THEMES.forEach((theme, index) => {
    const card = new Container();
    card.x = PADDING + index * (CARD_WIDTH + 16);
    card.y = 60;
    card.eventMode = "static";
    card.cursor = "pointer";

    const cardBg = new Graphics()
      .roundRect(0, 0, CARD_WIDTH, CARD_HEIGHT, 10)
      .fill(0xfff0f5)
      .stroke({ width: 2, color: 0xffb6c8 });
    const cardTitle = new Text({
      text: theme.title,
      style: { fill: 0x6a3347, fontSize: 16, fontWeight: "bold" },
    });
    cardTitle.x = 14;
    cardTitle.y = 14;
    const cardDesc = new Text({
      text: theme.summary,
      style: { fill: 0x8a5a6a, fontSize: 12, wordWrap: true, wordWrapWidth: CARD_WIDTH - 28, breakWords: true },
    });
    cardDesc.x = 14;
    cardDesc.y = 44;

    card.addChild(cardBg, cardTitle, cardDesc);
    card.on("pointertap", (event) => {
      event.stopPropagation();
      if (!isNight(state)) return;
      startTheme(theme);
    });
    themeSelectScreen.addChild(card);
    themeCards.push(card);
  });

  function updateNightGate() {
    const night = isNight(state);
    nightHintText.visible = !night;
    for (const card of themeCards) {
      card.alpha = night ? 1 : 0.5;
      card.cursor = night ? "pointer" : "default";
    }
  }
  updateNightGate();

  // ---- Stream screen ----
  const streamScreen = new Container();
  streamScreen.visible = false;
  streamScreen.eventMode = "static";
  streamScreen.hitArea = new Rectangle(0, 0, width, height);
  root.addChild(streamScreen);

  const videoContainer = new Container();
  videoContainer.x = videoX;
  videoContainer.y = videoY;
  streamScreen.addChild(videoContainer);

  const videoBg = new Graphics().roundRect(0, 0, videoWidth, videoHeight, 8).fill(0x2a2a3a);
  videoContainer.addChild(videoBg);

  const avatarRadius = Math.min(60, Math.round(videoHeight * 0.22));
  const avatar = new Graphics()
    .circle(videoWidth / 2, Math.round(videoHeight * 0.34), avatarRadius)
    .fill(0xffdfba);
  videoContainer.addChild(avatar);

  const liveBadge = new Container();
  const liveBadgeBg = new Graphics().roundRect(0, 0, 52, 22, 4).fill(0xff5577);
  const liveBadgeText = new Text({ text: "LIVE", style: { fill: 0xffffff, fontSize: 12, fontWeight: "bold" } });
  liveBadgeText.x = 9;
  liveBadgeText.y = 4;
  liveBadge.addChild(liveBadgeBg, liveBadgeText);
  liveBadge.x = 10;
  liveBadge.y = 10;
  videoContainer.addChild(liveBadge);

  // Dialogue box, overlaid inside the video area
  const dialogueBox = new Container();
  dialogueBox.x = dialogX;
  dialogueBox.y = dialogY;
  videoContainer.addChild(dialogueBox);

  const nameTagText = new Text({
    text: STREAMER_NAME,
    style: { fill: 0x6a3347, fontSize: 12, fontWeight: "bold" },
  });
  const nameTagBg = new Graphics();
  const nameTag = new Container();
  nameTag.addChild(nameTagBg, nameTagText);
  nameTagText.x = 10;
  nameTagText.y = 4;
  nameTagBg.roundRect(0, 0, nameTagText.width + 20, 22, 4).fill(0xffb6c8);
  nameTag.y = -26;
  dialogueBox.addChild(nameTag);

  const quoteText = new Text({
    text: "",
    style: {
      fill: 0xffe1ec,
      fontSize: 11,
      wordWrap: true,
      wordWrapWidth: dialogWidth,
      breakWords: true,
    },
  });
  quoteText.x = 2;
  quoteText.y = -50;
  quoteText.visible = false;
  dialogueBox.addChild(quoteText);

  const dialogueBoxBg = new Graphics().roundRect(0, 0, dialogWidth, dialogHeight, 10).fill({
    color: 0x000000,
    alpha: 0.68,
  });
  dialogueBox.addChild(dialogueBoxBg);

  const dialogueText = new Text({
    text: "",
    style: {
      fill: 0xffffff,
      fontSize: 14,
      lineHeight: 20,
      wordWrap: true,
      wordWrapWidth: dialogWidth - dialogTextPadding * 2,
      breakWords: true,
    },
  });
  dialogueText.x = dialogTextPadding;
  dialogueText.y = dialogTextPadding;
  dialogueBox.addChild(dialogueText);

  const triangleMark = new Text({ text: "▼", style: { fill: 0xffffff, fontSize: 13 } });
  triangleMark.anchor.set(1, 1);
  triangleMark.x = dialogWidth - 10;
  triangleMark.y = dialogHeight - 8;
  triangleMark.visible = false;
  dialogueBox.addChild(triangleMark);

  let trianglePulse = 0;
  const pulseTicker = (ticker: Ticker) => {
    if (!triangleMark.visible) return;
    trianglePulse += ticker.deltaTime * 0.15;
    triangleMark.alpha = 0.6 + Math.sin(trianglePulse) * 0.4;
  };
  Ticker.shared.add(pulseTicker);

  // Info row below the video, YouTube-ish
  const titleText = new Text({
    text: "",
    style: { fill: 0x333340, fontSize: 16, fontWeight: "bold" },
  });
  titleText.x = videoX;
  titleText.y = infoY;
  streamScreen.addChild(titleText);

  const channelDot = new Graphics().circle(0, 0, 10).fill(0xffb6c8);
  const channelNameText = new Text({ text: STREAMER_NAME, style: { fill: 0x4a4a5a, fontSize: 12 } });
  const viewerText = new Text({ text: "", style: { fill: 0x8a8a9a, fontSize: 12 } });
  streamScreen.addChild(channelDot, channelNameText, viewerText);

  function layoutInfoRow() {
    const row2Y = infoY + titleText.height + 10;
    channelDot.x = videoX + 10;
    channelDot.y = row2Y + 9;
    channelNameText.x = videoX + 26;
    channelNameText.y = row2Y;
    viewerText.x = channelNameText.x + channelNameText.width + 8;
    viewerText.y = row2Y;
  }

  function updateViewerText() {
    const count = Math.max(3, Math.round(state.params.fans * 0.6) + 8);
    viewerText.text = `・ 視聴者 ${count}人`;
    layoutInfoRow();
  }

  // Comments panel
  const commentsPanelBg = new Graphics()
    .roundRect(commentsX - 6, commentsY - 6, commentsWidth + 12, commentsHeight + 12, 10)
    .fill(0xfff8fa)
    .stroke({ width: 1, color: 0xffd7e4 });
  streamScreen.addChild(commentsPanelBg);

  const commentsHeader = new Text({
    text: "コメント",
    style: { fill: 0x6a3347, fontSize: 13, fontWeight: "bold" },
  });
  commentsHeader.x = commentsX;
  commentsHeader.y = commentsY;
  streamScreen.addChild(commentsHeader);

  const commentsViewportY = commentsY + 24;
  const commentsViewportHeight = commentsHeight - 24;

  const commentsViewport = new Container();
  commentsViewport.x = commentsX;
  commentsViewport.y = commentsViewportY;
  commentsViewport.eventMode = "static";
  commentsViewport.hitArea = new Rectangle(0, 0, commentsWidth, commentsViewportHeight);
  streamScreen.addChild(commentsViewport);

  const commentsMask = new Graphics().rect(0, 0, commentsWidth, commentsViewportHeight).fill(0xffffff);
  commentsViewport.addChild(commentsMask);

  const commentsList = new Container();
  commentsViewport.addChild(commentsList);
  commentsViewport.mask = commentsMask;

  let commentsData: BroadcastComment[] = [];
  let selectedComments: BroadcastComment[] = [];
  let scrollOffset = 0;
  let maxScroll = 0;
  let autoFollow = true;

  function renderCommentItem(comment: BroadcastComment): Container {
    const item = new Container();
    const itemWidth = commentsWidth - 8;
    const selected = selectedComments.some((c) => c.id === comment.id);

    const authorText = new Text({
      text: comment.colored && selected ? `${comment.author} ✓` : comment.author,
      style: { fill: comment.colored ? 0xd6336c : 0x8a8a9a, fontSize: 11, fontWeight: "bold" },
    });
    authorText.x = 8;
    authorText.y = 6;

    const bodyText = new Text({
      text: comment.text,
      style: {
        fill: 0x333340,
        fontSize: 12,
        wordWrap: true,
        wordWrapWidth: itemWidth - 16,
        breakWords: true,
      },
    });
    bodyText.x = 8;
    bodyText.y = authorText.y + authorText.height + 2;

    const boxHeight = bodyText.y + bodyText.height + 8;
    const boxBg = new Graphics().roundRect(0, 0, itemWidth, boxHeight, 6).fill(comment.colored ? 0xfff0f5 : 0xf4f4f7);
    if (comment.colored) {
      boxBg.stroke({ width: selected ? 3 : 1, color: selected ? 0xd6336c : 0xffc2d6 });
    }

    item.addChild(boxBg, authorText, bodyText);

    if (comment.colored) {
      item.eventMode = "static";
      item.cursor = "pointer";
      item.on("pointertap", (event) => {
        event.stopPropagation();
        toggleCommentSelection(comment);
      });
    }

    return item;
  }

  function layoutComments() {
    commentsList.removeChildren();
    let y = 0;
    for (const comment of commentsData) {
      const item = renderCommentItem(comment);
      item.x = 4;
      item.y = y;
      commentsList.addChild(item);
      y += item.height + 8;
    }
    maxScroll = Math.max(0, y - commentsViewportHeight);
    if (autoFollow) scrollOffset = maxScroll;
    scrollOffset = Math.max(0, Math.min(scrollOffset, maxScroll));
    commentsList.y = -scrollOffset;
  }

  commentsViewport.on("wheel", (event) => {
    event.stopPropagation();
    scrollOffset = Math.max(0, Math.min(scrollOffset + event.deltaY, maxScroll));
    autoFollow = scrollOffset >= maxScroll - 1;
    commentsList.y = -scrollOffset;
  });

  function addComment(comment: BroadcastComment) {
    commentsData.push(comment);
    layoutComments();
  }

  function toggleCommentSelection(comment: BroadcastComment) {
    if (phase !== "lines" && phase !== "await-reaction") return;
    const index = selectedComments.findIndex((c) => c.id === comment.id);
    if (index >= 0) {
      selectedComments.splice(index, 1);
    } else {
      if (selectedComments.length >= 2) return;
      selectedComments.push(comment);
    }
    layoutComments();
  }

  // Buttons
  function createActionButton(label: string, y: number): Container {
    const button = new Container();
    const buttonWidth = 170;
    const buttonHeight = 34;
    button.eventMode = "static";
    button.cursor = "pointer";
    const buttonBg = new Graphics().roundRect(0, 0, buttonWidth, buttonHeight, 8).fill(0xffb6c8);
    const buttonText = new Text({ text: label, style: { fill: 0x6a3347, fontSize: 13, fontWeight: "bold" } });
    buttonText.anchor.set(0.5);
    buttonText.x = buttonWidth / 2;
    buttonText.y = buttonHeight / 2;
    button.addChild(buttonBg, buttonText);
    button.x = videoX;
    button.y = y;
    button.visible = false;
    streamScreen.addChild(button);
    return button;
  }

  const reactionButton = createActionButton("コメントに反応する", height - 44);
  const returnButton = createActionButton("テーマ選択に戻る", height - 44);

  reactionButton.on("pointertap", (event) => {
    event.stopPropagation();
    if (phase !== "await-reaction") return;
    reactionButton.visible = false;
    phase = "reacting";
    const replySteps: DialogueStep[] = [
      ...selectedComments.map((comment) => ({
        text: comment.reply ?? `${comment.author}さん、コメントありがとうございます！`,
        quote: { author: comment.author, text: comment.text },
      })),
      { text: currentTheme ? currentTheme.closingText : "", quote: null },
    ];
    startQueue(replySteps, () => {
      phase = "done";
      returnButton.visible = true;
    });
  });

  returnButton.on("pointertap", (event) => {
    event.stopPropagation();
    typewriter?.stop();
    typewriter = null;
    streamScreen.visible = false;
    themeSelectScreen.visible = true;
  });

  // ---- Dialogue queue state machine ----
  type Phase = "lines" | "await-reaction" | "reacting" | "done";
  let phase: Phase = "lines";
  let currentTheme: BroadcastTheme | null = null;
  let typewriter: ReturnType<typeof startTypewriter> | null = null;
  let currentQueue: DialogueStep[] = [];
  let currentStepIndex = 0;
  let onQueueDone: (() => void) | null = null;

  function showStep(step: DialogueStep) {
    quoteText.visible = !!step.quote;
    if (step.quote) quoteText.text = `${step.quote.author}: ${step.quote.text}`;
    triangleMark.visible = false;
    typewriter?.stop();
    typewriter = startTypewriter(step.text, dialogueText, () => {
      triangleMark.visible = true;
      step.onComplete?.();
    });
  }

  function startQueue(steps: DialogueStep[], done: () => void) {
    currentQueue = steps;
    currentStepIndex = 0;
    onQueueDone = done;
    if (currentQueue.length > 0) showStep(currentQueue[0]);
  }

  function advanceQueue() {
    if (typewriter && !typewriter.finished) {
      typewriter.skip();
      return;
    }
    currentStepIndex += 1;
    if (currentStepIndex < currentQueue.length) {
      showStep(currentQueue[currentStepIndex]);
    } else {
      const done = onQueueDone;
      onQueueDone = null;
      done?.();
    }
  }

  streamScreen.on("pointertap", () => {
    if (phase === "lines" || phase === "reacting") advanceQueue();
  });

  function startTheme(theme: BroadcastTheme) {
    currentTheme = theme;
    commentsData = [];
    selectedComments = [];
    scrollOffset = 0;
    autoFollow = true;
    layoutComments();
    phase = "lines";
    reactionButton.visible = false;
    returnButton.visible = false;

    themeSelectScreen.visible = false;
    streamScreen.visible = true;

    titleText.text = `【${theme.title}】よろしくお願いします！`;
    layoutInfoRow();
    updateViewerText();

    const lineSteps: DialogueStep[] = theme.lines.map((line) => ({
      text: line.text,
      quote: null,
      onComplete: () => {
        for (const comment of line.comments) addComment(comment);
      },
    }));
    startQueue(lineSteps, () => {
      phase = "await-reaction";
      reactionButton.visible = true;
    });
  }

  const onParamsChanged = () => updateViewerText();
  const onTimeChanged = () => updateNightGate();
  state.onParamsChanged.on(onParamsChanged);
  state.onTimeChanged.on(onTimeChanged);

  return {
    view: root,
    dispose: () => {
      state.onParamsChanged.off(onParamsChanged);
      state.onTimeChanged.off(onTimeChanged);
      typewriter?.stop();
      Ticker.shared.remove(pulseTicker);
    },
  };
}
