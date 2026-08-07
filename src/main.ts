import { Application } from "pixi.js";
import { initDevtools } from "@pixi/devtools";
import { Desktop } from "./desktop/Desktop";
import { update } from "./async-utils";

(async () => {
  const app = new Application();
  await app.init({ background: "#1b2735", resizeTo: window });
  initDevtools({ app });
  document.body.appendChild(app.canvas);

  new Desktop(app);

  app.ticker.add((ticker) => {
    void update(ticker.deltaTime);
  });
})();
