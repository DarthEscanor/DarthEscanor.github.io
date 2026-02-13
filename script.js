const scenes = [...document.querySelectorAll('.scene')];
const app = document.getElementById('app');
const loadingScreen = document.getElementById('loading-screen');
const loadingProgress = document.getElementById('loading-progress');
const music = document.getElementById('bg-music');
const musicToggle = document.getElementById('music-toggle');
const particlesRoot = document.getElementById('global-particles');

const memoryCards = [
  { src: 'fav1.mp4', caption: 'My favorite memory with you.', type: 'video' },
  { src: 'fav2.mp4', caption: 'A moment I will always cherish.', type: 'video' },
  { src: 'fav3.jpeg', caption: 'A memory that still makes me smile.', type: 'image' },
  { src: 'fav4.jpeg', caption: 'Another beautiful piece of our story.', type: 'image' }
];

const state = {
  currentScene: 0,
  allowAdvance: false,
  hasStartedAudio: false,
  audioMuted: false,
  currentCard: 0,
  activeCanvas: null,
  sceneLock: false,
  scratchDone: false,
  finalStarted: false
};

const formatNumber = (num) => new Intl.NumberFormat('en-US').format(Math.floor(num));

const preloadAssets = async () => {
  const assets = ['song.mp3', ...memoryCards.map((card) => card.src)];
  let loaded = 0;
  await Promise.all(
    assets.map(
      (src) =>
        new Promise((resolve) => {
          const ext = src.split('.').pop();
          const done = () => {
            loaded += 1;
            loadingProgress.style.width = `${(loaded / assets.length) * 100}%`;
            resolve();
          };

          if (['mp4', 'webm', 'ogg'].includes(ext)) {
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.src = src;
            video.onloadeddata = done;
            video.onerror = done;
          } else if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
            const img = new Image();
            img.src = src;
            img.onload = done;
            img.onerror = done;
          } else {
            const audio = new Audio();
            audio.src = src;
            audio.oncanplaythrough = done;
            audio.onerror = done;
          }
        })
    )
  );
};

const typeLine = (el, speed = 28) =>
  new Promise((resolve) => {
    const text = el.dataset.text || '';
    el.textContent = '';
    let idx = 0;
    const tick = () => {
      if (idx <= text.length) {
        el.textContent = text.slice(0, idx);
        idx += 1;
        setTimeout(tick, speed);
      } else {
        resolve();
      }
    };
    tick();
  });

const runTypingForScene = async (scene) => {
  const targets = [...scene.querySelectorAll('.type-target')];
  for (const target of targets) {
    await typeLine(target, target.classList.contains('body-text') ? 18 : 24);
  }
  state.allowAdvance = true;
};

const launchHeartBurst = () => {
  const root = document.getElementById('opening-heart-burst');
  for (let i = 0; i < 34; i += 1) {
    const heart = document.createElement('span');
    heart.className = 'burst-heart';
    const angle = (Math.PI * 2 * i) / 34;
    const radius = 40 + Math.random() * 120;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    heart.style.left = `${centerX}px`;
    heart.style.top = `${centerY}px`;
    heart.animate(
      [
        { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
        { transform: `translate(${x}px, ${y}px) scale(0.2)`, opacity: 0 }
      ],
      { duration: 1600, easing: 'cubic-bezier(.16,.84,.44,1)' }
    );
    root.appendChild(heart);
    setTimeout(() => heart.remove(), 1700);
  }
};

const createGlobalParticles = () => {
  const maxParticles = window.innerWidth < 768 ? 18 : 32;
  for (let i = 0; i < maxParticles; i += 1) {
    const p = document.createElement('span');
    p.className = 'particle';
    const size = Math.random() * 3 + 2;
    p.style.width = `${size}px`;
    p.style.height = `${size}px`;
    p.style.left = `${Math.random() * 100}%`;
    p.style.top = `${Math.random() * 100}%`;
    p.style.background = `rgba(255, ${170 + Math.random() * 60}, ${210 + Math.random() * 40}, ${0.3 + Math.random() * 0.6})`;
    particlesRoot.appendChild(p);
  }
};

const animateParticles = () => {
  const particles = [...particlesRoot.children];
  let time = 0;

  const loop = () => {
    time += 0.006;
    particles.forEach((p, i) => {
      const drift = Math.sin(time + i) * 18;
      const rise = ((time * 35 + i * 12) % (window.innerHeight + 80)) - 40;
      p.style.transform = `translate3d(${drift}px, ${-rise}px, 0)`;
      p.style.opacity = `${0.4 + 0.5 * Math.sin(time * 2 + i)}`;
    });
    requestAnimationFrame(loop);
  };

  requestAnimationFrame(loop);
};

const fadeInAudio = async () => {
  if (state.hasStartedAudio) return;
  try {
    music.volume = 0;
    await music.play();
    state.hasStartedAudio = true;
    musicToggle.textContent = '🔊';
    let vol = 0;
    const intv = setInterval(() => {
      vol += 0.05;
      music.volume = Math.min(vol, 0.65);
      if (vol >= 0.65) clearInterval(intv);
    }, 180);
  } catch {
    // Browser autoplay can still block until explicit gesture.
  }
};

const animateCounter = (el, duration = 2200) => {
  const target = Number(el.dataset.target);
  let start = null;
  const step = (timestamp) => {
    if (!start) start = timestamp;
    const progress = Math.min((timestamp - start) / duration, 1);
    const eased = 1 - (1 - progress) ** 3;
    el.textContent = formatNumber(target * eased);
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
};

const vibratePulse = () => {
  if (!navigator.vibrate) return;
  navigator.vibrate([30, 45, 30]);
};

const showScene = (index) => {
  scenes[state.currentScene].classList.remove('active');
  state.currentScene = index;
  const scene = scenes[index];
  scene.classList.add('active');

  if (index === 0) {
    state.allowAdvance = false;
    runTypingForScene(scene);
    launchHeartBurst();
  }

  if (index === 1) {
    state.allowAdvance = true;
    animateCounter(document.getElementById('days-counter'));
    animateCounter(document.getElementById('heartbeat-counter'), 3200);
    vibratePulse();
  }

  if (index === 2) {
    state.allowAdvance = true;
  }

  if (index === 3) {
    state.allowAdvance = false;
    setupScratchCards();
  }

  if (index === 4 && !state.finalStarted) {
    state.finalStarted = true;
    state.allowAdvance = false;
    setTimeout(() => fadeOutAudio(9000), 2000);
    setTimeout(() => {
      document.body.animate(
        [{ filter: 'brightness(1)' }, { filter: 'brightness(0)' }],
        { duration: 11000, fill: 'forwards' }
      );
    }, 4500);
  }
};

const nextScene = () => {
  if (!state.allowAdvance || state.sceneLock || state.currentScene >= scenes.length - 1) return;
  state.sceneLock = true;
  showScene(state.currentScene + 1);
  setTimeout(() => {
    state.sceneLock = false;
  }, 700);
};

const fadeOutAudio = (duration = 3000) => {
  const startVolume = music.volume;
  let start;
  const step = (t) => {
    if (!start) start = t;
    const p = Math.min((t - start) / duration, 1);
    music.volume = startVolume * (1 - p);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
};

const scratchCardTemplate = (card) => {
  const container = document.createElement('div');
  container.className = 'scratch-card';
  container.style.width = '100%';
  container.style.height = '100%';
  container.style.position = 'relative';

  let media;
  if (card.type === 'video') {
    media = document.createElement('video');
    media.src = card.src;
    media.autoplay = true;
    media.loop = true;
    media.muted = true;
    media.playsInline = true;
  } else {
    media = document.createElement('img');
    media.src = card.src;
    media.alt = card.caption;
  }

  media.className = 'memory-media';
  container.appendChild(media);

  const canvas = document.createElement('canvas');
  canvas.className = 'scratch-canvas';
  container.appendChild(canvas);

  return { container, canvas };
};

const setupScratchCards = () => {
  state.currentCard = 0;
  state.scratchDone = false;
  renderScratchCard();
};

const renderScratchCard = () => {
  const stage = document.getElementById('scratch-stage');
  const caption = document.getElementById('memory-caption');
  const card = memoryCards[state.currentCard];
  const { container, canvas } = scratchCardTemplate(card);
  stage.innerHTML = '';
  stage.appendChild(container);
  caption.textContent = card.caption;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const dpr = window.devicePixelRatio || 1;
  const rect = stage.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const grd = ctx.createLinearGradient(0, 0, rect.width, rect.height);
  grd.addColorStop(0, '#f8aacd');
  grd.addColorStop(1, '#b34d8b');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, rect.width, rect.height);

  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '700 22px Montserrat';
  ctx.textAlign = 'center';
  ctx.fillText('Scratch me ✨', rect.width / 2, rect.height / 2);

  let drawing = false;

  const getPos = (e) => {
    const r = canvas.getBoundingClientRect();
    const point = e.touches?.[0] || e;
    return { x: point.clientX - r.left, y: point.clientY - r.top };
  };

  const scratch = (x, y) => {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, Math.max(20, rect.width * 0.045), 0, Math.PI * 2);
    ctx.fill();
    spawnScratchSpark(x, y, stage);
  };

  const pointerDown = (e) => {
    e.preventDefault();
    drawing = true;
    const { x, y } = getPos(e);
    scratch(x, y);
  };

  const pointerMove = (e) => {
    if (!drawing) return;
    e.preventDefault();
    const { x, y } = getPos(e);
    scratch(x, y);
  };

  const pointerUp = () => {
    drawing = false;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let transparentPixels = 0;
    for (let i = 3; i < imageData.length; i += 4) {
      if (imageData[i] === 0) transparentPixels += 1;
    }
    const transparentRatio = transparentPixels / (imageData.length / 4);
    if (transparentRatio > 0.4 && !state.scratchDone) {
      state.scratchDone = true;
      canvas.style.transition = 'opacity 450ms ease';
      canvas.style.opacity = 0;
      setTimeout(() => {
        if (state.currentCard < memoryCards.length - 1) {
          state.currentCard += 1;
          state.scratchDone = false;
          renderScratchCard();
        } else {
          state.allowAdvance = true;
          setTimeout(nextScene, 700);
        }
      }, 900);
    }
  };

  canvas.addEventListener('mousedown', pointerDown);
  canvas.addEventListener('mousemove', pointerMove);
  window.addEventListener('mouseup', pointerUp, { once: false });

  canvas.addEventListener('touchstart', pointerDown, { passive: false });
  canvas.addEventListener('touchmove', pointerMove, { passive: false });
  canvas.addEventListener('touchend', pointerUp, { passive: false });

  state.activeCanvas = canvas;
};

const spawnScratchSpark = (x, y, parent) => {
  const spark = document.createElement('span');
  spark.className = 'scratch-spark';
  spark.style.left = `${x}px`;
  spark.style.top = `${y}px`;
  spark.style.width = `${Math.random() * 4 + 2}px`;
  spark.style.height = spark.style.width;
  spark.style.background = 'radial-gradient(circle, #fff9c2, #ff8cc8)';
  parent.appendChild(spark);
  spark.animate(
    [
      { transform: 'translate(-50%, -50%) scale(1)', opacity: 0.95 },
      { transform: `translate(${(Math.random() - 0.5) * 22}px, ${-20 - Math.random() * 20}px) scale(0.2)`, opacity: 0 }
    ],
    { duration: 520, easing: 'ease-out' }
  );
  setTimeout(() => spark.remove(), 550);
};

const bindInteraction = () => {
  const interact = () => {
    fadeInAudio();
    if (state.currentScene !== 3) nextScene();
  };

  window.addEventListener('click', interact);
  window.addEventListener('touchstart', interact, { passive: true });

  let touchStartX = 0;
  window.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].clientX;
  }, { passive: true });
  window.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (dx < -45 && state.currentScene !== 3) nextScene();
  }, { passive: true });
};

musicToggle.addEventListener('click', async (e) => {
  e.stopPropagation();
  if (!state.hasStartedAudio) {
    await fadeInAudio();
  }
  state.audioMuted = !state.audioMuted;
  music.muted = state.audioMuted;
  musicToggle.textContent = state.audioMuted ? '🔈' : '🔊';
});

const init = async () => {
  await preloadAssets();
  loadingScreen.style.opacity = '0';
  loadingScreen.style.transition = 'opacity 500ms ease';
  setTimeout(() => loadingScreen.remove(), 550);

  app.classList.remove('hidden');
  createGlobalParticles();
  animateParticles();
  bindInteraction();
  showScene(0);
};

init();
