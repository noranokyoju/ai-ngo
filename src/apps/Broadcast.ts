import { Container, Graphics, Text } from "pixi.js";
import type { GameState } from "../game/GameState";
import type { AppContent } from "./types";

export function createBroadcastContent(state: GameState, width: number, height: number): AppContent {
  const root = new Container();

  const bg = new Graphics().rect(0, 0, width, height).fill(0x0d0d12);
  root.addChild(bg);

  let streaming = false;

  const liveBadge = new Container();
  const liveBadgeBg = new Graphics().roundRect(0, 0, 56, 24, 4).fill(0xff2d55);
  const liveBadgeText = new Text({
    text: "LIVE",
    style: { fill: 0xffffff, fontSize: 13, fontWeight: "bold" },
  });
  liveBadgeText.x = 10;
  liveBadgeText.y = 4;
  liveBadge.addChild(liveBadgeBg, liveBadgeText);
  liveBadge.x = 14;
  liveBadge.y = 14;
  root.addChild(liveBadge);

  const viewerText = new Text({
    text: "",
    style: { fill: 0xffffff, fontSize: 14 },
  });
  viewerText.x = width - 14;
  viewerText.y = 18;
  root.addChild(viewerText);

  const avatar = new Graphics().circle(width / 2, height / 2 - 20, 48).fill(0xffdfba);
  root.addChild(avatar);

  const statusText = new Text({
    text: "",
    style: { fill: 0xffffff, fontSize: 16, fontWeight: "bold", align: "center" },
  });
  statusText.anchor.set(0.5, 0);
  statusText.x = width / 2;
  statusText.y = height / 2 + 40;
  root.addChild(statusText);

  const toggleButton = new Container();
  const toggleBg = new Graphics().roundRect(0, 0, 140, 36, 8).fill(0x3a6ea5);
  const toggleText = new Text({
    text: "",
    style: { fill: 0xffffff, fontSize: 14, fontWeight: "bold" },
  });
  toggleText.anchor.set(0.5);
  toggleText.x = 70;
  toggleText.y = 18;
  toggleButton.addChild(toggleBg, toggleText);
  toggleButton.x = (width - 140) / 2;
  toggleButton.y = height - 56;
  toggleButton.eventMode = "static";
  toggleButton.cursor = "pointer";
  root.addChild(toggleButton);

  function render() {
    liveBadge.visible = streaming;
    viewerText.text = streaming ? `👁 ${Math.round(state.params.fans)}` : "";
    viewerText.x = width - 14 - viewerText.width;
    statusText.text = streaming ? "配信中…" : "配信は停止しています";
    toggleText.text = streaming ? "配信を終了する" : "配信を開始する";
  }

  toggleButton.on("pointertap", () => {
    streaming = !streaming;
    render();
  });

  render();
  const onParamsChanged = () => render();
  state.onParamsChanged.on(onParamsChanged);

  return {
    view: root,
    dispose: () => state.onParamsChanged.off(onParamsChanged),
  };
}
