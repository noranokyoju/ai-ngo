import { Application, Text, Container } from "pixi.js";
import '@pixi/layout'
import { LayoutContainer } from "@pixi/layout/components";
import { initDevtools } from "@pixi/devtools";
import '@pixi/layout/devtools'
import { delay, update } from "./async-utils";
import { DialogueBox } from "./dialogue";

const backgroundColor = '#ffffff';
const topBarColor = '#ffffff';
const facilities = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const;
type FacilityType = typeof facilities[number]
type FacilityInfo = {name: FacilityType, defaultCost: number, fps: number};
type FacilityParams = {level: number};
const facilityInfo: Record<FacilityType, FacilityInfo> = {
  A: {name: 'A', defaultCost: 10, fps: 1},
  B: {name: 'B', defaultCost: 100, fps: 5},
  C: {name: 'C', defaultCost: 1000, fps: 25},
  D: {name: 'D', defaultCost: 10000, fps: 125}, 
  E: {name: 'E', defaultCost: 100000, fps: 625},
  F: {name: 'F', defaultCost: 1000000, fps: 3025},
  G: {name: 'G', defaultCost: 10000000, fps: 15125}
} as const;

const facilityParams: Record<FacilityType, FacilityParams> = {
  'A': {level: 0},
  'B': {level: 0},
  'C': {level: 0},
  'D': {level: 0},
  'E': {level: 0},
  'F': {level: 0},
  'G': {level: 0}
};

const requestedFps = [1, 3, 10, 20, 50, 100, 300]


class EventManager{
  readonly facilityInfo: Record<FacilityType, FacilityInfo>
  readonly facilityParams: Record<FacilityType, FacilityParams>
  readonly dialogueBox: DialogueBox
  storyLevel = 0
  performing = false

  constructor(facilityInfo: Record<FacilityType, FacilityInfo>, facilityParams: Record<FacilityType, FacilityParams>, dialogueBox: DialogueBox){
    this.facilityInfo = facilityInfo;
    this.facilityParams = facilityParams;
    this.dialogueBox = dialogueBox;
  }

  check(){
    if(this.performing) return;

    if(this.facilityParams['A'].level >= 1 && this.storyLevel == 0){
      this.event1();
    }
    else if(this.facilityParams['B'].level >= 1 && this.storyLevel == 1){
      this.event2();
    }
  }

  async event1(){
    this.storyLevel += 1;
    this.performing = true;

    await this.dialogueBox.show([
      { speaker: 'アニ', text: '……あ、起きた?' },
      { speaker: 'アニ', text: 'ここは配信部屋。今日からあんたが世話係だから、よろしくね。' },
      { text: '（画面の向こうで、小さな女の子がこちらをじっと見ている）' },
    ]);

    this.performing = false;
  }

  async event2(){
    this.storyLevel += 1;
    this.performing = true;

    this.performing = false;
  }
  async event3(){
    this.storyLevel += 1;
    this.performing = true;

    this.performing = false;
  }
  async event4(){
    this.storyLevel += 1;
    this.performing = true;

    this.performing = false;
  }
  async event5(){
    this.storyLevel += 1;
    this.performing = true;

    this.performing = false;
  }
  async event6(){
    this.storyLevel += 1;
    this.performing = true;

    this.performing = false;
  }
  async event7(){
    this.storyLevel += 1;
    this.performing = true;

    this.performing = false;
  }
  async event8(){
    this.storyLevel += 1;
    this.performing = true;

    this.performing = false;
  }
  async event9(){
    this.storyLevel += 1;
    this.performing = true;

    this.performing = false;
  }
  async event10(){
    this.storyLevel += 1;
    this.performing = true;

    this.performing = false;
  }
}

var eventManager: EventManager;

(async () => {
  const app = new Application();
  await app.init({ background: '#1099bb', resizeTo: window });
  initDevtools({app});
  document.body.appendChild(app.canvas);
  app.stage.layout = {width: app.screen.width, height: app.screen.height, position: 'absolute'}

  var fish = 10;
  // const fishPerSec = 10;
  // const text = new Text();

  const screen = new LayoutContainer({layout: {position: 'absolute', width: '100%', height: '100%', backgroundColor: backgroundColor}});

  const dialogueBox = new DialogueBox(app);
  eventManager = new EventManager(facilityInfo, facilityParams, dialogueBox);

  // app.stage.addChild(text);

  const topBar = new LayoutContainer({layout: {backgroundColor: topBarColor, width: '100%', height: 80}});
  const fishText = new Text();
  fishText.text = fish;
  topBar.addChild(fishText)
  screen.addChild(topBar);

  const fpsText = new Text();
  fpsText.text = 0;
  fpsText.x = 200;
  topBar.addChild(fpsText);

  app.ticker.add(ticker => {
    var fps = 0;
    for(const facility of facilities){
      fps += facilityInfo[facility].fps * facilityParams[facility].level;
    }
    fish += fps * ticker.deltaTime / 60;
    fishText.text = Math.floor(fish);
    fpsText.text = fps;
    eventManager.check();
    update(ticker.deltaTime);
  });

  const upgradeContainer = new Container();
  upgradeContainer.x = 600;
  upgradeContainer.y = 100;
  var buttonCount = 0;
  for(const facility of facilities){
    const upgradeButton = new LayoutContainer({layout: {width: 120, height: 60, borderWidth: 2, borderColor: 0}});
    
    upgradeButton.y = buttonCount * 80;
    const buttonText = new Text();
    buttonText.text = facility;
    
    const levelText = new Text();
    levelText.text = facilityParams[facility].level;
    levelText.y = 30;

    const costText = new Text();
    costText.text = facilityInfo[facility].defaultCost;
    costText.x = 80;

    upgradeButton.addChild(buttonText);
    upgradeButton.addChild(levelText);
    upgradeButton.addChild(costText);
    upgradeContainer.addChild(upgradeButton);
    buttonCount += 1;
    const scale = 1.5;
    upgradeButton.on('pointerdown', () => {
      const level = facilityParams[facility].level;
      const cost = Math.floor(facilityInfo[facility].defaultCost * Math.pow(scale, level));
      if(Math.floor(fish) >= cost) {
        fish -= cost;
        facilityParams[facility].level = level + 1;
        levelText.text = level + 1;
        costText.text = Math.floor(facilityInfo[facility].defaultCost * Math.pow(scale, level + 1));
        
      }
    });
  }
  screen.addChild(upgradeContainer);
  screen.addChild(dialogueBox.container);
  app.stage.addChild(screen);

})();
