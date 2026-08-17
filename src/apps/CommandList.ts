import { Container, Graphics, Rectangle, Text, type FederatedPointerEvent, type FederatedWheelEvent } from "pixi.js";
import { getCommandsByGenre, TIME_OF_DAY_EMOJI, type CommandDef, type CommandGenre, type GameState } from "../game/GameState";
import type { AppContent, AppContentFactory } from "./types";

const PADDING = 12;
const BUTTON_HEIGHT = 48;
const BUTTON_GAP = 10;
const HEADER_HEIGHT = 40;

/** ジャンルごとのコマンド選択アプリを作る。 */
export function createCommandListContent(genre: CommandGenre): AppContentFactory {
  return (state: GameState, width: number, height: number): AppContent => {
    const root = new Container();

    const bg = new Graphics().rect(0, 0, width, height).fill(0xfff8ec);
    root.addChild(bg);

    const header = new Text({
      text: `${genre}：やることを選んでね`,
      style: { fill: 0x333333, fontSize: 14, fontWeight: "bold" },
    });
    header.x = PADDING;
    header.y = 10;
    root.addChild(header);

    const statusText = new Text({
      text: "",
      style: { fill: 0x888888, fontSize: 11 },
    });
    statusText.x = PADDING;
    statusText.y = HEADER_HEIGHT - 12;
    root.addChild(statusText);

    const viewportY = HEADER_HEIGHT + 10;
    const viewportHeight = height - viewportY - PADDING;
    const buttonWidth = width - PADDING * 2;

    const viewport = new Container();
    viewport.x = PADDING;
    viewport.y = viewportY;
    viewport.eventMode = "static";
    viewport.hitArea = new Rectangle(0, 0, buttonWidth, viewportHeight);
    root.addChild(viewport);

    const viewportMask = new Graphics().rect(0, 0, buttonWidth, viewportHeight).fill(0xffffff);
    viewport.addChild(viewportMask);

    const list = new Container();
    viewport.addChild(list);
    viewport.mask = viewportMask;

    let scrollOffset = 0;
    let maxScroll = 0;
    let dragging = false;
    let dragStartY = 0;
    let dragStartScroll = 0;

    function setScroll(offset: number) {
      scrollOffset = Math.max(0, Math.min(offset, maxScroll));
      list.y = -scrollOffset;
    }

    const commands = getCommandsByGenre(genre);
    const buttonDefs: { button: Container; command: CommandDef }[] = [];

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
      button.on("pointertap", (event: FederatedPointerEvent) => {
        event.stopPropagation();
        void state.doCommand(command);
      });

      list.addChild(button);
      buttonDefs.push({ button, command });
    });

    maxScroll = Math.max(0, commands.length * (BUTTON_HEIGHT + BUTTON_GAP) - BUTTON_GAP - viewportHeight);

    viewport.on("pointerdown", (event: FederatedPointerEvent) => {
      dragging = true;
      dragStartY = event.global.y;
      dragStartScroll = scrollOffset;
    });
    viewport.on("globalpointermove", (event: FederatedPointerEvent) => {
      if (!dragging) return;
      setScroll(dragStartScroll - (event.global.y - dragStartY));
    });
    const endDrag = () => {
      dragging = false;
    };
    viewport.on("pointerup", endDrag);
    viewport.on("pointerupoutside", endDrag);
    viewport.on("wheel", (event: FederatedWheelEvent) => {
      event.stopPropagation();
      setScroll(scrollOffset + event.deltaY);
    });

    function render() {
      const emoji = TIME_OF_DAY_EMOJI[state.timeOfDay];
      statusText.text = state.performing ? "行動中…" : `day${state.day} ${emoji}${state.timeOfDay}`;
      for (const { button, command } of buttonDefs) {
        const available = !state.performing && command.isAvailable(state);
        button.alpha = available ? 1 : 0.5;
        button.eventMode = available ? "static" : "none";
      }
    }

    render();
    const onBusyChanged = () => render();
    const onTimeChanged = () => render();
    const onParamsChanged = () => render();
    state.onBusyChanged.on(onBusyChanged);
    state.onTimeChanged.on(onTimeChanged);
    state.onParamsChanged.on(onParamsChanged);

    return {
      view: root,
      dispose: () => {
        state.onBusyChanged.off(onBusyChanged);
        state.onTimeChanged.off(onTimeChanged);
        state.onParamsChanged.off(onParamsChanged);
      },
    };
  };
}
