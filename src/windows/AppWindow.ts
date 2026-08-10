import { Container, Graphics, Text, Ticker, type FederatedPointerEvent } from "pixi.js";

const TITLE_BAR_HEIGHT = 32;
const TITLE_TEXT_COLOR = 0x4a4a5a;
const OPEN_DURATION_MS = 180;
const CLOSE_DURATION_MS = 140;
const MIN_SCALE = 0.05;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeInCubic(t: number): number {
  return t * t * t;
}

export interface AppWindowOptions {
  title: string;
  width: number;
  height: number;
  x?: number;
  y?: number;
  accentColor?: number;
  onClose: () => void;
}

export class AppWindow extends Container {
  readonly content: Container;
  readonly windowWidth: number;
  readonly windowHeight: number;

  private readonly titleBar: Container;
  private dragging = false;
  private dragOffsetX = 0;
  private dragOffsetY = 0;

  constructor(options: AppWindowOptions) {
    super();
    this.windowWidth = options.width;
    this.windowHeight = options.height;
    this.x = options.x ?? 80;
    this.y = options.y ?? 60;

    const frame = new Graphics()
      .roundRect(0, 0, this.windowWidth, this.windowHeight, 8)
      .fill(0xfffdf9)
      .stroke({ width: 2, color: 0xb8aed9 });
    this.addChild(frame);

    const titleBar = new Container();
    titleBar.eventMode = "static";
    titleBar.cursor = "move";
    const titleBg = new Graphics().roundRect(0, 0, this.windowWidth, TITLE_BAR_HEIGHT, 8).fill(
      options.accentColor ?? 0xc5cdef,
    );
    titleBar.addChild(titleBg);

    const titleText = new Text({
      text: options.title,
      style: { fill: TITLE_TEXT_COLOR, fontSize: 15, fontWeight: "bold" },
    });
    titleText.x = 10;
    titleText.y = 7;
    titleBar.addChild(titleText);

    const closeButton = new Text({
      text: "✕",
      style: { fill: TITLE_TEXT_COLOR, fontSize: 15 },
    });
    closeButton.eventMode = "static";
    closeButton.cursor = "pointer";
    closeButton.x = this.windowWidth - 24;
    closeButton.y = 7;
    closeButton.on("pointertap", (event) => {
      event.stopPropagation();
      options.onClose();
    });
    titleBar.addChild(closeButton);

    this.addChild(titleBar);
    this.titleBar = titleBar;

    const contentMask = new Graphics()
      .roundRect(0, TITLE_BAR_HEIGHT, this.windowWidth, this.windowHeight - TITLE_BAR_HEIGHT, 8)
      .fill(0xffffff);
    this.addChild(contentMask);

    this.content = new Container();
    this.content.x = 0;
    this.content.y = TITLE_BAR_HEIGHT;
    this.content.mask = contentMask;
    this.addChild(this.content);

    titleBar.on("pointerdown", this.onDragStart, this);
    this.on("globalpointermove", this.onDragMove, this);
    titleBar.on("pointerup", this.onDragEnd, this);
    titleBar.on("pointerupoutside", this.onDragEnd, this);

    this.eventMode = "static";
    this.on("pointerdown", () => this.emit("focus"));
  }

  playOpenAnimation() {
    this.animateScale(MIN_SCALE, 1, OPEN_DURATION_MS, easeOutCubic, () => {});
  }

  playCloseAnimation(onComplete: () => void) {
    this.eventMode = "none";
    this.animateScale(1, MIN_SCALE, CLOSE_DURATION_MS, easeInCubic, onComplete);
  }

  private animateScale(
    from: number,
    to: number,
    durationMs: number,
    easing: (t: number) => number,
    onComplete: () => void,
  ) {
    const baseX = this.x;
    const baseY = this.y;
    let elapsed = 0;

    const apply = (t: number) => {
      const eased = easing(t);
      const scale = from + (to - from) * eased;
      this.scale.set(scale);
      this.alpha = from < to ? Math.max(eased, MIN_SCALE) : 1 - eased;
      this.x = baseX + (this.windowWidth - this.windowWidth * scale) / 2;
      this.y = baseY + (this.windowHeight - this.windowHeight * scale) / 2;
    };

    apply(0);

    const tick = (ticker: Ticker) => {
      elapsed += ticker.deltaMS;
      const t = Math.min(1, elapsed / durationMs);
      apply(t);
      if (t >= 1) {
        Ticker.shared.remove(tick);
        onComplete();
      }
    };
    Ticker.shared.add(tick);
  }

  private onDragStart(event: FederatedPointerEvent) {
    if (!this.parent) return;
    this.dragging = true;
    const local = this.parent.toLocal(event.global);
    this.dragOffsetX = local.x - this.x;
    this.dragOffsetY = local.y - this.y;
    this.emit("focus");
  }

  private onDragMove(event: FederatedPointerEvent) {
    if (!this.dragging || !this.parent) return;
    const local = this.parent.toLocal(event.global);
    this.x = local.x - this.dragOffsetX;
    this.y = local.y - this.dragOffsetY;
  }

  private onDragEnd() {
    this.dragging = false;
  }
}
