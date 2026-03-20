/* ───────────────────────────────────────────
   SHARED STATE
─────────────────────────────────────────── */
const cs = {
  memoryClarity: 0,
  routeTimeLeft: 15,
  suspicion: 0,
  trust: 2,
  threat: 1,
  patience: 4,
  exposure: 1,
  unlockedKeywords: [],
  proofsEstablished: { symbol: false, taronwaliKothi: false, zoraver: false },
  part1Result: 'low',
  part2Result: 'clean',
  part3Result: null,
  lastOptionTag: null
};

/* ───────────────────────────────────────────
   SCENE MANAGER
─────────────────────────────────────────── */
const SCENES = ['sceneIntro','scenePart1','sceneTransition1','scenePart2',
                'sceneTransition2','scenePart3','sceneEnding'];

function goToScene(name) {
  const overlay = document.getElementById('fadeOverlay');
  overlay.classList.add('fading');
  setTimeout(() => {
    SCENES.forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.classList.remove('active'); }
    });
    let target;
    if (name === 'intro')       target = 'sceneIntro';
    else if (name === 'part1')  { target = 'scenePart1'; initPart1(); }
    else if (name === 'trans1') { target = 'sceneTransition1'; buildTransition1(); }
    else if (name === 'part2')  { target = 'scenePart2'; initPart2(); }
    else if (name === 'trans2') { target = 'sceneTransition2'; buildTransition2(); }
    else if (name === 'part3')  target = 'scenePart3';
    else if (name === 'ending') { target = 'sceneEnding'; buildEnding(); }
    const el = document.getElementById(target);
    if (el) el.classList.add('active');
    window.scrollTo(0, 0);
    overlay.classList.remove('fading');
  }, 600);
}

function restartChapter() {
  Object.assign(cs, {
    memoryClarity: 0, routeTimeLeft: 15, suspicion: 0,
    trust: 2, threat: 1, patience: 4, exposure: 1,
    unlockedKeywords: [], proofsEstablished: { symbol:false, taronwaliKothi:false, zoraver:false },
    part1Result:'low', part2Result:'clean', part3Result:null, lastOptionTag:null
  });
  goToScene('intro');
}

/* ═══════════════════════════════════════════
   PART 1 — SYMBOL MEMORY PUZZLE
═══════════════════════════════════════════ */

const CLUES = [
  {
    id: 'seal',
    name: 'Envelope Seal',
    desc: 'A pressed wax seal bearing a mark that is not the post office stamp.',
    feedback: 'The seal is irregular. Hand-pressed. Someone made this themselves — someone who knew the old ways of marking a message.',
    unlocks: ['symbol']
  },
  {
    id: 'insignia',
    name: 'Insignia on Paper',
    desc: 'A small drawn symbol above the salutation. Three interlocked lines and a curve.',
    feedback: 'You have seen this mark before. Not in a book. In a courtyard. On stone. A long time ago.',
    unlocks: ['courtyard', 'symbol_dust']
  },
  {
    id: 'texture',
    name: 'Paper Texture',
    desc: 'The paper is Indian handmade stock, not English. This did not come through ordinary post.',
    feedback: 'This paper travelled a long way. Someone brought it by hand, or passed it through channels that avoid the mail censors.',
    unlocks: ['old_letter']
  },
  {
    id: 'phrase',
    name: 'A Phrase in the Letter',
    desc: '"You were meant for something more than service to their system." Underlined once.',
    feedback: 'She said words like these once. Not exactly these words. But this feeling. Standing in the courtyard at Taronwali Kothi.',
    unlocks: ['meant_more', 'mother']
  },
  {
    id: 'noreturn',
    name: 'No Return Address',
    desc: 'There is none. Not even a city. This was written with the expectation that no reply would be possible.',
    feedback: 'A letter with no return. Either the sender is in danger, or they do not wish to be found until the time is right.',
    unlocks: ['taronwali_kothi']
  },
  {
    id: 'sender',
    name: 'Sender Signature',
    desc: 'Signed only "K." — a single initial. Not a name one would place on official correspondence.',
    feedback: 'Kishanlal. There is only one Khatri known to the movement who would use this mark.',
    unlocks: ['zoraver_word']
  }
];

const FRAGMENTS = [
  { id: 'symbol',       label: 'The Symbol',       icon: '◈' },
  { id: 'courtyard',    label: 'Courtyard',         icon: '⌂' },
  { id: 'symbol_dust',  label: 'Symbol in the Dust',icon: '≋' },
  { id: 'old_letter',   label: 'Old Letter',        icon: '✉' },
  { id: 'mother',       label: 'Mother',            icon: '♾' },
  { id: 'meant_more',   label: '"Meant for More"',  icon: '◎' },
  { id: 'taronwali_kothi', label: 'Taronwali Kothi', icon: '⊕' },
  { id: 'zoraver_word', label: 'Zoraver',           icon: '⋆' },
  { id: 'himmat',       label: 'Himmat',            icon: '❈' }
];

const KEYWORD_MAP = {
  low:    ['letter', 'symbol'],
  medium: ['letter', 'symbol', 'Taronwali Kothi', 'childhood'],
  high:   ['letter', 'symbol', 'Taronwali Kothi', 'childhood', 'mother', 'Zoraver', 'Himmat']
};

let p1State = { revealed: new Set(), matched: new Set(), usedClues: new Set() };

function initPart1() {
  p1State = { revealed: new Set(), matched: new Set(), usedClues: new Set() };
  cs.memoryClarity = 0;

  // Build clue list
  const list = document.getElementById('clueList');
  list.innerHTML = '';
  CLUES.forEach(clue => {
    const el = document.createElement('div');
    el.className = 'clue-item';
    el.id = 'clue_' + clue.id;
    el.innerHTML = `<div class="clue-name">${clue.name}</div><div class="clue-desc">${clue.desc}</div>`;
    el.onclick = () => inspectClue(clue);
    list.appendChild(el);
  });

  // Build fragments
  const grid = document.getElementById('fragmentsGrid');
  grid.innerHTML = '';
  FRAGMENTS.forEach(f => {
    const el = document.createElement('div');
    el.className = 'fragment-card locked';
    el.id = 'frag_' + f.id;
    el.innerHTML = `<div class="fragment-icon">${f.icon}</div><div class="fragment-label">${f.label}</div>`;
    el.onclick = () => matchFragment(f.id);
    grid.appendChild(el);
  });

  // Build clarity track
  buildClarityUI();
}

function inspectClue(clue) {
  if (p1State.usedClues.has(clue.id)) return;
  p1State.usedClues.add(clue.id);
  document.getElementById('clue_' + clue.id).classList.add('used');
  document.getElementById('p1Feedback').textContent = clue.feedback;

  // Reveal associated fragments
  clue.unlocks.forEach(fragId => {
    if (!p1State.revealed.has(fragId)) {
      p1State.revealed.add(fragId);
      const el = document.getElementById('frag_' + fragId);
      if (el) {
        el.classList.remove('locked');
        el.classList.add('revealed');
      }
    }
  });
}

function matchFragment(fragId) {
  if (p1State.matched.has(fragId)) return;
  if (!p1State.revealed.has(fragId)) return;
  p1State.matched.add(fragId);
  const el = document.getElementById('frag_' + fragId);
  if (el) el.classList.add('matched');

  cs.memoryClarity = Math.min(6, p1State.matched.size);
  buildClarityUI();

  const label = FRAGMENTS.find(f => f.id === fragId)?.label || fragId;
  document.getElementById('p1Feedback').textContent =
    `"${label}" — this is part of the pattern. Something is assembling itself in memory.`;
}

function buildClarityUI() {
  const track = document.getElementById('clarityTrack');
  track.innerHTML = '';
  for (let i = 0; i < 6; i++) {
    const pip = document.createElement('div');
    pip.className = 'clarity-pip' + (i < cs.memoryClarity ? ' filled' : '');
    track.appendChild(pip);
  }

  const band = cs.memoryClarity <= 2 ? '— Low Clarity —'
             : cs.memoryClarity <= 4 ? '— Medium Clarity —'
             : '— High Clarity —';
  document.getElementById('clarityBand').textContent = band;

  const level = cs.memoryClarity <= 2 ? 'low'
              : cs.memoryClarity <= 4 ? 'medium' : 'high';
  cs.unlockedKeywords = KEYWORD_MAP[level];
  cs.part1Result = level;

  const rw = document.getElementById('recoveredWords');
  rw.innerHTML = '';
  cs.unlockedKeywords.forEach(w => {
    const d = document.createElement('div');
    d.className = 'recovered-word'; d.textContent = w;
    rw.appendChild(d);
  });
}

function proceedFromPart1() {
  if (cs.memoryClarity < 3) {
    // Auto-fill to minimum 3 so game can proceed
    cs.memoryClarity = Math.max(cs.memoryClarity, 2);
  }
  goToScene('trans1');
}

function buildTransition1() {
  const level = cs.part1Result;
  const lines = {
    low: 'The memories remain blurred — fragments without full context. Dadabhai knows the symbol matters. He does not yet know why.',
    medium: 'Pieces of Taronwali Kothi are returning — the courtyard, the old letter, something his mother once said. Dadabhai sets down the paper and thinks of Cambridge.',
    high: 'The full weight of Taronwali Kothi has returned. The symbol, the courtyard, his mother\'s voice — and the name Zoraver, heard once and never forgotten. Dadabhai already knows what he must do.'
  };
  document.getElementById('t1Body').textContent = lines[level] || lines.medium;
  document.getElementById('t1Status').textContent =
    `Memory Clarity: ${cs.memoryClarity} / 6  ·  ${cs.part1Result.toUpperCase()}`;
}

/* ═══════════════════════════════════════════
   PART 2 — TIMED ROUTE INFILTRATION
═══════════════════════════════════════════ */

const ROUTE_NODES = [
  {
    id: 'street_corner',
    title: 'Street Corner',
    desc: 'Khatri stands at the junction. Lamplight pools fifty yards ahead. He can see the porch — but between him and it lies open road.',
    actions: {
      sprint: { label: 'Sprint',  cost: '−2s · +2 suspicion', time: -2, sus: +2, tag: 'fast' },
      dodge:  { label: 'Dodge',   cost: '−3s · +1 suspicion', time: -3, sus: +1, tag: 'careful' },
      hide:   { label: 'Pause',   cost: '−4s · −1 suspicion', time: -4, sus: -1, tag: 'slow' }
    }
  },
  {
    id: 'alley_mouth',
    title: 'Alley Mouth',
    desc: 'A narrow cut between two houses. A cat watches from a window. The alley is unlit and gives cover, but adds distance.',
    actions: {
      sprint: { label: 'Sprint',   cost: '−2s · +1 suspicion', time: -2, sus: +1, tag: 'fast' },
      dodge:  { label: 'Take Alley', cost: '−3s · ±0 suspicion', time: -3, sus:  0, tag: 'careful' },
      hide:   { label: 'Wait',      cost: '−4s · −1 suspicion', time: -4, sus: -1, tag: 'slow' }
    }
  },
  {
    id: 'cart_obstacle',
    title: 'Delivery Cart',
    desc: 'A merchant\'s cart left across the path. Khatri must either vault it, go around, or use it as cover.',
    actions: {
      sprint: { label: 'Vault',  cost: '−1s · +2 suspicion', time: -1, sus: +2, tag: 'fast' },
      dodge:  { label: 'Go Round', cost: '−3s · ±0 suspicion', time: -3, sus: 0, tag: 'careful' },
      hide:   { label: 'Hide Behind', cost: '−2s · −2 suspicion', time: -2, sus: -2, tag: 'slow' }
    }
  },
  {
    id: 'open_crossing',
    title: 'Open Crossing',
    desc: 'A wide cobbled crossing. Fully exposed. A curtain twitches in a window across the street.',
    actions: {
      sprint: { label: 'Run',    cost: '−1s · +3 suspicion', time: -1, sus: +3, tag: 'fast' },
      dodge:  { label: 'Walk Steadily', cost: '−3s · +1 suspicion', time: -3, sus: +1, tag: 'careful' },
      hide:   { label: 'Wait for Cloud', cost: '−5s · −1 suspicion', time: -5, sus: -1, tag: 'slow' }
    }
  },
  {
    id: 'porch',
    title: 'The Porch',
    desc: 'The front door is ten feet away. The porch light is still on. The knocker is within reach.',
    actions: {
      sprint: { label: 'Knock Loudly',  cost: '−1s · +1 suspicion', time: -1, sus: +1, tag: 'fast' },
      dodge:  { label: 'Knock Twice',   cost: '−2s · ±0 suspicion', time: -2, sus:  0, tag: 'careful' },
      hide:   { label: 'Tap the Glass', cost: '−3s · −1 suspicion', time: -3, sus: -1, tag: 'slow' }
    }
  }
];

let p2State = {
  nodeIndex: 0,
  timeLeft: 15,
  suspicion: 0,
  timerInterval: null
};

function initPart2() {
  p2State = { nodeIndex: 0, timeLeft: 15, suspicion: 0, timerInterval: null };
  document.getElementById('routeLog').innerHTML = '';
  buildSuspicionUI(0);
  buildRouteSVG();
  showNode(0);
  startTimer();
}

function startTimer() {
  clearInterval(p2State.timerInterval);
  p2State.timerInterval = setInterval(() => {
    p2State.timeLeft = Math.max(0, p2State.timeLeft - 1);
    updateTimerUI();
    if (p2State.timeLeft <= 0) {
      clearInterval(p2State.timerInterval);
      // Time ran out — hard fail
      addRouteLog('Time ran out — the light goes dark.', 'bad');
      setTimeout(() => {
        cs.routeTimeLeft = 0;
        cs.suspicion = p2State.suspicion;
        cs.part2Result = 'fail';
        goToScene('trans2');
      }, 1200);
    }
  }, 1000);
}

function updateTimerUI() {
  const t = p2State.timeLeft;
  const disp = document.getElementById('timerDisplay');
  const bar  = document.getElementById('timerBar');
  if (!disp || !bar) return;
  disp.textContent = t + 's';
  disp.className = 'hud-value' + (t <= 3 ? ' danger' : t <= 6 ? ' warn' : '');
  bar.style.width = (t / 15 * 100) + '%';
  bar.style.background = t <= 3 ? '#8b2424' : t <= 6 ? '#c8602a' : 'var(--amber)';
}

function buildRouteSVG() {
  const svg = document.getElementById('routeSvg');
  svg.innerHTML = '';
  const nodeCount = ROUTE_NODES.length;
  const xStep = 680 / (nodeCount - 1);
  const yBase = 130;

  // Draw path lines
  for (let i = 0; i < nodeCount - 1; i++) {
    const x1 = 40 + i * xStep, y1 = yBase;
    const x2 = 40 + (i+1) * xStep, y2 = yBase;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1); line.setAttribute('y1', y1);
    line.setAttribute('x2', x2); line.setAttribute('y2', y2);
    line.setAttribute('stroke', 'rgba(74,122,155,0.3)');
    line.setAttribute('stroke-width', '2');
    line.setAttribute('stroke-dasharray', '6 4');
    line.id = 'path_' + i;
    svg.appendChild(line);
  }

  // Draw nodes
  ROUTE_NODES.forEach((node, i) => {
    const cx = 40 + i * xStep, cy = yBase;
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.classList.add('route-node', 'locked');
    g.id = 'node_' + i;

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', cx); circle.setAttribute('cy', cy);
    circle.setAttribute('r', '18');
    g.appendChild(circle);

    const num = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    num.setAttribute('x', cx); num.setAttribute('y', cy + 4);
    num.setAttribute('text-anchor', 'middle');
    num.setAttribute('fill', 'rgba(184,216,232,0.7)');
    num.setAttribute('font-size', '11');
    num.setAttribute('font-family', 'Courier New, monospace');
    num.textContent = i + 1;
    g.appendChild(num);

    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', cx); label.setAttribute('y', cy + 38);
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('fill', 'rgba(122,175,200,0.7)');
    label.setAttribute('font-size', '8');
    label.setAttribute('font-family', 'Courier New, monospace');
    label.textContent = node.title.toUpperCase();
    g.appendChild(label);

    svg.appendChild(g);
  });

  updateNodeStyles();
}

function updateNodeStyles() {
  ROUTE_NODES.forEach((_, i) => {
    const g = document.getElementById('node_' + i);
    if (!g) return;
    g.classList.remove('active', 'done', 'locked');
    if (i < p2State.nodeIndex) g.classList.add('done');
    else if (i === p2State.nodeIndex) g.classList.add('active');
    else g.classList.add('locked');

    // Colour done paths
    const pathEl = document.getElementById('path_' + i);
    if (pathEl && i < p2State.nodeIndex) {
      pathEl.setAttribute('stroke', 'rgba(200,160,80,0.5)');
      pathEl.setAttribute('stroke-dasharray', 'none');
    }
  });
}

function showNode(idx) {
  const node = ROUTE_NODES[idx];
  if (!node) return;
  document.getElementById('p2NodeTitle').textContent = node.title;
  document.getElementById('p2NodeDesc').textContent = node.desc;
  document.getElementById('nodeProgress').textContent = (idx + 1) + ' / ' + ROUTE_NODES.length;

  const bar = document.getElementById('actionBar');
  bar.innerHTML = '';
  Object.entries(node.actions).forEach(([key, action]) => {
    const btn = document.createElement('button');
    btn.className = 'action-btn';
    btn.innerHTML = `<div class="action-name">${action.label}</div><div class="action-cost">${action.cost}</div>`;
    btn.onclick = () => chooseAction(key, action);
    bar.appendChild(btn);
  });
}

function chooseAction(key, action) {
  // Apply time cost
  p2State.timeLeft = Math.max(0, p2State.timeLeft + action.time);
  updateTimerUI();

  // Apply suspicion
  p2State.suspicion = Math.max(0, Math.min(5, p2State.suspicion + action.sus));
  buildSuspicionUI(p2State.suspicion);

  // Log entry
  const tag  = action.sus > 0 ? 'bad' : action.sus < 0 ? 'good' : '';
  const susText = action.sus > 0 ? `+${action.sus} suspicion` : action.sus < 0 ? `${action.sus} suspicion` : 'no suspicion';
  addRouteLog(`${ROUTE_NODES[p2State.nodeIndex].title}: ${action.label} · ${susText} · ${Math.abs(action.time)}s used`, tag);

  p2State.nodeIndex++;
  updateNodeStyles();

  if (p2State.nodeIndex >= ROUTE_NODES.length) {
    // Reached the door
    clearInterval(p2State.timerInterval);
    cs.routeTimeLeft = p2State.timeLeft;
    cs.suspicion = p2State.suspicion;

    if (p2State.timeLeft >= 5 && p2State.suspicion <= 1) {
      cs.part2Result = 'clean';
      addRouteLog('Khatri is inside. Clean entry.', 'good');
    } else if (p2State.timeLeft >= 2 && p2State.suspicion <= 3) {
      cs.part2Result = 'narrow';
      addRouteLog('Inside — a narrow margin.', 'good');
    } else {
      cs.part2Result = 'messy';
      addRouteLog('Inside, but not without noise.', 'bad');
    }
    setTimeout(() => goToScene('trans2'), 1400);
  } else if (p2State.timeLeft <= 0) {
    clearInterval(p2State.timerInterval);
    cs.routeTimeLeft = 0;
    cs.suspicion = 5;
    cs.part2Result = 'fail';
    addRouteLog('Time ran out.', 'bad');
    setTimeout(() => goToScene('trans2'), 1200);
  } else {
    showNode(p2State.nodeIndex);
  }
}

function buildSuspicionUI(val) {
  const track = document.getElementById('suspicionTrack');
  if (!track) return;
  track.innerHTML = '';
  for (let i = 0; i < 5; i++) {
    const pip = document.createElement('div');
    pip.className = 'sus-pip' + (i < val ? ' filled' : '');
    track.appendChild(pip);
  }
}

function addRouteLog(text, cls) {
  const log = document.getElementById('routeLog');
  if (!log) return;
  const el = document.createElement('div');
  el.className = 'log-entry' + (cls ? ' ' + cls : '');
  el.textContent = text;
  log.appendChild(el);
  log.scrollTop = log.scrollHeight;
}

function buildTransition2() {
  const lines = {
    clean: 'Khatri moves through the door without a sound. Dadabhai looks up from the chair, startled but composed. The light is still on.',
    narrow: 'Khatri is inside — barely. His breath is short. The porch light went out just as the door closed. Dadabhai watches him with the careful attention of a man deciding whether to call for Gururaj.',
    messy: 'Something on the street moved. Khatri is inside, but he came in fast — too fast. Dadabhai has already risen from his chair. Gururaj is behind the door to the hall.',
    fail: 'The light went dark before Khatri reached the door. He stands in the cold street. The moment has passed. He will have to try another way.'
  };
  document.getElementById('t2Body').textContent = lines[cs.part2Result] || lines.clean;

  const susLabel = cs.suspicion === 0 ? 'Undetected'
                 : cs.suspicion <= 1 ? 'Low Suspicion'
                 : cs.suspicion <= 3 ? 'Moderate Suspicion'
                 : 'High Suspicion';
  const timeLabel = cs.routeTimeLeft >= 5 ? 'Plenty of time'
                  : cs.routeTimeLeft >= 2 ? 'Narrow window'
                  : 'Barely made it';
  document.getElementById('t2Status').textContent =
    `Entry: ${cs.part2Result.toUpperCase()}  ·  ${timeLabel}  ·  ${susLabel}`;

  if (cs.part2Result === 'fail') {
    document.querySelector('#sceneTransition2 .btn-primary').textContent = 'Continue Anyway →';
  }
}

/* ═══════════════════════════════════════════
   PART 3 — KEYWORD CONVINCING DUEL
═══════════════════════════════════════════ */

const TURNS = [
  {
    id: 1,
    prompt: "Who are you, and why are you being followed?",
    context: "Dadabhai stands by the lamp. His eyes move between Khatri and the door.",
    options: [
      {
        text: "I belong to a secret society fighting the British.",
        tone: "blunt",
        tag: "blunt_open",
        effects: { trust: -2, threat: +1, patience: -1, exposure: 0 },
        criticalFail: false,
        response: "Dadabhai's expression does not change. 'That is either very brave or very stupid. Continue.'"
      },
      {
        text: "My name is Kishanlal Khatri. I sent you the letter. I am here at considerable risk to us both.",
        tone: "tactful",
        tag: "identify_khatri",
        effects: { trust: +2, threat: +1, patience: 0, exposure: 0 },
        unlockProof: 'symbol',
        criticalFail: false,
        response: "A slight nod. 'Khatri. I have heard that name. Sit down. But not too comfortably.'"
      },
      {
        text: "I am Khatri. I could not remain outside your house any longer.",
        tone: "guarded",
        tag: "identify_guarded",
        effects: { trust: +1, threat: +1, patience: 0, exposure: 0 },
        criticalFail: false,
        response: "'You have been watching my house?' A pause. 'For how long.'"
      }
    ]
  },
  {
    id: 2,
    prompt: "You sent me that symbol. Why?",
    context: "He has set the letter on the desk. He has not looked away from Khatri.",
    options: [
      {
        text: "Because you would recognise it. And because no one watching your post would.",
        tone: "tactful",
        tag: "symbol_explain",
        effects: { trust: +2, threat: +1, patience: 0, exposure: 0 },
        criticalFail: false,
        response: "'A fair answer.' He picks up the letter. 'Tell me where you first saw it.'"
      },
      {
        text: "The symbol is the key to Taronwali Kothi.",
        tone: "direct",
        tag: "taronwali_symbol",
        requiresProof: null,
        requiresClarity: 3,
        effects: { trust: +3, threat: +1, patience: 0, exposure: 0 },
        unlockProof: 'taronwaliKothi',
        criticalFail: false,
        response: "Silence. A long one. 'You know about Taronwali Kothi.' Not a question. His voice has changed."
      },
      {
        text: "I needed a mark that could not be explained away.",
        tone: "evasive",
        tag: "evasive",
        effects: { trust: 0, threat: 0, patience: -1, exposure: 0 },
        criticalFail: false,
        response: "Dadabhai sets down the letter. 'That is not an answer. Try again.'"
      }
    ]
  },
  {
    id: 3,
    prompt: "How do you know about that house?",
    context: "He has moved to the window. He is looking out. Not at Khatri.",
    options: [
      {
        text: "I do not. But you do. And that is why the symbol worked.",
        tone: "precise",
        tag: "precision_move",
        effects: { trust: +2, threat: +1, patience: +1, exposure: 0 },
        criticalFail: false,
        response: "A dry sound that might be a laugh. 'Yes. It did work. You chose well.' He turns from the window."
      },
      {
        text: "The movement has records. Taronwali Kothi appears in correspondence from the 1880s.",
        tone: "factual",
        tag: "factual_movement",
        requiresClarity: 4,
        effects: { trust: +1, threat: +2, patience: 0, exposure: +1 },
        criticalFail: false,
        response: "'The movement has records.' He says this slowly. 'Which movement. Be precise.'"
      },
      {
        text: "I cannot say how I know. Only that the information is accurate.",
        tone: "guarded",
        tag: "guarded_knowledge",
        effects: { trust: -1, threat: +1, patience: -1, exposure: 0 },
        criticalFail: false,
        response: "His patience shortens visibly. 'Vague answers are not currency in this house.'"
      }
    ]
  },
  {
    id: 4,
    prompt: "Why me? There are younger men in the movement.",
    context: "He sits. He folds his hands on the desk. He is waiting.",
    options: [
      {
        text: "Because Zoraver will not see anyone else.",
        tone: "direct",
        tag: "zoraver_mention",
        requiresKeyword: 'Zoraver',
        effects: { trust: +2, threat: +2, patience: 0, exposure: 0 },
        unlockProof: 'zoraver',
        criticalFail: false,
        response: "Something behind his eyes shifts. 'Zoraver.' He says the name carefully, as though testing its weight. 'That name has not been spoken to me in many years.'"
      },
      {
        text: "Because the letter needed to reach someone who has already survived this kind of risk.",
        tone: "respectful",
        tag: "respect_move",
        effects: { trust: +2, threat: +1, patience: +1, exposure: 0 },
        criticalFail: false,
        response: "'Flattery is also not currency.' But he seems less guarded. 'Continue.'"
      },
      {
        text: "Because the British are not watching you the way they are watching the younger men.",
        tone: "tactical",
        tag: "tactical_reason",
        effects: { trust: +1, threat: +1, patience: 0, exposure: +1 },
        criticalFail: false,
        response: "He considers this. 'That may be true. It is also precisely the kind of reasoning that gets careful men killed.'"
      }
    ]
  },
  {
    id: 5,
    prompt: "You mentioned Zoraver. Tell me what you know.",
    context: "He has stood again. He does not move toward the door. That is something.",
    options: [
      {
        text: "Zoraver is at Cambridge. He has documents that could shift the argument in Parliament — if they reach the right hands.",
        tone: "factual",
        tag: "zoraver_cambridge",
        requiresProof: 'zoraver',
        effects: { trust: +2, threat: +3, patience: 0, exposure: 0 },
        criticalFail: false,
        response: "'Documents.' He repeats the word. 'Of what nature.' His voice is quiet. That is the most dangerous kind of quiet."
      },
      {
        text: "Zoraver is not the issue. The issue is what he is carrying.",
        tone: "evasive",
        tag: "zoraver_evasive",
        effects: { trust: -1, threat: +1, patience: -1, exposure: 0 },
        criticalFail: false,
        response: "'Then why say his name at all.' He is annoyed. 'You are wasting time, Khatri.'"
      },
      {
        text: "Zoraver was at Taronwali Kothi. You knew each other there.",
        tone: "intimate",
        tag: "zoraver_taronwali",
        requiresProof: 'taronwaliKothi',
        requiresClarity: 5,
        effects: { trust: +4, threat: +2, patience: +1, exposure: 0 },
        criticalFail: false,
        response: "He goes very still. 'How do you know that.' He is not asking Khatri. He is asking the room."
      }
    ]
  },
  {
    id: 6,
    prompt: "Who is following you? And how close are they?",
    context: "He looks at the window again. His mind is calculating.",
    options: [
      {
        text: "Department men. At least two. I lost them at Waterloo, but not for long.",
        tone: "factual",
        tag: "department_waterloo",
        requiresProof: 'symbol',
        effects: { trust: +1, threat: +3, patience: 0, exposure: +1 },
        criticalFail: false,
        response: "'Waterloo.' He pulls the curtain half an inch to the side and looks out. 'Then we have perhaps an hour.'"
      },
      {
        text: "I do not know exactly. But they have been on my trail since Southampton.",
        tone: "honest",
        tag: "honest_admit",
        effects: { trust: +2, threat: +2, patience: 0, exposure: +1 },
        criticalFail: false,
        response: "'Since Southampton. And you brought them here.' A pause. 'I would have done the same. Sit down.'"
      },
      {
        text: "I took precautions. This house is safe for tonight.",
        tone: "reassuring",
        tag: "reassure",
        effects: { trust: 0, threat: -1, patience: +1, exposure: -1 },
        criticalFail: false,
        response: "'Do not reassure me. I am not worried about tonight. I am worried about the morning.'"
      }
    ]
  },
  {
    id: 7,
    prompt: "Why should I trust this letter? Anyone could have sent it.",
    context: "He picks up the letter again. He is looking at the symbol.",
    options: [
      {
        text: "Because only someone who knows about Taronwali Kothi would use that symbol. And only one person told me about it — Zoraver himself.",
        tone: "anchor",
        tag: "anchor_all",
        requiresProof: 'taronwaliKothi',
        requiresProof2: 'zoraver',
        effects: { trust: +3, threat: +2, patience: 0, exposure: 0 },
        criticalFail: false,
        response: "He sets the letter down very slowly. 'Then Zoraver is in danger.' He is not asking."
      },
      {
        text: "You already trust it. That is why you are still in this room.",
        tone: "direct",
        tag: "mirror_trust",
        effects: { trust: +2, threat: +1, patience: +1, exposure: 0 },
        criticalFail: false,
        response: "A long pause. Then something that is almost a smile. 'That is a fair point, Khatri.'"
      },
      {
        text: "You cannot. You can only decide whether the risk of inaction is greater than the risk of trust.",
        tone: "philosophical",
        tag: "risk_frame",
        requiresClarity: 4,
        requiresKeyword: 'mother',
        effects: { trust: +3, threat: +1, patience: +1, exposure: 0 },
        criticalFail: false,
        response: "He looks at Khatri properly for the first time. 'Your mother taught you to think like that.' He says it quietly."
      }
    ]
  },
  {
    id: 8,
    prompt: "What do you want from me, Khatri? Exactly.",
    context: "This is the final question. The whole conversation has been preparation for this.",
    options: [
      {
        text: "I want you to go to Cambridge. Find Zoraver. Carry the letter. That is all.",
        tone: "direct",
        tag: "direct_ask",
        effects: { trust: +1, threat: +1, patience: 0, exposure: 0 },
        criticalFail: false,
        response: "He looks at the letter for a long moment. Then he folds it and places it in his breast pocket."
      },
      {
        text: "I want you to be the bridge between what Zoraver knows and what Parliament cannot ignore. I cannot do that. Only you can.",
        tone: "passionate",
        tag: "bridge_ask",
        requiresProof: 'zoraver',
        effects: { trust: +2, threat: +1, patience: +1, exposure: 0 },
        criticalFail: false,
        response: "'The bridge.' He repeats it softly. He is already calculating the train times to Cambridge."
      },
      {
        text: "I want nothing. The movement needs something. I am only the messenger.",
        tone: "humble",
        tag: "humble_ask",
        effects: { trust: +1, threat: 0, patience: +1, exposure: -1 },
        criticalFail: false,
        response: "He nods slowly. 'A good answer. A careful one.' He picks up his pipe. 'I will think about Cambridge.'"
      }
    ]
  }
];

const ADJACENCY_RULES = [
  { prev: 'identify_khatri',    next: 'taronwali_symbol',  bonus: { trust: +1 } },
  { prev: 'taronwali_symbol',   next: 'zoraver_taronwali', bonus: { trust: +1 } },
  { prev: 'zoraver_mention',    next: 'zoraver_cambridge',  bonus: { threat: +1 } },
  { prev: 'evasive',            next: 'evasive',            bonus: { patience: -1 } },
  { prev: 'guarded_knowledge',  next: 'evasive',            bonus: { patience: -1 } },
  { prev: 'mirror_trust',       next: 'bridge_ask',         bonus: { trust: +1 } },
  { prev: 'anchor_all',         next: 'bridge_ask',         bonus: { trust: +2, threat: +1 } }
];

let p3State = { turnIndex: 0 };

function beginPart3() {
  // Apply carryover from Part 1 and Part 2
  if (cs.memoryClarity >= 5)     cs.trust += 1;
  else if (cs.memoryClarity <= 2) cs.trust -= 1;

  if (cs.part2Result === 'clean')  { cs.patience += 1; }
  if (cs.part2Result === 'messy')  { cs.patience -= 1; cs.exposure += 1; }
  if (cs.part2Result === 'fail')   { cs.patience -= 2; cs.exposure += 2; }

  cs.trust    = Math.max(0, Math.min(10, cs.trust));
  cs.patience = Math.max(1, Math.min(5, cs.patience));
  cs.exposure = Math.max(0, Math.min(5, cs.exposure));

  p3State.turnIndex = 0;
  document.getElementById('p3Log').innerHTML = '';
  buildProofAnchors();
  updateMeterUI();
  goToScene('part3');
  renderTurn();
}

function buildProofAnchors() {
  const el = document.getElementById('proofAnchors');
  el.innerHTML = '';
  ['symbol', 'taronwaliKothi', 'zoraver'].forEach(k => {
    const chip = document.createElement('div');
    chip.className = 'proof-chip' + (cs.proofsEstablished[k] ? ' established' : '');
    chip.id = 'proof_' + k;
    const labels = { symbol: 'The Symbol', taronwaliKothi: 'Taronwali Kothi', zoraver: 'Zoraver' };
    chip.textContent = labels[k];
    el.appendChild(chip);
  });
}

function updateMeterUI() {
  const set = (id, val, max) => {
    const bar = document.getElementById('m' + id);
    const vEl = document.getElementById('v' + id);
    if (bar) bar.style.width = (val / max * 100) + '%';
    if (vEl) vEl.textContent = val + ' / ' + max;
  };
  set('Trust',    cs.trust,    10);
  set('Threat',   cs.threat,   10);
  set('Patience', cs.patience,  5);
  set('Exposure', cs.exposure,  5);
}

function renderTurn() {
  const turnData = TURNS[p3State.turnIndex];
  if (!turnData) { resolvePart3(); return; }

  document.getElementById('turnCounter').textContent =
    `Turn ${p3State.turnIndex + 1} of ${TURNS.length}`;
  document.getElementById('dadabhaiSpeech').textContent = turnData.prompt;
  document.getElementById('dadabhaiContext').textContent = turnData.context || '';

  const optContainer = document.getElementById('responseOptions');
  optContainer.innerHTML = '';

  turnData.options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'response-btn';

    // Check locks
    let locked = false;
    let lockReason = '';

    if (opt.requiresProof && !cs.proofsEstablished[opt.requiresProof]) {
      locked = true;
      lockReason = `Requires: ${proofLabel(opt.requiresProof)} not yet established`;
    }
    if (opt.requiresProof2 && !cs.proofsEstablished[opt.requiresProof2]) {
      locked = true;
      lockReason = `Requires: both symbol proofs established`;
    }
    if (opt.requiresClarity && cs.memoryClarity < opt.requiresClarity) {
      locked = true;
      lockReason = `Requires clarity ${opt.requiresClarity} (yours: ${cs.memoryClarity})`;
    }
    if (opt.requiresKeyword && !cs.unlockedKeywords.includes(opt.requiresKeyword)) {
      locked = true;
      lockReason = `Memory keyword "${opt.requiresKeyword}" not recovered`;
    }

    if (locked) btn.classList.add('locked-option');

    btn.innerHTML = `
      <div class="resp-tone">${opt.tone}</div>
      <div class="resp-text">${opt.text}</div>
      ${locked ? `<div class="resp-lock-note">🔒 ${lockReason}</div>` : ''}
    `;

    if (!locked) {
      btn.onclick = () => chooseResponse(opt, turnData);
    }

    optContainer.appendChild(btn);
  });
}

function proofLabel(key) {
  return { symbol: 'The Symbol', taronwaliKothi: 'Taronwali Kothi', zoraver: 'Zoraver' }[key] || key;
}

function chooseResponse(opt, turnData) {
  // Disable all buttons
  document.querySelectorAll('.response-btn').forEach(b => b.disabled = true);

  // Apply adjacency bonus
  let adj = null;
  if (cs.lastOptionTag) {
    adj = ADJACENCY_RULES.find(r => r.prev === cs.lastOptionTag && r.next === opt.tag);
  }

  // Apply effects
  const eff = { ...opt.effects };
  if (adj) {
    Object.entries(adj.bonus).forEach(([k, v]) => { eff[k] = (eff[k] || 0) + v; });
  }

  cs.trust    = Math.max(0, Math.min(10, cs.trust    + (eff.trust    || 0)));
  cs.threat   = Math.max(0, Math.min(10, cs.threat   + (eff.threat   || 0)));
  cs.patience = Math.max(0, Math.min(5,  cs.patience + (eff.patience || 0)));
  cs.exposure = Math.max(0, Math.min(5,  cs.exposure + (eff.exposure || 0)));

  // Unlock proof
  if (opt.unlockProof && cs.proofsEstablished.hasOwnProperty(opt.unlockProof)) {
    cs.proofsEstablished[opt.unlockProof] = true;
    document.getElementById('proof_' + opt.unlockProof)?.classList.add('established');
    addP3Log(`Proof established: ${proofLabel(opt.unlockProof)}`, 'anchor');
  }

  updateMeterUI();
  cs.lastOptionTag = opt.tag;

  // Log the response
  const effParts = [];
  if (eff.trust    !== 0) effParts.push((eff.trust > 0 ? '+' : '') + eff.trust + ' trust');
  if (eff.threat   !== 0) effParts.push((eff.threat > 0 ? '+' : '') + eff.threat + ' threat');
  if (eff.patience !== 0) effParts.push((eff.patience > 0 ? '+' : '') + eff.patience + ' patience');
  if (eff.exposure !== 0) effParts.push((eff.exposure > 0 ? '+' : '') + eff.exposure + ' exposure');
  if (adj) effParts.push('(chain bonus)');

  const isGood = (eff.trust || 0) + (eff.threat || 0) + (eff.patience || 0) - (eff.exposure || 0) > 0;
  addP3Log(`T${p3State.turnIndex + 1}: "${opt.text.slice(0, 48)}…" → ${effParts.join(' · ')}`, isGood ? 'good' : 'bad');

  // Show Dadabhai response
  document.getElementById('dadabhaiSpeech').textContent = opt.response || turnData.prompt;
  document.getElementById('dadabhaiContext').textContent = '';
  document.getElementById('responseOptions').innerHTML =
    `<div style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.15em;color:var(--blue2);padding:12px;border:1px solid rgba(74,122,155,0.15);">
      — ${effParts.join('  ·  ')} —
    </div>`;

  // Check for critical fail states
  if (opt.criticalFail) {
    setTimeout(() => endPart3('criticalFail'), 1600);
    return;
  }
  if (cs.patience <= 0) {
    setTimeout(() => endPart3('patience'), 1600);
    return;
  }
  if (cs.exposure >= 5) {
    setTimeout(() => endPart3('exposure'), 1600);
    return;
  }
  if (cs.trust < 0) {
    setTimeout(() => endPart3('trust'), 1600);
    return;
  }

  // Advance
  p3State.turnIndex++;
  setTimeout(() => {
    if (p3State.turnIndex >= TURNS.length) {
      resolvePart3();
    } else {
      renderTurn();
      document.getElementById('dadabhaiSpeech').textContent = TURNS[p3State.turnIndex].prompt;
      document.getElementById('dadabhaiContext').textContent = TURNS[p3State.turnIndex].context || '';
      renderTurn();
    }
  }, 1800);
}

function addP3Log(text, cls) {
  const log = document.getElementById('p3Log');
  if (!log) return;
  const el = document.createElement('div');
  el.className = 'p3-log-entry' + (cls ? ' ' + cls : '');
  el.textContent = text;
  log.appendChild(el);
  log.scrollTop = log.scrollHeight;
}

function resolvePart3() {
  const allProofs = cs.proofsEstablished.symbol &&
                    cs.proofsEstablished.taronwaliKothi &&
                    cs.proofsEstablished.zoraver;

  if (cs.trust >= 7 && cs.threat >= 6 && cs.patience > 0 && cs.exposure < 5 && allProofs) {
    cs.part3Result = 'strong';
  } else if (cs.trust >= 5 && cs.threat >= 4 && cs.patience > 0) {
    cs.part3Result = 'weak';
  } else {
    cs.part3Result = 'fail';
  }
  goToScene('ending');
}

function endPart3(reason) {
  cs.part3Result = 'fail';
  goToScene('ending');
}

/* ═══════════════════════════════════════════
   ENDING
═══════════════════════════════════════════ */

function buildEnding() {
  const r = cs.part3Result;
  const endings = {
    strong: {
      eyebrow: 'Chapter II · Strong Outcome',
      title: 'Cambridge',
      body: 'Dadabhai Naoroji folds Khatri\'s letter into his breast pocket and does not look down again. He reaches for a pen and begins to write a note. To the stationmaster at Victoria. For the first train to Cambridge. "Zoraver will have his audience," he says at last. "And the Department will have their evidence — only it will be in the wrong hands."',
      summary: `Trust: ${cs.trust}/10  ·  Threat: ${cs.threat}/10  ·  All proofs established  ·  Strong Success`
    },
    weak: {
      eyebrow: 'Chapter II · Partial Outcome',
      title: 'Cambridge — With Doubt',
      body: 'Dadabhai stands for a long moment at the window. Then he sets down his glass and picks up the letter again. "I will go," he says finally. "But not because I am convinced. Because the risk of ignoring this is greater than the risk of being wrong." He does not look at Khatri as he says it.',
      summary: `Trust: ${cs.trust}/10  ·  Threat: ${cs.threat}/10  ·  Weak Success`
    },
    fail: {
      eyebrow: 'Chapter II · Failed',
      title: 'The Door Closes',
      body: 'Dadabhai sets the letter face-down on the desk. He does not return it. He calls for Gururaj. "See our visitor to the door," he says quietly. "And lock it after him." In the hallway, Khatri understands that there will be no second chance at this approach. Whatever is in that letter will have to find another way to Cambridge.',
      summary: `Trust: ${cs.trust}/10  ·  The interview failed`
    },
    criticalFail: {
      eyebrow: 'Chapter II · Critical Failure',
      title: 'The Wrong Word',
      body: 'One sentence wrong and the entire architecture of trust collapsed. Dadabhai rose from his chair before Khatri had finished the sentence. There was no shouting. Just a very quiet instruction to Gururaj, and the sound of a door.',
      summary: `The conversation ended prematurely`
    }
  };

  const data = endings[r] || endings.fail;
  document.getElementById('endingEyebrow').textContent = data.eyebrow;
  document.getElementById('endingTitle').textContent   = data.title;
  document.getElementById('endingBody').textContent    = data.body;
  document.getElementById('endingSummary').textContent = data.summary;

  // Style card border based on outcome
  const card = document.getElementById('endingCard');
  if (r === 'strong') card.style.borderTopColor = 'var(--amber)';
  else if (r === 'weak') card.style.borderTopColor = 'var(--blue3)';
  else card.style.borderTopColor = 'var(--red)';
}
