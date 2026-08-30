
import GUI, { Controller } from 'lil-gui';
import type { GameState } from '../game/GameState';
import { STREAM_GENRES, type StreamGenre } from '../game/StreamTopics';
import { delayFrame } from '../async-utils';

var currentGui: undefined | GUI = undefined;
const DAYS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24 ,25, 26, 27, 28, 29, 30]


export function CreateGUI(state: GameState) {
  const gui = new GUI();
  gui.add( state.params, 'fans' );
  gui.add( state.params, 'stress' );
  gui.add( state.params, 'affection' );
  gui.add( state.params, 'sickness' );
  gui.add( state, 'day', DAYS);
  gui.add( state, 'timeOfDay', ['昼', '夕方', '夜']);
  gui.add( state, 'consecutiveStreamDays');
  gui.add( state, 'gameLevel');
  gui.add( state, 'experienceLevel');
  gui.add( state, 'impactLevel');
  gui.add( state, 'announcementDay', (DAYS as any[]).concat([null]));
  gui.add( state, 'darkStreamLockedUntilDay', (DAYS as any[]).concat([null]));
  gui.add( state, 'unreadJineStreak');
  gui.add( state, 'hadDaytimeOverdose');
  gui.add( state, 'harumagedonLevel');
  gui.add( state, 'unlockedStreamTopicIds');
  

  const unlockedFolder = gui.addFolder('unlocked');
  const unlockedControllerMap = new Map<StreamGenre, Controller>();
  var unlockedLevel: Record<StreamGenre, number> = {
    chat: 0,
    game: 0,
    angel_explain: 0,
    conspiracy: 0,
    net_lore: 0,
    asmr: 0,
    sexy: 0,
    dark: 0,
    otaku: 0,
    challenge: 0,
    pr: 0,
    internet_angel: 0
  }

  const broadcastedFolder = gui.addFolder('broadcasted');
  const broadcastControllerMap = new Map<StreamGenre, Controller>();
  var broadcastedLevel: Record<StreamGenre, number> = {
    chat: 0,
    game: 0,
    angel_explain: 0,
    conspiracy: 0,
    net_lore: 0,
    asmr: 0,
    sexy: 0,
    dark: 0,
    otaku: 0,
    challenge: 0,
    pr: 0,
    internet_angel: 0
  }

  const updateDisplay = function() {
    for(const genre of STREAM_GENRES){
      unlockedLevel[genre] = [1, 2, 3, 4, 5].find(lv => !state.unlockedStreamTopicIds.has(`${genre}-${lv}`)) ?? 6 - 1;
      broadcastedLevel[genre] = [1, 2, 3, 4, 5].find(lv => !state.broadcastedStreamTopicIds.has(`${genre}-${lv}`)) ?? 6 - 1;
    }
    gui.controllersRecursive().forEach(con => con.updateDisplay());
  };

  (async () => {
    await delayFrame(1);
    updateDisplay();
  })();

  state.onBusyChanged.on(updateDisplay);

  const onChangeUnlockedLevel = function(genre: StreamGenre, newValue: number){
    const levelSet = [0, 1, 2, 3, 4, 5];
    for(const level of levelSet){
      const streamId = `${genre}-${level}`;
      if(level <= newValue) {
        state.unlockedStreamTopicIds.add(streamId);
      }
      else {
        state.unlockedStreamTopicIds.delete(streamId);
      }
      broadcastControllerMap.get(genre)?.setValue(Math.min(newValue, Math.max(newValue - 1, broadcastedLevel[genre])));
      // broadcastedLevel[genre] = Math.min(newValue, Math.max(newValue - 1, broadcastedLevel[genre]));
      // updateDisplay();
    }
  }

  for(const genre of STREAM_GENRES){
    const con = unlockedFolder.add( unlockedLevel, genre, [0, 1, 2, 3, 4, 5] )
      .onChange(onChangeUnlockedLevel.bind(null, genre))
    unlockedControllerMap.set(genre, con);
  }

  const onChangeBroadcastedLevel = function(genre: StreamGenre, newValue: number) {
    const levelSet = [0, 1, 2, 3, 4, 5];
    for(const level of levelSet){
      const streamId = `${genre}-${level}`;
      if(level <= newValue) {
        state.broadcastedStreamTopicIds.add(streamId);
      }
      else {
        state.broadcastedStreamTopicIds.delete(streamId);
      }
      unlockedControllerMap.get(genre)?.setValue(Math.min(newValue + 1, Math.max(newValue, unlockedLevel[genre])));
      // unlockedLevel[genre] = Math.min(newValue + 1, Math.max(newValue, unlockedLevel[genre]));
      // updateDisplay();
    }
  }

  for(const genre of STREAM_GENRES){
    const con = broadcastedFolder.add( broadcastedLevel, genre, [0, 1, 2, 3, 4, 5] )
      .onChange(onChangeBroadcastedLevel.bind(null, genre));
    broadcastControllerMap.set(genre, con);
  }

  currentGui?.destroy();
  currentGui = gui;
}