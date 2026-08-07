import { Container, Graphics, Text, type FederatedPointerEvent } from "pixi.js";

const TITLE_BAR_HEIGHT = 32;

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
      .fill(0xf4f4f4)
      .stroke({ width: 2, color: 0x222222 });
    this.addChild(frame);

    const titleBar = new Container();
    titleBar.eventMode = "static";
    titleBar.cursor = "move";
    const titleBg = new Graphics().roundRect(0, 0, this.windowWidth, TITLE_BAR_HEIGHT, 8).fill(
      options.accentColor ?? 0x3a6ea5,
    );
    titleBar.addChild(titleBg);

    const titleText = new Text({
      text: options.title,
      style: { fill: 0xffffff, fontSize: 15, fontWeight: "bold" },
    });
    titleText.x = 10;
    titleText.y = 7;
    titleBar.addChild(titleText);

    const closeButton = new Text({
      text: "✕",
      style: { fill: 0xffffff, fontSize: 15 },
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
