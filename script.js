const canvas = document.getElementById("mycanvas");
const ctx = canvas.getContext("2d");

const BASE_W = 1280;
const BASE_H = 575;
let scaleX = 1,
  scaleY = 1;

function isMobileDevice() {
  return (
    /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    ) || window.innerWidth <= 1024
  );
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  scaleX = canvas.width / BASE_W;
  scaleY = canvas.height / BASE_H;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const sfxBuffers = {};
const sfxFiles = {
  attack: "sfx/Attack.wav",
  backsound: "sfx/backsound.mp3",
  final_round: "sfx/final_round.wav",
  hit: "sfx/Hit.wav",
  jump: "sfx/Jump.wav",
  landing: "sfx/Landing.wav",
  parry: "sfx/parry.mp3",
  player1wins: "sfx/player-2-wins.mp3",
  player2wins: "sfx/player-1-wins.mp3",
  round1: "sfx/round_1.wav",
  round2: "sfx/round_2.wav",
  step: "sfx/Step.wav",
  ultimate: "sfx/Ultimate.mp3",
};
const sfxVolumes = {
  backsound: 0.35,
  step: 0.3,
  landing: 0.5,
  attack: 0.8,
  hit: 0.85,
  jump: 0.6,
  parry: 0.9,
  round1: 1.0,
  round2: 1.0,
  player1wins: 1.0,
  player2wins: 1.0,
  final_round: 1.0,
  ultimate: 1.0,
};

async function loadSFX() {
  for (const [key, src] of Object.entries(sfxFiles)) {
    try {
      const res = await fetch(src);
      const arr = await res.arrayBuffer();
      sfxBuffers[key] = await audioCtx.decodeAudioData(arr);
    } catch (e) {}
  }
}
loadSFX();

let bgmSource = null;
let bgmGain = null;
let bgmStarted = false;

function playBGM() {
  if (bgmStarted || !sfxBuffers.backsound) return;
  bgmGain = audioCtx.createGain();
  bgmGain.gain.value = sfxVolumes.backsound;
  bgmGain.connect(audioCtx.destination);
  bgmSource = audioCtx.createBufferSource();
  bgmSource.buffer = sfxBuffers.backsound;
  bgmSource.loop = true;
  bgmSource.connect(bgmGain);
  bgmSource.start(0);
  bgmStarted = true;
}

function stopBGM() {
  if (bgmSource) {
    try {
      bgmSource.stop();
    } catch (e) {}
    bgmSource = null;
  }
  bgmGain = null;
  bgmStarted = false;
}

function playSFX(key) {
  if (audioCtx.state === "suspended") audioCtx.resume();
  const buf = sfxBuffers[key];
  if (!buf) return;
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  const gain = audioCtx.createGain();
  gain.gain.value = sfxVolumes[key] !== undefined ? sfxVolumes[key] : 0.8;
  src.connect(gain);
  gain.connect(audioCtx.destination);
  src.start(0);
}

function resumeAudioCtx() {
  if (audioCtx.state === "suspended") audioCtx.resume();
}
document.addEventListener("keydown", resumeAudioCtx, { once: true });
document.addEventListener("click", resumeAudioCtx, { once: true });
document.addEventListener("touchstart", resumeAudioCtx, { once: true });

const SPRITE_DEFS = {
  p1Idle: { src: "warrior/IdleLeft.png", cols: 8, frames: 8 },
  p1Run: { src: "warrior/RunLeft.png", cols: 8, frames: 8 },
  p1Attack: {
    src: "warrior/Attack1Left.png",
    cols: 4,
    frames: 4,
    atkStartupFrames: 1,
  },
  p1Attack2: {
    src: "warrior/Attack2Left.png",
    cols: 4,
    frames: 4,
    atkStartupFrames: 2,
  },
  p1Jump: { src: "warrior/JumpLeft.png", cols: 2, frames: 2 },
  p1TakeHit: { src: "warrior/Take_Hit.png", cols: 4, frames: 4 },
  p1Death: { src: "warrior/Death.png", cols: 6, frames: 6 },
  p2Idle: { src: "warrior2/IDLE.png", cols: 8, frames: 8 },
  p2Run: { src: "warrior2/RUN.png", cols: 8, frames: 8 },
  p2Attack: {
    src: "warrior2/ATTACK1.png",
    cols: 6,
    frames: 6,
    atkStartupFrames: 2,
  },
  p2Attack2: {
    src: "warrior2/Attack2.png",
    cols: 6,
    frames: 6,
    atkStartupFrames: 2,
  },
  p2Jump: { src: "warrior2/Jump.png", cols: 2, frames: 2 },
  p2Fall: { src: "warrior2/Fall.png", cols: 2, frames: 2 },
  p2TakeHit: { src: "warrior2/Take_Hit.png", cols: 4, frames: 4 },
  p2Death: { src: "warrior2/Death.png", cols: 6, frames: 6 },
};

const IMG = {};
for (const [key, def] of Object.entries(SPRITE_DEFS)) {
  IMG[key] = new Image();
  IMG[key].src = def.src;
}
const bgImg = new Image();
bgImg.src = "bg/background.png";

function getSpriteW(key) {
  const img = IMG[key],
    def = SPRITE_DEFS[key];
  if (!img || !img.complete || !img.naturalWidth) return 0;
  return img.width / def.cols;
}
function getSpriteH(key) {
  const img = IMG[key];
  if (!img || !img.complete || !img.naturalHeight) return 0;
  return img.height;
}

const GRAVITY = 0.8;
const JUMP_POWER = -20;
const MOVE_SPEED = 7;
const ACCEL = 1.1;
const DECEL = 1.4;
const AIR_CONTROL = 0.7;
const GROUND_P1 = 270;
const GROUND_P2 = 235;
const MAX_HP = 600;
const ATK_DAMAGE = 50;
const FRAME_DELAY_P1 = 5;
const FRAME_DELAY_P2 = 3;
const ARENA_LEFT = -175;
const ARENA_RIGHT = BASE_W + 150;
const ATK_MAX_USES = 3;
const ATK_COOLDOWN = 60;
const ATK_RESET_WINDOW = 60;
const PARRY_WINDOW_FRAMES = 18;
const PARRY_FLASH_DURATION = 16;
const BLOCK_FLASH_DURATION = 12;
const BLOCK_MAX_STAMINA = 100;
const BLOCK_DRAIN_RATE = 1.1;
const BLOCK_HIT_STAMINA_COST = 22;
const BLOCK_REGEN_RATE = 0.6;
const BLOCK_EMPTY_COOLDOWN = 90;
const ROUNDS_TO_WIN = 2;
const HIT_FLASH_DURATION = 14;
const HIT_SHAKE_DURATION = 14;

const ULTIMATE_MAX_ENERGY = 100;
const ULTIMATE_ENERGY_PER_HIT_DEALT = 12;
const ULTIMATE_ENERGY_PER_HIT_TAKEN = 8;
const ULTIMATE_ENERGY_REGEN_RATE = 0.04;
const ULTIMATE_DAMAGE = 180;
const ULTIMATE_COOLDOWN = 600;
const ULTIMATE_HITBOX_MULTIPLIER = 2.0;
const ULTIMATE_FLASH_DURATION = 60;
const ULTIMATE_SHOCKWAVE_DURATION = 30;
const ULTIMATE_SCREEN_FLASH_DURATION = 20;

const S = {
  IDLE: "idle",
  RUN: "run",
  JUMP: "jump",
  ATTACK: "attack",
  ATTACK2: "attack2",
  BLOCK: "block",
  HURT: "hurt",
  DEAD: "dead",
};
const GAME_STATE = {
  MENU: "menu",
  ROUND_INTRO: "round_intro",
  PLAYING: "playing",
  PAUSED: "paused",
  ROUND_OVER: "round_over",
  MATCH_OVER: "match_over",
};
const GAME_MODE = { PVP: "pvp", PVCOM: "pvcom" };
let gameMode = isMobileDevice() ? GAME_MODE.PVCOM : GAME_MODE.PVP;

let screenFlashTimer = 0;
let screenFlashColor = "255,100,0";
let shockwaves = [];

const P1_IMG = {
  [S.IDLE]: "p1Idle",
  [S.RUN]: "p1Run",
  [S.ATTACK]: "p1Attack",
  [S.ATTACK2]: "p1Attack2",
  [S.JUMP]: "p1Jump",
  [S.BLOCK]: "p1Idle",
  [S.HURT]: "p1TakeHit",
  [S.DEAD]: "p1Death",
};
const P2_IMG = {
  [S.IDLE]: "p2Idle",
  [S.RUN]: "p2Run",
  [S.ATTACK]: "p2Attack",
  [S.ATTACK2]: "p2Attack2",
  [S.JUMP]: "p2Jump",
  [S.BLOCK]: "p2Idle",
  [S.HURT]: "p2TakeHit",
  [S.DEAD]: "p2Death",
};

function makeP1() {
  return {
    x: BASE_W - 300,
    y: GROUND_P1,
    vx: 0,
    vy: 0,
    hp: MAX_HP,
    state: S.IDLE,
    frame: 0,
    frameTimer: 0,
    attackHit: false,
    atkCooldown: 0,
    atkUses: 0,
    atkResetTimer: 0,
    hitFlashTimer: 0,
    hitShakeTimer: 0,
    blocking: false,
    blockTimer: 0,
    parryFlashTimer: 0,
    blockFlashTimer: 0,
    blockStamina: BLOCK_MAX_STAMINA,
    blockEmptyCooldown: 0,
    keys: { left: false, right: false, up: false },
    groundY: GROUND_P1,
    scale: 2,
    imgKey: "p1Idle",
    frameDelay: FRAME_DELAY_P1,
    imgMap: P1_IMG,
    flipX: false,
    facingLeft: true,
    stepTimer: 0,
    ultimateEnergy: 0,
    ultimateCooldown: 0,
    ultimateFlashTimer: 0,
    isUltimate: false,
    ultimateGlowPulse: 0,
  };
}
function makeP2() {
  return {
    x: 50,
    y: GROUND_P2,
    vx: 0,
    vy: 0,
    hp: MAX_HP,
    state: S.IDLE,
    frame: 0,
    frameTimer: 0,
    attackHit: false,
    atkCooldown: 0,
    atkUses: 0,
    atkResetTimer: 0,
    hitFlashTimer: 0,
    hitShakeTimer: 0,
    blocking: false,
    blockTimer: 0,
    parryFlashTimer: 0,
    blockFlashTimer: 0,
    blockStamina: BLOCK_MAX_STAMINA,
    blockEmptyCooldown: 0,
    keys: { left: false, right: false, up: false },
    groundY: GROUND_P2,
    scale: 2,
    imgKey: "p2Idle",
    frameDelay: FRAME_DELAY_P2,
    imgMap: P2_IMG,
    flipX: false,
    facingLeft: false,
    stepTimer: 0,
    ultimateEnergy: 0,
    ultimateCooldown: 0,
    ultimateFlashTimer: 0,
    isUltimate: false,
    ultimateGlowPulse: 0,
  };
}

let p1 = makeP1();
let p2 = makeP2();
let gameState = GAME_STATE.MENU;
let winner = "";
let roundWins = { p1: 0, p2: 0 };
let currentRound = 1;
let roundOverTimer = 0;
let roundIntroTimer = 0;
let roundIntroLabel = "ROUND 1";
const ROUND_OVER_DELAY = 1800;
const ROUND_INTRO_DELAY = 1400;
let lastTime = 0;

function setPlayerState(p, newState) {
  if (p.state === S.DEAD) return;
  if (p.state === newState) return;
  p.state = newState;
  p.frame = 0;
  p.frameTimer = 0;
  p.imgKey = p.imgMap[newState];
}

function resolveIdle(p) {
  if (p.keys.left || p.keys.right) setPlayerState(p, S.RUN);
  else setPlayerState(p, S.IDLE);
}

function approach(current, target, rate) {
  if (current < target) return Math.min(current + rate, target);
  if (current > target) return Math.max(current - rate, target);
  return current;
}

function isAttackState(state) {
  return state === S.ATTACK || state === S.ATTACK2;
}

function gainUltimateEnergy(p, amount) {
  if (p.state === S.DEAD) return;
  p.ultimateEnergy = Math.min(ULTIMATE_MAX_ENERGY, p.ultimateEnergy + amount);
}

function canUseUltimate(p) {
  return (
    p.ultimateEnergy >= ULTIMATE_MAX_ENERGY &&
    p.ultimateCooldown <= 0 &&
    !isAttackState(p.state) &&
    p.state !== S.DEAD &&
    p.state !== S.BLOCK &&
    p.state !== S.HURT
  );
}

function startUltimate(p) {
  if (!canUseUltimate(p)) return false;
  p.ultimateEnergy = 0;
  p.ultimateCooldown = ULTIMATE_COOLDOWN;
  p.isUltimate = true;
  p.ultimateFlashTimer = ULTIMATE_FLASH_DURATION;
  p.ultimateGlowPulse = 0;
  p.attackHit = false;
  p.atkUses++;
  playSFX("attack");
  playSFX("ultimate");
  setPlayerState(p, S.ATTACK2);
  screenFlashTimer = ULTIMATE_SCREEN_FLASH_DURATION;
  screenFlashColor = p === p1 ? "255,80,0" : "120,0,255";
  return true;
}

function spawnShockwave(x, y, color) {
  shockwaves.push({
    x,
    y,
    timer: 0,
    maxTimer: ULTIMATE_SHOCKWAVE_DURATION,
    color,
  });
}

function updatePlayer(p, spriteNaturalLeft, dt) {
  if (p.state !== S.DEAD) {
    gainUltimateEnergy(p, ULTIMATE_ENERGY_REGEN_RATE * dt);
  }
  if (p.ultimateCooldown > 0) {
    p.ultimateCooldown = Math.max(0, p.ultimateCooldown - dt);
  }
  if (p.ultimateFlashTimer > 0) {
    p.ultimateFlashTimer = Math.max(0, p.ultimateFlashTimer - dt);
    p.ultimateGlowPulse += 0.25;
  }
  if (p.atkCooldown > 0) {
    p.atkCooldown = Math.max(0, p.atkCooldown - dt);
    if (p.atkCooldown === 0) p.atkUses = 0;
  }
  if (p.atkUses > 0 && !isAttackState(p.state)) {
    p.atkResetTimer += dt;
    if (p.atkResetTimer >= ATK_RESET_WINDOW) {
      p.atkUses = 0;
      p.atkResetTimer = 0;
      p.atkCooldown = 0;
    }
  } else {
    p.atkResetTimer = 0;
  }
  if (p.hitFlashTimer > 0) p.hitFlashTimer = Math.max(0, p.hitFlashTimer - dt);
  if (p.hitShakeTimer > 0) p.hitShakeTimer = Math.max(0, p.hitShakeTimer - dt);
  if (p.parryFlashTimer > 0)
    p.parryFlashTimer = Math.max(0, p.parryFlashTimer - dt);
  if (p.blockFlashTimer > 0)
    p.blockFlashTimer = Math.max(0, p.blockFlashTimer - dt);

  if (p.state === S.DEAD) {
    p.vx = approach(p.vx, 0, DECEL * dt);
    p.x += p.vx * dt;
    return;
  }

  const onGround = p.y >= p.groundY;

  if (p.state === S.BLOCK) {
    p.blockTimer += dt;
    p.blockStamina = Math.max(0, p.blockStamina - BLOCK_DRAIN_RATE * dt);
    if (p.blockStamina <= 0) {
      p.blockEmptyCooldown = BLOCK_EMPTY_COOLDOWN;
      stopBlock(p);
    }
  } else {
    p.blockStamina = Math.min(
      BLOCK_MAX_STAMINA,
      p.blockStamina + BLOCK_REGEN_RATE * dt,
    );
  }
  if (p.blockEmptyCooldown > 0)
    p.blockEmptyCooldown = Math.max(0, p.blockEmptyCooldown - dt);

  if (!isAttackState(p.state) && p.state !== S.BLOCK && p.state !== S.HURT) {
    let targetVx = 0;
    if (p.keys.left) {
      targetVx = -MOVE_SPEED;
      p.flipX = spriteNaturalLeft ? false : true;
      p.facingLeft = true;
    }
    if (p.keys.right) {
      targetVx = MOVE_SPEED;
      p.flipX = spriteNaturalLeft ? true : false;
      p.facingLeft = false;
    }
    const rate =
      (targetVx === 0 ? DECEL : ACCEL) * (onGround ? 1 : AIR_CONTROL);
    p.vx = approach(p.vx, targetVx, rate * dt);
  } else {
    p.vx = approach(p.vx, 0, DECEL * dt);
  }

  const wasInAir = p.y < p.groundY;
  p.vy += GRAVITY * dt;
  p.x += p.vx * dt;
  p.y += p.vy * dt;

  if (p.y >= p.groundY) {
    if (wasInAir && p.vy > 2) playSFX("landing");
    p.y = p.groundY;
    p.vy = 0;
    if (p.state === S.JUMP) resolveIdle(p);
  }

  if (onGround && p.state === S.RUN) {
    p.stepTimer -= dt;
    if (p.stepTimer <= 0) {
      playSFX("step");
      p.stepTimer = 18;
    }
  } else {
    p.stepTimer = 0;
  }

  p.x = Math.max(
    ARENA_LEFT,
    Math.min(ARENA_RIGHT - getSpriteW(p.imgKey) * p.scale, p.x),
  );

  if (p.state === S.JUMP) {
    const fallKey = p.imgMap[S.JUMP] === "p2Jump" ? "p2Fall" : null;
    if (fallKey && SPRITE_DEFS[fallKey]) {
      const wantKey = p.vy > 0 ? fallKey : p.imgMap[S.JUMP];
      if (p.imgKey !== wantKey) {
        p.imgKey = wantKey;
        p.frame = 0;
        p.frameTimer = 0;
      }
    }
  }

  if (
    !isAttackState(p.state) &&
    p.state !== S.JUMP &&
    p.state !== S.BLOCK &&
    p.state !== S.HURT
  ) {
    if (p.keys.left || p.keys.right) {
      if (p.state !== S.RUN) setPlayerState(p, S.RUN);
    } else {
      if (p.state !== S.IDLE) setPlayerState(p, S.IDLE);
    }
  }

  const def = SPRITE_DEFS[p.imgKey];
  const totalFrames = def ? def.frames : 1;
  p.frameTimer += dt;
  if (p.frameTimer >= p.frameDelay) {
    p.frameTimer = 0;
    p.frame++;
    if (p.state === S.DEAD) {
      if (p.frame >= totalFrames) p.frame = totalFrames - 1;
    } else if (isAttackState(p.state)) {
      if (p.frame >= totalFrames) {
        p.attackHit = false;
        p.isUltimate = false;
        if (p.atkUses >= ATK_MAX_USES) p.atkCooldown = ATK_COOLDOWN;
        resolveIdle(p);
      }
    } else if (p.state === S.HURT) {
      if (p.frame >= totalFrames) resolveIdle(p);
    } else if (p.state === S.JUMP) {
      if (p.frame >= totalFrames) p.frame = totalFrames - 1;
    } else {
      if (p.frame >= totalFrames) p.frame = 0;
    }
  }
}

function startBlock(p) {
  if (
    isAttackState(p.state) ||
    p.state === S.JUMP ||
    p.state === S.DEAD ||
    p.state === S.BLOCK ||
    p.state === S.HURT ||
    p.blockEmptyCooldown > 0 ||
    p.blockStamina <= 0
  )
    return;
  p.blocking = true;
  p.blockTimer = 0;
  setPlayerState(p, S.BLOCK);
}
function stopBlock(p) {
  p.blocking = false;
  if (p.state === S.BLOCK) resolveIdle(p);
}

function startAttack(p, attackState) {
  p.attackHit = false;
  p.isUltimate = false;
  p.atkUses++;
  playSFX("attack");
  setPlayerState(p, attackState);
}

function takeHit(p, damage) {
  const dmg = damage !== undefined ? damage : ATK_DAMAGE;
  if (isAttackState(p.state) && p.atkUses >= ATK_MAX_USES && p.atkCooldown <= 0)
    p.atkCooldown = ATK_COOLDOWN;
  if (p.imgMap[S.HURT] && SPRITE_DEFS[p.imgMap[S.HURT]])
    setPlayerState(p, S.HURT);
  playSFX("hit");
  p.hitFlashTimer = HIT_FLASH_DURATION;
  p.hitShakeTimer =
    dmg > ATK_DAMAGE ? HIT_SHAKE_DURATION * 2.5 : HIT_SHAKE_DURATION;
  gainUltimateEnergy(p, ULTIMATE_ENERGY_PER_HIT_TAKEN);
}

function getHitBox(p) {
  const sw = getSpriteW(p.imgKey) * p.scale,
    sh = getSpriteH(p.imgKey) * p.scale;
  return {
    x: p.x + sw * 0.3,
    y: p.y + sh * 0.25,
    width: sw * 0.35,
    height: sh * 0.65,
  };
}
function getAttackBox(p) {
  const sw = getSpriteW(p.imgKey) * p.scale,
    sh = getSpriteH(p.imgKey) * p.scale;
  const mult = p.isUltimate ? ULTIMATE_HITBOX_MULTIPLIER : 1;
  if (p.facingLeft)
    return {
      x: p.x - sw * 0.1 * mult,
      y: p.y + sh * 0.25,
      width: sw * 0.7 * mult,
      height: sh * 0.5 * mult,
    };
  return {
    x: p.x + sw * 0.3,
    y: p.y + sh * 0.25,
    width: sw * 0.7 * mult,
    height: sh * 0.5 * mult,
  };
}
function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function checkHits() {
  if (isAttackState(p1.state) && !p1.attackHit) {
    const startup = SPRITE_DEFS[p1.imgKey].atkStartupFrames || 0;
    if (p1.frame >= startup && rectsOverlap(getAttackBox(p1), getHitBox(p2))) {
      p1.attackHit = true;
      const damage = p1.isUltimate ? ULTIMATE_DAMAGE : ATK_DAMAGE;
      if (p2.state === S.BLOCK) {
        if (p2.blockTimer <= PARRY_WINDOW_FRAMES) {
          playSFX("parry");
          p2.parryFlashTimer = PARRY_FLASH_DURATION;
          if (p1.isUltimate) gainUltimateEnergy(p2, 20);
        } else {
          p2.blockFlashTimer = BLOCK_FLASH_DURATION;
          const staminaCost = p1.isUltimate
            ? BLOCK_HIT_STAMINA_COST * 2.5
            : BLOCK_HIT_STAMINA_COST;
          p2.blockStamina = Math.max(0, p2.blockStamina - staminaCost);
          if (p2.blockStamina <= 0) {
            p2.blockEmptyCooldown = BLOCK_EMPTY_COOLDOWN;
            stopBlock(p2);
          }
        }
      } else {
        p2.hp = Math.max(0, p2.hp - damage);
        takeHit(p2, damage);
        gainUltimateEnergy(p1, ULTIMATE_ENERGY_PER_HIT_DEALT);
        if (p1.isUltimate) {
          const sw = getSpriteW(p2.imgKey) * p2.scale;
          const sh = getSpriteH(p2.imgKey) * p2.scale;
          spawnShockwave(p2.x + sw * 0.5, p2.y + sh * 0.4, "255,80,0");
          spawnShockwave(p2.x + sw * 0.5, p2.y + sh * 0.4, "255,200,0");
        }
      }
    }
  }
  if (isAttackState(p2.state) && !p2.attackHit) {
    const startup = SPRITE_DEFS[p2.imgKey].atkStartupFrames || 0;
    if (p2.frame >= startup && rectsOverlap(getAttackBox(p2), getHitBox(p1))) {
      p2.attackHit = true;
      const damage = p2.isUltimate ? ULTIMATE_DAMAGE : ATK_DAMAGE;
      if (p1.state === S.BLOCK) {
        if (p1.blockTimer <= PARRY_WINDOW_FRAMES) {
          playSFX("parry");
          p1.parryFlashTimer = PARRY_FLASH_DURATION;
          if (p2.isUltimate) gainUltimateEnergy(p1, 20);
        } else {
          p1.blockFlashTimer = BLOCK_FLASH_DURATION;
          const staminaCost = p2.isUltimate
            ? BLOCK_HIT_STAMINA_COST * 2.5
            : BLOCK_HIT_STAMINA_COST;
          p1.blockStamina = Math.max(0, p1.blockStamina - staminaCost);
          if (p1.blockStamina <= 0) {
            p1.blockEmptyCooldown = BLOCK_EMPTY_COOLDOWN;
            stopBlock(p1);
          }
        }
      } else {
        p1.hp = Math.max(0, p1.hp - damage);
        takeHit(p1, damage);
        gainUltimateEnergy(p2, ULTIMATE_ENERGY_PER_HIT_DEALT);
        if (p2.isUltimate) {
          const sw = getSpriteW(p1.imgKey) * p1.scale;
          const sh = getSpriteH(p1.imgKey) * p1.scale;
          spawnShockwave(p1.x + sw * 0.5, p1.y + sh * 0.4, "120,0,255");
          spawnShockwave(p1.x + sw * 0.5, p1.y + sh * 0.4, "200,100,255");
        }
      }
    }
  }
}

function checkDeath() {
  if (p1.hp <= 0 && p1.state !== S.DEAD) {
    setPlayerState(p1, S.DEAD);
    p1.vx = 0;
    p1.vy = 0;
    p1.keys = { left: false, right: false, up: false };
    endRound("Samurai", "p2");
  }
  if (p2.hp <= 0 && p2.state !== S.DEAD) {
    setPlayerState(p2, S.DEAD);
    p2.vx = 0;
    p2.vy = 0;
    p2.keys = { left: false, right: false, up: false };
    endRound("King", "p1");
  }
}

function endRound(roundWinnerName, winnerKey) {
  if (gameState !== GAME_STATE.PLAYING) return;
  roundWins[winnerKey]++;
  winner = roundWinnerName;
  roundOverTimer = 0;
  if (roundWins[winnerKey] >= ROUNDS_TO_WIN) {
    gameState = GAME_STATE.MATCH_OVER;
    stopBGM();
    playSFX(winnerKey === "p1" ? "player1wins" : "player2wins");
  } else {
    gameState = GAME_STATE.ROUND_OVER;
  }
  syncOverlayUI();
}

function startRoundIntro(label, sfxKey) {
  roundIntroLabel = label;
  roundIntroTimer = 0;
  gameState = GAME_STATE.ROUND_INTRO;
  playSFX(sfxKey);
  syncOverlayUI();
}

function nextRound() {
  currentRound++;
  const keepWins = roundWins;
  p1 = makeP1();
  p2 = makeP2();
  roundWins = keepWins;
  winner = "";
  shockwaves = [];
  screenFlashTimer = 0;
  const isFinalRound = roundWins.p1 === 1 && roundWins.p2 === 1;
  startRoundIntro(
    isFinalRound ? "FINAL ROUND" : `ROUND ${currentRound}`,
    isFinalRound ? "final_round" : "round2",
  );
}

function restartMatch() {
  audioCtx.resume();
  p1 = makeP1();
  p2 = makeP2();
  roundWins = { p1: 0, p2: 0 };
  currentRound = 1;
  winner = "";
  shockwaves = [];
  screenFlashTimer = 0;
  playBGM();
  startRoundIntro("ROUND 1", "round1");
}

function goToMenu() {
  audioCtx.resume();
  gameState = GAME_STATE.MENU;
  stopBGM();
  p1 = makeP1();
  p2 = makeP2();
  roundWins = { p1: 0, p2: 0 };
  currentRound = 1;
  winner = "";
  shockwaves = [];
  screenFlashTimer = 0;
  syncOverlayUI();
}

function drawUltimateAura(p) {
  if (p.ultimateFlashTimer <= 0 && p.ultimateEnergy < ULTIMATE_MAX_ENERGY)
    return;
  const sw = getSpriteW(p.imgKey) * p.scale;
  const sh = getSpriteH(p.imgKey) * p.scale;
  const cx = p.x + sw * 0.5;
  const cy = p.y + sh * 0.5;

  if (p.ultimateFlashTimer > 0) {
    const pulse = Math.abs(Math.sin(p.ultimateGlowPulse));
    const radius = sw * 0.7 + pulse * 30;
    const alpha = (p.ultimateFlashTimer / ULTIMATE_FLASH_DURATION) * 0.7;
    const color =
      p === p1 ? `rgba(255,120,0,${alpha})` : `rgba(160,0,255,${alpha})`;
    const innerColor =
      p === p1
        ? `rgba(255,220,0,${alpha * 0.5})`
        : `rgba(220,150,255,${alpha * 0.5})`;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grad.addColorStop(0, innerColor);
    grad.addColorStop(0.6, color);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, radius, radius * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else if (p.ultimateEnergy >= ULTIMATE_MAX_ENERGY) {
    const pulse = Math.abs(Math.sin(Date.now() * 0.006));
    const radius = sw * 0.45 + pulse * 12;
    const alpha = 0.25 + pulse * 0.2;
    const color =
      p === p1 ? `rgba(255,180,0,${alpha})` : `rgba(180,60,255,${alpha})`;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grad.addColorStop(0, color);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.save();
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, radius, radius * 0.75, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawShockwaves() {
  for (const sw of shockwaves) {
    const progress = sw.timer / sw.maxTimer;
    const radius = 20 + progress * 120;
    const alpha = (1 - progress) * 0.8;
    const lineW = (1 - progress) * 6 + 1;
    ctx.save();
    ctx.strokeStyle = `rgba(${sw.color},${alpha})`;
    ctx.lineWidth = lineW;
    ctx.beginPath();
    ctx.arc(sw.x, sw.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.5})`;
    ctx.lineWidth = lineW * 0.5;
    ctx.beginPath();
    ctx.arc(sw.x, sw.y, radius * 0.6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawTinted(
  p,
  img,
  frame,
  sw,
  sh,
  dw,
  dh,
  shakeX,
  shakeY,
  color,
  alpha,
) {
  if (!p._flashCanvas) p._flashCanvas = document.createElement("canvas");
  const fc = p._flashCanvas;
  fc.width = sw;
  fc.height = sh;
  const fctx = fc.getContext("2d");
  fctx.clearRect(0, 0, sw, sh);
  fctx.drawImage(img, frame * sw, 0, sw, sh, 0, 0, sw, sh);
  fctx.globalCompositeOperation = "source-atop";
  fctx.fillStyle = `rgba(${color}, ${alpha})`;
  fctx.fillRect(0, 0, sw, sh);
  fctx.globalCompositeOperation = "source-over";
  ctx.save();
  if (p.flipX) {
    ctx.translate(p.x + dw + shakeX, p.y + shakeY);
    ctx.scale(-1, 1);
    ctx.drawImage(fc, 0, 0, sw, sh, 0, 0, dw, dh);
  } else {
    ctx.drawImage(fc, 0, 0, sw, sh, p.x + shakeX, p.y + shakeY, dw, dh);
  }
  ctx.restore();
}

function drawSprite(p) {
  drawUltimateAura(p);
  const img = IMG[p.imgKey],
    def = SPRITE_DEFS[p.imgKey];
  if (!img || !img.complete || !img.naturalWidth || !def) return;
  const sw = img.width / def.cols,
    sh = img.height,
    dw = sw * p.scale,
    dh = sh * p.scale;
  const frame = Math.min(Math.floor(p.frame), def.frames - 1);
  let shakeX = 0,
    shakeY = 0;
  if (p.hitShakeTimer > 0) {
    const intensity = Math.min(1, p.hitShakeTimer / HIT_SHAKE_DURATION);
    shakeX = (Math.random() * 2 - 1) * 6 * intensity;
    shakeY = (Math.random() * 2 - 1) * 4 * intensity;
  }
  if (p.isUltimate && p.state === S.ATTACK2) {
    const tintColor = p === p1 ? "255,120,0" : "160,60,255";
    const pulse = Math.abs(Math.sin(p.ultimateGlowPulse));
    drawTinted(
      p,
      img,
      frame,
      sw,
      sh,
      dw,
      dh,
      shakeX,
      shakeY,
      tintColor,
      0.35 + pulse * 0.25,
    );
    return;
  }
  if (p.hitFlashTimer > 0) {
    drawTinted(
      p,
      img,
      frame,
      sw,
      sh,
      dw,
      dh,
      shakeX,
      shakeY,
      "255,30,30",
      Math.min(0.65, (p.hitFlashTimer / HIT_FLASH_DURATION) * 0.65),
    );
    return;
  }
  if (p.parryFlashTimer > 0) {
    drawTinted(
      p,
      img,
      frame,
      sw,
      sh,
      dw,
      dh,
      shakeX,
      shakeY,
      "255,215,60",
      Math.min(0.75, (p.parryFlashTimer / PARRY_FLASH_DURATION) * 0.75),
    );
    return;
  }
  if (p.state === S.BLOCK) {
    let alpha = 0.3;
    if (p.blockFlashTimer > 0)
      alpha =
        0.3 + Math.min(0.4, (p.blockFlashTimer / BLOCK_FLASH_DURATION) * 0.4);
    drawTinted(
      p,
      img,
      frame,
      sw,
      sh,
      dw,
      dh,
      shakeX,
      shakeY,
      "70,170,255",
      alpha,
    );
    return;
  }
  ctx.save();
  if (p.flipX) {
    ctx.translate(p.x + dw + shakeX, p.y + shakeY);
    ctx.scale(-1, 1);
    ctx.drawImage(img, frame * sw, 0, sw, sh, 0, 0, dw, dh);
  } else {
    ctx.drawImage(
      img,
      frame * sw,
      0,
      sw,
      sh,
      p.x + shakeX,
      p.y + shakeY,
      dw,
      dh,
    );
  }
  ctx.restore();
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawUltimateBars() {
  const bw = 500;
  const by = 50;
  const samX = 20;
  const kingX = BASE_W - 20 - bw;
  const eW = 200,
    eH = 10,
    eY = by + 22 + 8,
    eR = 4;

  const r2 = p2.ultimateEnergy / ULTIMATE_MAX_ENERGY;
  const ready2 = p2.ultimateEnergy >= ULTIMATE_MAX_ENERGY;
  const pulsing2 = ready2 && Math.sin(Date.now() * 0.008) > 0;

  ctx.fillStyle = "rgba(0,0,0,0.5)";
  roundRect(samX, eY, eW, eH, eR);
  ctx.fill();

  if (r2 > 0) {
    const grad2 = ctx.createLinearGradient(samX, 0, samX + eW * r2, 0);
    if (ready2) {
      grad2.addColorStop(0, pulsing2 ? "#ffee00" : "#ffaa00");
      grad2.addColorStop(1, pulsing2 ? "#ff6600" : "#ffdd00");
    } else {
      grad2.addColorStop(0, "#ff6600");
      grad2.addColorStop(1, "#ffaa00");
    }
    ctx.fillStyle = grad2;
    roundRect(samX, eY, eW * r2, eH, eR);
    ctx.fill();
  }

  ctx.strokeStyle = ready2 ? "rgba(255,200,0,0.6)" : "rgba(255,255,255,0.15)";
  ctx.lineWidth = ready2 ? 1.5 : 1;
  roundRect(samX, eY, eW, eH, eR);
  ctx.stroke();

  if (p2.ultimateCooldown > 0) {
    const cdRatio = 1 - p2.ultimateCooldown / ULTIMATE_COOLDOWN;
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    roundRect(samX, eY + eH + 3, eW, 4, 2);
    ctx.fill();
    ctx.fillStyle = "#888";
    roundRect(samX, eY + eH + 3, eW * cdRatio, 4, 2);
    ctx.fill();
  }

  const r1 = p1.ultimateEnergy / ULTIMATE_MAX_ENERGY;
  const ready1 = p1.ultimateEnergy >= ULTIMATE_MAX_ENERGY;
  const pulsing1 = ready1 && Math.sin(Date.now() * 0.008) > 0;

  ctx.fillStyle = "rgba(0,0,0,0.5)";
  roundRect(kingX + bw - eW, eY, eW, eH, eR);
  ctx.fill();

  if (r1 > 0) {
    const grad1 = ctx.createLinearGradient(
      kingX + bw - eW * r1,
      0,
      kingX + bw,
      0,
    );
    if (ready1) {
      grad1.addColorStop(0, pulsing1 ? "#cc00ff" : "#9900ff");
      grad1.addColorStop(1, pulsing1 ? "#ff44ff" : "#cc44ff");
    } else {
      grad1.addColorStop(0, "#6600cc");
      grad1.addColorStop(1, "#cc44ff");
    }
    ctx.fillStyle = grad1;
    roundRect(kingX + bw - eW * r1, eY, eW * r1, eH, eR);
    ctx.fill();
  }

  ctx.strokeStyle = ready1 ? "rgba(200,100,255,0.6)" : "rgba(255,255,255,0.15)";
  ctx.lineWidth = ready1 ? 1.5 : 1;
  roundRect(kingX + bw - eW, eY, eW, eH, eR);
  ctx.stroke();

  if (p1.ultimateCooldown > 0) {
    const cdRatio = 1 - p1.ultimateCooldown / ULTIMATE_COOLDOWN;
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    roundRect(kingX + bw - eW, eY + eH + 3, eW, 4, 2);
    ctx.fill();
    ctx.fillStyle = "#888";
    roundRect(kingX + bw - eW * cdRatio, eY + eH + 3, eW * cdRatio, 4, 2);
    ctx.fill();
  }

  ctx.font = 'bold 10px "Pixelify Sans",monospace';
  ctx.textAlign = "left";
  ctx.fillStyle = ready2
    ? pulsing2
      ? "#ffee00"
      : "#ffaa00"
    : "rgba(255,160,0,0.7)";
  ctx.fillText(ready2 ? "⚡ ULTIMATE READY!" : "⚡ ENERGY", samX, eY - 2);

  ctx.textAlign = "right";
  ctx.fillStyle = ready1
    ? pulsing1
      ? "#ee88ff"
      : "#cc44ff"
    : "rgba(180,80,255,0.7)";
  ctx.fillText(ready1 ? "⚡ ULTIMATE READY!" : "⚡ ENERGY", kingX + bw, eY - 2);
  ctx.textAlign = "left";
}

function drawHealthBars() {
  const bw = 500,
    bh = 22,
    by = 50,
    r = 4,
    pad = 2;
  const samX = 20,
    kingX = BASE_W - 20 - bw;
  const rKing = p1.hp / MAX_HP,
    rSam = p2.hp / MAX_HP;
  const getColor = (ratio) =>
    ratio > 0.5 ? "#e03333" : ratio > 0.25 ? "#e07a33" : "#e0c433";

  ctx.fillStyle = "rgba(0,0,0,0.55)";
  roundRect(samX - pad, by - pad, bw + pad * 2, bh + pad * 2, r + 1);
  ctx.fill();
  roundRect(kingX - pad, by - pad, bw + pad * 2, bh + pad * 2, r + 1);
  ctx.fill();
  ctx.fillStyle = "#3a3a3a";
  roundRect(samX, by, bw, bh, r);
  ctx.fill();
  roundRect(kingX, by, bw, bh, r);
  ctx.fill();
  ctx.fillStyle = getColor(rSam);
  roundRect(samX, by, bw * rSam, bh, r);
  ctx.fill();
  ctx.fillStyle = getColor(rKing);
  roundRect(kingX + bw * (1 - rKing), by, bw * rKing, bh, r);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;
  roundRect(samX, by, bw, bh, r);
  ctx.stroke();
  roundRect(kingX, by, bw, bh, r);
  ctx.stroke();

  ctx.fillStyle = "white";
  ctx.font = 'bold 18px "Pixelify Sans",monospace';
  ctx.textAlign = "left";
  ctx.fillText("Samurai (P1)", samX, by - 8);
  ctx.textAlign = "right";
  ctx.fillText("King (P2)", kingX + bw, by - 8);
  ctx.textAlign = "left";

  drawUltimateBars();

  const slotSize = 14,
    slotGap = 5,
    slotY = by + bh + 30;
  function drawAtkSlots(p, originX, alignRight) {
    for (let i = 0; i < ATK_MAX_USES; i++) {
      const slotX = alignRight
        ? originX - (i + 1) * slotSize - i * slotGap
        : originX + i * (slotSize + slotGap);
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      roundRect(slotX, slotY, slotSize, slotSize, 3);
      ctx.fill();
      ctx.fillStyle = i >= p.atkUses ? "#4ad991" : "#555";
      roundRect(slotX + 2, slotY + 2, slotSize - 4, slotSize - 4, 2);
      ctx.fill();
    }
  }
  drawAtkSlots(p2, samX, false);
  drawAtkSlots(p1, kingX + bw, true);

  const cdW = 38,
    cdH = 6,
    cdY = slotY + slotSize + 6,
    cdR = 3;
  if (p2.atkCooldown > 0) {
    const ratio = 1 - p2.atkCooldown / ATK_COOLDOWN;
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    roundRect(samX, cdY, cdW, cdH, cdR);
    ctx.fill();
    ctx.fillStyle = "#e0c433";
    roundRect(samX, cdY, cdW * ratio, cdH, cdR);
    ctx.fill();
  }
  if (p1.atkCooldown > 0) {
    const ratio = 1 - p1.atkCooldown / ATK_COOLDOWN,
      cdX = kingX + bw - cdW;
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    roundRect(cdX, cdY, cdW, cdH, cdR);
    ctx.fill();
    ctx.fillStyle = "#e0c433";
    roundRect(cdX + cdW * (1 - ratio), cdY, cdW * ratio, cdH, cdR);
    ctx.fill();
  }

  ctx.font = 'bold 13px "Pixelify Sans",monospace';
  ctx.textAlign = "left";
  if (p2.state === S.BLOCK) {
    ctx.fillStyle =
      p2.blockTimer <= PARRY_WINDOW_FRAMES ? "#ffd83c" : "#46aaff";
    ctx.fillText(
      p2.blockTimer <= PARRY_WINDOW_FRAMES ? "PARRY READY" : "BLOCK",
      samX,
      cdY + cdH + 14,
    );
  }
  ctx.textAlign = "right";
  if (p1.state === S.BLOCK) {
    ctx.fillStyle =
      p1.blockTimer <= PARRY_WINDOW_FRAMES ? "#ffd83c" : "#46aaff";
    ctx.fillText(
      p1.blockTimer <= PARRY_WINDOW_FRAMES ? "PARRY READY" : "BLOCK",
      kingX + bw,
      cdY + cdH + 14,
    );
  }
  ctx.textAlign = "left";

  const stamW = 82,
    stamH = 8,
    stamY = cdY + cdH + 20,
    stamR = 3;
  function drawStaminaBar(p, x) {
    const ratio = p.blockStamina / BLOCK_MAX_STAMINA;
    const color =
      p.blockEmptyCooldown > 0
        ? "#555"
        : ratio > 0.5
          ? "#46aaff"
          : ratio > 0.2
            ? "#e0c433"
            : "#e03333";
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    roundRect(x, stamY, stamW, stamH, stamR);
    ctx.fill();
    ctx.fillStyle = color;
    roundRect(x, stamY, stamW * ratio, stamH, stamR);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1;
    roundRect(x, stamY, stamW, stamH, stamR);
    ctx.stroke();
  }
  drawStaminaBar(p2, samX);
  drawStaminaBar(p1, kingX + bw - stamW);

  const dotR = 7,
    dotGap = 20,
    dotY = stamY + stamH + 16;
  for (let i = 0; i < ROUNDS_TO_WIN; i++) {
    const cx = samX + dotR + i * dotGap;
    ctx.beginPath();
    ctx.arc(cx, dotY, dotR, 0, Math.PI * 2);
    ctx.fillStyle = i < roundWins.p2 ? "#e0c433" : "rgba(255,255,255,0.15)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  for (let i = 0; i < ROUNDS_TO_WIN; i++) {
    const cx = kingX + bw - dotR - i * dotGap;
    ctx.beginPath();
    ctx.arc(cx, dotY, dotR, 0, Math.PI * 2);
    ctx.fillStyle = i < roundWins.p1 ? "#e0c433" : "rgba(255,255,255,0.15)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = 'bold 16px "Pixelify Sans",monospace';
  ctx.textAlign = "center";
  ctx.fillText(`ROUND ${currentRound}`, BASE_W / 2, by + 6);
  ctx.textAlign = "left";
}

function drawScreenFlash() {
  if (screenFlashTimer <= 0) return;
  const alpha = (screenFlashTimer / ULTIMATE_SCREEN_FLASH_DURATION) * 0.4;
  ctx.fillStyle = `rgba(${screenFlashColor},${alpha})`;
  ctx.fillRect(0, 0, BASE_W, BASE_H);
  screenFlashTimer = Math.max(0, screenFlashTimer - 1);
}

function drawMenu() {
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, 0, BASE_W, BASE_H);
}

function drawPause() {
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.fillRect(0, 0, BASE_W, BASE_H);
}
function drawRoundIntro() {
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(0, 0, BASE_W, BASE_H);
  ctx.fillStyle = "#fff";
  ctx.font = 'bold 58px "Pixelify Sans",monospace';
  ctx.textAlign = "center";
  ctx.fillText(roundIntroLabel, BASE_W / 2, BASE_H / 2);
  ctx.textAlign = "left";
}
function drawRoundOver() {
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(0, 0, BASE_W, BASE_H);
  ctx.fillStyle = "#fff";
  ctx.font = '52px "Pixelify Sans",monospace';
  ctx.textAlign = "center";
  ctx.fillText(
    `${winner} wins Round ${currentRound}!`,
    BASE_W / 2,
    BASE_H / 2 - 20,
  );
  ctx.font = '22px "Pixelify Sans",monospace';
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.fillText("Get ready...", BASE_W / 2, BASE_H / 2 + 22);
  ctx.textAlign = "left";
}
function drawMatchOver() {
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.fillRect(0, 0, BASE_W, BASE_H);
}

function update(dt) {
  for (const sw of shockwaves) {
    sw.timer += dt;
  }
  shockwaves = shockwaves.filter((sw) => sw.timer < sw.maxTimer);

  if (gameMode === GAME_MODE.PVCOM) updateCPU(dt);
  updatePlayer(p1, true, dt);
  updatePlayer(p2, false, dt);
  checkHits();
  checkDeath();
}

function loop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const rawDt = timestamp - lastTime;
  lastTime = timestamp;
  const dt = Math.min(rawDt / (1000 / 60), 2.5);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
  ctx.drawImage(bgImg, 0, 0, BASE_W, BASE_H);
  syncMenuUI();
  syncOverlayUI();
  if (gameState === GAME_STATE.PLAYING) {
    update(dt);
  } else if (gameState === GAME_STATE.ROUND_INTRO) {
    roundIntroTimer += rawDt;
    if (roundIntroTimer >= ROUND_INTRO_DELAY) {
      gameState = GAME_STATE.PLAYING;
      syncOverlayUI();
    }
  } else if (gameState === GAME_STATE.ROUND_OVER) {
    if (p1.state === S.DEAD) updatePlayer(p1, true, dt);
    if (p2.state === S.DEAD) updatePlayer(p2, false, dt);
    roundOverTimer += rawDt;
    if (roundOverTimer >= ROUND_OVER_DELAY) nextRound();
  } else if (gameState === GAME_STATE.MATCH_OVER) {
    if (p1.state === S.DEAD) updatePlayer(p1, true, dt);
    if (p2.state === S.DEAD) updatePlayer(p2, false, dt);
  }
  drawShockwaves();
  drawSprite(p1);
  drawSprite(p2);
  drawScreenFlash();
  if (gameState !== GAME_STATE.MENU) drawHealthBars();
  if (gameState === GAME_STATE.MENU) drawMenu();
  else if (gameState === GAME_STATE.PAUSED) drawPause();
  else if (gameState === GAME_STATE.ROUND_INTRO) drawRoundIntro();
  else if (gameState === GAME_STATE.ROUND_OVER) drawRoundOver();
  else if (gameState === GAME_STATE.MATCH_OVER) drawMatchOver();
  requestAnimationFrame(loop);
}

function togglePause() {
  if (gameState === GAME_STATE.PLAYING) {
    gameState = GAME_STATE.PAUSED;
    audioCtx.suspend();
  } else if (gameState === GAME_STATE.PAUSED) {
    gameState = GAME_STATE.PLAYING;
    lastTime = 0;
    audioCtx.resume();
  }
  syncOverlayUI();
}

function canStartAttack(p) {
  return (
    !isAttackState(p.state) &&
    p.state !== S.DEAD &&
    p.state !== S.BLOCK &&
    p.state !== S.HURT &&
    p.atkCooldown <= 0 &&
    p.atkUses < ATK_MAX_USES
  );
}

let cpuActionTimer = 0,
  cpuBlockTimer = 0;
function updateCPU(dt) {
  if (p1.state === S.DEAD || gameState !== GAME_STATE.PLAYING) return;
  const dist = p2.x - p1.x,
    absDist = Math.abs(dist);
  p1.keys.left = false;
  p1.keys.right = false;
  const inRange = absDist < 140;
  if (
    !inRange &&
    p1.state !== S.BLOCK &&
    p1.state !== S.HURT &&
    !isAttackState(p1.state)
  ) {
    if (dist > 0) p1.keys.right = true;
    else p1.keys.left = true;
  }
  cpuActionTimer -= dt;
  cpuBlockTimer -= dt;

  if (
    inRange &&
    canUseUltimate(p1) &&
    cpuActionTimer <= 0 &&
    Math.random() < 0.6
  ) {
    startUltimate(p1);
    cpuActionTimer = 80 + Math.random() * 40;
  } else if (inRange && canStartAttack(p1) && cpuActionTimer <= 0) {
    startAttack(p1, S.ATTACK);
    cpuActionTimer = 40 + Math.random() * 30;
  }
  if (
    isAttackState(p2.state) &&
    !p2.attackHit &&
    absDist < 160 &&
    p1.state !== S.BLOCK &&
    cpuBlockTimer <= 0
  ) {
    startBlock(p1);
    cpuBlockTimer = 70;
  }
  if (p1.state === S.BLOCK && Math.random() < 0.03) stopBlock(p1);
}

document.addEventListener("keydown", (e) => {
  if (gameState === GAME_STATE.MENU) return;
  if (e.code === "Escape" || e.code === "KeyP") {
    if (gameState === GAME_STATE.PLAYING || gameState === GAME_STATE.PAUSED)
      togglePause();
    return;
  }
  if (gameState === GAME_STATE.PAUSED) return;
  if (e.code === "KeyR" && gameState === GAME_STATE.MATCH_OVER) {
    restartMatch();
    lastTime = 0;
    return;
  }
  if (gameState !== GAME_STATE.PLAYING) return;
  if (gameMode !== GAME_MODE.PVCOM) {
    if (e.code === "ArrowLeft") p1.keys.left = true;
    if (e.code === "ArrowRight") p1.keys.right = true;
    if (
      e.code === "ArrowUp" &&
      !p1.keys.up &&
      p1.state !== S.JUMP &&
      p1.state !== S.DEAD &&
      p1.state !== S.BLOCK &&
      p1.state !== S.HURT
    ) {
      p1.keys.up = true;
      p1.vy = JUMP_POWER;
      setPlayerState(p1, S.JUMP);
      playSFX("jump");
    }
    if (e.code === "ArrowDown" && canStartAttack(p1)) startAttack(p1, S.ATTACK);
    if (e.code === "Comma") {
      e.preventDefault();
      startUltimate(p1);
    }
    if (e.code === "ShiftRight") {
      e.preventDefault();
      startBlock(p1);
    }
  }
  if (e.code === "KeyA") p2.keys.left = true;
  if (e.code === "KeyD") p2.keys.right = true;
  if (
    e.code === "KeyW" &&
    !p2.keys.up &&
    p2.state !== S.JUMP &&
    p2.state !== S.DEAD &&
    p2.state !== S.BLOCK &&
    p2.state !== S.HURT
  ) {
    p2.keys.up = true;
    p2.vy = JUMP_POWER;
    setPlayerState(p2, S.JUMP);
    playSFX("jump");
  }
  if (e.code === "Space" && canStartAttack(p2)) {
    e.preventDefault();
    startAttack(p2, S.ATTACK);
  }
  if (e.code === "KeyQ") {
    e.preventDefault();
    startUltimate(p2);
  }
  if (e.code === "KeyS") startBlock(p2);
});

document.addEventListener("keyup", (e) => {
  if (gameMode !== GAME_MODE.PVCOM) {
    if (e.code === "ArrowLeft") {
      p1.keys.left = false;
      if (p1.state === S.RUN) resolveIdle(p1);
    }
    if (e.code === "ArrowRight") {
      p1.keys.right = false;
      if (p1.state === S.RUN) resolveIdle(p1);
    }
    if (e.code === "ArrowUp") p1.keys.up = false;
    if (e.code === "ShiftRight") stopBlock(p1);
  }
  if (e.code === "KeyA") {
    p2.keys.left = false;
    if (p2.state === S.RUN) resolveIdle(p2);
  }
  if (e.code === "KeyD") {
    p2.keys.right = false;
    if (p2.state === S.RUN) resolveIdle(p2);
  }
  if (e.code === "KeyW") p2.keys.up = false;
  if (e.code === "KeyS") stopBlock(p2);
});

const menuUI = document.createElement("div");
menuUI.style.cssText = `position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:0;font-family:"Pixelify Sans",monospace;z-index:10;width:min(85%,340px);`;

const menuPanel = document.createElement("div");
menuPanel.style.cssText = `display:flex;flex-direction:column;align-items:center;gap:16px;width:100%;padding:28px 24px;border-radius:6px;background:#1c1c1c;border:4px solid #fff;box-shadow:0 6px 0 rgba(0,0,0,0.5);`;

const menuTitle = document.createElement("div");
menuTitle.textContent = "SAMURAI VS KING";
menuTitle.style.cssText = `font-size:clamp(20px,4.5vw,28px);font-weight:bold;color:#fff;letter-spacing:1px;text-align:center;line-height:1.3;`;

function makeBtn(label, style = {}) {
  const btn = document.createElement("button");
  btn.textContent = label;
  btn.style.cssText = `width:100%;padding:12px 0;font-size:15px;font-family:"Pixelify Sans",monospace;font-weight:bold;border:3px solid #fff;border-radius:0;cursor:pointer;background:#1c1c1c;color:#fff;transition:background 0.1s,color 0.1s;letter-spacing:1px;`;
  Object.assign(btn.style, style);
  btn.addEventListener("mouseenter", () => {
    if (!btn._active) {
      btn.style.background = "#fff";
      btn.style.color = "#1c1c1c";
    }
  });
  btn.addEventListener("mouseleave", () => {
    if (!btn._active) {
      btn.style.background = style.background || "#1c1c1c";
      btn.style.color = style.color || "#fff";
    }
  });
  return btn;
}

const btnMode = makeBtn("MODE: PVP");
const btnStart = makeBtn("START");

function refreshMenuButtons() {
  btnMode.textContent =
    gameMode === GAME_MODE.PVP ? "MODE: PVP" : "MODE: VS COM";
}
btnMode.addEventListener("click", () => {
  gameMode = gameMode === GAME_MODE.PVP ? GAME_MODE.PVCOM : GAME_MODE.PVP;
  refreshMenuButtons();
});
btnStart.addEventListener("click", () => {
  restartMatch();
  lastTime = 0;
});

menuPanel.appendChild(menuTitle);
if (!isMobileDevice()) menuPanel.appendChild(btnMode);
menuPanel.appendChild(btnStart);
menuUI.appendChild(menuPanel);
refreshMenuButtons();

if (isMobileDevice()) {
  gameMode = GAME_MODE.PVCOM;
}

const pauseUI = document.createElement("div");
pauseUI.style.cssText = `position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:none;flex-direction:column;align-items:center;gap:14px;font-family:"Pixelify Sans",monospace;z-index:10;background:rgba(0,0,0,0.82);padding:36px 48px;border-radius:14px;border:2px solid rgba(255,255,255,0.15);min-width:280px;`;
const pauseTitle = document.createElement("div");
pauseTitle.textContent = "PAUSED";
pauseTitle.style.cssText = `color:#fff;font-size:34px;font-weight:bold;font-family:"Pixelify Sans",monospace;letter-spacing:2px;margin-bottom:6px;`;
const btnResume = makeBtn("▶ Resume");
const btnPauseRestart = makeBtn("↺ Restart");
const btnPauseMenu = makeBtn("⌂ Main Menu");
btnResume.addEventListener("click", () => togglePause());
btnPauseRestart.addEventListener("click", () => {
  restartMatch();
  lastTime = 0;
});
btnPauseMenu.addEventListener("click", () => goToMenu());
pauseUI.appendChild(pauseTitle);
pauseUI.appendChild(btnResume);
pauseUI.appendChild(btnPauseRestart);
pauseUI.appendChild(btnPauseMenu);

const matchOverUI = document.createElement("div");
matchOverUI.style.cssText = `position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:none;flex-direction:column;align-items:center;gap:14px;font-family:"Pixelify Sans",monospace;z-index:10;background:rgba(0,0,0,0.85);padding:36px 48px;border-radius:14px;border:2px solid rgba(255,255,255,0.15);min-width:300px;text-align:center;`;
const matchOverTitle = document.createElement("div");
matchOverTitle.style.cssText = `color:#e0c433;font-size:32px;font-weight:bold;font-family:"Pixelify Sans",monospace;margin-bottom:2px;`;
const matchOverSub = document.createElement("div");
matchOverSub.style.cssText = `color:rgba(255,255,255,0.6);font-size:16px;font-family:"Pixelify Sans",monospace;margin-bottom:10px;`;
const btnMatchRestart = makeBtn("↺ Play Again", {
  background: "#e0c433",
  color: "#1a1a1a",
  borderColor: "#e0c433",
});
const btnMatchMenu = makeBtn("⌂ Main Menu");
btnMatchRestart.addEventListener("click", () => {
  restartMatch();
  lastTime = 0;
});
btnMatchMenu.addEventListener("click", () => goToMenu());
matchOverUI.appendChild(matchOverTitle);
matchOverUI.appendChild(matchOverSub);
matchOverUI.appendChild(btnMatchRestart);
matchOverUI.appendChild(btnMatchMenu);

const wrap = canvas.parentElement;
if (wrap) {
  if (!wrap.style.position) wrap.style.position = "relative";
  wrap.appendChild(menuUI);
  wrap.appendChild(pauseUI);
  wrap.appendChild(matchOverUI);
}

function syncMenuUI() {
  menuUI.style.display = gameState === GAME_STATE.MENU ? "flex" : "none";
}
function syncOverlayUI() {
  pauseUI.style.display = gameState === GAME_STATE.PAUSED ? "flex" : "none";
  if (gameState === GAME_STATE.MATCH_OVER) {
    const mw = roundWins.p1 > roundWins.p2 ? "King" : "Samurai";
    matchOverTitle.textContent = `${mw} wins the Match!`;
    matchOverSub.textContent = `${roundWins.p1} — ${roundWins.p2}`;
    matchOverUI.style.display = "flex";
  } else {
    matchOverUI.style.display = "none";
  }
}

IMG["p1Idle"].onload = () => {
  requestAnimationFrame(loop);
};
