const scenes = [...document.querySelectorAll('.scene')];
const app = document.getElementById('app');
const loadingScreen = document.getElementById('loading-screen');
const loadingProgress = document.getElementById('loading-progress');
const music = document.getElementById('bg-music');
const musicToggle = document.getElementById('music-toggle');
const particlesRoot = document.getElementById('global-particles');

const memoryCards = [
  { src: 'fav1.mp4', caption: 'Ako edin hum eneke', type: 'video' },
  { src: 'fav2.mp4', caption: 'Ei video tu bhalke nulale, but it is one of my fav. Your natural expressions. Your smile just melts my heart', type: 'video' },
  { src: 'fav3.jpeg', caption: 'Iyat tmk imn dhunia lagisil, I am still awestruck with this beauty. No one could catch my eyes as you do daaarlingg.', type: 'image' },
  { src: 'fav4.jpeg', caption: 'Ami bura hua r pasotu eneke pek pekai thakiba de', type: 'image' },
  { src: 'fav5.mp4', caption: 'I wish to make more memories together with you, my love', type: 'video' }
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
  finalStarted: false,
  revealTimer: null,
  revealCleanup: null
};

const formatNumber = (num) => new Intl.NumberFormat('en-US').format(Math.floor(num));

const preloadAssets = async () => {
  const assets = [{ src: 'song.mp3', type: 'audio' }, ...memoryCards];
  let loaded = 0;
  await Promise.all(
    assets.map(
      ({ src, type }) =>
        new Promise((resolve) => {
          const done = () => {
            loaded += 1;
            loadingProgress.style.width = `${(loaded / assets.length) * 100}%`;
            resolve();
          };

          if (type === 'video') {
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.src = src;
            video.onloadeddata = done;
            video.onerror = done;
          } else if (type === 'image') {
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
  media.addEventListener('error', () => {
    media.style.display = 'none';
    container.style.background =
      'linear-gradient(135deg, rgba(255,178,213,0.95), rgba(255,150,198,0.92), rgba(255,214,180,0.92))';
  });
  container.appendChild(media);

  const canvas = document.createElement('canvas');
  canvas.className = 'scratch-canvas';
  container.appendChild(canvas);

  return { container, canvas };
};

const setupScratchCards = () => {
  if (state.revealTimer) {
    clearTimeout(state.revealTimer);
    state.revealTimer = null;
  }
  if (state.revealCleanup) {
    state.revealCleanup();
    state.revealCleanup = null;
  }
  state.currentCard = 0;
  state.scratchDone = false;
  renderScratchCard();
};

const revealMediaAndContinue = ({ card, container, media, canvas }) => {
  const isLastCard = state.currentCard === memoryCards.length - 1;
  const imageDelay = isLastCard ? 6000 : 4000;
  const crossfadeDuration = 950;

  const clearRevealHandlers = () => {
    if (state.revealTimer) {
      clearTimeout(state.revealTimer);
      state.revealTimer = null;
    }
    if (state.revealCleanup) {
      state.revealCleanup();
      state.revealCleanup = null;
    }
  };

  const continueFlow = () => {
    clearRevealHandlers();

    container.style.transition = `opacity ${crossfadeDuration}ms ease`;
    container.style.opacity = 0;

    state.revealTimer = setTimeout(() => {
      if (state.currentCard < memoryCards.length - 1) {
        state.currentCard += 1;
        state.scratchDone = false;
        renderScratchCard({ fadeIn: true });
      } else {
        state.allowAdvance = true;
        nextScene();
      }
    }, crossfadeDuration);
  };

  canvas.style.pointerEvents = 'none';
  canvas.style.transition = 'opacity 350ms ease';
  canvas.style.opacity = 0;

  if (card.type === 'image') {
    media.animate(
      [
        { filter: 'brightness(1) drop-shadow(0 0 0 rgba(255, 201, 227, 0.1))' },
        { filter: 'brightness(1.06) drop-shadow(0 0 18px rgba(255, 182, 218, 0.55))' },
        { filter: 'brightness(1) drop-shadow(0 0 0 rgba(255, 201, 227, 0.1))' }
      ],
      { duration: 2100, iterations: Infinity, easing: 'ease-in-out' }
    );
    state.revealTimer = setTimeout(continueFlow, imageDelay);
    return;
  }

  media.loop = false;
  media.playsInline = true;
  media.setAttribute('playsinline', '');

  const onVideoEnd = () => continueFlow();
  media.addEventListener('ended', onVideoEnd, { once: true });
  state.revealCleanup = () => media.removeEventListener('ended', onVideoEnd);

  const pickVideoDelay = () => {
    if (!Number.isFinite(media.duration) || media.duration <= 0) {
      return isLastCard ? 6000 : 6200;
    }

    const durationMs = media.duration * 1000;
    if (isLastCard) return durationMs <= 6000 ? durationMs + 100 : 6000;
    return durationMs <= 7000 ? durationMs + 100 : 6200;
  };

  state.revealTimer = setTimeout(continueFlow, pickVideoDelay());

  media
    .play()
    .then(async () => {
      try {
        media.muted = false;
        await media.play();
      } catch {
        media.muted = true;
      }
    })
    .catch(() => {
      media.muted = true;
    });
};

const renderScratchCard = ({ fadeIn = false } = {}) => {
  const stage = document.getElementById('scratch-stage');
  const caption = document.getElementById('memory-caption');
  const card = memoryCards[state.currentCard];
  const { container, canvas } = scratchCardTemplate(card);
  stage.innerHTML = '';
  if (fadeIn) {
    container.style.opacity = 0;
    container.style.transition = 'opacity 950ms ease';
  }
  stage.appendChild(container);
  if (fadeIn) {
    requestAnimationFrame(() => {
      container.style.opacity = 1;
    });
  }
  caption.textContent = card.caption;

  const media = container.querySelector('.memory-media');

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const dpr = window.devicePixelRatio || 1;
  const rect = stage.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const grd = ctx.createLinearGradient(0, 0, rect.width, rect.height);
  grd.addColorStop(0, '#ffd5eb');
  grd.addColorStop(0.5, '#ff9ac6');
  grd.addColorStop(1, '#ffb689');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, rect.width, rect.height);

  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = '700 22px Montserrat';
  ctx.textAlign = 'center';
  ctx.fillText('Scratch me ✨', rect.width / 2, rect.height / 2);

  let drawing = false;
  let moveCount = 0;
  let lastPoint = null;

  const revealThreshold = 0.4;
  const brushRadius = Math.max(42, rect.width * 0.1);

  const getPos = (e) => {
    const r = canvas.getBoundingClientRect();
    const point = e.touches?.[0] || e;
    return { x: point.clientX - r.left, y: point.clientY - r.top };
  };

  const scratch = (x, y) => {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    if (!lastPoint) {
      ctx.beginPath();
      ctx.arc(x, y, brushRadius, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.lineWidth = brushRadius * 2;
      ctx.beginPath();
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    lastPoint = { x, y };
    spawnScratchSpark(x, y, stage);
  };

  const getTransparentRatio = () => {
    const sampleStride = 32;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let transparentPixels = 0;
    let sampled = 0;

    for (let i = 3; i < imageData.length; i += sampleStride * 4) {
      sampled += 1;
      if (imageData[i] < 20) transparentPixels += 1;
    }

    return sampled ? transparentPixels / sampled : 0;
  };

  const tryReveal = () => {
    const transparentRatio = getTransparentRatio();
    if (transparentRatio > revealThreshold && !state.scratchDone) {
      state.scratchDone = true;
      revealMediaAndContinue({ card, container, media, canvas });
    }
  };

  const pointerDown = (e) => {
    if (e.cancelable) e.preventDefault();
    drawing = true;
    const { x, y } = getPos(e);
    lastPoint = null;
    scratch(x, y);
  };

  const pointerMove = (e) => {
    if (!drawing) return;
    if (e.cancelable) e.preventDefault();
    const { x, y } = getPos(e);
    scratch(x, y);
    moveCount += 1;
    if (moveCount % 2 === 0) tryReveal();
  };

  const pointerUp = () => {
    drawing = false;
    lastPoint = null;
    tryReveal();
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
  spark.style.width = `${Math.random() * 6 + 4}px`;
  spark.style.height = spark.style.width;
  spark.style.background = 'radial-gradient(circle, #fff9dc, #ff95cc)';
  parent.appendChild(spark);
  spark.animate(
    [
      { transform: 'translate(-50%, -50%) scale(1)', opacity: 0.95 },
      { transform: `translate(${(Math.random() - 0.5) * 30}px, ${-22 - Math.random() * 24}px) scale(0.2)`, opacity: 0 }
    ],
    { duration: 300, easing: 'ease-out' }
  );
  setTimeout(() => spark.remove(), 320);
};

const bindInteraction = () => {
  const interact = () => {
    fadeInAudio();
    if (state.currentScene !== 3) nextScene();
  };

  window.addEventListener('click', interact);
  window.addEventListener('touchstart', interact, { passive: true });

  let touchStartX = 0;
  window.addEventListener(
    'touchstart',
    (e) => {
      touchStartX = e.changedTouches[0].clientX;
    },
    { passive: true }
  );
  window.addEventListener(
    'touchend',
    (e) => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (dx < -45 && state.currentScene !== 3) nextScene();
    },
    { passive: true }
  );
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
