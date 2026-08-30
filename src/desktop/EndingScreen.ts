import { Container, Graphics, Text } from "pixi.js";

const BSOD_BG = 0x1a3fa0;
const TEXT_LIGHT = 0xffffff;

export interface EndingScreenOptions {
  width: number;
  height: number;
  /** エンディング名。 */
  title: string;
  onDismiss: () => void;
}

/** Windowsのブルースクリーンを模したエンディング画面。クリックでセーブデータ選択画面に戻る。 */
export class EndingScreen extends Container {
  constructor(options: EndingScreenOptions) {
    super();
    this.eventMode = "static";
    this.cursor = "pointer";

    const bg = new Graphics().rect(0, 0, options.width, options.height).fill(BSOD_BG);
    this.addChild(bg);

    const face = new Text({
      text: ":(",
      style: { fill: TEXT_LIGHT, fontSize: 72, fontWeight: "bold" },
    });
    face.x = options.width / 2 - 220;
    face.y = options.height / 2 - 160;
    this.addChild(face);

    const gameOverText = new Text({
      text: "GAME OVER",
      style: { fill: TEXT_LIGHT, fontSize: 40, fontWeight: "bold" },
    });
    gameOverText.x = options.width / 2 - 220;
    gameOverText.y = options.height / 2 - 60;
    this.addChild(gameOverText);

    const endingTitleText = new Text({
      text: options.title,
      style: { fill: TEXT_LIGHT, fontSize: 26, fontWeight: "bold" },
    });
    endingTitleText.x = options.width / 2 - 220;
    endingTitleText.y = gameOverText.y + gameOverText.height + 16;
    this.addChild(endingTitleText);

    const hintText = new Text({
      text: "画面をクリックしてセーブデータ選択に戻る",
      style: { fill: TEXT_LIGHT, fontSize: 14 },
    });
    hintText.x = options.width / 2 - 220;
    hintText.y = endingTitleText.y + endingTitleText.height + 40;
    this.addChild(hintText);

    this.on("pointertap", () => options.onDismiss());
  }
}
