import { Container, Graphics, Text } from "pixi.js";
import { SAVE_SLOT_COUNT, type SaveData } from "../game/SaveManager";

const OVERLAY_BG = 0x2b2b3a;
const CARD_BG = 0xfffdf9;
const ACCENT = 0xc5cdef;
const DANGER = 0xffb3b3;
const TEXT_DARK = 0x4a4a5a;
const TEXT_LIGHT = 0xffffff;

const CARD_WIDTH = 220;
const CARD_HEIGHT = 200;
const CARD_GAP = 24;

export interface SaveSlotOverlayOptions {
  width: number;
  height: number;
  slots: (SaveData | null)[];
  dismissable: boolean;
  onSelect: (slot: number) => void;
  onReset: (slot: number) => void;
  onClose: () => void;
}

function createButton(label: string, width: number, height: number, color: number, onTap: () => void): Container {
  const button = new Container();
  button.eventMode = "static";
  button.cursor = "pointer";
  const bg = new Graphics().roundRect(0, 0, width, height, 8).fill(color);
  const text = new Text({
    text: label,
    style: { fill: TEXT_DARK, fontSize: 13, fontWeight: "bold" },
  });
  text.anchor.set(0.5);
  text.x = width / 2;
  text.y = height / 2;
  button.addChild(bg, text);
  button.on("pointertap", (event) => {
    event.stopPropagation();
    onTap();
  });
  return button;
}

export class SaveSlotOverlay extends Container {
  constructor(options: SaveSlotOverlayOptions) {
    super();
    this.eventMode = "static";

    const bg = new Graphics().rect(0, 0, options.width, options.height).fill({ color: OVERLAY_BG, alpha: 0.94 });
    this.addChild(bg);

    const title = new Text({
      text: "セーブデータを選んでください",
      style: { fill: TEXT_LIGHT, fontSize: 20, fontWeight: "bold" },
    });
    title.anchor.set(0.5, 0);
    title.x = options.width / 2;
    title.y = 36;
    this.addChild(title);

    if (options.dismissable) {
      const closeButton = createButton("✕ 閉じる", 90, 30, ACCENT, () => options.onClose());
      closeButton.x = options.width - 90 - 20;
      closeButton.y = 20;
      this.addChild(closeButton);
    }

    const totalWidth = CARD_WIDTH * SAVE_SLOT_COUNT + CARD_GAP * (SAVE_SLOT_COUNT - 1);
    const startX = (options.width - totalWidth) / 2;
    const cardY = options.height / 2 - CARD_HEIGHT / 2;

    for (let slot = 0; slot < SAVE_SLOT_COUNT; slot++) {
      const data = options.slots[slot];
      const card = new Container();
      card.x = startX + slot * (CARD_WIDTH + CARD_GAP);
      card.y = cardY;

      const cardBg = new Graphics()
        .roundRect(0, 0, CARD_WIDTH, CARD_HEIGHT, 12)
        .fill(CARD_BG)
        .stroke({ width: 2, color: ACCENT });
      card.addChild(cardBg);

      const slotLabel = new Text({
        text: `スロット ${slot + 1}`,
        style: { fill: TEXT_DARK, fontSize: 15, fontWeight: "bold" },
      });
      slotLabel.x = 14;
      slotLabel.y = 12;
      card.addChild(slotLabel);

      const summaryText = new Text({
        text: data
          ? `フォロワー: ${Math.round(data.params.fans)}人\nメンタル: ${Math.round(data.params.mental)}\n所持金: ¥${Math.round(data.params.money)}\n投稿数: ${data.posts.length}`
          : "データがありません\n新しく始めます",
        style: {
          fill: 0x6a6a7a,
          fontSize: 12,
          wordWrap: true,
          wordWrapWidth: CARD_WIDTH - 28,
          lineHeight: 18,
        },
      });
      summaryText.x = 14;
      summaryText.y = 44;
      card.addChild(summaryText);

      const selectButton = createButton(
        data ? "つづきから" : "はじめる",
        CARD_WIDTH - 28,
        34,
        ACCENT,
        () => options.onSelect(slot),
      );
      selectButton.x = 14;
      selectButton.y = CARD_HEIGHT - (data ? 82 : 48);
      card.addChild(selectButton);

      if (data) {
        const resetButton = createButton("リセット", CARD_WIDTH - 28, 30, DANGER, () => options.onReset(slot));
        resetButton.x = 14;
        resetButton.y = CARD_HEIGHT - 40;
        card.addChild(resetButton);
      }

      this.addChild(card);
    }
  }
}
