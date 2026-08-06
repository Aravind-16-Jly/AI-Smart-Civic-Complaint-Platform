const background = document.getElementById('site-background');
const layer = document.querySelector('.background-layer');
const particlesRoot = document.querySelector('.background-particles');
const canvas = document.getElementById('background-network');
const ctx = canvas.getContext('2d');

let width = 0;
let height = 0;
let dpr = Math.min(window.devicePixelRatio || 1, 2);
let mouseX = 0;
let mouseY = 0;
let targetX = 0;
let targetY = 0;
let particles = [];
let nodes = [];
let frameId = null;
let isScrolling = false;
let scrollTimer = null;
let lastFrameTime = 0;

function resizeCanvas() {
  width = window.innerWidth;
  height = window.innerHeight;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const count = window.innerWidth < 640 ? 10 : window.innerWidth < 1024 ? 14 : 19;
  particles = Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    r: Math.random() * 1.8 + 0.9,
    speed: Math.random() * 0.16 + 0.04,
    driftX: Math.random() * 0.32 - 0.16,
    driftY: Math.random() * 0.32 - 0.16,
    opacity: Math.random() * 0.28 + 0.22,
  }));

  const nodeCount = window.innerWidth < 640 ? 8 : window.innerWidth < 1024 ? 11 : 14;
  nodes = Array.from({ length: nodeCount }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.045,
    vy: (Math.random() - 0.5) * 0.045,
    radius: Math.random() * 1.1 + 0.8,
  }));

  particlesRoot.innerHTML = '';
  particles.forEach((particle, index) => {
    const el = document.createElement('span');
    el.className = 'background-particle';
    el.style.left = `${particle.x}px`;
    el.style.top = `${particle.y}px`;
    el.style.opacity = particle.opacity.toString();
    el.style.animationDelay = `${index * 0.08}s`;
    particlesRoot.appendChild(el);
  });
}

function animate(timestamp) {
  const time = performance.now() * 0.00035;
  const minFrame = isScrolling ? 80 : 30;

  if (timestamp - lastFrameTime < minFrame) {
    frameId = requestAnimationFrame(animate);
    return;
  }

  lastFrameTime = timestamp;
  ctx.clearRect(0, 0, width, height);

  const pointerOffsetX = (mouseX / Math.max(width, 1)) * 8;
  const pointerOffsetY = (mouseY / Math.max(height, 1)) * 8;
  layer.style.setProperty('--bg-shift-x', `${pointerOffsetX}px`);
  layer.style.setProperty('--bg-shift-y', `${pointerOffsetY}px`);
  background.style.setProperty('--bg-shift-x', `${pointerOffsetX}px`);
  background.style.setProperty('--bg-shift-y', `${pointerOffsetY}px`);

  if (!isScrolling) {
    nodes.forEach((node) => {
      node.x += node.vx;
      node.y += node.vy;

      if (node.x < 0 || node.x > width) node.vx *= -1;
      if (node.y < 0 || node.y > height) node.vy *= -1;

      const pulse = 0.78 + Math.sin(time * 1.2 + node.x * 0.002) * 0.1;
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius * pulse, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(125, 211, 252, ${0.32 + pulse * 0.12})`;
      ctx.shadowBlur = 10;
      ctx.shadowColor = 'rgba(34, 211, 238, 0.42)';
      ctx.fill();
    });

    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = nodes[i];
        const b = nodes[j];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist < 160) {
          const alpha = (1 - dist / 160) * 0.08;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(96, 165, 250, ${alpha})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    particles.forEach((particle, index) => {
      particle.x += (particle.speed * 0.7) + Math.sin(time + index) * 0.008;
      particle.y += (particle.driftY * 0.7) + Math.cos(time * 0.6 + index) * 0.008;
      if (particle.x > width + 12) particle.x = -12;
      if (particle.y > height + 12) particle.y = -12;
      if (particle.x < -12) particle.x = width + 12;
      if (particle.y < -12) particle.y = height + 12;

      const el = particlesRoot.children[index];
      if (el) {
        el.style.transform = `translate3d(${particle.x}px, ${particle.y}px, 0)`;
        el.style.opacity = `${particle.opacity * (0.7 + Math.sin(time * 1.7 + index) * 0.25)}`;
      }
    });
  }

  frameId = requestAnimationFrame(animate);
}

function handlePointer(event) {
  targetX = event.clientX;
  targetY = event.clientY;
}

function updatePointer() {
  mouseX += (targetX - mouseX) * 0.02;
  mouseY += (targetY - mouseY) * 0.02;
  frameId = requestAnimationFrame(updatePointer);
}

function handleScroll() {
  isScrolling = true;
  document.body.classList.add('scrolling');
  window.clearTimeout(scrollTimer);
  scrollTimer = window.setTimeout(() => {
    isScrolling = false;
    document.body.classList.remove('scrolling');
  }, 140);
}

window.addEventListener('resize', resizeCanvas);
window.addEventListener('mousemove', handlePointer);
window.addEventListener('scroll', handleScroll, { passive: true });
window.addEventListener('touchmove', (event) => {
  const touch = event.touches[0];
  if (touch) {
    targetX = touch.clientX;
    targetY = touch.clientY;
  }
}, { passive: true });

resizeCanvas();
frameId = requestAnimationFrame(animate);
updatePointer();
