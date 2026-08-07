import { Container, Graphics, Text } from "pixi.js";
import { ACTIONS, type GameState } from "../game/GameState";
import type { AppContent } from "./types";

const PADDING = 12;
const BUTTON_HEIGHT = 48;
const BUTTON_GAP = 10;

export function createActionSelectContent(state: GameState, width: number, height: number): AppContent {
  const root = new Container();

  const bg = new Graphics().rect(0, 0, width, height).fill(0xfff8ec);
  root.addChild(bg);

  const header = new Text({
    text: "今日の行動を選んでね",
    style: { fill: 0x333333, fontSize: 15, fontWeight: "bold" },
  });
  header.x = PADDING;
  header.y = 12;
  root.addChild(header);

  const buttonWidth = width - PADDING * 2;
  const buttons: Container[] = [];

  ACTIONS.forEach((action, index) => {
    const button = new Container();
    button.x = PADDING;
    button.y = 48 + index * (BUTTON_HEIGHT + BUTTON_GAP);
    button.eventMode = "static";
    button.cursor = "pointer";

    const buttonBg = new Graphics().roundRect(0, 0, buttonWidth, BUTTON_HEIGHT, 8).fill(0xffa500);
    const label = new Text({
      text: action.label,
      style: { fill: 0xffffff, fontSize: 14, fontWeight: "bold" },
    });
    label.anchor.set(0.5);
    label.x = buttonWidth / 2;
    label.y = BUTTON_HEIGHT / 2;

    button.addChild(buttonBg, label);
    button.on("pointertap", () => {
      void state.doAction(action);
    });

    root.addChild(button);
    buttons.push(button);
  });

  const statusText = new Text({
    text: "",
    style: { fill: 0x888888, fontSize: 12 },
  });
  statusText.x = PADDING;
  statusText.y = 48 + ACTIONS.length * (BUTTON_HEIGHT + BUTTON_GAP) + 4;
  root.addChild(statusText);

  function render() {
    statusText.text = state.performing ? "行動中…" : "";
    for (const button of buttons) {
      button.alpha = state.performing ? 0.5 : 1;
      button.eventMode = state.performing ? "none" : "static";
    }
  }

  render();
  const onBusyChanged = () => render();
  state.onBusyChanged.on(onBusyChanged);

  return {
    view: root,
    dispose: () => state.onBusyChanged.off(onBusyChanged),
  };
}
