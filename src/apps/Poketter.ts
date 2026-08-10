import { Container, Graphics, Text } from "pixi.js";
import type { GameState, PoketterPost } from "../game/GameState";
import type { AppContent } from "./types";

const PADDING = 12;
const AVATAR_SIZE = 36;
const CONTENT_X = AVATAR_SIZE + 10;

const COLOR_BG = 0xffffff;
const COLOR_DIVIDER = 0xeff3f4;
const COLOR_TEXT_PRIMARY = 0x0f1419;
const COLOR_TEXT_SECONDARY = 0x536471;
const COLOR_AVATAR_BG = 0x1d9bf0;
const COLOR_IMAGE_BG = 0xe1e8ed;
const COLOR_LIKE = 0xf91880;

function formatPostTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const hh = Math.floor(total / 3600) % 24;
  const mm = Math.floor(total / 60) % 60;
  return `${hh.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}`;
}

function formatCount(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return `${count}`;
}

export function createPoketterContent(state: GameState, width: number, height: number): AppContent {
  const root = new Container();

  const bg = new Graphics().rect(0, 0, width, height).fill(COLOR_BG);
  root.addChild(bg);

  const listContainer = new Container();
  listContainer.x = 0;
  listContainer.y = PADDING;
  root.addChild(listContainer);

  const listWidth = width - PADDING * 2;
  const contentWidth = listWidth - CONTENT_X;

  function renderPost(post: PoketterPost): Container {
    const item = new Container();

    const avatar = new Graphics().circle(AVATAR_SIZE / 2, AVATAR_SIZE / 2, AVATAR_SIZE / 2).fill(COLOR_AVATAR_BG);
    item.addChild(avatar);

    const avatarLabel = new Text({
      text: post.author.slice(0, 1),
      style: { fill: 0xffffff, fontSize: 15, fontWeight: "bold" },
    });
    avatarLabel.anchor.set(0.5);
    avatarLabel.x = AVATAR_SIZE / 2;
    avatarLabel.y = AVATAR_SIZE / 2;
    item.addChild(avatarLabel);

    const nameText = new Text({
      text: post.author,
      style: { fill: COLOR_TEXT_PRIMARY, fontSize: 13, fontWeight: "bold" },
    });
    nameText.x = CONTENT_X;
    item.addChild(nameText);

    const metaText = new Text({
      text: `${post.authorId} · ${formatPostTime(post.time)}`,
      style: { fill: COLOR_TEXT_SECONDARY, fontSize: 12 },
    });
    metaText.x = CONTENT_X + nameText.width + 6;
    metaText.y = 2;
    item.addChild(metaText);

    const body = new Text({
      text: post.text,
      style: { fill: COLOR_TEXT_PRIMARY, fontSize: 13, wordWrap: true, wordWrapWidth: contentWidth },
    });
    body.x = CONTENT_X;
    body.y = 20;
    item.addChild(body);

    let cursorY = body.y + body.height + 8;

    if (post.hasImage) {
      const imageHeight = 140;
      const image = new Graphics().roundRect(0, 0, contentWidth, imageHeight, 12).fill(COLOR_IMAGE_BG);
      image.x = CONTENT_X;
      image.y = cursorY;
      item.addChild(image);

      const imageIcon = new Text({ text: "🖼", style: { fontSize: 32 } });
      imageIcon.anchor.set(0.5);
      imageIcon.x = CONTENT_X + contentWidth / 2;
      imageIcon.y = cursorY + imageHeight / 2;
      item.addChild(imageIcon);

      cursorY += imageHeight + 8;
    }

    const retweetIcon = new Text({
      text: "🔁",
      style: { fill: COLOR_TEXT_SECONDARY, fontSize: 12 },
    });
    retweetIcon.x = CONTENT_X;
    retweetIcon.y = cursorY;
    item.addChild(retweetIcon);

    const retweetCount = new Text({
      text: formatCount(post.retweets),
      style: { fill: COLOR_TEXT_SECONDARY, fontSize: 12 },
    });
    retweetCount.x = retweetIcon.x + retweetIcon.width + 4;
    retweetCount.y = cursorY;
    item.addChild(retweetCount);

    const likeIcon = new Text({
      text: "❤",
      style: { fill: COLOR_LIKE, fontSize: 12 },
    });
    likeIcon.x = CONTENT_X + 90;
    likeIcon.y = cursorY;
    item.addChild(likeIcon);

    const likeCount = new Text({
      text: formatCount(post.likes),
      style: { fill: COLOR_TEXT_SECONDARY, fontSize: 12 },
    });
    likeCount.x = likeIcon.x + likeIcon.width + 4;
    likeCount.y = cursorY;
    item.addChild(likeCount);

    const footerBottom = cursorY + Math.max(retweetIcon.height, likeIcon.height);

    const divider = new Graphics().rect(0, footerBottom + 10, listWidth, 1).fill(COLOR_DIVIDER);
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
      y += item.height + 4;
    }
    if (state.posts.length === 0) {
      const empty = new Text({
        text: "まだ投稿がありません。「行動選択」から行動すると投稿されます。",
        style: { fill: COLOR_TEXT_SECONDARY, fontSize: 12, wordWrap: true, wordWrapWidth: listWidth },
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
