// ===============
// 簡易データ(JSONをそのまま文字列でコピーして使う想定)
// data.json の想定構造: { "action": { [ActionName]: { "jine": string[], "poketter": string[] } } }
// ここでは内部に直書きして JSON.parse で利用します。
const RAW_DATA_JSON = JSON.stringify({
  action: {
    "ゲーム": {
      jine: ["ゲームしよ！", "今日のランク上げる！", "配信までのウォームアップ〜"],
      poketter: ["ゲームしてる", "勝った！最高！", "負けた…つらい"]
    },
    "コミュニケーション": {
      jine: ["おしゃべりする？", "DM返すタイム", "コメント拾ってくる〜"],
      poketter: ["みんなの声聞いてるよ", "DM追いつかん…", "リプ返し祭り"]
    },
    "えっちなこと": {
      jine: ["ちょっとドキドキ…", "秘密の時間…？", "内緒だよ…"],
      poketter: ["ふふ…", "大人の時間…", "ナイショ"]
    },
    "夕方まで寝る": {
      jine: ["お昼寝してくる〜", "Zzz…", "起きたら連絡するね"],
      poketter: ["昼寝した", "回復！", "寝すぎたかも"]
    },
    "夜まで寝る": {
      jine: ["ぐっすりコース", "まだ眠い…", "いっぱい寝る！"],
      poketter: ["寝てた", "昼夜逆転の波", "夜まで寝た"]
    },
    "明日まで寝る": {
      jine: ["今日はもうおやすみ", "また明日！", "お布団最高"]
      , poketter: ["完全にオフにする", "明日からがんばる", "睡眠大事"]
    },
    "おくすり": {
      jine: ["お薬飲むね", "副作用でちょっとだるいかも", "効いてきた気がする"],
      poketter: ["体調管理、大事", "処方守るの大切", "お薬タイム"]
    },
    "SNS": {
      jine: ["SNS見てくる", "タイムライン追いかける", "バズってないかな"],
      poketter: ["タイムライン徘徊", "流行チェック", "トレンド追いかけ"]
    },
    "エゴサ": {
      jine: ["名前で検索…", "怖いもの見たさ…", "褒められてると嬉しい"],
      poketter: ["自分の名前見てる", "ちょっとメンタル削れる", "優しい世界希望"]
    },
    "動画サイト": {
      jine: ["おすすめ漁る", "勉強になる", "切り抜き見てる"],
      poketter: ["動画見てた", "編集すごい", "時間溶けた"]
    },
    "掲示板": {
      jine: ["掲示板こわ…", "たまに有益", "深淵を覗く"],
      poketter: ["掲示板見てた", "治安悪い", "情報収集"]
    },
    "マチアプ": {
      jine: ["冷やかし程度に…", "通知鳴る…", "へぇ〜"]
      , poketter: ["民度まちまち", "人間観察", "出会いは一期一会"]
    }
  }
});
const GAME_DATA = JSON.parse(RAW_DATA_JSON);

// ===============
// アプリ/アイコン定義
const APPS = [
  { id: 'jine', name: 'JINE', emoji: '💬' },
  { id: 'poketter', name: 'Poketter', emoji: '🐦' },
  { id: 'task', name: 'タスクマネージャ', emoji: '📊' },
  { id: 'play', name: 'あそぶ', emoji: '🎮' },
  { id: 'sleep', name: 'ねる', emoji: '😴' },
  { id: 'med', name: 'おくすり', emoji: '💊' },
  { id: 'net', name: 'インターネット', emoji: '🌐' }
];

// 8種スタンプ
const STAMPS = ['😀','😍','😭','😡','🫶','👍','💤','💊'];

// 時間帯
const TIMES = [
  { key:'昼', emoji:'🌞' },
  { key:'夕方', emoji:'🌆' },
  { key:'夜', emoji:'🌙' }
];

// 行動ごとのパラメータ変化と時間進行(内部ルール)
const ACTION_RULES = {
  'ゲーム':        { followers:+50, stress:+10, affection:+5, dark:+5, step:1 },
  'コミュニケーション': { followers:+20, stress:-5, affection:+10, dark:-5, step:1 },
  'えっちなこと':   { followers:+80, stress:+10, affection:+5, dark:+15, step:1 },
  '夕方まで寝る':    { followers:+0,  stress:-20, affection:+0,  dark:-5,  step:1 },
  '夜まで寝る':     { followers:+0,  stress:-25, affection:+0,  dark:-5,  step:2 },
  '明日まで寝る':    { followers:+0,  stress:-35, affection:+0,  dark:-10, step:3 },
  'おくすり':       { followers:+0,  stress:-10, affection:+0,  dark:-5,  step:1 },
  'SNS':           { followers:+10, stress:+5,  affection:+0,  dark:+5,  step:1 },
  'エゴサ':         { followers:+0,  stress:+15, affection:-5,  dark:+10, step:1 },
  '動画サイト':      { followers:+0,  stress:-5,  affection:+0,  dark:+0,  step:1 },
  '掲示板':         { followers:+0,  stress:+10, affection:-5,  dark:+10, step:1 },
  'マチアプ':        { followers:+5,  stress:+0,  affection:+0,  dark:+5,  step:1 }
};

// ===============
// ゲーム状態
const state = {
  day: 1,
  timeIndex: 0, // 0:昼 1:夕方 2:夜
  params: { followers: 0, stress: 10, affection: 50, dark: 10 },
  history: { stress:[10], affection:[50], dark:[10] },
  jineMessages: [], // {who:'me'|'other'|'sys', text}
  pokets: [], // tweets
};

// ===============
// DOM ショートカット
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

// ===============
// アイコン配置（上から下、端まで来たら右に列を増やす）
function mountIcons(){
  const wrap = $('#icons');
  wrap.innerHTML = '';
  for(const app of APPS){
    const div = document.createElement('div');
    div.className = 'desk-icon';
    div.dataset.app = app.id;
    div.innerHTML = `<div class="emoji">${app.emoji}</div><div class="label">${app.name}</div>`;
    div.addEventListener('dblclick', ()=> openApp(app.id));
    wrap.appendChild(div);
  }
  layoutIcons();
  window.addEventListener('resize', layoutIcons);
}

function layoutIcons(){
  const wrap = $('#icons');
  const items = $$('.desk-icon', wrap);
  const tb = $('#taskbar');
  const pad = 8;
  const maxH = wrap.clientHeight - pad; // icons area already excludes taskbar
  let x = pad;
  let y = pad;
  const colGap = 12;
  const rowGap = 8;
  let colW = 120;
  items.forEach((el)=>{
    const h = el.offsetHeight || 64; // fallback
    if(y + h > maxH){
      // next column
      y = pad;
      x += colW + colGap;
    }
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    y += h + rowGap;
  });
}

// ===============
// ウィンドウ管理
const wm = {
  z: 10,
  windows: new Map(),
  active: null,
};

function createWindow({id,title,width=420,height=360,content}){
  const area = $('#windows');
  const win = document.createElement('div');
  win.className = 'win';
  win.dataset.win = id;
  win.style.left = Math.round(40 + Math.random()*100) + 'px';
  win.style.top  = Math.round(40 + Math.random()*60) + 'px';
  win.style.width = width + 'px';
  win.style.height = height + 'px';

  win.innerHTML = `
    <div class="win-title">
      <div class="title">${title}</div>
      <div class="controls">
        <button data-act="min">—</button>
        <button data-act="max">▢</button>
        <button data-act="close">×</button>
      </div>
    </div>
    <div class="win-body"></div>
  `;
  $('.win-body', win).appendChild(content);
  area.appendChild(win);

  enableWindowBehaviors(win);
  wm.windows.set(id, { el: win, id, title, minimized:false, maximized:false });
  focusWindow(id);
  addTaskbarButton(id, title);
  return win;
}

function focusWindow(id){
  const w = wm.windows.get(id);
  if(!w) return;
  wm.z += 1;
  w.el.style.zIndex = wm.z;
  $$('.win').forEach(e=>e.classList.remove('active'));
  w.el.classList.add('active');
  wm.active = id;
  // taskbar active
  $$('.task-app').forEach(b=>b.classList.toggle('active', b.dataset.win===id));
}

function closeWindow(id){
  const w = wm.windows.get(id);
  if(!w) return;
  removeTaskbarButton(id);
  w.el.remove();
  wm.windows.delete(id);
  if(wm.active===id) wm.active = null;
}

function minimizeWindow(id){
  const w = wm.windows.get(id); if(!w) return;
  w.minimized = true;
  w.el.style.display = 'none';
  $(`.task-app[data-win="${id}"]`)?.classList.remove('active');
}

function restoreWindow(id){
  const w = wm.windows.get(id); if(!w) return;
  w.minimized = false;
  w.el.style.display = '';
  focusWindow(id);
}

function toggleMaximize(id){
  const w = wm.windows.get(id); if(!w) return;
  const el = w.el;
  if(!w.maximized){
    // save rect
    const rect = el.getBoundingClientRect();
    w.prev = { left: el.style.left, top: el.style.top, width: el.style.width, height: el.style.height };
    el.classList.add('maximized');
    el.style.left = '0px';
    el.style.top = '0px';
    el.style.width = '100%';
    el.style.height = (document.body.clientHeight - $('#taskbar').offsetHeight) + 'px';
    w.maximized = true;
  }else{
    el.classList.remove('maximized');
    if(w.prev){
      el.style.left = w.prev.left; el.style.top = w.prev.top; el.style.width = w.prev.width; el.style.height = w.prev.height;
    }
    w.maximized = false;
  }
  focusWindow(id);
}

function enableWindowBehaviors(win){

  // drag by title bar
  const bar = $('.win-title', win);
  let drag = null;
  let x = 0;
  let y = 0;
  win.addEventListener('pointerdown', (e)=>{
    if(e.button!==0) return;
    focusWindow(win.dataset.win)
    // const wrec = win.getBoundingClientRect();
    // drag = { dx:e.clientX - wrec.left, dy:e.clientY - wrec.top };
    // win.setPointerCapture(e.pointerId);
  });
  bar.addEventListener('pointermove', (e)=>{
    if(!e.buttons) return;
    x += e.movementX;
    y += e.movementY;
    win.style.transform = `translate(${x}px, ${y}px)`;
    e.target.setPointerCapture(e.pointerId);
    // const maxW = document.body.clientWidth;
    // const maxH = document.body.clientHeight - $('#taskbar').offsetHeight;
    // let nx = e.clientX - drag.dx;
    // let ny = e.clientY - drag.dy;
    // nx = Math.max(0, Math.min(nx, maxW - win.offsetWidth));
    // ny = Math.max(0, Math.min(ny, maxH - win.offsetHeight));
    // win.style.left = nx + 'px';
    // win.style.top = ny + 'px';
  });
  // bar.addEventListener('mouseup', ()=> drag=null);

  // controls
  bar.addEventListener('click', (e)=>{
    const b = e.target.closest('button');
    if(!b) return;
    const id = win.dataset.win;
    if(b.dataset.act==='close') closeWindow(id);
    if(b.dataset.act==='min') minimizeWindow(id);
    if(b.dataset.act==='max') toggleMaximize(id);
  });
}

// ===============
// タスクバー
function addTaskbarButton(id, title){
  const wrap = $('#taskbar-apps');
  let btn = $(`.task-app[data-win="${id}"]`);
  if(btn) return;
  btn = document.createElement('button');
  btn.className = 'task-app';
  btn.dataset.win = id;
  btn.textContent = title;
  btn.addEventListener('click', ()=>{
    const w = wm.windows.get(id);
    if(!w) return;
    if(w.minimized){ restoreWindow(id); }
    else { focusWindow(id); }
  });
  wrap.appendChild(btn);
}
function removeTaskbarButton(id){
  $(`.task-app[data-win="${id}"]`)?.remove();
}

// ===============
// 日時表示
function renderClock(){
  const c = $('#clock');
  const t = TIMES[state.timeIndex];
  c.textContent = `day${state.day} ${t.emoji}`;
}
function advanceTime(steps=1){
  for(let i=0;i<steps;i++){
    state.timeIndex++;
    if(state.timeIndex>2){ state.timeIndex=0; state.day++; }
  }
  renderClock();
}

// ===============
// アプリの実装
function openApp(id){
  if(wm.windows.has(id)){
    const w = wm.windows.get(id);
    if(w.minimized) restoreWindow(id); else focusWindow(id);
    return;
  }
  if(id==='jine') return openJINE();
  if(id==='poketter') return openPoketter();
  if(id==='task') return openTaskManager();
  if(id==='play') return openPlay();
  if(id==='sleep') return openSleep();
  if(id==='med') return openMed();
  if(id==='net') return openNet();
}

// JINE
function openJINE(){
  const content = document.createElement('div');
  content.className = 'jine';
  const chat = document.createElement('div'); chat.className = 'chat';
  const choices = document.createElement('div'); choices.className='choices hidden';
  const stamps = document.createElement('div'); stamps.className = 'stamps';
  for(const s of STAMPS){
    const b = document.createElement('button'); b.textContent = s;
    b.addEventListener('click', ()=>{
      addJineMessage('me', s);
    });
    stamps.appendChild(b);
  }
  content.append(chat, choices, stamps);
  const win = createWindow({id:'jine', title:'JINE', width:460, height:480, content});
  // 初期メッセージ
  if(state.jineMessages.length===0){
    addJineMessage('other', '今日もがんばろう〜');
    presentReplyChoices(['うん！','ちょっと眠い…','あと5分…']);
  }else{
    state.jineMessages.forEach(m=> renderJineBubble(chat, m));
  }

  function addJineMessage(who, text){
    const msg = { who, text };
    state.jineMessages.push(msg);
    renderJineBubble(chat, msg);
    chat.scrollTop = chat.scrollHeight;
    saveState();
  }
  function renderJineBubble(container, msg){
    const div = document.createElement('div');
    div.className = `bubble ${msg.who==='me'?'me':'other'}`;
    div.textContent = msg.text;
    container.appendChild(div);
  }
  function presentReplyChoices(opts){
    choices.innerHTML = '';
    for(const o of opts){
      const b = document.createElement('button');
      b.textContent = o;
      b.addEventListener('click', ()=>{
        choices.classList.add('hidden');
        addJineMessage('me', o);
      });
      choices.appendChild(b);
    }
    choices.classList.remove('hidden');
  }

  // expose helpers
  win.__jine = { addJineMessage, presentReplyChoices };
}

// Poketter
function openPoketter(){
  const content = document.createElement('div');
  const tl = document.createElement('div'); tl.className='timeline';
  content.appendChild(tl);
  const win = createWindow({id:'poketter', title:'Poketter', width:520, height:480, content});
  renderTimeline();

  function renderTimeline(){
    tl.innerHTML = '';
    for(const tw of state.pokets){
      tl.appendChild(renderTweet(tw));
    }
  }
  function renderTweet(t){
    const row = document.createElement('div');
    row.className='tweet';
    row.innerHTML = `
      <div class="avatar">${t.avatar}</div>
      <div>
        <div><strong>${t.name}</strong> <span class="meta">@${t.id} ・ ${t.time}</span></div>
        <div class="body">${t.text}</div>
        <div class="counts">❤ ${t.like}　🔁 ${t.rt}</div>
      </div>
    `;
    return row;
  }
  // expose
  win.__poke = { renderTimeline };
}

// タスクマネージャ
function openTaskManager(){
  const content = document.createElement('div');
  const wrap = document.createElement('div'); wrap.className='tm';
  wrap.innerHTML = `
    <div class="name">フォロワー数</div><div class="val" id="tm-followers"></div><div></div>
    <div class="name">ストレス</div><div class="val" id="tm-stress"></div><canvas class="spark" id="spark-stress"></canvas>
    <div class="name">好感度</div><div class="val" id="tm-affection"></div><canvas class="spark" id="spark-affection"></canvas>
    <div class="name">やみ度</div><div class="val" id="tm-dark"></div><canvas class="spark" id="spark-dark"></canvas>
  `;
  content.appendChild(wrap);
  const win = createWindow({id:'task', title:'タスクマネージャ', width:560, height:300, content});
  renderTask();

  function renderTask(){
    $('#tm-followers').textContent = state.params.followers.toString();
    $('#tm-stress').textContent = state.params.stress + '%';
    $('#tm-affection').textContent = state.params.affection + '%';
    $('#tm-dark').textContent = state.params.dark + '%';
    drawSpark($('#spark-stress'), state.history.stress, '#ff6fa1');
    drawSpark($('#spark-affection'), state.history.affection, '#6fd6a6');
    drawSpark($('#spark-dark'), state.history.dark, '#8a7ff7');
  }
  win.__task = { renderTask };
}

function drawSpark(canvas, data, color){
  const ctx = canvas.getContext('2d');
  const W = canvas.clientWidth, H = canvas.clientHeight;
  canvas.width = W * devicePixelRatio; canvas.height = H * devicePixelRatio;
  ctx.scale(devicePixelRatio, devicePixelRatio);
  ctx.clearRect(0,0,W,H);
  const n = data.length;
  if(n<2) return;
  const max = 100; const min = 0;
  ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath();
  for(let i=0;i<n;i++){
    const x = (W-8) * (i/(n-1)) + 4;
    const val = data[i];
    const y = H - 6 - (H-12) * ((val-min)/(max-min));
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  }
  ctx.stroke();
}

// あそぶ
function openPlay(){
  const content = document.createElement('div'); content.className='action-list';
  const acts = [
    {key:'ゲーム', icon:'🎮'},
    {key:'コミュニケーション', icon:'🗣️'},
    {key:'えっちなこと', icon:'🔞'}
  ];
  acts.forEach(a=>{
    const item = document.createElement('div'); item.className='action-item';
    item.innerHTML = `<div class="icon">${a.icon}</div><div>${a.key}</div>`;
    item.addEventListener('click', ()=> performAction(a.key));
    content.appendChild(item);
  });
  createWindow({id:'play', title:'あそぶ', width:300, height:260, content});
}

// ねる
function openSleep(){
  const content = document.createElement('div'); content.className='action-list';
  const acts = [
    {key:'夕方まで寝る', icon:'🛌'},
    {key:'夜まで寝る', icon:'🌙'},
    {key:'明日まで寝る', icon:'☀️'}
  ];
  acts.forEach(a=>{
    const item = document.createElement('div'); item.className='action-item';
    item.innerHTML = `<div class="icon">${a.icon}</div><div>${a.key}</div>`;
    item.addEventListener('click', ()=> performAction(a.key));
    content.appendChild(item);
  });
  createWindow({id:'sleep', title:'ねる', width:300, height:220, content});
}

// おくすり
function openMed(){
  const content = document.createElement('div'); content.className='action-list';
  const card = document.createElement('div'); card.className='action-item';
  card.innerHTML = `
    <div class="icon" style="font-size:40px">💊</div>
    <div>
      <div><strong>名前:</strong> SSRI(仮)</div>
      <div><strong>効果:</strong> 気分の安定</div>
      <div><strong>副作用:</strong> 眠気、だるさ</div>
      <div><strong>あめちゃんメモ:</strong> 焦らず継続。</div>
      <div style="margin-top:6px"><button id="med-take">服用する</button></div>
    </div>`;
  content.appendChild(card);
  const win = createWindow({id:'med', title:'おくすり', width:420, height:240, content});
  $('#med-take', win).addEventListener('click', ()=> performAction('おくすり'));
}

// インターネット
function openNet(){
  const content = document.createElement('div'); content.className='action-list';
  const acts = [
    {key:'SNS', icon:'💬'},
    {key:'エゴサ', icon:'🔎'},
    {key:'動画サイト', icon:'📺'},
    {key:'掲示板', icon:'📜'},
    {key:'マチアプ', icon:'📱'}
  ];
  acts.forEach(a=>{
    const item = document.createElement('div'); item.className='action-item';
    item.innerHTML = `<div class="icon">${a.icon}</div><div>${a.key}</div>`;
    item.addEventListener('click', ()=> performAction(a.key));
    content.appendChild(item);
  });
  createWindow({id:'net', title:'インターネット', width:320, height:320, content});
}

// ===============
// 行動の効果
function performAction(actionKey){
  const rule = ACTION_RULES[actionKey] || {followers:0,stress:0,affection:0,dark:0,step:1};
  // 数値更新
  state.params.followers = Math.max(0, state.params.followers + rule.followers);
  state.params.stress = clamp01p(state.params.stress + rule.stress);
  state.params.affection = clamp01p(state.params.affection + rule.affection);
  state.params.dark = clamp01p(state.params.dark + rule.dark);
  pushHistory();
  // 投稿
  postByAction(actionKey);
  // 時間進行
  advanceTime(rule.step||1);
  // UI更新
  updateAppsAfterStateChange();
  // たまにJINE返信選択肢
  maybeShowJineChoices();
  // セーブ
  saveState();
}

function clamp01p(v){ return Math.max(0, Math.min(100, v)); }
function pushHistory(){
  const cap = 48;
  for(const key of ['stress','affection','dark']){
    state.history[key].push(state.params[key]);
    if(state.history[key].length>cap) state.history[key].shift();
  }
}

function postByAction(actionKey){
  const a = GAME_DATA.action[actionKey];
  if(!a) return;
  // JINE: 相手から届いた風
  if(wm.windows.has('jine')){
    const chat = wm.windows.get('jine').el.__jine;
    chat?.addJineMessage('other', pick(a.jine));
  }else{
    state.jineMessages.push({who:'other', text:pick(a.jine)});
  }
  // Poketter: TLにポスト
  const tweet = {
    avatar:'💗', name:'Ame-chan', id:'angel_ame', text:pick(a.poketter),
    like:  Math.floor(10+Math.random()*500),
    rt:    Math.floor(3+Math.random()*200),
    time:  `day${state.day} ${TIMES[state.timeIndex].key}`
  };
  state.pokets.unshift(tweet);
  if(wm.windows.has('poketter')) wm.windows.get('poketter').el.__poke?.renderTimeline();
}

function maybeShowJineChoices(){
  if(!wm.windows.has('jine')) return;
  // 50%で選択肢を出す
  if(Math.random()<0.5){
    const opts = ['了解〜','いいね！','やめとく…','あとでにしよ'];
    wm.windows.get('jine').el.__jine?.presentReplyChoices(opts);
  }
}

function updateAppsAfterStateChange(){
  if(wm.windows.has('task')) wm.windows.get('task').el.__task?.renderTask();
}

function pick(arr){ return arr[Math.floor(Math.random()*arr.length)] }

// ===============
// スタートメニュー
function setupStartMenu(){
  const btn = $('#start-button');
  const menu = $('#start-menu');
  btn.addEventListener('click', ()=>{
    menu.classList.toggle('hidden');
    menu.setAttribute('aria-hidden', menu.classList.contains('hidden'));
  });
  document.addEventListener('click', (e)=>{
    if(!menu.contains(e.target) && e.target!==btn){ menu.classList.add('hidden'); }
  });
  menu.addEventListener('click', (e)=>{
    const b = e.target.closest('button'); if(!b) return;
    const act = b.dataset.startAction;
    if(act==='new'){ clearState(); initState(); saveState(); location.reload(); }
    if(act==='continue'){ loadState(); renderClock(); }
    if(act==='pictures'){ openPictures(); }
    if(act==='control'){ openTaskManager(); }
    if(act==='reboot'){ clearState(); location.reload(); }
    if(act==='shutdown'){ shutdownOverlay(); }
    menu.classList.add('hidden');
  });
}

function openPictures(){
  const content = document.createElement('div'); content.className='action-list';
  ['📸','🐱','🌸','🍰','✨','🎀','🧸'].forEach(e=>{
    const item = document.createElement('div'); item.className='action-item';
    item.innerHTML = `<div class="icon" style="font-size:28px">${e}</div><div>かわいいピクチャ</div>`;
    content.appendChild(item);
  });
  createWindow({id:'pics', title:'マイピクチャ', width:360, height:300, content});
}

function shutdownOverlay(){
  const ov = document.createElement('div');
  ov.style.position='fixed'; ov.style.inset='0'; ov.style.background='#111'; ov.style.color='#fff';
  ov.style.display='flex'; ov.style.alignItems='center'; ov.style.justifyContent='center'; ov.style.fontSize='20px';
  ov.textContent = '電源オフ… (F5で再開)';
  document.body.appendChild(ov);
}

// ===============
// セーブ/ロード
function saveState(){
  try{
    const data = JSON.stringify(state);
    localStorage.setItem('NGO_STATE', data);
  }catch(e){ /* ignore */ }
}
function loadState(){
  try{
    const d = localStorage.getItem('NGO_STATE');
    if(!d) return;
    const s = JSON.parse(d);
    // shallow assign only known keys
    state.day = s.day||1;
    state.timeIndex = s.timeIndex||0;
    state.params = s.params||state.params;
    state.history = s.history||state.history;
    state.jineMessages = s.jineMessages||[];
    state.pokets = s.pokets||[];
  }catch(e){ /* ignore */ }
}
function clearState(){ localStorage.removeItem('NGO_STATE'); }
function initState(){
  state.day=1; state.timeIndex=0; state.params={followers:0,stress:10,affection:50,dark:10};
  state.history={stress:[10],affection:[50],dark:[10]};
  state.jineMessages=[]; state.pokets=[];
}

// ===============
// 初期化
function boot(){
  mountIcons();
  setupStartMenu();
  loadState();
  renderClock();
}
document.addEventListener('DOMContentLoaded', boot);

