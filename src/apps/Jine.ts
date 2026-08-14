import { Container, Graphics, Text, type FederatedPointerEvent, type FederatedWheelEvent } from "pixi.js";
import { FRIEND_NAME, JINE_STAMPS, type GameState, type JineMessage } from "../game/GameState";
import type { AppContent } from "./types";

const PADDING = 10;
const BOTTOM_PANEL_HEIGHT = 130;

export function createJineContent(state: GameState, width: number, height: number): AppContent {
  const root = new Container();

  const bg = new Graphics().rect(0, 0, width, height).fill(0xeafbf0);
  root.addChild(bg);

  const messagesHeight = height - BOTTOM_PANEL_HEIGHT;
  const bubbleMaxWidth = width - PADDING * 2 - 40;

  // ------------------------------------------------------------------
  // メッセージ一覧（スクロール可能・クリックで会話送り）
  // ------------------------------------------------------------------
  const viewport = new Container();
  viewport.eventMode = "static";
  viewport.cursor = "pointer";
  root.addChild(viewport);

  const viewportHit = new Graphics().rect(0, 0, width, messagesHeight).fill({ color: 0x000000, alpha: 0 });
  viewport.addChild(viewportHit);

  const viewportMask = new Graphics().rect(0, 0, width, messagesHeight).fill(0xffffff);
  viewport.addChild(viewportMask);

  const listContainer = new Container();
  listContainer.mask = viewportMask;
  viewport.addChild(listContainer);

  let contentHeight = 0;
  let scrollOffset = 0;
  let dragging = false;
  let dragStartY = 0;
  let dragStartScroll = 0;
  let dragMoved = false;

  function maxScrollOffset(): number {
    return Math.max(0, contentHeight - messagesHeight + PADDING * 2);
  }

  function setScroll(offset: number) {
    const max = maxScrollOffset();
    scrollOffset = Math.max(-max, Math.min(0, offset));
    listContainer.y = PADDING + scrollOffset;
  }

  function scrollToBottom() {
    setScroll(-maxScrollOffset());
  }

  function renderMessage(message: JineMessage): Container {
    const item = new Container();
    const isFriend = message.sender === "friend";

    const nameText = new Text({
      text: isFriend ? FRIEND_NAME : "あなた",
      style: { fill: 0x888888, fontSize: 10 },
    });

    let bubbleContainer: Container;
    let bubbleWidth: number;
    let bubbleHeight: number;

    if (message.isStamp) {
      const stampText = new Text({ text: message.text, style: { fontSize: 40 } });
      bubbleContainer = new Container();
      bubbleContainer.addChild(stampText);
      bubbleWidth = stampText.width;
      bubbleHeight = stampText.height;
    } else {
      const bodyText = new Text({
        text: message.text,
        style: { fill: 0x000000, fontSize: 13, wordWrap: true, wordWrapWidth: bubbleMaxWidth - 16 },
      });
      const bubble = new Graphics()
        .roundRect(0, 0, bodyText.width + 16, bodyText.height + 12, 10)
        .fill(isFriend ? 0xffffff : 0xbff0ce);
      bodyText.x = 8;
      bodyText.y = 6;

      bubbleContainer = new Container();
      bubbleContainer.addChild(bubble, bodyText);
      bubbleWidth = bubble.width;
      bubbleHeight = bubble.height;
    }
    bubbleContainer.y = 14;

    if (isFriend) {
      nameText.x = 0;
      bubbleContainer.x = 0;
    } else {
      nameText.x = width - PADDING * 2 - nameText.width;
      bubbleContainer.x = width - PADDING * 2 - bubbleWidth;
    }

    item.addChild(nameText, bubbleContainer);

    if (!isFriend && message.readAt != null) {
      const readText = new Text({ text: "既読", style: { fill: 0xaaaaaa, fontSize: 9 } });
      readText.x = width - PADDING * 2 - readText.width;
      readText.y = bubbleContainer.y + bubbleHeight + 2;
      item.addChild(readText);
    }

    return item;
  }

  function renderMessages() {
    listContainer.removeChildren();
    let y = 0;
    for (const message of state.messages.slice(-50)) {
      const item = renderMessage(message);
      item.x = PADDING;
      item.y = y;
      listContainer.addChild(item);
      y += item.height + 10;
    }
    contentHeight = y;
    if (state.messages.length === 0) {
      const empty = new Text({
        text: "まだメッセージがありません。行動するとメッセージが届きます。",
        style: { fill: 0x888888, fontSize: 12, wordWrap: true, wordWrapWidth: width - PADDING * 2 },
      });
      empty.x = PADDING;
      listContainer.addChild(empty);
    }
    scrollToBottom();
  }

  viewport.on("pointerdown", (event: FederatedPointerEvent) => {
    dragging = true;
    dragMoved = false;
    dragStartY = event.global.y;
    dragStartScroll = scrollOffset;
  });
  viewport.on("globalpointermove", (event: FederatedPointerEvent) => {
    if (!dragging) return;
    const dy = event.global.y - dragStartY;
    if (Math.abs(dy) > 4) dragMoved = true;
    setScroll(dragStartScroll + dy);
  });
  const endDrag = () => {
    dragging = false;
  };
  viewport.on("pointerup", endDrag);
  viewport.on("pointerupoutside", endDrag);
  viewport.on("wheel", (event: FederatedWheelEvent) => {
    setScroll(scrollOffset - event.deltaY);
  });
  viewport.on("pointertap", () => {
    if (dragMoved) return;
    state.requestAdvance();
  });

  // ------------------------------------------------------------------
  // 下部パネル（スタンプ欄 / メッセージ選択画面）
  // ------------------------------------------------------------------
  const bottomPanel = new Container();
  bottomPanel.y = messagesHeight;
  root.addChild(bottomPanel);

  const bottomBg = new Graphics()
    .rect(0, 0, width, BOTTOM_PANEL_HEIGHT)
    .fill(0xffffff)
    .stroke({ width: 1, color: 0xdde7e0 });

  function renderStampPanel() {
    bottomPanel.removeChildren();
    bottomPanel.addChild(bottomBg);

    if (state.pendingChoices) {
      renderChoicePanel(state.pendingChoices);
      return;
    }

    const cols = 4;
    const rows = 2;
    const cellWidth = width / cols;
    const cellHeight = BOTTOM_PANEL_HEIGHT / rows;

    JINE_STAMPS.forEach((emoji, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);

      const cell = new Container();
      cell.eventMode = "static";
      cell.cursor = "pointer";
      cell.alpha = 0.55;
      cell.x = col * cellWidth;
      cell.y = row * cellHeight;

      const label = new Text({ text: emoji, style: { fontSize: 26 } });
      label.anchor.set(0.5);
      label.x = cellWidth / 2;
      label.y = cellHeight / 2;
      cell.addChild(label);

      cell.on("pointerover", () => {
        cell.alpha = 1;
      });
      cell.on("pointerout", () => {
        cell.alpha = 0.55;
      });
      cell.on("pointertap", (event: FederatedPointerEvent) => {
        event.stopPropagation();
        state.sendStamp(emoji);
      });

      bottomPanel.addChild(cell);
    });
  }

  function renderChoicePanel(options: string[]) {
    const innerWidth = width - PADDING * 2;
    let y = 8;
    for (const optionText of options) {
      const optionContainer = new Container();
      optionContainer.eventMode = "static";
      optionContainer.cursor = "pointer";
      optionContainer.alpha = 0.6;
      optionContainer.x = PADDING;
      optionContainer.y = y;

      const bodyText = new Text({
        text: optionText,
        style: { fill: 0x000000, fontSize: 12, wordWrap: true, wordWrapWidth: innerWidth - 16 },
      });
      bodyText.x = 8;
      bodyText.y = 7;

      const bubble = new Graphics().roundRect(0, 0, innerWidth, bodyText.height + 14, 10).fill(0xbff0ce);
      optionContainer.addChild(bubble, bodyText);

      optionContainer.on("pointerover", () => {
        optionContainer.alpha = 1;
      });
      optionContainer.on("pointerout", () => {
        optionContainer.alpha = 0.6;
      });
      optionContainer.on("pointertap", (event: FederatedPointerEvent) => {
        event.stopPropagation();
        state.selectChoice(optionText);
      });

      bottomPanel.addChild(optionContainer);
      y += bubble.height + 6;
    }
  }

  renderMessages();
  renderStampPanel();

  const onMessageAdded = () => renderMessages();
  const onMessageRead = () => renderMessages();
  const onConversationChanged = () => renderStampPanel();
  state.onMessageAdded.on(onMessageAdded);
  state.onMessageRead.on(onMessageRead);
  state.onConversationChanged.on(onConversationChanged);

  return {
    view: root,
    dispose: () => {
      state.onMessageAdded.off(onMessageAdded);
      state.onMessageRead.off(onMessageRead);
      state.onConversationChanged.off(onConversationChanged);
    },
  };
}
