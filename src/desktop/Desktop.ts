import { Application, Container, Graphics, Text } from "pixi.js";
import { AppWindow } from "../windows/AppWindow";
import { FRIEND_NAME, GameState, TIME_OF_DAY_EMOJI, type JineMessage } from "../game/GameState";
import { loadAllSlots, loadSlotData, resetSlotData, saveSlotData } from "../game/SaveManager";
import { STREAM_GENRE_LABEL, STREAM_GENRES, type StreamGenre, type StreamTopic } from "../game/StreamTopics";
import { evaluateEndings } from "../game/Endings";
import { SaveSlotOverlay } from "./SaveSlotOverlay";
import { DesktopNotification } from "./DesktopNotification";
import { EndingScreen } from "./EndingScreen";
import { createPoketterContent } from "../apps/Poketter";
import { createJineContent } from "../apps/Jine";
import { createTaskManagerContent } from "../apps/TaskManager";
import { createBroadcastContent } from "../apps/Broadcast";
import { createCommandListContent } from "../apps/CommandList";
import type { AppContentFactory } from "../apps/types";
import GUI, { Controller } from 'lil-gui';
import { delayFrame } from "../async-utils";
import { CreateGUI } from "../debug/DebugGUI";

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
    iconColor: 0x9fe7b5,
    accentColor: 0x9fe7b5,
    width: 340,
    height: 460,
    createContent: createJineContent,
  },
  {
    id: "poketter",
    label: "Poketter",
    iconColor: 0xa9d8f5,
    accentColor: 0xa9d8f5,
    width: 360,
    height: 460,
    createContent: createPoketterContent,
  },
  {
    id: "taskmanager",
    label: "タスクマネージャー",
    iconColor: 0xc5cdef,
    accentColor: 0xc5cdef,
    width: 320,
    height: 360,
    createContent: createTaskManagerContent,
  },
  {
    id: "broadcast",
    label: "配信",
    iconColor: 0xffb6c8,
    accentColor: 0xffb6c8,
    width: 760,
    height: 480,
    createContent: createBroadcastContent,
  },
  {
    id: "cmd-play",
    label: "あそぶ",
    iconColor: 0xffd9a6,
    accentColor: 0xffd9a6,
    width: 300,
    height: 360,
    createContent: createCommandListContent("あそぶ"),
  },
  {
    id: "cmd-sleep",
    label: "ねる",
    iconColor: 0xc9b6ff,
    accentColor: 0xc9b6ff,
    width: 300,
    height: 300,
    createContent: createCommandListContent("ねる"),
  },
  {
    id: "cmd-medicine",
    label: "おくすり",
    iconColor: 0xb6d9ff,
    accentColor: 0xb6d9ff,
    width: 300,
    height: 340,
    createContent: createCommandListContent("おくすり"),
  },
  {
    id: "cmd-internet",
    label: "いんたーねっと",
    iconColor: 0x9fe7c8,
    accentColor: 0x9fe7c8,
    width: 300,
    height: 400,
    createContent: createCommandListContent("いんたーねっと"),
  },
  {
    id: "cmd-outing",
    label: "おでかけ",
    iconColor: 0xffc2d6,
    accentColor: 0xffc2d6,
    width: 300,
    height: 420,
    createContent: createCommandListContent("おでかけ"),
  },
];

const TASKBAR_HEIGHT = 40;
const ICON_SIZE = 56;
const DESKTOP_BG = 0xeaf0fb;
const TASKBAR_BG = 0xc9daf5;
const TASKBAR_BUTTON_BG = 0xf3ecfa;
const START_BUTTON_BG = 0xb8aed9;
const START_BUTTON_WIDTH = 78;
const TEXT_DARK = 0x4a4a5a;

export class Desktop {
  private state = new GameState();
  private currentSlot: number | null = null;
  private readonly stage = new Container();
  private readonly windowLayer = new Container();
  private readonly taskbarButtonLayer = new Container();
  private readonly clockText: Text;
  private readonly openWindows = new Map<string, { window: AppWindow; dispose: () => void }>();
  private readonly notificationLayer = new Container();
  private readonly activeNotifications: DesktopNotification[] = [];
  private saveOverlay: SaveSlotOverlay | null = null;
  private endingScreen: EndingScreen | null = null;
  private cascadeOffset = 0;
  private readonly screenWidth: number;
  private readonly screenHeight: number;

  constructor(app: Application) {
    this.screenWidth = app.screen.width;
    this.screenHeight = app.screen.height;

    const bg = new Graphics().rect(0, 0, app.screen.width, app.screen.height).fill(DESKTOP_BG);
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
      .fill(TASKBAR_BG);
    taskbar.y = app.screen.height - TASKBAR_HEIGHT;
    this.stage.addChild(taskbar);

    const startButton = this.createStartButton();
    startButton.x = 8;
    startButton.y = app.screen.height - TASKBAR_HEIGHT + 6;
    this.stage.addChild(startButton);

    this.taskbarButtonLayer.x = 8 + START_BUTTON_WIDTH + 8;
    this.taskbarButtonLayer.y = app.screen.height - TASKBAR_HEIGHT;
    this.stage.addChild(this.taskbarButtonLayer);

    this.clockText = new Text({
      text: "",
      style: { fill: TEXT_DARK, fontSize: 13, fontWeight: "bold" },
    });
    this.clockText.anchor.set(1, 0);
    this.clockText.y = app.screen.height - TASKBAR_HEIGHT + 11;
    this.clockText.x = app.screen.width - 12;
    this.stage.addChild(this.clockText);

    this.stage.addChild(this.notificationLayer);

    app.stage.addChild(this.stage);
    this.updateTimeDisplay();

    this.openSaveSlotOverlay(false);
  }

  private createStartButton(): Container {
    const button = new Container();
    button.eventMode = "static";
    button.cursor = "pointer";
    const buttonBg = new Graphics().roundRect(0, 0, START_BUTTON_WIDTH, 28, 4).fill(START_BUTTON_BG);
    const buttonText = new Text({
      text: "スタート",
      style: { fill: TEXT_DARK, fontSize: 12, fontWeight: "bold" },
    });
    buttonText.anchor.set(0.5);
    buttonText.x = START_BUTTON_WIDTH / 2;
    buttonText.y = 14;
    button.addChild(buttonBg, buttonText);
    button.on("pointertap", () => this.openSaveSlotOverlay(true));
    return button;
  }

  private openSaveSlotOverlay(dismissable: boolean) {
    if (this.saveOverlay) return;
    this.saveOverlay = new SaveSlotOverlay({
      width: this.screenWidth,
      height: this.screenHeight,
      slots: loadAllSlots(),
      dismissable,
      onSelect: (slot) => this.switchToSlot(slot),
      onReset: (slot) => this.resetSlot(slot),
      onClose: () => this.closeSaveSlotOverlay(),
    });
    this.stage.addChild(this.saveOverlay);
  }

  private closeSaveSlotOverlay() {
    if (!this.saveOverlay) return;
    this.stage.removeChild(this.saveOverlay);
    this.saveOverlay.destroy({ children: true });
    this.saveOverlay = null;
  }

  private refreshSaveSlotOverlay() {
    if (!this.saveOverlay) return;
    const dismissable = this.currentSlot !== null;
    this.closeSaveSlotOverlay();
    this.openSaveSlotOverlay(dismissable);
  }

  private resetSlot(slot: number) {
    if (!window.confirm(`スロット${slot + 1}のデータをリセットしてやり直しますか？`)) return;
    resetSlotData(slot);
    if (this.currentSlot === slot) {
      this.switchToSlot(slot, { fresh: true });
    } else {
      this.refreshSaveSlotOverlay();
    }
  }

  private switchToSlot(slot: number, options: { fresh?: boolean } = {}) {
    for (const id of [...this.openWindows.keys()]) {
      this.closeWindow(id);
    }
    this.clearNotifications();

    const data = options.fresh ? null : loadSlotData(slot);
    const newState = new GameState();
    if (data) {
      newState.loadFromSave(data);
    }
    
    CreateGUI(newState);

    this.state = newState;
    this.currentSlot = slot;

    const persist = () => {
      if (this.currentSlot === slot) {
        saveSlotData(slot, this.state.serialize());
      }
    };
    this.state.onParamsChanged.on(persist);
    this.state.onPostAdded.on(persist);
    this.state.onMessageAdded.on(persist);
    this.state.onMessageRead.on(persist);
    this.state.onTimeChanged.on(persist);
    this.state.onMessageAdded.on((message) => this.handleMessageAdded(message));
    this.state.onStreamTopicUnlocked.on(persist);
    this.state.onStreamTopicUnlocked.on((topic) => this.handleStreamTopicUnlocked(topic));
    this.state.onTimeChanged.on(() => this.updateTimeDisplay());
    this.state.onParamsChanged.on(() => this.checkEndings());
    this.state.onTimeChanged.on(() => this.checkEndings());
    this.updateTimeDisplay();

    this.closeSaveSlotOverlay();
    this.checkEndings();
  }

  /** 現在の状態がエンディング条件を満たしていないか確認し、満たしていればエンディング画面に移る。 */
  private checkEndings() {
    if (this.endingScreen || this.currentSlot === null) return;
    const ending = evaluateEndings(this.state);
    if (ending) this.triggerEnding(ending.title);
  }

  private triggerEnding(title: string) {
    if (this.endingScreen) return;
    for (const id of [...this.openWindows.keys()]) {
      this.closeWindow(id);
    }
    this.clearNotifications();

    this.endingScreen = new EndingScreen({
      width: this.screenWidth,
      height: this.screenHeight,
      title,
      onDismiss: () => this.dismissEnding(),
    });
    this.stage.addChild(this.endingScreen);
  }

  private dismissEnding() {
    if (!this.endingScreen) return;
    this.stage.removeChild(this.endingScreen);
    this.endingScreen.destroy({ children: true });
    this.endingScreen = null;
    this.currentSlot = null;
    this.openSaveSlotOverlay(false);
  }

  private handleMessageAdded(message: JineMessage) {
    if (message.sender !== "friend") return;
    if (this.openWindows.has("jine")) return;
    this.showNotification(`${FRIEND_NAME}からのメッセージ`, message.text, () => {
      const jineApp = APPS.find((appDef) => appDef.id === "jine");
      if (jineApp) this.openWindow(jineApp);
    });
  }

  private handleStreamTopicUnlocked(topic: StreamTopic) {
    this.showNotification(
      "新しい配信ネタを解放しました！",
      `${STREAM_GENRE_LABEL[topic.genre]}「${topic.title}」`,
      () => {
        const broadcastApp = APPS.find((appDef) => appDef.id === "broadcast");
        if (broadcastApp) this.openWindow(broadcastApp);
      },
    );
  }

  private showNotification(title: string, message: string, onClick: () => void) {
    const notification = new DesktopNotification({
      title,
      message,
      onClick,
      onDismiss: () => this.removeNotification(notification),
    });
    this.activeNotifications.push(notification);
    this.notificationLayer.addChild(notification);
    this.layoutNotifications();
  }

  private removeNotification(notification: DesktopNotification) {
    const index = this.activeNotifications.indexOf(notification);
    if (index === -1) return;
    this.activeNotifications.splice(index, 1);
    this.notificationLayer.removeChild(notification);
    notification.destroy({ children: true });
    this.layoutNotifications();
  }

  private clearNotifications() {
    for (const notification of this.activeNotifications) {
      notification.dispose();
      this.notificationLayer.removeChild(notification);
      notification.destroy({ children: true });
    }
    this.activeNotifications.length = 0;
  }

  private layoutNotifications() {
    const margin = 16;
    let y = this.screenHeight - TASKBAR_HEIGHT - margin;
    for (let i = this.activeNotifications.length - 1; i >= 0; i--) {
      const notification = this.activeNotifications[i];
      y -= notification.notificationHeight;
      notification.x = this.screenWidth - notification.notificationWidth - margin;
      notification.y = y;
      y -= 10;
    }
  }

  private updateTimeDisplay() {
    const emoji = TIME_OF_DAY_EMOJI[this.state.timeOfDay];
    this.clockText.text = `day${this.state.day} ${emoji}${this.state.timeOfDay}`;
  }

  private createIcon(appDef: AppDef): Container {
    const icon = new Container();
    icon.eventMode = "static";
    icon.cursor = "pointer";

    const square = new Graphics().roundRect(0, 0, ICON_SIZE, ICON_SIZE, 10).fill(appDef.iconColor);
    icon.addChild(square);

    const label = new Text({
      text: appDef.label,
      style: { fill: TEXT_DARK, fontSize: 11, align: "center", wordWrap: true, wordWrapWidth: ICON_SIZE + 20 },
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
    appWindow.playOpenAnimation();

    this.rebuildTaskbarButtons();
  }

  private closeWindow(id: string) {
    const entry = this.openWindows.get(id);
    if (!entry) return;
    this.openWindows.delete(id);
    this.rebuildTaskbarButtons();
    entry.window.playCloseAnimation(() => {
      entry.dispose();
      this.windowLayer.removeChild(entry.window);
      entry.window.destroy({ children: true });
    });
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
      const buttonBg = new Graphics().roundRect(0, 0, buttonWidth, 28, 4).fill(TASKBAR_BUTTON_BG);
      const buttonText = new Text({
        text: appDef.label,
        style: { fill: TEXT_DARK, fontSize: 11 },
      });
      buttonText.x = 8;
      buttonText.y = 7;
      button.addChild(buttonBg, buttonText);
      button.x = x;
      button.y = 6;
      button.on("pointertap", () => {
        entry.window.visible = true;
        this.bringToFront(entry.window);
      });

      this.taskbarButtonLayer.addChild(button);
      x += buttonWidth + 6;
    }
  }
}
