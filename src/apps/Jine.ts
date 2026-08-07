import { Container, Graphics, Text } from "pixi.js";
import { FRIEND_NAME, type GameState, type JineMessage } from "../game/GameState";
import type { AppContent } from "./types";

const PADDING = 10;

export function createJineContent(state: GameState, width: number, height: number): AppContent {
  const root = new Container();

  const bg = new Graphics().rect(0, 0, width, height).fill(0xe8f5e9);
  root.addChild(bg);

  const header = new Graphics().rect(0, 0, width, 36).fill(0x06c755);
  root.addChild(header);
  const headerText = new Text({
    text: `JINE - ${FRIEND_NAME}`,
    style: { fill: 0xffffff, fontSize: 16, fontWeight: "bold" },
  });
  headerText.x = PADDING;
  headerText.y = 8;
  root.addChild(headerText);

  const listContainer = new Container();
  listContainer.x = 0;
  listContainer.y = 44;
  root.addChild(listContainer);

  const bubbleMaxWidth = width - PADDING * 2 - 40;

  function renderMessage(message: JineMessage): Container {
    const item = new Container();
    const isFriend = message.sender === "friend";

    const nameText = new Text({
      text: isFriend ? FRIEND_NAME : "あなた",
      style: { fill: 0x888888, fontSize: 10 },
    });

    const bodyText = new Text({
      text: message.text,
      style: { fill: 0x000000, fontSize: 13, wordWrap: true, wordWrapWidth: bubbleMaxWidth - 16 },
    });

    const bubble = new Graphics()
      .roundRect(0, 0, bodyText.width + 16, bodyText.height + 12, 10)
      .fill(isFriend ? 0xffffff : 0x9be89b);
    bodyText.x = 8;
    bodyText.y = 6;

    const bubbleContainer = new Container();
    bubbleContainer.addChild(bubble, bodyText);
    bubbleContainer.y = 14;

    if (isFriend) {
      nameText.x = 0;
      bubbleContainer.x = 0;
    } else {
      nameText.x = width - PADDING * 2 - nameText.width;
      bubbleContainer.x = width - PADDING * 2 - bubble.width;
    }

    item.addChild(nameText, bubbleContainer);
    return item;
  }

  function renderMessages() {
    listContainer.removeChildren();
    let y = 0;
    for (const message of state.messages.slice(-30)) {
      const item = renderMessage(message);
      item.x = PADDING;
      item.y = y;
      listContainer.addChild(item);
      y += item.height + 10;
    }
    if (state.messages.length === 0) {
      const empty = new Text({
        text: "まだメッセージがありません。行動するとメッセージが届きます。",
        style: { fill: 0x888888, fontSize: 12, wordWrap: true, wordWrapWidth: width - PADDING * 2 },
      });
      empty.x = PADDING;
      listContainer.addChild(empty);
    }
  }

  renderMessages();
  const onMessageAdded = () => renderMessages();
  state.onMessageAdded.on(onMessageAdded);

  return {
    view: root,
    dispose: () => state.onMessageAdded.off(onMessageAdded),
  };
}
