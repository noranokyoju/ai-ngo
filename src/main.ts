import { Application } from "pixi.js";
import { PixelateFilter } from "pixi-filters";
import { initDevtools } from "@pixi/devtools";
import { Desktop } from "./desktop/Desktop";
import { update } from "./async-utils";

const PIXELATE_SIZE = 4;

(async () => {
  const app = new Application();
  await app.init({ background: "#1b2735", resizeTo: window, antialias: false });
  initDevtools({ app });
  document.body.appendChild(app.canvas);

  app.stage.filters = [new PixelateFilter(PIXELATE_SIZE)];

  new Desktop(app);

  app.ticker.add((ticker) => {
    void update(ticker.deltaTime);
  });
})();
