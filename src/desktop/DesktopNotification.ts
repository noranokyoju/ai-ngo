import { Container, Graphics, Text, Ticker } from "pixi.js";

const WIDTH = 260;
const PADDING = 12;
const TITLE_COLOR = 0x4a4a5a;
const BODY_COLOR = 0x333333;
const BG_COLOR = 0xfffdf9;
const BORDER_COLOR = 0x9fe7b5;
const DISPLAY_DURATION_MS = 6000;
const ANIMATION_DURATION_MS = 200;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export interface DesktopNotificationOptions {
  title: string;
  message: string;
  onClick: () => void;
  onDismiss: () => void;
}

export class DesktopNotification extends Container {
  readonly notificationWidth = WIDTH;
  readonly notificationHeight: number;

  private shownMs = 0;
  private closing = false;
  private readonly onDismiss: () => void;
  private readonly tick = (ticker: Ticker) => this.onTick(ticker);

  constructor(options: DesktopNotificationOptions) {
    super();
    this.eventMode = "static";
    this.cursor = "pointer";
    this.onDismiss = options.onDismiss;

    const titleText = new Text({
      text: options.title,
      style: { fill: TITLE_COLOR, fontSize: 13, fontWeight: "bold" },
    });
    const bodyText = new Text({
      text: options.message,
      style: { fill: BODY_COLOR, fontSize: 12, wordWrap: true, wordWrapWidth: WIDTH - PADDING * 2 },
    });

    this.notificationHeight = PADDING * 2 + titleText.height + 6 + bodyText.height;

    const frame = new Graphics()
      .roundRect(0, 0, WIDTH, this.notificationHeight, 10)
      .fill(BG_COLOR)
      .stroke({ width: 2, color: BORDER_COLOR });
    this.addChild(frame);

    titleText.x = PADDING;
    titleText.y = PADDING;
    this.addChild(titleText);

    bodyText.x = PADDING;
    bodyText.y = PADDING + titleText.height + 6;
    this.addChild(bodyText);

    const closeButton = new Text({
      text: "✕",
      style: { fill: TITLE_COLOR, fontSize: 12 },
    });
    closeButton.eventMode = "static";
    closeButton.cursor = "pointer";
    closeButton.x = WIDTH - PADDING - closeButton.width;
    closeButton.y = PADDING - 2;
    closeButton.on("pointertap", (event) => {
      event.stopPropagation();
      this.close();
    });
    this.addChild(closeButton);

    this.on("pointertap", () => {
      options.onClick();
      this.close();
    });

    this.alpha = 0;
    Ticker.shared.add(this.tick);
  }

  close() {
    if (this.closing) return;
    this.closing = true;
    this.shownMs = 0;
  }

  /** Stops the animation ticker without playing the dismiss animation or firing onDismiss. */
  dispose() {
    Ticker.shared.remove(this.tick);
  }

  private onTick(ticker: Ticker) {
    this.shownMs += ticker.deltaMS;

    if (this.closing) {
      const t = Math.min(1, this.shownMs / ANIMATION_DURATION_MS);
      this.alpha = 1 - easeOutCubic(t);
      if (t >= 1) {
        Ticker.shared.remove(this.tick);
        this.onDismiss();
      }
      return;
    }

    this.alpha = easeOutCubic(Math.min(1, this.shownMs / ANIMATION_DURATION_MS));
    if (this.shownMs >= DISPLAY_DURATION_MS) {
      this.close();
    }
  }
}
