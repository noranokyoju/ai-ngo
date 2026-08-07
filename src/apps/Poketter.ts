import { Container, Graphics, Text } from "pixi.js";
import type { GameState, PoketterPost } from "../game/GameState";
import type { AppContent } from "./types";

const PADDING = 10;

export function createPoketterContent(state: GameState, width: number, height: number): AppContent {
  const root = new Container();

  const bg = new Graphics().rect(0, 0, width, height).fill(0xffffff);
  root.addChild(bg);

  const header = new Graphics().rect(0, 0, width, 36).fill(0x1da1f2);
  root.addChild(header);
  const headerText = new Text({
    text: "Poketter",
    style: { fill: 0xffffff, fontSize: 16, fontWeight: "bold" },
  });
  headerText.x = PADDING;
  headerText.y = 8;
  root.addChild(headerText);

  const listContainer = new Container();
  listContainer.x = 0;
  listContainer.y = 44;
  root.addChild(listContainer);

  const listWidth = width - PADDING * 2;

  function renderPost(post: PoketterPost): Container {
    const item = new Container();
    const author = new Text({
      text: post.author,
      style: { fill: 0x14171a, fontSize: 13, fontWeight: "bold" },
    });
    item.addChild(author);

    const body = new Text({
      text: post.text,
      style: { fill: 0x333333, fontSize: 13, wordWrap: true, wordWrapWidth: listWidth },
    });
    body.y = 18;
    item.addChild(body);

    const divider = new Graphics()
      .rect(0, body.y + body.height + 8, listWidth, 1)
      .fill(0xe1e8ed);
    item.addChild(divider);

    return item;
  }

  function renderPosts() {
    listContainer.removeChildren();
    let y = 0;
    for (const post of state.posts.slice(0, 30)) {
      const item = renderPost(post);
      item.x = PADDING;
      item.y = y;
      listContainer.addChild(item);
      y += item.height + 10;
    }
    if (state.posts.length === 0) {
      const empty = new Text({
        text: "まだ投稿がありません。「行動選択」から行動すると投稿されます。",
        style: { fill: 0x888888, fontSize: 12, wordWrap: true, wordWrapWidth: listWidth },
      });
      empty.x = PADDING;
      listContainer.addChild(empty);
    }
  }

  renderPosts();
  const onPostAdded = () => renderPosts();
  state.onPostAdded.on(onPostAdded);

  return {
    view: root,
    dispose: () => state.onPostAdded.off(onPostAdded),
  };
}
