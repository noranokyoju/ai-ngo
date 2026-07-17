// ===========================================================
//                  ADV Dialogue System
// ===========================================================
// A minimal visual-novel style dialogue box: shows a speaker name
// and a line of text, and advances to the next line on click/tap.
// Intended to be used from story events (see EventManager in main.ts).

import { Application, Container, Graphics, Text } from "pixi.js";

export type DialogueLine = {
  speaker?: string;
  text: string;
};

const boxHeight = 160;
const boxColor = 0x000000;
const boxAlpha = 0.8;
const nameColor = '#ffe066';
const bodyColor = '#ffffff';

export class DialogueBox {
  // Not attached to a parent automatically: add `container` to the
  // display tree wherever/whenever the desired z-order requires.
  readonly container: Container;
  private readonly nameText: Text;
  private readonly bodyText: Text;
  private resolveAdvance: (() => void) | null = null;

  constructor(app: Application) {
    const width = app.screen.width;

    this.container = new Container();
    this.container.x = 0;
    this.container.y = app.screen.height - boxHeight;
    this.container.visible = false;
    this.container.eventMode = 'static';
    this.container.cursor = 'pointer';
    this.container.on('pointerdown', () => this.advance());

    const background = new Graphics()
      .rect(0, 0, width, boxHeight)
      .fill({ color: boxColor, alpha: boxAlpha });
    this.container.addChild(background);

    this.nameText = new Text({ text: '', style: { fill: nameColor, fontSize: 20, fontWeight: 'bold' } });
    this.nameText.x = 16;
    this.nameText.y = 12;
    this.container.addChild(this.nameText);

    this.bodyText = new Text({ text: '', style: { fill: bodyColor, fontSize: 18, wordWrap: true, wordWrapWidth: width - 32 } });
    this.bodyText.x = 16;
    this.bodyText.y = 48;
    this.container.addChild(this.bodyText);
  }

  // Plays a sequence of lines, waiting for a click between each one.
  async show(lines: DialogueLine[]): Promise<void> {
    this.container.visible = true;
    for (const line of lines) {
      await this.showLine(line);
    }
    this.container.visible = false;
  }

  private showLine(line: DialogueLine): Promise<void> {
    this.nameText.text = line.speaker ?? '';
    this.bodyText.text = line.text;
    return new Promise(resolve => {
      this.resolveAdvance = resolve;
    });
  }

  private advance() {
    if (!this.resolveAdvance) return;
    const resolve = this.resolveAdvance;
    this.resolveAdvance = null;
    resolve();
  }
}
