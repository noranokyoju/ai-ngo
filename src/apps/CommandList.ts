import { Container, Graphics, Text, type FederatedPointerEvent, type FederatedWheelEvent } from "pixi.js";
import {
  COMMANDS,
  GENRE_LABELS,
  TIME_OF_DAY_EMOJI,
  type CommandDef,
  type CommandGenre,
  type GameState,
} from "../game/GameState";
import type { AppContent, AppContentFactory } from "./types";

const PADDING = 12;
const BUTTON_HEIGHT = 48;
const BUTTON_GAP = 10;
const HEADER_HEIGHT = 40;
const STATUS_HEIGHT = 24;

/** ジャンルを指定してコマンド選択アプリのコンテンツファクトリーを作る。 */
export function createCommandListContent(genre: CommandGenre): AppContentFactory {
  const commands = COMMANDS.filter((command) => command.genre === genre);

  return (state: GameState, width: number, height: number): AppContent => {
    const root = new Container();

    const bg = new Graphics().rect(0, 0, width, height).fill(0xfff8ec);
    root.addChild(bg);

    const header = new Text({
      text: `${GENRE_LABELS[genre]}：行動を選んでね`,
      style: { fill: 0x333333, fontSize: 14, fontWeight: "bold" },
    });
    header.x = PADDING;
    header.y = 12;
    root.addChild(header);

    const listTop = HEADER_HEIGHT;
    const listHeight = Math.max(0, height - HEADER_HEIGHT - STATUS_HEIGHT);
    const buttonWidth = width - PADDING * 2;

    const viewport = new Container();
    viewport.x = 0;
    viewport.y = listTop;
    viewport.eventMode = "static";
    root.addChild(viewport);

    const viewportHit = new Graphics().rect(0, 0, width, listHeight).fill({ color: 0x000000, alpha: 0 });
    viewport.addChild(viewportHit);

    const viewportMask = new Graphics().rect(0, 0, width, listHeight).fill(0xffffff);
    viewport.addChild(viewportMask);

    const listContainer = new Container();
    listContainer.mask = viewportMask;
    viewport.addChild(listContainer);

    const buttonDefs: { button: Container; command: CommandDef }[] = [];
    let contentHeight = 0;
    let scrollOffset = 0;
    let dragging = false;
    let dragStartY = 0;
    let dragStartScroll = 0;

    function maxScrollOffset(): number {
      return Math.max(0, contentHeight - listHeight);
    }

    function setScroll(offset: number) {
      const max = maxScrollOffset();
      scrollOffset = Math.max(-max, Math.min(0, offset));
      listContainer.y = scrollOffset;
    }

    commands.forEach((command, index) => {
      const button = new Container();
      button.y = index * (BUTTON_HEIGHT + BUTTON_GAP);
      button.eventMode = "static";
      button.cursor = "pointer";

      const buttonBg = new Graphics().roundRect(0, 0, buttonWidth, BUTTON_HEIGHT, 8).fill(0xffd9a6);
      const label = new Text({
        text: command.label,
        style: { fill: 0x7a4a1f, fontSize: 13, fontWeight: "bold" },
      });
      label.anchor.set(0.5);
      label.x = buttonWidth / 2;
      label.y = BUTTON_HEIGHT / 2;

      button.addChild(buttonBg, label);
      button.on("pointertap", () => {
        void state.doCommand(command);
      });

      listContainer.addChild(button);
      buttonDefs.push({ button, command });
    });
    contentHeight = commands.length * (BUTTON_HEIGHT + BUTTON_GAP) - BUTTON_GAP;
    listContainer.x = PADDING;

    viewport.on("pointerdown", (event: FederatedPointerEvent) => {
      dragging = true;
      dragStartY = event.global.y;
      dragStartScroll = scrollOffset;
    });
    viewport.on("globalpointermove", (event: FederatedPointerEvent) => {
      if (!dragging) return;
      setScroll(dragStartScroll + (event.global.y - dragStartY));
    });
    const endDrag = () => {
      dragging = false;
    };
    viewport.on("pointerup", endDrag);
    viewport.on("pointerupoutside", endDrag);
    viewport.on("wheel", (event: FederatedWheelEvent) => {
      setScroll(scrollOffset - event.deltaY);
    });

    const statusText = new Text({
      text: "",
      style: { fill: 0x888888, fontSize: 12 },
    });
    statusText.x = PADDING;
    statusText.y = height - STATUS_HEIGHT + 4;
    root.addChild(statusText);

    function render() {
      const emoji = TIME_OF_DAY_EMOJI[state.timeOfDay];
      statusText.text = state.performing ? "行動中…" : `day${state.day} ${emoji}${state.timeOfDay}`;
      for (const { button, command } of buttonDefs) {
        const available = !state.performing && (!command.availableWhen || command.availableWhen(state));
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
  };
}
