import { Container, Graphics, Text } from "pixi.js";
import type { GameParams, GameState } from "../game/GameState";
import type { AppContent } from "./types";

const PADDING = 14;
const BAR_WIDTH_RATIO = 1;

interface ParamRow {
  label: string;
  color: number;
  get: (params: GameParams) => number;
  max: number;
  format: (value: number) => string;
}

const ROWS: ParamRow[] = [
  {
    label: "メンタル",
    color: 0xff6b81,
    get: (p) => p.mental,
    max: 100,
    format: (v) => `${Math.round(v)} / 100`,
  },
  {
    label: "フォロワー数",
    color: 0x1da1f2,
    get: (p) => p.fans,
    max: 1000,
    format: (v) => `${Math.round(v)} 人`,
  },
  {
    label: "所持金",
    color: 0xffc107,
    get: (p) => p.money,
    max: 2000,
    format: (v) => `¥${Math.round(v)}`,
  },
];

export function createTaskManagerContent(state: GameState, width: number, height: number): AppContent {
  const root = new Container();

  const bg = new Graphics().rect(0, 0, width, height).fill(0x2b2b2b);
  root.addChild(bg);

  const header = new Text({
    text: "タスクマネージャー",
    style: { fill: 0xffffff, fontSize: 16, fontWeight: "bold" },
  });
  header.x = PADDING;
  header.y = 12;
  root.addChild(header);

  const barWidth = (width - PADDING * 2) * BAR_WIDTH_RATIO;
  const rowContainers: { track: Graphics; fill: Graphics; valueText: Text; row: ParamRow }[] = [];

  ROWS.forEach((row, index) => {
    const y = 56 + index * 64;

    const label = new Text({
      text: row.label,
      style: { fill: 0xdddddd, fontSize: 13 },
    });
    label.x = PADDING;
    label.y = y;
    root.addChild(label);

    const track = new Graphics().roundRect(0, 0, barWidth, 16, 8).fill(0x444444);
    track.x = PADDING;
    track.y = y + 20;
    root.addChild(track);

    const fill = new Graphics();
    fill.x = PADDING;
    fill.y = y + 20;
    root.addChild(fill);

    const valueText = new Text({
      text: "",
      style: { fill: 0xffffff, fontSize: 12 },
    });
    valueText.x = PADDING;
    valueText.y = y + 40;
    root.addChild(valueText);

    rowContainers.push({ track, fill, valueText, row });
  });

  function render() {
    for (const { fill, valueText, row } of rowContainers) {
      const value = row.get(state.params);
      const ratio = Math.max(0, Math.min(1, value / row.max));
      fill.clear();
      if (ratio > 0) {
        fill.roundRect(0, 0, Math.max(4, barWidth * ratio), 16, 8).fill(row.color);
      }
      valueText.text = row.format(value);
    }
  }

  render();
  const onParamsChanged = () => render();
  state.onParamsChanged.on(onParamsChanged);

  return {
    view: root,
    dispose: () => state.onParamsChanged.off(onParamsChanged),
  };
}
