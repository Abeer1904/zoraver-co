/* ════════════════════════════════
   NAVIGATION
════════════════════════════════ */
function goTo(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  // Stage 5 setup
  if (id === 'stage-5') initFlashback();
}

/* ════════════════════════════════
   MODAL SYSTEM
════════════════════════════════ */
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

/* ════════════════════════════════
   STAGE 1 STATE
════════════════════════════════ */
const s1 = { letter: false, telegram: false, seal: false };

function checkS1Progress() {
  const done = [s1.letter, s1.telegram, s1.seal].filter(Boolean).length;
  document.getElementById('stage1Progress').textContent = done + ' of 3 examined';
  if (done === 3) {
    document.getElementById('presentBtn').disabled = false;
    document.getElementById('stage1Progress').style.color = 'var(--amber)';
  }
}

function markObj(id, stateKey) {
  s1[stateKey] = true;
  document.getElementById(id).classList.add('done');
  checkS1Progress();
}

/* ════════════════════════════════
   LETTER PUZZLE
════════════════════════════════ */
const fragments = [
  { id:'fA', order:2, text:'"The mounds rise from the plain as if placed by deliberate hands. The Brahui call this earth sacred, and will not dig." — Masson, November 1842' },
  { id:'fB', order:1, text:'"I write from Multan, having ridden three weeks from the river. I have found something the Company does not yet know of, and I am not sure they should." — Masson, October 1842' },
  { id:'fC', order:3, text:'"An incomprehensible script marks every object we recover. Unlike Egypt. Unlike Mesopotamia. Older, perhaps. The seals bear animals I do not recognise as divine." — Masson, December 1842' },
  { id:'fD', order:4, text:'"The gate in the upper quarter will not move. The Brahui elder says it was sealed by the people themselves. He says what is behind it should remain so." — Masson, January 1843' },
];

const correctLetterOrder = [1,2,3,4]; // position of selection → must match fragment.order
let selectedOrder = [];

function initLetter() {
  const grid = document.getElementById('fragGrid');
  grid.innerHTML = '';
  // Shuffle display
  const shuffled = [...fragments].sort(() => Math.random() - 0.5);
  shuffled.forEach(f => {
    const div = document.createElement('div');
    div.className = 'frag';
    div.dataset.fragId = f.id;
    div.dataset.order = f.order;
    div.innerHTML = `<span class="frag-num">#${selectedOrder.indexOf(f.id)+1 || ''}</span>${f.text}`;
    div.onclick = () => selectFrag(div, f);
    grid.appendChild(div);
  });
  selectedOrder = [];
  updateLetterBtn();
}

function selectFrag(el, f) {
  if (el.classList.contains('locked')) return;
  if (el.classList.contains('selected')) {
    el.classList.remove('selected');
    selectedOrder = selectedOrder.filter(x => x !== f.id);
  } else {
    el.classList.add('selected');
    selectedOrder.push(f.id);
  }
  // Update numbers
  document.querySelectorAll('.frag').forEach(fe => {
    const idx = selectedOrder.indexOf(fe.dataset.fragId);
    fe.querySelector('.frag-num').textContent = idx >= 0 ? '#' + (idx+1) : '';
  });
  updateLetterBtn();
}

function updateLetterBtn() {
  document.getElementById('letterDoneBtn').disabled = selectedOrder.length < 4;
}

function confirmLetter() {
  // Check if the selected order matches fragment.order sequence
  const fragMap = {};
  fragments.forEach(f => fragMap[f.id] = f.order);
  const isCorrect = selectedOrder.every((fid, i) => fragMap[fid] === i+1);

  if (isCorrect) {
    document.getElementById('letterMsg').innerHTML = '<span class="success-msg">✓ The account assembles. Masson knew.</span>';
    document.querySelectorAll('.frag').forEach(f => { f.classList.add('locked'); f.classList.remove('selected'); });
    setTimeout(() => {
      closeModal('modalLetter');
      markObj('objLetter','letter');
    }, 900);
  } else {
    document.getElementById('letterMsg').innerHTML = '<span class="error-msg">Incorrect sequence. Read the text — it must flow.</span>';
    document.querySelectorAll('.frag').forEach(f => f.classList.remove('selected'));
    selectedOrder = [];
    document.querySelectorAll('.frag-num').forEach(n => n.textContent='');
  }
}

// Init on page load
initLetter();

/* ════════════════════════════════
   TELEGRAM PUZZLE
════════════════════════════════ */
function checkCipher(btn, correct) {
  const all = document.querySelectorAll('.cipher-choice');
  all.forEach(b => { b.disabled = true; b.style.cursor = 'default'; });
  if (correct) {
    btn.classList.add('correct');
    document.getElementById('telegramMsg').innerHTML = '<span class="success-msg">✓ W·A·R·N. The Brahui issued a warning.</span>';
    setTimeout(() => {
      closeModal('modalTelegram');
      markObj('objTelegram','telegram');
    }, 900);
  } else {
    btn.classList.add('wrong');
    document.getElementById('telegramMsg').innerHTML = '<span class="error-msg">Incorrect. Count the letters: 23=W, 1=A, 18=R, 14=N.</span>';
    setTimeout(() => {
      all.forEach(b => { b.disabled = false; b.style.cursor = 'pointer'; });
      btn.classList.remove('wrong');
      document.getElementById('telegramMsg').innerHTML = '';
    }, 1600);
  }
}

/* ════════════════════════════════
   SEAL PUZZLE
════════════════════════════════ */
function checkSeal(btn, correct) {
  const all = document.querySelectorAll('.seal-opt');
  all.forEach(b => { b.disabled = true; b.style.cursor = 'default'; });
  if (correct) {
    btn.classList.add('correct');
    document.getElementById('sealMsg').innerHTML = '<span class="success-msg">✓ Indus Valley. Mature Harappan. The script undeciphered.</span>';
    setTimeout(() => {
      closeModal('modalSeal');
      markObj('objSeal','seal');
    }, 900);
  } else {
    btn.classList.add('wrong');
    document.getElementById('sealMsg').innerHTML = '<span class="error-msg">Incorrect. Look at the animal motif and the script above.</span>';
    setTimeout(() => {
      all.forEach(b => { b.disabled = false; b.style.cursor = 'pointer'; });
      btn.classList.remove('wrong');
      document.getElementById('sealMsg').innerHTML = '';
    }, 1600);
  }
}

/* ════════════════════════════════
   HYPOTHESIS
════════════════════════════════ */
function checkHyp(btn, correct) {
  const all = document.querySelectorAll('.hyp-btn');
  all.forEach(b => { b.disabled = true; });
  if (correct) {
    btn.classList.add('correct');
    document.getElementById('hypMsg').innerHTML = '<span class="success-msg">✓ Confirmed. You go in with the right question.</span>';
    setTimeout(() => {
      closeModal('modalHyp');
      goTo('stage-2');
    }, 1100);
  } else {
    btn.classList.add('wrong');
    document.getElementById('hypMsg').innerHTML = '<span class="error-msg">The evidence doesn\'t support this. Re-read the objects.</span>';
    setTimeout(() => {
      all.forEach(b => { b.disabled = false; });
      btn.classList.remove('wrong');
      document.getElementById('hypMsg').innerHTML = '';
    }, 1800);
  }
}

/* ════════════════════════════════
   STAGE 2 — MAP DRAG & DROP
════════════════════════════════ */
// correct: seal→upper, pottery→lower, weight→lower
const tokenZone = {}; // tokenId → zone placed
const correctZones = { seal:'upper', pottery:'lower', weight:'lower' };
let draggedToken = null;

function dragToken(e, tokenId) {
  draggedToken = tokenId;
  e.dataTransfer.setData('text/plain', tokenId);
  document.getElementById('t-'+tokenId).classList.add('dragging');
}
function endDrag(e) {
  if (draggedToken) document.getElementById('t-'+draggedToken).classList.remove('dragging');
  draggedToken = null;
}
function allowDrop(e) { e.preventDefault(); e.currentTarget.classList.add('over'); }
function leaveDrop(e) { e.currentTarget.classList.remove('over'); }

function dropToken(e, zone) {
  e.preventDefault();
  const dz = e.currentTarget;
  dz.classList.remove('over');
  if (!draggedToken) return;
  const tokenId = draggedToken;
  const tokenEl = document.getElementById('t-'+tokenId);

  // Remove from previous zone if any
  if (tokenZone[tokenId]) {
    const prev = document.getElementById('dz-'+tokenZone[tokenId]);
    const prevToken = prev.querySelector('[data-token="'+tokenId+'"]');
    if (prevToken) prev.removeChild(prevToken);
  }
  // Remove placeholder text if first token
  dz.querySelectorAll('span').forEach(s => s.remove());

  // Clone into drop zone
  const clone = document.createElement('div');
  clone.className = 'token';
  clone.dataset.token = tokenId;
  clone.innerHTML = tokenEl.innerHTML;
  clone.style.cursor = 'default';
  clone.style.transform = 'none';
  dz.appendChild(clone);

  tokenZone[tokenId] = zone;
  // Hide original
  tokenEl.style.display = 'none';

  checkMapComplete();
}

function checkMapComplete() {
  if (Object.keys(tokenZone).length < 3) return;
  const allCorrect = Object.entries(tokenZone).every(([tid, zone]) => correctZones[tid] === zone);
  if (allCorrect) {
    document.getElementById('dz-upper').classList.add('correct');
    document.getElementById('dz-lower').classList.add('correct');
    document.getElementById('mapMsg').innerHTML = '<span class="success-msg">✓ Correctly mapped. The gate is in the upper citadel.</span>';
    document.getElementById('mapNextBtn').disabled = false;
  } else {
    document.getElementById('mapMsg').innerHTML = '<span class="error-msg">Placement incorrect. Think about function — what was made where.</span>';
    setTimeout(() => {
      // Return all tokens to tray
      Object.keys(tokenZone).forEach(tid => {
        const dzEl = document.getElementById('dz-'+tokenZone[tid]);
        const t = dzEl.querySelector('[data-token="'+tid+'"]');
        if (t) dzEl.removeChild(t);
        document.getElementById('t-'+tid).style.display = 'flex';
      });
      // Reset drop zone placeholder text
      ['upper','lower'].forEach(z => {
        const dz = document.getElementById('dz-'+z);
        if (!dz.querySelector('[data-token]')) {
          const sp = document.createElement('span');
          sp.style.cssText = 'font-family:monospace;font-size:0.68rem;color:rgba(74,122,155,0.4)';
          sp.textContent = 'Drop artefacts here';
          dz.appendChild(sp);
        }
      });
      for (const k in tokenZone) delete tokenZone[k];
      document.getElementById('mapMsg').innerHTML = '';
    }, 1800);
  }
}

/* ════════════════════════════════
   STAGE 3 — SLIDING PUZZLE
════════════════════════════════ */

// 8 Indus-style SVG glyphs + 1 empty (index 8 = empty)
const glyphs = [
  // 0: fish
  `<svg viewBox="0 0 64 64"><path d="M14 32 Q24 20 40 32 Q24 44 14 32Z" fill="none" stroke="#7aafc8" stroke-width="1.5"/><circle cx="38" cy="30" r="2" fill="#7aafc8"/><line x1="14" y1="32" x2="6" y2="26" stroke="#7aafc8" stroke-width="1.5"/><line x1="14" y1="32" x2="6" y2="38" stroke="#7aafc8" stroke-width="1.5"/></svg>`,
  // 1: star/dot cluster (Pleiades)
  `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="3" fill="#7aafc8"/><circle cx="22" cy="24" r="2.5" fill="#7aafc8"/><circle cx="42" cy="24" r="2.5" fill="#7aafc8"/><circle cx="18" cy="36" r="2" fill="#7aafc8"/><circle cx="46" cy="36" r="2" fill="#7aafc8"/><circle cx="28" cy="44" r="2" fill="#7aafc8"/><circle cx="36" cy="44" r="2" fill="#7aafc8"/></svg>`,
  // 2: tree
  `<svg viewBox="0 0 64 64"><line x1="32" y1="48" x2="32" y2="20" stroke="#7aafc8" stroke-width="1.5"/><path d="M20 36 Q32 16 44 36Z" fill="none" stroke="#7aafc8" stroke-width="1.5"/><line x1="24" y1="36" x2="20" y2="44" stroke="#7aafc8" stroke-width="1.2"/><line x1="40" y1="36" x2="44" y2="44" stroke="#7aafc8" stroke-width="1.2"/></svg>`,
  // 3: unicorn (simplified)
  `<svg viewBox="0 0 64 64"><path d="M18 44 Q22 36 30 34 Q38 33 44 38 Q48 42 46 46 Q40 50 30 50 Q20 50 18 44Z" fill="none" stroke="#7aafc8" stroke-width="1.5"/><path d="M18 44 Q14 36 16 28 Q18 22 24 22 L26 30 Q22 36 18 44Z" fill="none" stroke="#7aafc8" stroke-width="1.5"/><line x1="20" y1="22" x2="14" y2="12" stroke="#7aafc8" stroke-width="1.5"/></svg>`,
  // 4: water/wave
  `<svg viewBox="0 0 64 64"><path d="M12 28 Q20 20 28 28 Q36 36 44 28 Q52 20 56 28" fill="none" stroke="#7aafc8" stroke-width="1.5"/><path d="M12 38 Q20 30 28 38 Q36 46 44 38 Q52 30 56 38" fill="none" stroke="#7aafc8" stroke-width="1.5"/></svg>`,
  // 5: circle with cross (sun)
  `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="14" fill="none" stroke="#7aafc8" stroke-width="1.5"/><line x1="32" y1="14" x2="32" y2="50" stroke="#7aafc8" stroke-width="1.2"/><line x1="14" y1="32" x2="50" y2="32" stroke="#7aafc8" stroke-width="1.2"/></svg>`,
  // 6: jar/pot
  `<svg viewBox="0 0 64 64"><path d="M22 20 Q16 28 16 36 Q16 46 32 48 Q48 46 48 36 Q48 28 42 20Z" fill="none" stroke="#7aafc8" stroke-width="1.5"/><line x1="22" y1="20" x2="42" y2="20" stroke="#7aafc8" stroke-width="1.5"/><line x1="26" y1="16" x2="38" y2="16" stroke="#7aafc8" stroke-width="1.2"/></svg>`,
  // 7: arrow pointing right (direction glyph)
  `<svg viewBox="0 0 64 64"><line x1="12" y1="32" x2="48" y2="32" stroke="#7aafc8" stroke-width="1.5"/><path d="M38 22 L52 32 L38 42" fill="none" stroke="#7aafc8" stroke-width="1.5"/><line x1="12" y1="24" x2="12" y2="40" stroke="#7aafc8" stroke-width="1.2"/></svg>`,
  // 8: EMPTY
  ``,
];

// Solved state: tiles 0–7 in order, empty at index 8 (position 8 = bottom-right)
const SOLVED = [0,1,2,3,4,5,6,7,8];
let puzzleState = [...SOLVED];
let puzzleSolved = false;

function initPuzzle() {
  shufflePuzzle();
  renderRefGrid();
}

function shufflePuzzle() {
  puzzleSolved = false;
  document.getElementById('puzzleMsg').innerHTML = '';
  // Fisher-Yates on a solvable shuffle (make ~40 random moves)
  puzzleState = [...SOLVED];
  for (let i = 0; i < 80; i++) {
    const empty = puzzleState.indexOf(8);
    const neighbors = getNeighbors(empty);
    const pick = neighbors[Math.floor(Math.random()*neighbors.length)];
    [puzzleState[empty], puzzleState[pick]] = [puzzleState[pick], puzzleState[empty]];
  }
  renderPuzzle();
}

function getNeighbors(pos) {
  const row = Math.floor(pos/3), col = pos%3, n = [];
  if (row > 0) n.push(pos-3);
  if (row < 2) n.push(pos+3);
  if (col > 0) n.push(pos-1);
  if (col < 2) n.push(pos+1);
  return n;
}

function renderPuzzle() {
  const grid = document.getElementById('slideGrid');
  grid.innerHTML = '';
  puzzleState.forEach((tileVal, pos) => {
    const div = document.createElement('div');
    div.className = 'slide-tile' + (tileVal === 8 ? ' empty' : '');
    div.dataset.pos = pos;
    if (tileVal !== 8) {
      div.innerHTML = glyphs[tileVal];
      div.onclick = () => moveTile(pos);
    }
    grid.appendChild(div);
  });
}

function renderRefGrid() {
  const grid = document.getElementById('refGrid');
  grid.innerHTML = '';
  SOLVED.forEach(val => {
    const div = document.createElement('div');
    div.className = val === 8 ? 'ref-tile ref-empty' : 'ref-tile';
    if (val !== 8) div.innerHTML = glyphs[val];
    grid.appendChild(div);
  });
}

function moveTile(pos) {
  if (puzzleSolved) return;
  const emptyPos = puzzleState.indexOf(8);
  if (!getNeighbors(emptyPos).includes(pos)) return;
  [puzzleState[emptyPos], puzzleState[pos]] = [puzzleState[pos], puzzleState[emptyPos]];
  renderPuzzle();
  checkSolved();
}

function checkSolved() {
  if (puzzleState.every((v,i) => v === SOLVED[i])) {
    puzzleSolved = true;
    document.getElementById('puzzleMsg').innerHTML = '<span class="success-msg" style="font-size:0.68rem">✓ The seals align. The constellation is complete.</span>';
    document.querySelectorAll('.slide-tile').forEach(t => t.classList.add('solved-flash'));
    setTimeout(() => goTo('stage-4'), 2000);
  }
}

initPuzzle();

/* ════════════════════════════════
   STAGE 4 — DOOR CHOICE
════════════════════════════════ */
function badEnding() {
  const overlay = document.getElementById('flashOverlay');
  // Yellow fog flash
  overlay.style.background = 'rgba(212,200,68,0.7)';
  overlay.classList.add('burst');
  setTimeout(() => {
    overlay.classList.remove('burst');
    overlay.classList.add('fade');
    document.getElementById('badEnd').classList.add('show');
    setTimeout(() => overlay.classList.remove('fade'), 2000);
  }, 300);
}

function restartDoor() {
  document.getElementById('badEnd').classList.remove('show');
  document.getElementById('flashOverlay').style.background = 'var(--fog)';
}

/* ════════════════════════════════
   STAGE 5 — FLASHBACK
════════════════════════════════ */
// Correct: C (Brahui keepers) → A (fog warning) → B (the body)
const correctVisionOrder = ['C','A','B'];
const slotContents = {1: null, 2: null, 3: null};
let draggedVision = null;
let flashImgTimer = null;

function initFlashback() {
  // Reset slots
  [1,2,3].forEach(i => {
    const slot = document.getElementById('vs-'+i);
    slotContents[i] = null;
    slot.classList.remove('filled','correct');
    // Restore placeholder
    const ph = slot.querySelector('span:last-child');
    if (ph) ph.style.display = '';
  });
  // Restore cards
  ['A','B','C'].forEach(id => {
    const card = document.getElementById('vc-'+id);
    card.style.display = '';
  });
  document.getElementById('visionDoneBtn').disabled = true;
  document.getElementById('visionMsg').innerHTML = '';
  // Start image cycling
  clearInterval(flashImgTimer);
  let fi = 0;
  document.getElementById('fi-0').classList.add('vis');
  flashImgTimer = setInterval(() => {
    document.querySelector('.flash-img.vis')?.classList.remove('vis');
    fi = (fi+1)%4;
    document.getElementById('fi-'+fi).classList.add('vis');
  }, 3500);
}

function dragVision(e, id) {
  draggedVision = id;
  e.dataTransfer.setData('text/plain', id);
  document.getElementById('vc-'+id).classList.add('dragging-v');
}
function endVisionDrag(e) {
  if (draggedVision) document.getElementById('vc-'+draggedVision)?.classList.remove('dragging-v');
  draggedVision = null;
}
function allowVisionDrop(e) { e.preventDefault(); e.currentTarget.classList.add('over'); }
function leaveVisionDrop(e) { e.currentTarget.classList.remove('over'); }

function dropVision(e, slotNum) {
  e.preventDefault();
  const slot = document.getElementById('vs-'+slotNum);
  slot.classList.remove('over');
  if (!draggedVision) return;
  const vid = draggedVision;

  // Remove from previous slot if placed
  Object.entries(slotContents).forEach(([sn, sv]) => {
    if (sv === vid) {
      slotContents[sn] = null;
      const prevSlot = document.getElementById('vs-'+sn);
      prevSlot.classList.remove('filled','correct');
      const prev = prevSlot.querySelector('.vision-card');
      if (prev) prevSlot.removeChild(prev);
      const ph = prevSlot.querySelector('span:last-child');
      if (ph) ph.style.display = '';
    }
  });

  // Place in new slot
  if (slotContents[slotNum]) {
    // Return previous occupant to hand
    const prev = slot.querySelector('.vision-card');
    if (prev) { document.getElementById('visionHand').appendChild(prev); prev.draggable = true; }
  }

  const card = document.getElementById('vc-'+vid);
  const ph = slot.querySelector('span:last-child');
  if (ph) ph.style.display = 'none';
  const clone = card.cloneNode(true);
  clone.draggable = false; clone.style.cursor = 'default'; clone.classList.remove('dragging-v');
  slot.appendChild(clone);
  slot.classList.add('filled');
  card.style.display = 'none';
  slotContents[slotNum] = vid;

  checkVisionComplete();
}

function checkVisionComplete() {
  if (!slotContents[1] || !slotContents[2] || !slotContents[3]) return;
  const allCorrect = correctVisionOrder.every((vid,i) => slotContents[i+1] === vid);
  if (allCorrect) {
    [1,2,3].forEach(i => document.getElementById('vs-'+i).classList.add('correct'));
    document.getElementById('visionMsg').innerHTML = '<span class="success-msg">✓ The order is clear. What was. What will be. What must not happen.</span>';
    document.getElementById('visionDoneBtn').disabled = false;
  } else {
    document.getElementById('visionMsg').innerHTML = '<span class="error-msg">The sequence doesn\'t hold. What came first — the secret, the warning, or the future?</span>';
    setTimeout(() => {
      // Return all to hand
      [1,2,3].forEach(i => {
        const slot = document.getElementById('vs-'+i);
        if (slotContents[i]) {
          const vid = slotContents[i];
          const card = document.getElementById('vc-'+vid);
          card.style.display = '';
          const placed = slot.querySelector('.vision-card');
          if (placed) slot.removeChild(placed);
          const ph = slot.querySelector('span:last-child');
          if (ph) ph.style.display = '';
          slot.classList.remove('filled','correct');
          slotContents[i] = null;
        }
      });
      document.getElementById('visionMsg').innerHTML = '';
    }, 2000);
  }
}

function flashbackComplete() {
  clearInterval(flashImgTimer);
  const overlay = document.getElementById('flashOverlay');
  overlay.style.background = '#d4c844';
  overlay.classList.add('burst');
  setTimeout(() => {
    overlay.classList.remove('burst');
    overlay.classList.add('fade');
    goTo('screen-end');
    setTimeout(() => overlay.classList.remove('fade'), 2200);
  }, 400);
}

/* ════════════════════════════════
   MOBILE TOUCH SUPPORT
   Tap-to-select / tap-to-place
════════════════════════════════ */
const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

// ── Stage 2: Token tap-to-place ──
let selectedTokenId = null;

function initTokenTouch() {
  if (!isTouchDevice) return;

  // Make tokens tappable
  document.querySelectorAll('.token-tray .token').forEach(tok => {
    tok.removeAttribute('draggable');
    tok.addEventListener('click', (e) => {
      e.stopPropagation();
      const tokenId = tok.id.replace('t-', '');
      if (selectedTokenId === tokenId) {
        selectedTokenId = null;
        tok.classList.remove('selected-touch');
        return;
      }
      // Deselect previous
      document.querySelectorAll('.token.selected-touch').forEach(t => t.classList.remove('selected-touch'));
      selectedTokenId = tokenId;
      tok.classList.add('selected-touch');
    });
  });

  // Make drop zones tappable
  ['upper', 'lower'].forEach(zone => {
    const dz = document.getElementById('dz-' + zone);
    dz.addEventListener('click', () => {
      if (!selectedTokenId) return;
      // Simulate the drop
      const fakeEvent = { preventDefault: () => {}, currentTarget: dz };
      draggedToken = selectedTokenId;
      dropToken(fakeEvent, zone);
      // Clean up
      document.querySelectorAll('.token.selected-touch').forEach(t => t.classList.remove('selected-touch'));
      selectedTokenId = null;
      draggedToken = null;
    });
  });
}

// ── Stage 5: Vision card tap-to-place ──
let selectedVisionId = null;

function initVisionTouch() {
  if (!isTouchDevice) return;

  // Make vision cards tappable
  document.querySelectorAll('#visionHand .vision-card').forEach(card => {
    card.removeAttribute('draggable');
    card.addEventListener('click', (e) => {
      e.stopPropagation();
      const vid = card.id.replace('vc-', '');
      if (selectedVisionId === vid) {
        selectedVisionId = null;
        card.classList.remove('selected-touch');
        return;
      }
      document.querySelectorAll('.vision-card.selected-touch').forEach(c => c.classList.remove('selected-touch'));
      selectedVisionId = vid;
      card.classList.add('selected-touch');
    });
  });

  // Make vision slots tappable
  [1, 2, 3].forEach(slotNum => {
    const slot = document.getElementById('vs-' + slotNum);
    slot.addEventListener('click', () => {
      if (!selectedVisionId) return;
      const fakeEvent = { preventDefault: () => {}, currentTarget: slot };
      draggedVision = selectedVisionId;
      dropVision(fakeEvent, slotNum);
      document.querySelectorAll('.vision-card.selected-touch').forEach(c => c.classList.remove('selected-touch'));
      selectedVisionId = null;
      draggedVision = null;
    });
  });
}

// Init touch support on page load
document.addEventListener('DOMContentLoaded', () => {
  initTokenTouch();
  initVisionTouch();
});
