import type { Container } from "pixi.js";
import type { GameState } from "../game/GameState";

export interface AppContent {
  view: Container;
  dispose: () => void;
}

export type AppContentFactory = (state: GameState, width: number, height: number) => AppContent;
