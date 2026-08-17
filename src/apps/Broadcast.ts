import { Container, Graphics, Rectangle, Text, Ticker, type FederatedPointerEvent, type FederatedWheelEvent } from "pixi.js";
import type { GameState } from "../game/GameState";
import { STREAM_GENRE_LABEL, type StreamTopic } from "../game/StreamTopics";
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

/**
 * 配信ネタごとの中身（トーク内容）は用意せず、ネタのタイトルを使った汎用テンプレートで進行する。
 * docs/broadcast.md はネタの解放条件・ボーナスの仕様のみを定義しているため。
 */
function buildTheme(topic: StreamTopic): BroadcastTheme {
  return {
    id: topic.id,
    title: topic.title,
    summary: `${STREAM_GENRE_LABEL[topic.genre]} Lv${topic.level}`,
    lines: [
      {
        text: `今日は「${topic.title}」について配信するよ！`,
        comments: [
          { id: `${topic.id}-c1`, author: "通りすがりA", text: "楽しみ！", colored: false },
          {
            id: `${topic.id}-c2`,
            author: "ふぁん1号",
            text: "待ってました！",
            colored: true,
            reply: "見てくれてありがとう……！頑張るね！",
          },
        ],
      },
      {
        text: "うんうん、みんな聞いてくれてる？よし、じゃあ続けるね。",
        comments: [
          { id: `${topic.id}-c3`, author: "名無し", text: "聞いてるよ〜", colored: false },
          {
            id: `${topic.id}-c4`,
            author: "常連さん",
            text: "今日も面白い！",
            colored: true,
            reply: "えへへ、ありがとう……もっと頑張っちゃう！",
          },
        ],
      },
    ],
    closingText: "今日の配信はこの辺で。見てくれてありがとうございました！",
  };
}

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

  const CARD_HEIGHT = 56;
  const CARD_GAP = 8;
  const listViewportY = PADDING + selectTitle.height + nightHintText.height + 16;
  const listViewportHeight = height - listViewportY - PADDING;
  const listWidth = width - PADDING * 2;

  const listViewport = new Container();
  listViewport.x = PADDING;
  listViewport.y = listViewportY;
  listViewport.eventMode = "static";
  listViewport.hitArea = new Rectangle(0, 0, listWidth, listViewportHeight);
  themeSelectScreen.addChild(listViewport);

  const listMask = new Graphics().rect(0, 0, listWidth, listViewportHeight).fill(0xffffff);
  listViewport.addChild(listMask);

  const list = new Container();
  listViewport.addChild(list);
  listViewport.mask = listMask;

  const noTopicsText = new Text({
    text: "配信できるネタがありません。いろいろな行動をして新しいネタを解放しよう！",
    style: { fill: 0x8a8a9a, fontSize: 12, wordWrap: true, wordWrapWidth: listWidth },
  });
  noTopicsText.x = PADDING;
  noTopicsText.y = listViewportY;
  themeSelectScreen.addChild(noTopicsText);

  let themeCards: Container[] = [];
  let listScrollOffset = 0;
  let listMaxScroll = 0;

  function setListScroll(offset: number) {
    listScrollOffset = Math.max(0, Math.min(offset, listMaxScroll));
    list.y = -listScrollOffset;
  }

  function renderThemeList() {
    list.removeChildren();
    themeCards = [];

    const topics = state.getAvailableStreamTopics();
    noTopicsText.visible = topics.length === 0;

    topics.forEach((topic, index) => {
      const card = new Container();
      card.y = index * (CARD_HEIGHT + CARD_GAP);
      card.eventMode = "static";
      card.cursor = "pointer";

      const cardBg = new Graphics()
        .roundRect(0, 0, listWidth, CARD_HEIGHT, 8)
        .fill(0xfff0f5)
        .stroke({ width: 2, color: 0xffb6c8 });
      const cardGenre = new Text({
        text: STREAM_GENRE_LABEL[topic.genre],
        style: { fill: 0xd6336c, fontSize: 10, fontWeight: "bold" },
      });
      cardGenre.x = 14;
      cardGenre.y = 8;
      const cardTitle = new Text({
        text: topic.title,
        style: { fill: 0x6a3347, fontSize: 14, fontWeight: "bold" },
      });
      cardTitle.x = 14;
      cardTitle.y = 26;

      card.addChild(cardBg, cardGenre, cardTitle);
      card.on("pointertap", (event) => {
        event.stopPropagation();
        if (!isNight(state)) return;
        startTheme(topic);
      });
      list.addChild(card);
      themeCards.push(card);
    });

    listMaxScroll = Math.max(0, topics.length * (CARD_HEIGHT + CARD_GAP) - CARD_GAP - listViewportHeight);
    setListScroll(listScrollOffset);
    updateNightGate();
  }

  listViewport.on("wheel", (event: FederatedWheelEvent) => {
    event.stopPropagation();
    setListScroll(listScrollOffset + event.deltaY);
  });

  let listDragging = false;
  let listDragStartY = 0;
  let listDragStartScroll = 0;
  listViewport.on("pointerdown", (event: FederatedPointerEvent) => {
    listDragging = true;
    listDragStartY = event.global.y;
    listDragStartScroll = listScrollOffset;
  });
  listViewport.on("globalpointermove", (event: FederatedPointerEvent) => {
    if (!listDragging) return;
    setListScroll(listDragStartScroll - (event.global.y - listDragStartY));
  });
  const endListDrag = () => {
    listDragging = false;
  };
  listViewport.on("pointerup", endListDrag);
  listViewport.on("pointerupoutside", endListDrag);

  function updateNightGate() {
    const night = isNight(state);
    nightHintText.visible = !night;
    for (const card of themeCards) {
      card.alpha = night ? 1 : 0.5;
      card.cursor = night ? "pointer" : "default";
    }
  }
  renderThemeList();

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

    const result = currentTopic ? state.doBroadcast(currentTopic) : null;
    const closingText = currentTheme
      ? result
        ? `${currentTheme.closingText}（フォロワー+${result.fansGain}人）`
        : currentTheme.closingText
      : "";

    const replySteps: DialogueStep[] = [
      ...selectedComments.map((comment) => ({
        text: comment.reply ?? `${comment.author}さん、コメントありがとうございます！`,
        quote: { author: comment.author, text: comment.text },
      })),
      { text: closingText, quote: null },
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
    renderThemeList();
  });

  // ---- Dialogue queue state machine ----
  type Phase = "lines" | "await-reaction" | "reacting" | "done";
  let phase: Phase = "lines";
  let currentTheme: BroadcastTheme | null = null;
  let currentTopic: StreamTopic | null = null;
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

  function startTheme(topic: StreamTopic) {
    currentTopic = topic;
    const theme = buildTheme(topic);
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

  const onParamsChanged = () => {
    updateViewerText();
    if (!streamScreen.visible) renderThemeList();
  };
  const onTimeChanged = () => updateNightGate();
  const onStreamTopicUnlocked = () => {
    if (!streamScreen.visible) renderThemeList();
  };
  state.onParamsChanged.on(onParamsChanged);
  state.onTimeChanged.on(onTimeChanged);
  state.onStreamTopicUnlocked.on(onStreamTopicUnlocked);

  return {
    view: root,
    dispose: () => {
      state.onParamsChanged.off(onParamsChanged);
      state.onTimeChanged.off(onTimeChanged);
      state.onStreamTopicUnlocked.off(onStreamTopicUnlocked);
      typewriter?.stop();
      Ticker.shared.remove(pulseTicker);
    },
  };
}
