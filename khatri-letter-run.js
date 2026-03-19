(() => {
  // ── DOM ───────────────────────────────────────────────────────────────
  const canvas      = document.getElementById('game');
  const ctx         = canvas.getContext('2d');
  const overlay     = document.getElementById('overlay');
  const overlayCard = document.getElementById('overlayCard');
  const alertFill   = document.getElementById('alertFill');
  const postFill    = document.getElementById('postFill');
  const statusText  = document.getElementById('statusText');
  const decoyText   = document.getElementById('decoyText');
  const introScreen = document.getElementById('introScreen');

  canvas.focus();
  window.addEventListener('load', () => canvas.focus());
  canvas.addEventListener('click', () => canvas.focus());

  const keys = new Set();
  let started      = false;
  let lastTime     = 0;
  let introVisible = true;

  // ════════════════════════════════════════════════════════════════════
  //  WATERLOO DISTRICT MAP
  //  Based on the real street grid:
  //  Baylis Rd (left) → Morley St → Waterloo Rd (diagonal) →
  //  Blackfriars Rd (right) with Westminster Bridge Rd at the bottom
  //  and St George's Circus where the three roads converge.
  // ════════════════════════════════════════════════════════════════════
  const world = {
    width:  1280,
    height: 780,

    roads: [
      // ── Horizontal ─────────────────────────────────────────────────
      { x:0,   y:55,  w:1280, h:64  }, // Webber Street (top E-W)
      { x:80,  y:178, w:445,  h:52  }, // Coral Street (Baylis → Waterloo Rd upper)
      { x:80,  y:320, w:800,  h:56  }, // Stamford St / Upper Ground (full mid connector)
      { x:722, y:440, w:441,  h:52  }, // Davidge St / King James St (Waterloo lower → right)
      { x:868, y:530, w:275,  h:52  }, // Library Street (right side)
      { x:0,   y:638, w:1280, h:68  }, // Westminster Bridge Road (bottom E-W)
      // ── Vertical ───────────────────────────────────────────────────
      { x:80,  y:0,   w:64,   h:780 }, // Baylis Road (left)
      { x:348, y:55,  w:54,   h:322 }, // Morley Street (Webber St → Stamford St)
      { x:428, y:0,   w:64,   h:335 }, // Waterloo Road upper (Webber → Stamford)
      { x:658, y:320, w:64,   h:326 }, // Waterloo Road lower (Stamford → Westminster)
      { x:868, y:55,  w:62,   h:590 }, // Blackfriars Road (right, Webber → Westminster)
    ],

    buildings: [
      // ── Block B: Baylis Rd to Morley St ────────────────────────────
      { x:157, y:134, w:178, h:36  }, // thin strip, Webber St → Coral St
      { x:157, y:248, w:178, h:64  }, // Coral St → Stamford St
      { x:157, y:391, w:178, h:238 }, // Stamford St → Westminster Bridge Rd
      // ── Block D: right of Waterloo Rd upper ────────────────────────
      { x:508, y:134, w:132, h:36  }, // thin strip
      { x:508, y:248, w:132, h:64  }, // Coral → Stamford
      { x:508, y:391, w:132, h:238 }, // Stamford → Westminster
      // ── Block E: Waterloo Rd lower to Blackfriars Rd ───────────────
      { x:738, y:134, w:112, h:168 }, // Webber St → Stamford St
      { x:738, y:391, w:112, h:30  }, // Stamford → King James
      { x:738, y:498, w:112, h:118 }, // King James → Westminster
      // ── Block F: right of Blackfriars Rd ───────────────────────────
      { x:946, y:134, w:192, h:298 }, // Webber St → King James St
      { x:1153,y:134, w:107, h:298 }, // far right upper
      { x:946, y:596, w:294, h:30  }, // Library St → Westminster
      // ── Westminster Rd north-side strips ───────────────────────────
      { x:157, y:712, w:178, h:24  },
      { x:490, y:712, w:155, h:24  },
      { x:738, y:712, w:112, h:24  },
    ],

    crowdZones: [
      // Waterloo Market (junction of Waterloo Rd / Stamford St)
      { x:368, y:310, w:230, h:76,
        slow:0.80, sightMult:0.55, label:'Waterloo Market' },
      // St George's Circus (where Waterloo Rd lower meets Westminster Bridge Rd)
      { x:615, y:624, w:285, h:60,
        slow:0.85, sightMult:0.60, label:"St George's Circus" },
      // Church crowd (Blackfriars / King James junction)
      { x:868, y:418, w:132, h:84,
        slow:0.85, sightMult:0.65, label:'Church' },
    ],

    landmarks: [
      { x:88,  y:48,  text:'Baylis Rd'           },
      { x:352, y:48,  text:'Morley St'            },
      { x:432, y:48,  text:'Waterloo Rd'          },
      { x:874, y:48,  text:'Blackfriars Rd'       },
      { x:618, y:628, text:"St George's Circus"   },
      { x:1052,y:518, text:'Post Box'             },
      { x:50,  y:624, text:'Westminster Bridge Rd'},
      { x:88,  y:145, text:'START'                },
    ],
  };

  // Post box: on Library Street, right side
  const postBox = { x:1095, y:556, r:18, interactRadius:42, holdDuration:2000 };

  // ── Game state ────────────────────────────────────────────────────────
  const game = {
    state: 'intro',
    globalAlert: 0, postProgress: 0,
    decoy: null, rainOffset: 0,
  };

  // ── Player ────────────────────────────────────────────────────────────
  const player = {
    x: 112, y: 88, r: 12,
    speed: 180, baseSpeed: 180,
    decoyAvailable: true,
    color: '#c8a050',
  };

  // ── Enemies ───────────────────────────────────────────────────────────
  // Each patrols along roads in the Waterloo district.
  const enemies = [
    {
      // Patrols Webber St / Waterloo Rd upper / Morley St triangle
      x:462, y:88, r:13, dir:0, state:'patrol', stateTimer:0, suspicion:0,
      patrol:[{x:462,y:88},{x:462,y:310},{x:375,y:310},{x:375,y:88}],
      patrolIndex:1,
      patrolSpeed:96, chaseSpeed:150, searchSpeed:116,
      visionRange:205, visionAngle:Math.PI/2.6, color:'#8b3030', lastSeen:null
    },
    {
      // Patrols Stamford St / Westminster Bridge Rd long loop
      x:690, y:342, r:13, dir:Math.PI, state:'patrol', stateTimer:0, suspicion:0,
      patrol:[{x:690,y:342},{x:690,y:660},{x:155,y:660},{x:155,y:342}],
      patrolIndex:1,
      patrolSpeed:90, chaseSpeed:150, searchSpeed:115,
      visionRange:215, visionAngle:Math.PI/2.8, color:'#8b3030', lastSeen:null
    },
    {
      // Patrols Blackfriars Rd / Webber St / King James St
      x:900, y:88, r:13, dir:Math.PI, state:'patrol', stateTimer:0, suspicion:0,
      patrol:[{x:900,y:88},{x:1155,y:88},{x:1155,y:456},{x:900,y:456}],
      patrolIndex:1,
      patrolSpeed:88, chaseSpeed:155, searchSpeed:118,
      visionRange:225, visionAngle:Math.PI/2.5, color:'#8b3030', lastSeen:null
    },
    {
      // Guards the post box on Library Street
      x:900, y:556, r:13, dir:0, state:'patrol', stateTimer:0, suspicion:0,
      patrol:[{x:900,y:456},{x:900,y:645},{x:1143,y:556},{x:1143,y:456}],
      patrolIndex:1,
      patrolSpeed:88, chaseSpeed:152, searchSpeed:118,
      visionRange:210, visionAngle:Math.PI/2.7, color:'#8b3030', lastSeen:null
    }
  ];

  // ── Geometry helpers ──────────────────────────────────────────────────
  function rectContains(rect, x, y) {
    return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
  }
  function circleRectCollision(cx, cy, cr, rect) {
    const closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
    const closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
    const dx = cx - closestX, dy = cy - closestY;
    return (dx * dx + dy * dy) < cr * cr;
  }
  function segmentIntersectsRect(x1, y1, x2, y2, rect) {
    if (pointInRect(x1, y1, rect) || pointInRect(x2, y2, rect)) return true;
    const edges = [
      [rect.x, rect.y, rect.x+rect.w, rect.y],
      [rect.x+rect.w, rect.y, rect.x+rect.w, rect.y+rect.h],
      [rect.x+rect.w, rect.y+rect.h, rect.x, rect.y+rect.h],
      [rect.x, rect.y+rect.h, rect.x, rect.y],
    ];
    return edges.some(([ax,ay,bx,by]) => segmentsIntersect(x1,y1,x2,y2,ax,ay,bx,by));
  }
  function pointInRect(x, y, rect) {
    return x >= rect.x && x <= rect.x+rect.w && y >= rect.y && y <= rect.y+rect.h;
  }
  function ccw(ax, ay, bx, by, cx, cy) {
    return (cy - ay) * (bx - ax) > (by - ay) * (cx - ax);
  }
  function segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy) {
    return ccw(ax,ay,cx,cy,dx,dy) !== ccw(bx,by,cx,cy,dx,dy) &&
           ccw(ax,ay,bx,by,cx,cy) !== ccw(ax,ay,bx,by,dx,dy);
  }
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function normalizeAngle(a) {
    while (a >  Math.PI) a -= Math.PI*2;
    while (a < -Math.PI) a += Math.PI*2;
    return a;
  }

  // ── Environment ───────────────────────────────────────────────────────
  function playerVisibilityMultiplier() {
    for (const z of world.crowdZones) {
      if (rectContains(z, player.x, player.y)) return z.sightMult;
    }
    return 1;
  }
  function playerSpeedMultiplier() {
    for (const z of world.crowdZones) {
      if (rectContains(z, player.x, player.y)) return z.slow;
    }
    return 1;
  }
  function isOnRoad(x, y) { return world.roads.some(r => rectContains(r, x, y)); }
  function collidesBuilding(x, y, r) {
    return world.buildings.some(b => circleRectCollision(x, y, r, b));
  }

  // ── Vision ────────────────────────────────────────────────────────────
  function canSeePlayer(enemy) {
    const dx = player.x - enemy.x, dy = player.y - enemy.y;
    const dist = Math.hypot(dx, dy);
    if (dist > enemy.visionRange * playerVisibilityMultiplier()) return false;
    const diff = Math.abs(normalizeAngle(Math.atan2(dy, dx) - enemy.dir));
    if (diff > enemy.visionAngle / 2) return false;
    for (const b of world.buildings) {
      if (segmentIntersectsRect(enemy.x, enemy.y, player.x, player.y, b)) return false;
    }
    return true;
  }
  function canSeePoint(enemy, point, distMult = 1) {
    const dist = Math.hypot(point.x - enemy.x, point.y - enemy.y);
    if (dist > enemy.visionRange * distMult) return false;
    for (const b of world.buildings) {
      if (segmentIntersectsRect(enemy.x, enemy.y, point.x, point.y, b)) return false;
    }
    return true;
  }

  // ── Movement ──────────────────────────────────────────────────────────
  function moveTowards(entity, target, speed, dt) {
    const dx = target.x - entity.x, dy = target.y - entity.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.001) return true;
    const step = Math.min(dist, speed * dt);
    entity.dir = Math.atan2(dy, dx);
    entity.x += (dx / dist) * step;
    entity.y += (dy / dist) * step;
    return dist <= speed * dt + 0.5;
  }

  function tryMovePlayer(dt) {
    let dx = 0, dy = 0;
    if (keys.has('ArrowUp')    || keys.has('w') || keys.has('W')) dy -= 1;
    if (keys.has('ArrowDown')  || keys.has('s') || keys.has('S')) dy += 1;
    if (keys.has('ArrowLeft')  || keys.has('a') || keys.has('A')) dx -= 1;
    if (keys.has('ArrowRight') || keys.has('d') || keys.has('D')) dx += 1;

    if (dx === 0 && dy === 0) return;
    // ── THIS IS THE BUG FIX: startGame() now reachable from any state ──
    if (!started) startGame();
    if (game.state !== 'playing') return;

    const mag = Math.hypot(dx, dy) || 1;
    dx /= mag; dy /= mag;
    const speed = player.baseSpeed * playerSpeedMultiplier();
    const nx = player.x + dx * speed * dt;
    const ny = player.y + dy * speed * dt;

    if (isOnRoad(nx, player.y) && !collidesBuilding(nx, player.y, player.r))
      player.x = clamp(nx, player.r, world.width - player.r);
    if (isOnRoad(player.x, ny) && !collidesBuilding(player.x, ny, player.r))
      player.y = clamp(ny, player.r, world.height - player.r);
  }

  function useDecoy() {
    if (!started) startGame();
    if (!player.decoyAvailable || game.state !== 'playing') return;
    player.decoyAvailable = false;
    decoyText.textContent = 'Used';

    let dx = 0, dy = 0;
    if (keys.has('ArrowUp')    || keys.has('w') || keys.has('W')) dy -= 1;
    if (keys.has('ArrowDown')  || keys.has('s') || keys.has('S')) dy += 1;
    if (keys.has('ArrowLeft')  || keys.has('a') || keys.has('A')) dx -= 1;
    if (keys.has('ArrowRight') || keys.has('d') || keys.has('D')) dx += 1;
    const mag = Math.hypot(dx, dy) || 1;
    dx = (dx === 0 && dy === 0) ? -1 : dx / mag;
    dy = (dx === -1)            ?  0 : dy / mag;

    const px = clamp(player.x - dx * 90, 30, world.width - 30);
    const py = clamp(player.y - dy * 90, 30, world.height - 30);
    game.decoy = { x:px, y:py, ttl:4.0, radius:180, pulse:0 };
    statusText.textContent = 'Decoy thrown. Nearby pursuers will investigate.';

    enemies.forEach(e => {
      if (Math.hypot(e.x-px, e.y-py) < game.decoy.radius && canSeePoint(e, game.decoy, 1.2)) {
        e.state = 'search'; e.lastSeen = {x:px, y:py}; e.stateTimer = 3.5;
      }
    });
  }

  // ── Enemy AI ──────────────────────────────────────────────────────────
  function updateEnemies(dt) {
    let anyChasing = false, anySuspicious = false;

    enemies.forEach(enemy => {
      const sees = canSeePlayer(enemy);

      if (sees) {
        enemy.suspicion = clamp(enemy.suspicion + dt * 1.8, 0, 1);
        enemy.lastSeen = { x:player.x, y:player.y };
        if (enemy.suspicion >= 0.55) enemy.state = 'chase';
        else if (enemy.state !== 'chase') enemy.state = 'suspicious';
      } else {
        enemy.suspicion = clamp(enemy.suspicion - dt * 0.7, 0, 1);
        if (enemy.state === 'suspicious' && enemy.suspicion <= 0.02) {
          enemy.state = 'search'; enemy.stateTimer = 2.0;
        }
      }

      switch (enemy.state) {
        case 'patrol': {
          const t = enemy.patrol[enemy.patrolIndex];
          if (moveTowards(enemy, t, enemy.patrolSpeed, dt))
            enemy.patrolIndex = (enemy.patrolIndex + 1) % enemy.patrol.length;
          break;
        }
        case 'suspicious': {
          anySuspicious = true;
          if (enemy.lastSeen) moveTowards(enemy, enemy.lastSeen, enemy.searchSpeed, dt);
          break;
        }
        case 'chase': {
          anyChasing = true;
          moveTowards(enemy, player, enemy.chaseSpeed, dt);
          if (!sees && enemy.lastSeen) {
            enemy.stateTimer += dt;
            if (enemy.stateTimer >= 0.9) { enemy.state = 'search'; enemy.stateTimer = 3.2; }
          } else { enemy.stateTimer = 0; }
          break;
        }
        case 'search': {
          anySuspicious = true;
          if (enemy.lastSeen) moveTowards(enemy, enemy.lastSeen, enemy.searchSpeed, dt);
          enemy.stateTimer -= dt;
          if (enemy.stateTimer <= 0) { enemy.state = 'patrol'; enemy.suspicion = 0; }
          break;
        }
      }

      if (Math.hypot(enemy.x - player.x, enemy.y - player.y) <= enemy.r + player.r - 2)
        loseGame();
    });

    const alertTarget = anyChasing ? 1 : anySuspicious ? 0.55 : 0.12;
    game.globalAlert += (alertTarget - game.globalAlert) * Math.min(1, dt * 2.8);
    alertFill.style.width = `${Math.round(game.globalAlert * 100)}%`;
  }

  function updateDecoy(dt) {
    if (!game.decoy) return;
    game.decoy.ttl -= dt; game.decoy.pulse += dt * 5;
    if (game.decoy.ttl <= 0) game.decoy = null;
  }

  function updatePosting(dt) {
    const d = Math.hypot(player.x - postBox.x, player.y - postBox.y);
    const holding = keys.has('e') || keys.has('E');

    if (d <= postBox.interactRadius && holding && game.state === 'playing') {
      game.postProgress = clamp(game.postProgress + dt * 1000, 0, postBox.holdDuration);
      statusText.textContent = 'Posting letter... hold position.';
      if (game.postProgress >= postBox.holdDuration) winGame();
    } else {
      game.postProgress = clamp(game.postProgress - dt * 1400, 0, postBox.holdDuration);
      if (game.state === 'playing' && d <= postBox.interactRadius)
        statusText.textContent = 'At the post box. Hold E to post.';
    }
    postFill.style.width = `${Math.round((game.postProgress / postBox.holdDuration) * 100)}%`;
  }

  // ── Game flow ─────────────────────────────────────────────────────────
  function dismissIntro() {
    if (!introVisible) return;
    introVisible = false;
    introScreen.classList.add('fade-out');
    setTimeout(() => { introScreen.style.display = 'none'; }, 950);
  }

  function startGame() {
    started = true;
    game.state = 'playing';
    overlay.style.display = 'none';
    statusText.textContent = 'Running. Keep the letter hidden. Reach the post box.';
  }

  function loseGame() {
    if (game.state === 'lost' || game.state === 'won') return;
    game.state = 'lost';
    statusText.textContent = 'Captured before the letter entered the chain.';
    overlay.style.display = 'flex';
    overlayCard.innerHTML = `
      <img class="overlay-art" src="Game Images/3.jpg" alt="" />
      <div class="overlay-inner">
        <div class="overlay-eyebrow">Run Failed</div>
        <h3>Captured.</h3>
        <p>The hunters reached Khatri before the letter entered the postal chain.
           The message will never reach its destination.</p>
        <span class="overlay-restart">— ${isTouchDevice ? 'Tap to try again' : 'Press R to try again'} —</span>
      </div>`;
  }

  function winGame() {
    if (game.state === 'lost' || game.state === 'won') return;
    game.state = 'won';
    statusText.textContent = 'The letter is in the chain. Run complete.';
    overlay.style.display = 'flex';
    overlayCard.innerHTML = `
      <img class="overlay-art" src="Game Images/Dadabai.jpg" alt="" />
      <div class="overlay-inner">
        <div class="overlay-eyebrow">Mission Complete</div>
        <h3>Letter Posted.</h3>
        <p>Khatri has done enough. The letter is now beyond his hand and inside the chain —
           bound for Dadabai Naoroji and the cause beyond.</p>
        <span class="overlay-restart">— ${isTouchDevice ? 'Tap to replay' : 'Press R to replay'} —</span>
      </div>`;
  }

  function resetGame() {
    player.x = 112; player.y = 88;
    player.decoyAvailable = true;
    game.state = 'intro'; game.globalAlert = 0;
    game.postProgress = 0; game.decoy = null;
    decoyText.textContent = 'Available';
    alertFill.style.width = '0%'; postFill.style.width = '0%';
    started = false;

    enemies[0].x = 462;  enemies[0].y = 88;  enemies[0].patrolIndex = 1;
    enemies[1].x = 690;  enemies[1].y = 342; enemies[1].patrolIndex = 1;
    enemies[2].x = 900;  enemies[2].y = 88;  enemies[2].patrolIndex = 1;
    enemies[3].x = 900;  enemies[3].y = 556; enemies[3].patrolIndex = 1;
    enemies.forEach(e => { e.state='patrol'; e.stateTimer=0; e.suspicion=0; e.lastSeen=null; });

    overlay.style.display = 'flex';
    overlayCard.innerHTML = `
      <div class="overlay-inner">
        <div class="overlay-eyebrow">Chapter I · Waterloo, London 1906</div>
        <h3>Post the letter.</h3>
        <p>Cross the district, use crowd cover and building corners,
           and hold position at the red post box on Blackfriars Road
           long enough to drop the letter into the chain.</p>
        <span class="overlay-restart">— ${isTouchDevice ? 'Tap to begin' : 'Press any movement key to begin'} —</span>
      </div>`;
    statusText.textContent = 'Keep the letter hidden. Reach the post box.';
  }

  // ── Canvas drawing ────────────────────────────────────────────────────
  function drawRoundedRect(x, y, w, h, r, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.arcTo(x+w, y, x+w, y+h, r);
    ctx.arcTo(x+w, y+h, x, y+h, r);
    ctx.arcTo(x, y+h, x, y, r);
    ctx.arcTo(x, y, x+w, y, r);
    ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); }
  }

  function drawWorld() {
    // Background
    const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bg.addColorStop(0, '#0e1a28'); bg.addColorStop(1, '#060e18');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Roads
    world.roads.forEach(r =>
      drawRoundedRect(r.x, r.y, r.w, r.h, 10, '#243650', 'rgba(74,122,155,0.18)'));

    // Road centre dashes (amber lantern tint)
    ctx.strokeStyle = 'rgba(200,160,80,0.16)'; ctx.lineWidth = 2;
    ctx.setLineDash([14, 18]);
    world.roads.forEach(r => {
      ctx.beginPath();
      if (r.w > r.h) {
        ctx.moveTo(r.x+14, r.y+r.h/2); ctx.lineTo(r.x+r.w-14, r.y+r.h/2);
      } else {
        ctx.moveTo(r.x+r.w/2, r.y+14); ctx.lineTo(r.x+r.w/2, r.y+r.h-14);
      }
      ctx.stroke();
    });
    ctx.setLineDash([]);

    // Crowd zones
    world.crowdZones.forEach(z => {
      drawRoundedRect(z.x, z.y, z.w, z.h, 12, 'rgba(200,160,80,0.18)', 'rgba(200,160,80,0.32)');
      ctx.fillStyle = 'rgba(200,160,80,0.10)';
      for (let i = 0; i < 26; i++) {
        const px = z.x + 12 + (i * 31) % (z.w - 24);
        const py = z.y + 14 + ((i * 53) % (z.h - 28));
        ctx.beginPath(); ctx.arc(px, py, 4+(i%3), 0, Math.PI*2); ctx.fill();
      }
      ctx.fillStyle = 'rgba(200,160,80,0.55)';
      ctx.font = '10px "Courier New", monospace';
      ctx.fillText(z.label, z.x+8, z.y+14);
    });

    // Buildings (Victorian brick blocks)
    world.buildings.forEach(b => {
      drawRoundedRect(b.x, b.y, b.w, b.h, 5, '#0d1e2f', '#1e3d58');
      // Amber window glow
      ctx.fillStyle = 'rgba(200,160,80,0.20)';
      const cols = Math.max(1, Math.floor(b.w / 40));
      for (let i = 0; i < cols; i++) {
        const wx = b.x + 11 + i * 25;
        const wy = b.y + 11;
        if (wx + 9 < b.x + b.w - 9) ctx.fillRect(wx, wy, 8, 6);
      }
      // Brick hatch lines
      ctx.strokeStyle = 'rgba(30,61,88,0.45)'; ctx.lineWidth = 1;
      for (let i = 0; i < Math.floor(b.h / 10); i++) {
        ctx.beginPath();
        ctx.moveTo(b.x+3, b.y+20+i*10); ctx.lineTo(b.x+b.w-3, b.y+20+i*10);
        ctx.stroke();
      }
    });

    // Street name labels
    ctx.font = '11px "Courier New", monospace';
    world.landmarks.forEach(l => {
      ctx.fillStyle = 'rgba(122,175,200,0.65)';
      ctx.fillText(l.text, l.x, l.y);
    });

    // Post box
    ctx.beginPath();
    ctx.arc(postBox.x, postBox.y, postBox.interactRadius, 0, Math.PI*2);
    ctx.strokeStyle = 'rgba(176,33,33,0.3)'; ctx.lineWidth = 1; ctx.stroke();

    ctx.beginPath();
    ctx.arc(postBox.x, postBox.y, postBox.r, 0, Math.PI*2);
    ctx.fillStyle = '#b02121'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,200,200,0.35)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(postBox.x-9, postBox.y-2, 18, 4);

    // Decoy
    if (game.decoy) {
      const pulse = 18 + Math.sin(game.decoy.pulse) * 8;
      ctx.beginPath(); ctx.arc(game.decoy.x, game.decoy.y, pulse, 0, Math.PI*2);
      ctx.strokeStyle = 'rgba(200,160,80,0.9)'; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.beginPath(); ctx.arc(game.decoy.x, game.decoy.y, 6, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(200,160,80,0.85)'; ctx.fill();
    }

    // Enemies
    enemies.forEach(enemy => {
      const vr = enemy.visionRange * (canSeePlayer(enemy) ? playerVisibilityMultiplier() : 1);
      // Vision cone
      ctx.beginPath(); ctx.moveTo(enemy.x, enemy.y);
      ctx.arc(enemy.x, enemy.y, vr, enemy.dir-enemy.visionAngle/2, enemy.dir+enemy.visionAngle/2);
      ctx.closePath();
      ctx.fillStyle = enemy.state === 'chase' ? 'rgba(139,48,48,0.22)' : 'rgba(74,122,155,0.10)';
      ctx.fill();
      // Body
      ctx.beginPath(); ctx.arc(enemy.x, enemy.y, enemy.r, 0, Math.PI*2);
      ctx.fillStyle = enemy.color; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1.5; ctx.stroke();
      // Suspicion arc
      if (enemy.suspicion > 0.02) {
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.r+5, 0, Math.PI*2*enemy.suspicion);
        ctx.strokeStyle = enemy.state === 'chase' ? '#c04040' : '#c8a050';
        ctx.lineWidth = 2.5; ctx.stroke();
      }
      // Alert dot
      if (enemy.state === 'chase' || enemy.state === 'suspicious') {
        ctx.beginPath(); ctx.arc(enemy.x, enemy.y-enemy.r-8, 4, 0, Math.PI*2);
        ctx.fillStyle = enemy.state === 'chase' ? '#d04040' : '#c8a050'; ctx.fill();
      }
    });

    // Player (Khatri) — amber glow + letter mark
    const glow = ctx.createRadialGradient(player.x, player.y, 0, player.x, player.y, player.r*3);
    glow.addColorStop(0, 'rgba(200,160,80,0.22)'); glow.addColorStop(1, 'transparent');
    ctx.beginPath(); ctx.arc(player.x, player.y, player.r*3, 0, Math.PI*2);
    ctx.fillStyle = glow; ctx.fill();

    ctx.beginPath(); ctx.arc(player.x, player.y, player.r, 0, Math.PI*2);
    ctx.fillStyle = player.color; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.5; ctx.stroke();

    ctx.fillStyle = 'rgba(232,242,248,0.85)';
    ctx.fillRect(player.x-5, player.y-3, 10, 7);
    ctx.strokeStyle = 'rgba(200,160,80,0.6)'; ctx.lineWidth = 1;
    ctx.strokeRect(player.x-5, player.y-3, 10, 7);

    // London rain
    game.rainOffset = (game.rainOffset + 7) % (canvas.height + 120);
    ctx.strokeStyle = 'rgba(180,210,240,0.12)'; ctx.lineWidth = 1.5;
    for (let x = -40; x < canvas.width+40; x += 34) {
      for (let y = -40; y < canvas.height+60; y += 88) {
        const yy = (y + game.rainOffset) % (canvas.height + 120) - 60;
        ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x+10, yy+22); ctx.stroke();
      }
    }

    // Vignette
    const vig = ctx.createRadialGradient(
      canvas.width/2, canvas.height/2, canvas.height*0.28,
      canvas.width/2, canvas.height/2, canvas.width*0.72);
    vig.addColorStop(0, 'transparent');
    vig.addColorStop(1, 'rgba(6,10,18,0.52)');
    ctx.fillStyle = vig; ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // ── Main loop — BUG FIX: tryMovePlayer called regardless of state ─────
  function update(dt) {
    // tryMovePlayer runs in all non-terminal states so pressing a movement
    // key can call startGame() and transition intro → playing.
    if (game.state !== 'won' && game.state !== 'lost') {
      tryMovePlayer(dt);
    }
    if (game.state === 'playing') {
      updateEnemies(dt);
      updateDecoy(dt);
      updatePosting(dt);
    }
    drawWorld();
  }

  // ── Input ─────────────────────────────────────────────────────────────
  function handleKeyDown(e) {
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
    keys.add(e.key);

    if (introVisible) {
      dismissIntro();
      return; // key stays in `keys`; tryMovePlayer will see it next frame
    }

    if (e.key === ' ' && game.state !== 'won' && game.state !== 'lost') useDecoy();
    if ((e.key === 'r' || e.key === 'R') &&
        (game.state === 'won' || game.state === 'lost' || game.state === 'intro')) resetGame();
  }
  function handleKeyUp(e) { keys.delete(e.key); }

  window.addEventListener('keydown',   handleKeyDown, { passive:false });
  window.addEventListener('keyup',     handleKeyUp,   { passive:false });
  document.addEventListener('keydown', handleKeyDown, { passive:false });
  document.addEventListener('keyup',   handleKeyUp,   { passive:false });
  canvas.addEventListener('keydown',   handleKeyDown, { passive:false });
  canvas.addEventListener('keyup',     handleKeyUp,   { passive:false });
  window.addEventListener('blur', () => keys.clear());

  // ── Touch / Mobile Controls ───────────────────────────────────────────
  const isTouchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  const touchControls = document.getElementById('touchControls');
  const joystickZone  = document.getElementById('joystickZone');
  const joystickBase  = document.getElementById('joystickBase');
  const joystickKnob  = document.getElementById('joystickKnob');
  const btnPost       = document.getElementById('btnPost');
  const btnDecoy      = document.getElementById('btnDecoy');
  const btnRestart    = document.getElementById('btnRestart');

  // Virtual joystick state
  const joystick = { active: false, touchId: null, cx: 0, cy: 0, dx: 0, dy: 0, maxR: 40 };

  if (isTouchDevice && touchControls) {
    touchControls.style.display = 'flex';

    // ── Tap intro screen to dismiss ───────────────────────────────────
    introScreen.addEventListener('touchstart', e => {
      e.preventDefault();
      dismissIntro();
    }, { passive: false });

    // ── Tap overlay to start / restart ────────────────────────────────
    overlay.addEventListener('touchstart', e => {
      e.preventDefault();
      if (game.state === 'won' || game.state === 'lost') { resetGame(); return; }
      if (!started) startGame();
    }, { passive: false });
    overlay.style.pointerEvents = 'auto';

    // ── Update CTA text for mobile ────────────────────────────────────
    const introCta = document.querySelector('.intro-cta');
    if (introCta) introCta.textContent = '— Tap to begin —';

    // ── Joystick ──────────────────────────────────────────────────────
    joystickZone.addEventListener('touchstart', e => {
      e.preventDefault();
      const t = e.changedTouches[0];
      joystick.active  = true;
      joystick.touchId = t.identifier;

      const rect = joystickZone.getBoundingClientRect();
      joystick.cx = rect.left + rect.width  / 2;
      joystick.cy = rect.top  + rect.height / 2;

      // Move base to where the finger landed
      joystickBase.style.left = `${t.clientX - rect.left}px`;
      joystickBase.style.top  = `${t.clientY - rect.top}px`;
      joystick.cx = t.clientX;
      joystick.cy = t.clientY;
      joystickKnob.style.transform = 'translate(-50%,-50%)';

      if (introVisible) dismissIntro();
      if (!started) startGame();
    }, { passive: false });

    joystickZone.addEventListener('touchmove', e => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier !== joystick.touchId) continue;
        let dx = t.clientX - joystick.cx;
        let dy = t.clientY - joystick.cy;
        const dist = Math.hypot(dx, dy);
        if (dist > joystick.maxR) { dx = dx/dist*joystick.maxR; dy = dy/dist*joystick.maxR; }
        joystickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

        // Clear old directional keys, set new ones
        keys.delete('ArrowUp'); keys.delete('ArrowDown');
        keys.delete('ArrowLeft'); keys.delete('ArrowRight');

        const deadzone = 8;
        if (dy < -deadzone) keys.add('ArrowUp');
        if (dy >  deadzone) keys.add('ArrowDown');
        if (dx < -deadzone) keys.add('ArrowLeft');
        if (dx >  deadzone) keys.add('ArrowRight');

        joystick.dx = dx;
        joystick.dy = dy;
      }
    }, { passive: false });

    const endJoystick = e => {
      for (const t of e.changedTouches) {
        if (t.identifier !== joystick.touchId) continue;
        joystick.active = false;
        joystick.touchId = null;
        joystick.dx = 0;
        joystick.dy = 0;
        joystickKnob.style.transform = 'translate(-50%,-50%)';
        keys.delete('ArrowUp'); keys.delete('ArrowDown');
        keys.delete('ArrowLeft'); keys.delete('ArrowRight');
      }
    };
    joystickZone.addEventListener('touchend',    endJoystick);
    joystickZone.addEventListener('touchcancel', endJoystick);

    // ── Action buttons ────────────────────────────────────────────────
    btnPost.addEventListener('touchstart', e => {
      e.preventDefault();
      if (introVisible) dismissIntro();
      if (!started) startGame();
      keys.add('E');
    }, { passive: false });
    btnPost.addEventListener('touchend', e => {
      e.preventDefault();
      keys.delete('E');
    }, { passive: false });

    btnDecoy.addEventListener('touchstart', e => {
      e.preventDefault();
      if (introVisible) dismissIntro();
      useDecoy();
    }, { passive: false });

    btnRestart.addEventListener('touchstart', e => {
      e.preventDefault();
      if (game.state === 'won' || game.state === 'lost' || game.state === 'intro') resetGame();
    }, { passive: false });

    // Prevent canvas zoom / scroll on mobile
    canvas.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
    canvas.addEventListener('touchmove',  e => e.preventDefault(), { passive: false });
  }

  function loop(ts) {
    const dt = Math.min(0.033, (ts - lastTime) / 1000 || 0.016);
    lastTime = ts;
    update(dt);
    requestAnimationFrame(loop);
  }

  resetGame();
  requestAnimationFrame(loop);
})();