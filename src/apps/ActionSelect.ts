import { Container, Graphics, Text } from "pixi.js";
import { ACTIONS, TIME_OF_DAY_EMOJI, type GameState } from "../game/GameState";
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
  const buttonDefs: { button: Container; action: (typeof ACTIONS)[number] }[] = [];

  ACTIONS.forEach((action, index) => {
    const button = new Container();
    button.x = PADDING;
    button.y = 48 + index * (BUTTON_HEIGHT + BUTTON_GAP);
    button.eventMode = "static";
    button.cursor = "pointer";

    const buttonBg = new Graphics().roundRect(0, 0, buttonWidth, BUTTON_HEIGHT, 8).fill(0xffd9a6);
    const labelText = action.nightOnly
      ? `${action.label}（${action.turns}ターン・夜のみ）`
      : `${action.label}（${action.turns}ターン）`;
    const label = new Text({
      text: labelText,
      style: { fill: 0x7a4a1f, fontSize: 13, fontWeight: "bold" },
    });
    label.anchor.set(0.5);
    label.x = buttonWidth / 2;
    label.y = BUTTON_HEIGHT / 2;

    button.addChild(buttonBg, label);
    button.on("pointertap", () => {
      void state.doAction(action);
    });

    root.addChild(button);
    buttonDefs.push({ button, action });
  });

  const statusText = new Text({
    text: "",
    style: { fill: 0x888888, fontSize: 12 },
  });
  statusText.x = PADDING;
  statusText.y = 48 + ACTIONS.length * (BUTTON_HEIGHT + BUTTON_GAP) + 4;
  root.addChild(statusText);

  function render() {
    const emoji = TIME_OF_DAY_EMOJI[state.timeOfDay];
    statusText.text = state.performing
      ? "行動中…"
      : `day${state.day} ${emoji}${state.timeOfDay}`;
    for (const { button, action } of buttonDefs) {
      const available = !state.performing && (!action.nightOnly || state.timeOfDay === "夜");
      button.alpha = available ? 1 : 0.5;
      button.eventMode = available ? "static" : "none";
    }
  }

  render();
  const onBusyChanged = () => render();
  const onTimeChanged = () => render();
  state.onBusyChanged.on(onBusyChanged);
  state.onTimeChanged.on(onTimeChanged);

  return {
    view: root,
    dispose: () => {
      state.onBusyChanged.off(onBusyChanged);
      state.onTimeChanged.off(onTimeChanged);
    },
  };
}
