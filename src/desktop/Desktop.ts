import { Application, Container, Graphics, Text } from "pixi.js";
import { AppWindow } from "../windows/AppWindow";
import { GameState } from "../game/GameState";
import { createPoketterContent } from "../apps/Poketter";
import { createJineContent } from "../apps/Jine";
import { createTaskManagerContent } from "../apps/TaskManager";
import { createBroadcastContent } from "../apps/Broadcast";
import { createActionSelectContent } from "../apps/ActionSelect";
import type { AppContentFactory } from "../apps/types";

interface AppDef {
  id: string;
  label: string;
  iconColor: number;
  accentColor: number;
  width: number;
  height: number;
  createContent: AppContentFactory;
}

const APPS: AppDef[] = [
  {
    id: "jine",
    label: "JINE",
    iconColor: 0x06c755,
    accentColor: 0x06c755,
    width: 340,
    height: 460,
    createContent: createJineContent,
  },
  {
    id: "poketter",
    label: "Poketter",
    iconColor: 0x1da1f2,
    accentColor: 0x1da1f2,
    width: 360,
    height: 460,
    createContent: createPoketterContent,
  },
  {
    id: "taskmanager",
    label: "タスクマネージャー",
    iconColor: 0x555555,
    accentColor: 0x3a6ea5,
    width: 320,
    height: 320,
    createContent: createTaskManagerContent,
  },
  {
    id: "broadcast",
    label: "配信",
    iconColor: 0xff2d55,
    accentColor: 0xff2d55,
    width: 400,
    height: 320,
    createContent: createBroadcastContent,
  },
  {
    id: "action",
    label: "行動選択",
    iconColor: 0xffa500,
    accentColor: 0xffa500,
    width: 300,
    height: 360,
    createContent: createActionSelectContent,
  },
];

const TASKBAR_HEIGHT = 40;
const ICON_SIZE = 56;

export class Desktop {
  private readonly state = new GameState();
  private readonly stage = new Container();
  private readonly windowLayer = new Container();
  private readonly taskbarButtonLayer = new Container();
  private readonly clockText: Text;
  private readonly openWindows = new Map<string, { window: AppWindow; dispose: () => void }>();
  private cascadeOffset = 0;

  constructor(app: Application) {
    const bg = new Graphics().rect(0, 0, app.screen.width, app.screen.height).fill(0x1b2735);
    this.stage.addChild(bg);

    const iconLayer = new Container();
    APPS.forEach((appDef, index) => {
      const icon = this.createIcon(appDef);
      icon.x = 20;
      icon.y = 20 + index * (ICON_SIZE + 26);
      iconLayer.addChild(icon);
    });
    this.stage.addChild(iconLayer);

    this.stage.addChild(this.windowLayer);

    const taskbar = new Graphics()
      .rect(0, 0, app.screen.width, TASKBAR_HEIGHT)
      .fill(0x0f1620);
    taskbar.y = app.screen.height - TASKBAR_HEIGHT;
    this.stage.addChild(taskbar);

    this.taskbarButtonLayer.x = 8;
    this.taskbarButtonLayer.y = app.screen.height - TASKBAR_HEIGHT;
    this.stage.addChild(this.taskbarButtonLayer);

    this.clockText = new Text({
      text: "",
      style: { fill: 0xffffff, fontSize: 13 },
    });
    this.clockText.y = app.screen.height - TASKBAR_HEIGHT + 11;
    this.clockText.x = app.screen.width - 70;
    this.stage.addChild(this.clockText);

    app.stage.addChild(this.stage);
    app.ticker.add(() => this.updateClock());
    this.updateClock();
  }

  private updateClock() {
    const now = new Date();
    const hh = now.getHours().toString().padStart(2, "0");
    const mm = now.getMinutes().toString().padStart(2, "0");
    this.clockText.text = `${hh}:${mm}`;
  }

  private createIcon(appDef: AppDef): Container {
    const icon = new Container();
    icon.eventMode = "static";
    icon.cursor = "pointer";

    const square = new Graphics().roundRect(0, 0, ICON_SIZE, ICON_SIZE, 10).fill(appDef.iconColor);
    icon.addChild(square);

    const label = new Text({
      text: appDef.label,
      style: { fill: 0xffffff, fontSize: 11, align: "center", wordWrap: true, wordWrapWidth: ICON_SIZE + 20 },
    });
    label.anchor.set(0.5, 0);
    label.x = ICON_SIZE / 2;
    label.y = ICON_SIZE + 4;
    icon.addChild(label);

    icon.on("pointertap", () => this.openWindow(appDef));

    return icon;
  }

  private openWindow(appDef: AppDef) {
    const existing = this.openWindows.get(appDef.id);
    if (existing) {
      existing.window.visible = true;
      this.bringToFront(existing.window);
      return;
    }

    const { view, dispose } = appDef.createContent(
      this.state,
      appDef.width,
      appDef.height - 32,
    );

    const appWindow = new AppWindow({
      title: appDef.label,
      width: appDef.width,
      height: appDef.height,
      x: 100 + (this.cascadeOffset % 5) * 30,
      y: 40 + (this.cascadeOffset % 5) * 30,
      accentColor: appDef.accentColor,
      onClose: () => this.closeWindow(appDef.id),
    });
    this.cascadeOffset += 1;
    appWindow.content.addChild(view);
    appWindow.on("focus", () => this.bringToFront(appWindow));

    this.windowLayer.addChild(appWindow);
    this.openWindows.set(appDef.id, { window: appWindow, dispose });

    this.rebuildTaskbarButtons();
  }

  private closeWindow(id: string) {
    const entry = this.openWindows.get(id);
    if (!entry) return;
    entry.dispose();
    this.windowLayer.removeChild(entry.window);
    entry.window.destroy({ children: true });
    this.openWindows.delete(id);
    this.rebuildTaskbarButtons();
  }

  private bringToFront(appWindow: AppWindow) {
    this.windowLayer.addChild(appWindow);
  }

  private rebuildTaskbarButtons() {
    this.taskbarButtonLayer.removeChildren();
    let x = 0;
    for (const [id, entry] of this.openWindows) {
      const appDef = APPS.find((a) => a.id === id);
      if (!appDef) continue;

      const button = new Container();
      button.eventMode = "static";
      button.cursor = "pointer";
      const buttonWidth = 120;
      const buttonBg = new Graphics().roundRect(0, 0, buttonWidth, 28, 4).fill(0x22303f);
      const buttonText = new Text({
        text: appDef.label,
        style: { fill: 0xffffff, fontSize: 11 },
      });
      buttonText.x = 8;
      buttonText.y = 7;
      button.addChild(buttonBg, buttonText);
      button.x = x;
      button.y = 6;
      button.on("pointertap", () => {
        entry.window.visible = !entry.window.visible;
        if (entry.window.visible) this.bringToFront(entry.window);
      });

      this.taskbarButtonLayer.addChild(button);
      x += buttonWidth + 6;
    }
  }
}
