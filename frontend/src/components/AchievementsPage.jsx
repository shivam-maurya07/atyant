// src/components/AchievementsPage.jsx
// Atyant — Achievements. Cinematic dark-violet experience.
// Three.js particle-text morphing · GSAP ScrollTrigger · Framer Motion.
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  motion, useScroll, useSpring, useInView,
  useMotionValue, animate,
} from 'framer-motion';
import SEO from './SEO';
import './AchievementsPage.css';

gsap.registerPlugin(ScrollTrigger);

/* ───────────────────────── ASSETS ───────────────────────── */
const IMG = '/achievements/';
const A = {
  hultStage: IMG + 'hult-prize-stage.png',
  hultStage2:IMG + 'hult-prize2.png',
  hultPitch: IMG + 'img-hult-pitch.png',
  pitchWar:  IMG + 'img-pitch-war.png',
  pitchWar2: IMG + 'img-pitch-war2.png',
  pitchWar3: IMG + 'img-pitch-war3.png',
  founders:  IMG + 'img-founders.png',
  team:      IMG + 'img-team.png',
  discussion:IMG + 'img-discussion.png',
  vnitDir:   IMG + 'img-vnit-director.png',
  vnitEcell: IMG + 'img-vnit-ecell.png',
  manit:     IMG + 'img-manit.png',
  pce:       IMG + 'img-pce.png',
  ghrce:     IMG + 'img-ghrce.png',
  iim:       IMG + 'img-iim-mumbai.png',
  success:   IMG + 'img-success.png',
  bny:       IMG + 'img-bny.png',
};

/* ════════════════════════════════════════════════════════════════════
   ParticleMorph — Three.js particle text that morphs through phrases
   then scatters. Reused by hero, feature sections, and final section.
════════════════════════════════════════════════════════════════════ */
function ParticleMorph({
  phrases,
  color = '#a99cec',
  holdMs = 2000,
  count = 4200,
  start = true,
  scatterAtEnd = true,
  withField = false,
  fontWeight = 900,
  onDone,
  style,
  className = '',
}) {
  const mountRef = useRef(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (!start) return;
    const mount = mountRef.current;
    if (!mount) return;

    let width = mount.clientWidth || 800;
    let height = mount.clientHeight || 400;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(
      -width / 2, width / 2, height / 2, -height / 2, 1, 1000
    );
    camera.position.z = 10;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(
    window.innerWidth < 768
      ? Math.min(window.devicePixelRatio, 3)
      : Math.min(window.devicePixelRatio, 2)
  );
  
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    /* ── round glowing sprite texture ── */
    const makeDot = () => {
      const s = 64;
      const c = document.createElement('canvas');
      c.width = c.height = s;
      const ctx = c.getContext('2d');
      const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.25, 'rgba(255,255,255,0.9)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s, s);
      const t = new THREE.CanvasTexture(c);
      return t;
    };
    const dotTex = makeDot();

    /* ── sample a phrase into centred pixel points ── */
    const sampleText = (text) => {
      const c = document.createElement('canvas');
      const ctx = c.getContext('2d');
      c.width = width; c.height = height;
      const maxW = width * 0.86;
      // auto-fit font size, allow up to 2 lines
      let fs = Math.min(height * 0.42, width * 0.16);
      const fits = (size, lines) => {
        ctx.font = `${fontWeight} ${size}px Poppins, system-ui, sans-serif`;
        return lines.every((ln) => ctx.measureText(ln).width <= maxW);
      };
      const wrap = (size) => {
        ctx.font = `${fontWeight} ${size}px Poppins, system-ui, sans-serif`;
        const words = text.split(' ');
        if (ctx.measureText(text).width <= maxW) return [text];
        const lines = []; let cur = '';
        for (const w of words) {
          const test = cur ? cur + ' ' + w : w;
          if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; }
          else cur = test;
        }
        if (cur) lines.push(cur);
        return lines;
      };
      let lines = wrap(fs);
      while ((lines.length > 2 || !fits(fs, lines)) && fs > 16) {
        fs -= 4; lines = wrap(fs);
      }
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${fontWeight} ${fs}px Poppins, system-ui, sans-serif`;
      const lh = fs * 1.12;
      const startY = height / 2 - (lh * (lines.length - 1)) / 2;
      lines.forEach((ln, i) => ctx.fillText(ln, width / 2, startY + i * lh));

      const data = ctx.getImageData(0, 0, width, height).data;
      const gap =
      window.innerWidth < 768
        ? 2
        : Math.max(3, Math.round(fs / 26));
      const pts = [];
      for (let y = 0; y < height; y += gap) {
        for (let x = 0; x < width; x += gap) {
          if (data[(y * width + x) * 4 + 3] > 130) {
            pts.push([x - width / 2, -(y - height / 2)]);
          }
        }
      }
      // shuffle for organic morphs
      for (let i = pts.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        [pts[i], pts[j]] = [pts[j], pts[i]];
      }
      // resample to exactly `count`
      const out = new Float32Array(count * 3);
      if (pts.length === 0) return out;
      for (let i = 0; i < count; i++) {
        const p = pts[i % pts.length];
        const jx = (Math.random() - 0.5) * gap;
        const jy = (Math.random() - 0.5) * gap;
        out[i * 3] = p[0] + jx;
        out[i * 3 + 1] = p[1] + jy;
        out[i * 3 + 2] = (Math.random() - 0.5) * 14;
      }
      return out;
    };

    const hasText = !!(phrases && phrases.length > 0);
    const targets = hasText ? phrases.map(sampleText) : [];

    /* ── text particle system ── */
    let geo = null, mat = null, points = null;
    const cur = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    if (hasText) {
      for (let i = 0; i < count; i++) {
        const r = Math.max(width, height) * (0.5 + Math.random() * 0.6);
        const a = Math.random() * Math.PI * 2;
        cur[i * 3] = Math.cos(a) * r;
        cur[i * 3 + 1] = Math.sin(a) * r;
        cur[i * 3 + 2] = (Math.random() - 0.5) * 200;
      }
      geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(cur, 3));
      mat = new THREE.PointsMaterial({
        size:
        window.innerWidth < 768
        ? 2.2
        : Math.max(2.7,Math.min(width,900)*0.0042),
        map: dotTex,
        color: new THREE.Color(color),
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      points = new THREE.Points(geo, mat);
      scene.add(points);
    }

    /* ── ambient drifting field (optional) ── */
    let field = null;
    if (withField || !hasText) {
      const fc = 1400;
      const fpos = new Float32Array(fc * 3);
      const fvel = new Float32Array(fc * 3);
      for (let i = 0; i < fc; i++) {
        fpos[i * 3] = (Math.random() - 0.5) * width * 1.4;
        fpos[i * 3 + 1] = (Math.random() - 0.5) * height * 1.4;
        fpos[i * 3 + 2] = (Math.random() - 0.5) * 300;
        fvel[i * 3] = (Math.random() - 0.5) * 0.18;
        fvel[i * 3 + 1] = (Math.random() - 0.5) * 0.18;
        fvel[i * 3 + 2] = 0;
      }
      const fgeo = new THREE.BufferGeometry();
      fgeo.setAttribute('position', new THREE.BufferAttribute(fpos, 3));
      const fmat = new THREE.PointsMaterial({
        size: Math.max(1.6, width * 0.0022),
        map: dotTex, color: new THREE.Color('#8b7ee0'),
        transparent: true, opacity: 0.5, depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      field = new THREE.Points(fgeo, fmat);
      field.userData = { fpos, fvel, fc };
      scene.add(field);
    }

    /* ── state machine ── */
    let phase = 0;            // current phrase index
    let mode = 'form';        // form | scatter
    let phaseStart = performance.now();
    let formedAt = null;
    let doneFired = false;
    let raf = 0;
    const startTime = performance.now();

    const startScatter = () => {
      mode = 'scatter';
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 0.6 + Math.random() * 2.4;
        vel[i * 3] = Math.cos(a) * sp;
        vel[i * 3 + 1] = Math.sin(a) * sp;
        vel[i * 3 + 2] = (Math.random() - 0.5) * sp;
      }
    };

    const tick = () => {
      const now = performance.now();

      if (hasText) {
        const pos = geo.attributes.position.array;

        // fade in shortly after start
        if (mat.opacity < 1 && mode === 'form') {
          mat.opacity = Math.min(1, (now - startTime) / 700);
        }

        if (mode === 'form') {
        const tar = targets[phase];
        let settled = 0;
        for (let i = 0; i < count; i++) {
          const ix = i * 3;
          const dx = tar[ix] - pos[ix];
          const dy = tar[ix + 1] - pos[ix + 1];
          const dz = tar[ix + 2] - pos[ix + 2];
          pos[ix] += dx * 0.075 + (Math.random() - 0.5) * 0.15;
          pos[ix + 1] += dy * 0.075 + (Math.random() - 0.5) * 0.15;
          pos[ix + 2] += dz * 0.075;
          if (dx * dx + dy * dy < 6) settled++;
        }
        if (settled > count * 0.6) {
          if (formedAt == null) formedAt = now;
          if (now - formedAt > holdMs) {
            formedAt = null;
            if (phase < phrases.length - 1) {
              phase++; phaseStart = now;
            } else if (scatterAtEnd) {
              startScatter();
            } else {
              if (!doneFired) { doneFired = true; onDoneRef.current && onDoneRef.current(); }
            }
          }
        }
      } else {
        // scatter & fade
        for (let i = 0; i < count; i++) {
          const ix = i * 3;
          pos[ix] += vel[ix];
          pos[ix + 1] += vel[ix + 1] + 0.06;
          pos[ix + 2] += vel[ix + 2];
          vel[ix] *= 0.992; vel[ix + 1] *= 0.992;
        }
        mat.opacity *= 0.975;
        if (mat.opacity < 0.02 && !doneFired) {
          doneFired = true; onDoneRef.current && onDoneRef.current();
        }
      }
        geo.attributes.position.needsUpdate = true;
      }

      // drift field
      if (field) {
        const { fpos, fvel, fc } = field.userData;
        for (let i = 0; i < fc; i++) {
          fpos[i * 3] += fvel[i * 3];
          fpos[i * 3 + 1] += fvel[i * 3 + 1];
          if (Math.abs(fpos[i * 3]) > width * 0.75) fvel[i * 3] *= -1;
          if (Math.abs(fpos[i * 3 + 1]) > height * 0.75) fvel[i * 3 + 1] *= -1;
        }
        field.geometry.attributes.position.needsUpdate = true;
        field.rotation.z += 0.0004;
      }

      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onResize = () => {
      width = mount.clientWidth || width;
      height = mount.clientHeight || height;
      camera.left = -width / 2; camera.right = width / 2;
      camera.top = height / 2; camera.bottom = -height / 2;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      if (geo) geo.dispose(); if (mat) mat.dispose(); dotTex.dispose();
      if (field) { field.geometry.dispose(); field.material.dispose(); }
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start]);

  return <div ref={mountRef} className={className} style={style} />;
}

/* ───────── lazy-mount a ParticleMorph only when scrolled into view ───────── */
function InViewParticle(props) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-15% 0px' });
  return (
    <div ref={ref} style={{ position: 'absolute', inset: 0 }}>
      {inView && <ParticleMorph {...props} />}
    </div>
  );
}

/* ───────────────────────── COUNTER ───────────────────────── */
function Counter({ to, prefix = '', suffix = '', duration = 2 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-20% 0px' });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, to, {
      duration, ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setVal(v),
    });
    return () => controls.stop();
  }, [inView, to, duration]);
  const fmt = (n) => Math.round(n).toLocaleString('en-IN');
  return <span ref={ref}>{prefix}{fmt(val)}{suffix}</span>;
}

/* ───────────────────────── MAGNETIC BUTTON ───────────────────────── */
function Magnetic({ children, className = '', onClick, style }) {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 200, damping: 14 });
  const sy = useSpring(y, { stiffness: 200, damping: 14 });
  const move = (e) => {
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * 0.35);
    y.set((e.clientY - (r.top + r.height / 2)) * 0.35);
  };
  const reset = () => { x.set(0); y.set(0); };
  return (
    <motion.button
      ref={ref} className={className} onClick={onClick}
      onMouseMove={move} onMouseLeave={reset}
      style={{ ...style, x: sx, y: sy }}
    >
      {children}
    </motion.button>
  );
}

/* ───────────────────────── REVEAL ───────────────────────── */
const reveal = {
  hidden: { opacity: 0, y: 36 },
  show: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.8, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] },
  }),
};
function Reveal({ children, i = 0, className = '', style }) {
  return (
    <motion.div
      className={className} style={style} custom={i}
      variants={reveal} initial="hidden"
      whileInView="show" viewport={{ once: true, margin: '-12% 0px' }}
    >
      {children}
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   FEATURE SECTION
════════════════════════════════════════════════════════════════════ */
function Feature({ tone, tag, word, phrases, title, desc, stats, children, flip, particleColor }) {
  const wrapRef = useRef(null);
  const cardRef = useRef(null);
  const inView = useInView(wrapRef, { once: true, margin: '-25% 0px' });
  const [revealed, setRevealed] = useState(false);

  // GSAP parallax on the image card
  useEffect(() => {
    if (!cardRef.current) return;
    const ctx = gsap.context(() => {
      if (window.innerWidth < 900) return;
      gsap.fromTo(cardRef.current,
        { y: 34 },
        {
          y: -34, ease: 'none',
          scrollTrigger: { trigger: wrapRef.current, start: 'top bottom', end: 'bottom top', scrub: true },
        });
    }, wrapRef);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={wrapRef} className={`aa-feature ${tone}${flip ? ' flip' : ''}`}>
      <div className="aa-feature-glow" />
      {tone === 'blue' && (
        <div className="aa-rays">
          <div className="aa-ray" style={{ left: '0%', animationDelay: '0s' }} />
          <div className="aa-ray" style={{ left: '30%', animationDelay: '3s' }} />
          <div className="aa-ray" style={{ left: '60%', animationDelay: '6s' }} />
        </div>
      )}
      <div className="aa-feature-inner">
        <div>
          <Reveal><span className="aa-feature-tag">{tag}</span></Reveal>
          <Reveal i={1}><h2 className="aa-feature-title" dangerouslySetInnerHTML={{ __html: title }} /></Reveal>
          <Reveal i={2}><p className="aa-feature-desc">{desc}</p></Reveal>
          {stats && (
            <Reveal i={3}>
              <div className="aa-stat-row">
                {stats.map((s) => (
                  <div key={s.label}>
                    <div className="aa-stat-num">
                      {s.count
                        ? <Counter to={s.count} prefix={s.prefix} suffix={s.suffix} />
                        : s.value}
                    </div>
                    <div className="aa-stat-label">{s.label}</div>
                  </div>
                ))}
              </div>
            </Reveal>
          )}
        </div>

        <div ref={cardRef} style={{ position: 'relative' }}>
          {/* particle word dissolving into the image */}
          <div style={{ position: 'relative' }}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={revealed ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 1 }}
            >
              {children}
            </motion.div>
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
              {inView && (
                <ParticleMorph
                  phrases={phrases || [word]}
                  color={particleColor}
                  count={3200}
                  holdMs={phrases ? 1300 : 1500}
                  scatterAtEnd
                  onDone={() => setRevealed(true)}
                  style={{ position: 'absolute', inset: 0, height: '100%', minHeight: 320 }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════════
   MOSAIC + MODAL
════════════════════════════════════════════════════════════════════ */
const MOSAIC = [
  { src: A.hultStage, cat: 'Hult Prize', name: 'On the National Stage', date: 'IIT Bombay · 2026', story: "Atyant's founders presenting at the Hult Prize regionals — selected among the Top 20 teams nationally for building India's career infrastructure." },
  { src: A.founders, cat: 'Founders', name: 'The Team Behind Atyant', date: 'VNIT Nagpur', story: 'Two founders, one mission — turning career confusion into verified, lived paths for every ambitious student.' },
  { src: A.vnitDir, cat: 'Recognition', name: 'Backed by VNIT Nagpur', date: 'Nagpur · 2025', story: 'Demonstrating the engine to the VNIT director and faculty — institutional validation for a student-built platform.' },
  { src: A.team, cat: 'Community', name: 'Builders & Believers', date: 'Campus Meet', story: 'The growing Atyant team and community — students who chose to build instead of wait.' },
  { src: A.hultPitch, cat: 'Hult Prize', name: 'How Atyant Works', date: 'IIT Bombay · 2026', story: 'Walking the panel through the Atyant engine — structured, reusable guidance from real human journeys.' },
  { src: A.vnitEcell, cat: 'Pitch', name: 'Market Opportunity', date: 'E-Cell Pitch', story: 'Presenting the TAM–SAM–SOM of India\'s career-clarity market to the VNIT E-Cell.' },
  { src: A.discussion, cat: 'Community', name: 'Student Sessions', date: 'On Campus', story: 'A live working session with students — the kind of grounded conversation Atyant scales nationwide.' },
  { src: A.iim, cat: 'Success Story', name: 'Internship at IIM Mumbai', date: 'Outcome', story: 'A student who found a verified path through Atyant and landed an internship at IIM Mumbai.' },
  { src: A.success, cat: 'Success Story', name: 'IIM Ahmedabad · IIT Mandi', date: 'Outcomes', story: 'Real outcomes — students reaching IIM Ahmedabad and IIT Mandi after following verified senior paths.' },
  { src: A.manit, cat: 'Colleges', name: 'On the Ground', date: 'Campus Visit', story: 'Meeting students where they are — one campus at a time, across India.' },
  { src: A.pce, cat: 'Colleges', name: 'Spreading the Word', date: 'Campus Outreach', story: 'Students sharing Atyant on their own campuses — organic growth built on real trust.' },
  { src: A.ghrce, cat: 'Recognition', name: 'Recognised & Awarded', date: 'GHRCE', story: 'Recognition for innovation and entrepreneurship — momentum that compounds.' },
  { src: A.bny, cat: 'Mentors', name: 'Mentor Conversations', date: 'Online Sessions', story: 'Verified seniors and mentors guiding the next generation — the heart of the Atyant engine.' },
];

function Mosaic() {
  const [active, setActive] = useState(null);
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && setActive(null);
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, []);
  return (
    <>
      <div className="aa-mosaic">
        {MOSAIC.map((m, i) => (
          <motion.div
            key={m.src} className="aa-mosaic-item"
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-8% 0px' }}
            transition={{ duration: 0.6, delay: (i % 4) * 0.06, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => setActive(m)}
          >
            <img src={m.src} alt={m.name} loading="lazy" />
            <div className="aa-mosaic-overlay">
              <span className="aa-mosaic-cat">{m.cat}</span>
              <span className="aa-mosaic-name">{m.name}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {active && (
        <motion.div
          className="aa-modal-backdrop"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={() => setActive(null)}
        >
          <motion.div
            className="aa-modal" onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            <button className="aa-modal-close" onClick={() => setActive(null)} aria-label="Close">✕</button>
            <img className="aa-modal-img" src={active.src} alt={active.name} />
            <div className="aa-modal-body">
              <span className="aa-modal-cat">{active.cat}</span>
              <h3 className="aa-modal-title">{active.name}</h3>
              <div className="aa-modal-date">{active.date}</div>
              <p className="aa-modal-story">{active.story}</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </>
  );
}

/* ───────────────────────── TIMELINE MILESTONE ───────────────────────── */
function Milestone({ side, year, title, desc, imgs }) {
  return (
    <div className={`aa-milestone ${side}`}>
      <div className="aa-milestone-node" />
      <motion.div
        className="aa-milestone-card"
        initial={{ opacity: 0, x: side === 'right' ? 60 : -60 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: '-20% 0px' }}
        transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="aa-milestone-year">{year}</div>
        <h3 className="aa-milestone-title">{title}</h3>
        <p className="aa-milestone-desc">{desc}</p>
        <div className="aa-collage">
          {imgs.map((src, i) => (
            <motion.img
              key={src} src={src} alt={title} loading="lazy"
              initial={{ opacity: 0, scale: 0.85 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.15 + i * 0.12 }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════════════════════════════ */
export default function AchievementsPage() {
  const navigate = useNavigate();
  const orbRef = useRef(null);
  const timelineRef = useRef(null);
  const glowRef = useRef(null);

  // mouse-following orb
  useEffect(() => {
    const move = (e) => {
      if (!orbRef.current) return;
      orbRef.current.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    };
    window.addEventListener('mousemove', move);
    return () => window.removeEventListener('mousemove', move);
  }, []);

  // smooth scroll behaviour
  useEffect(() => {
    const prev = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => { document.documentElement.style.scrollBehavior = prev; };
  }, []);

  // GSAP — timeline glow line fills as you scroll the timeline
  useEffect(() => {
    if (!timelineRef.current || !glowRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(glowRef.current,
        { height: '0%' },
        {
          height: '100%', ease: 'none',
          scrollTrigger: {
            trigger: timelineRef.current,
            start: 'top center', end: 'bottom center', scrub: true,
          },
        });
    }, timelineRef);
    return () => ctx.revert();
  }, []);

  // community 3D tilt on mouse
  const peopleRef = useRef(null);
  const onPeopleMove = useCallback((e) => {
    const wrap = peopleRef.current;
    if (!wrap) return;
    const r = wrap.getBoundingClientRect();
    const rx = ((e.clientY - (r.top + r.height / 2)) / r.height) * -8;
    const ry = ((e.clientX - (r.left + r.width / 2)) / r.width) * 8;
    wrap.querySelectorAll('.aa-people-card').forEach((c, i) => {
      const depth = 1 + (i % 4) * 0.25;
      c.style.transform = `rotateX(${rx * depth}deg) rotateY(${ry * depth}deg) translateZ(${i % 2 ? 20 : 0}px)`;
    });
  }, []);
  const resetPeople = useCallback(() => {
    peopleRef.current?.querySelectorAll('.aa-people-card').forEach((c) => {
      c.style.transform = 'rotateX(0) rotateY(0)';
    });
  }, []);

  const go = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  const MARQUEE = [A.hultStage, A.founders, A.team, A.vnitDir, A.hultPitch, A.discussion, A.success, A.iim, A.manit, A.pce, A.ghrce, A.bny, A.vnitEcell];

  return (
    <>
      <SEO
        title="Milestones that define Atyant — Achievements"
        description="From IIT Bombay Hult Prize Top 20 to a growing community of ambitious students — the milestones building India's career infrastructure."
        canonical="https://atyant.in/achievements"
      />

      <div className="atyant-achievements">
        {/* orb */}
        <div ref={orbRef} className="aa-orb" />

        {/* ── HEADER (matches landing page) ── */}
        <header className="aa-header">
          <button className="aa-brand" onClick={() => navigate('/home')}>
            <span className="aa-brand-mark">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 2.5l1.9 5.3a3 3 0 001.8 1.8l5.3 1.9-5.3 1.9a3 3 0 00-1.8 1.8L12 20.5l-1.9-5.3a3 3 0 00-1.8-1.8L3 11.5l5.3-1.9a3 3 0 001.8-1.8z" fill="currentColor" />
                <path d="M18.5 3l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" fill="currentColor" opacity="0.85" />
              </svg>
            </span>
            अत्यanT
          </button>
          <nav className="aa-nav">
            <button className="aa-nav-btn" onClick={() => navigate('/home')}>Home</button>
            <button className="aa-nav-btn" onClick={() => go('timeline')}>Timeline</button>
            <button className="aa-nav-btn" onClick={() => go('hult')}>Hult Prize</button>
            <button className="aa-nav-btn" onClick={() => go('community')}>Community</button>
            <button className="aa-nav-btn active" onClick={() => go('gallery')}>Gallery</button>
          </nav>
          <div className="aa-header-actions">
            <button className="aa-primary-btn" onClick={() => window.open('https://atyant.in/', '_blank', 'noopener')}>
              Try the Engine →
            </button>
          </div>
        </header>

        {/* ── HERO ── */}
        <section className="aa-hero">
          {/* full-screen ambient drifting dots */}
          <ParticleMorph
            className="aa-hero-bg"
            phrases={[]}
            color="#8b7ee0"
            withField
            style={{ position: 'absolute', inset: 0 }}
          />
          <div className="aa-hero-content">
            <div className="aa-hero-stage">
              <ParticleMorph
                phrases={["Building India's Career Infrastructure", 'Milestones that define Atyant']}
                color="#b3a6f0"
                count={
                  window.innerWidth < 768
                    ? 4000
                    : 4200
                }
                holdMs={2000}
                scatterAtEnd={false}
                style={{ position: 'absolute', inset: 0 }}
              />
            </div>
            <p className="aa-hero-sub">
              From IIT Bombay Hult Prize Top 20 to a growing community of ambitious students.
            </p>
            <Magnetic className="aa-hero-cta" onClick={() => go('timeline')}>
              Explore Journey <span className="aa-arrow">↓</span>
            </Magnetic>
          </div>
        </section>

        {/* ── SCROLL STORY TIMELINE ── */}
        <section className="aa-section" id="timeline">
          <Reveal><span className="aa-eyebrow">The journey so far</span></Reveal>
          <Reveal i={1}><h2 className="aa-section-title">A line of milestones,<br />each one earned.</h2></Reveal>

          <div ref={timelineRef} className="aa-timeline" style={{ marginTop: 70 }}>
            <div className="aa-timeline-line" />
            <div ref={glowRef} className="aa-timeline-glow" />
            <Milestone
              side="left" year="2024" title="Founded at VNIT Nagpur"
              desc="Two students set out to fix career confusion with verified, lived paths — and Atyant was born on campus."
              imgs={[A.founders, A.team, A.discussion]}
            />
            <Milestone
              side="right" year="2025" title="Backed & Recognised"
              desc="Institutional validation from VNIT Nagpur and recognition across campuses for a student-built engine."
              imgs={[A.pce, A.ghrce, A.manit]}
            />
            <Milestone
              side="left" year="2025" title="Pitch Wars Champion"
              desc="From classroom pitches to winning stages — the idea proved itself in front of tough panels."
              imgs={[A.vnitDir, A.pitchWar2, A.pitchWar3]}
            />
            <Milestone
              side="right" year="2026" title="Hult Prize · IIT Bombay Top 20"
              desc="Selected among the Top 20 teams nationally — taking India's career infrastructure to the biggest stage."
              imgs={[A.hultStage, A.hultPitch, A.hultStage2]}
            />
          </div>
        </section>

        {/* ── ACHIEVEMENT 1 · HULT PRIZE (red) ── */}
        <div id="hult" />
        <Feature
          tone="red"
          tag="National Finals 2026"
          word="HULT PRIZE"
          particleColor="#ff5470"
          title='Hult Prize, <em>IIT Bombay</em><br />— Top 20 Nationally.'
          desc="The world's biggest student social-entrepreneurship competition. Atyant earned its place among the Top 20 teams in India, pitching career infrastructure on the national stage at IIT Bombay."
          stats={[
            { value: 'Top 20', label: 'National Ranking' },
            { value: '2026', label: 'IIT Bombay Finals' },
          ]}
        >
          <div className="aa-glass-card">
            <img src={A.hultStage} alt="Hult Prize stage" />
          </div>
        </Feature>

        {/* ── ACHIEVEMENT 2 · PITCH WARS CHAMPION (gold) ── */}
        <Feature
          tone="gold" flip
          tag="Champion"
          word="CHAMPION"
          particleColor="#f2c265"
          title='Pitch Wars<br /><em>Champion.</em>'
          desc="Idea against idea, founder against founder. Atyant's vision and traction won the room — turning a sharp pitch into a decisive win and momentum that compounds."
          stats={[
            { value: '1st', label: 'Place' },
            { count: 12, suffix: '+', label: 'Pitches Delivered' },
          ]}
        >
        <div style={{ position: 'relative' }}>
          <svg className="aa-floater"
              style={{ top: -26, right: 10, width: 54, height: 54, color: '#f2c265' }}
              viewBox="0 0 24 24"
              fill="currentColor">
            <path d="M6 3h12v2h3v3a4 4 0 01-4 4h-.4A6 6 0 0113 18.9V21h3v2H8v-2h3v-2.1A6 6 0 017.4 15H7a4 4 0 01-4-4V5h3V3zm0 4H5v1a2 2 0 002 2V7zm12 0v3a2 2 0 002-2V7h-2z" />
          </svg>

          <div className="aa-glass-card">
            <img src={A.pitchWar} alt="Pitch Wars Champion" />
          </div>
        </div>
        </Feature>

        {/* ── ACHIEVEMENT 3 · FUNDED AT VNIT (blue) ── */}
        <Feature
          tone="blue"
          tag="VNIT Nagpur"
          word="FUNDED"
          particleColor="#5aa3ff"
          title='Funded & backed<br />at <em>VNIT Nagpur.</em>'
          desc="Institutional belief turned into real support. Demonstrating the engine to the VNIT director and E-Cell secured funding and mentorship to scale verified career paths across India."
          stats={[
            { count: 5, prefix: '₹', suffix: 'L+', label: 'Funding Secured' },
            { count: 25, suffix: '+', label: 'Mentors Onboarded' },
          ]}
        >
          <div className="aa-glass-card">
            <img src={A.vnitDir} alt="VNIT director" />
          </div>
        </Feature>

        {/* ── ACHIEVEMENT 4 · COMMUNITY (violet) ── */}
        <div id="community" />
        <Feature
          tone="violet" flip
          tag="The Movement"
          phrases={['50,000+ Students', '2,000+ Mentors', '500+ Colleges']}
          particleColor="#a99cec"
          title='A growing community<br />of <em>ambitious students.</em>'
          desc="Beyond the trophies and headlines, the real milestone is people — tens of thousands of students, thousands of verified mentors, and hundreds of colleges, all moving together."
        >
          <div className="aa-glass-card">
            <img src={A.discussion} alt="VNIT director" />
          </div>
        </Feature>

        {/* ── INFINITE MARQUEE GALLERY ── */}
        <section className="aa-section" style={{ paddingBottom: 40 }}>
          <Reveal><span className="aa-eyebrow">In motion</span></Reveal>
          <Reveal i={1}><h2 className="aa-section-title">Moments, on the move.</h2></Reveal>
        </section>
        <div className="aa-marquee-wrap">
          <div className="aa-marquee">
            {[...MARQUEE, ...MARQUEE].map((src, i) => (
              <div className="aa-marquee-card" key={i}>
                <img src={src} alt="gallery" loading="lazy" />
              </div>
            ))}
          </div>
        </div>

        {/* ── MOSAIC GALLERY ── */}
        <section className="aa-section" id="gallery">
          <Reveal><span className="aa-eyebrow">The archive</span></Reveal>
          <Reveal i={1}><h2 className="aa-section-title">Every milestone,<br />in full.</h2></Reveal>
          <Reveal i={2}><p className="aa-section-sub">Hover to explore. Click any moment to open its story.</p></Reveal>
          <div style={{ marginTop: 50 }}>
            <Mosaic />
          </div>
        </section>

        {/* ── STATISTICS ── */}
        <section className="aa-section">
          <Reveal><span className="aa-eyebrow">By the numbers</span></Reveal>
          <Reveal i={1}><h2 className="aa-section-title">Scale that speaks<br />for itself.</h2></Reveal>
          <div className="aa-stats-grid" style={{ marginTop: 50 }}>
            {[
              { to: 50000, suffix: '+', lbl: 'Students' },
              { to: 2000, suffix: '+', lbl: 'Mentors' },
              { to: 500, suffix: '+', lbl: 'Colleges' },
              { to: 20, suffix: '+', lbl: 'Events' },
            ].map((s, i) => (
              <motion.div
                key={s.lbl} className="aa-stat-cell"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-10% 0px' }}
                transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="num"><Counter to={s.to} suffix={s.suffix} /></div>
                <div className="lbl">{s.lbl}</div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── FINAL SECTION ── */}
        <section className="aa-final">
          <div className="aa-final-pulse" />
          <InViewParticle
            phrases={['This is just the beginning.', 'The next milestone could be yours.']}
            color="#b3a6f0"
            count={4600}
            holdMs={2200}
            withField
            scatterAtEnd={false}
          />
          <div className="aa-final-content">
            <motion.div
              initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
              viewport={{ once: true }} transition={{ delay: 5, duration: 1 }}
              className="aa-final-sub"
              style={{ animation: 'aa-fade-up 1s ease forwards 5s' }}
            >
              <Magnetic
                className="aa-hero-cta" style={{ opacity: 1, animation: 'none' }}
                onClick={() => window.open('https://atyant.in/', '_blank', 'noopener')}
              >
                Build your milestone with Atyant →
              </Magnetic>
            </motion.div>
          </div>
        </section>

        {/* ── FOOTER (matches landing page) ── */}
        <footer className="aa-footer">
          <div className="aa-footer-top">
            <div className="aa-footer-col">
              <button className="aa-brand" style={{ cursor: 'default', padding: 0, fontSize: '1.1rem' }}>
                <span className="aa-brand-mark">A</span> Atyant
              </button>
              <p style={{ color: 'var(--textSub)', fontSize: '0.88rem', lineHeight: 1.72, maxWidth: 260, fontFamily: 'var(--font-serif)' }}>
                India's career clarity engine for engineering students. Ask your confusion. Get the right path.
              </p>
              <p style={{ color: 'var(--textMuted)', fontSize: '0.8rem' }}>VNIT Nagpur · Founded 2024</p>
              <p style={{ color: 'var(--textMuted)', fontSize: '0.8rem' }}>Hult Prize Top 20 · IIT Bombay 2026</p>
            </div>
            <div className="aa-footer-col">
              <h4>Platform</h4>
              <button className="aa-footer-link" onClick={() => navigate('/home')}>Home</button>
              <button className="aa-footer-link" onClick={() => navigate('/internships')}>Internships</button>
              <button className="aa-footer-link" onClick={() => navigate('/career-guides')}>Career Guides</button>
              <button className="aa-footer-link" onClick={() => navigate('/achievements')}>Achievements</button>
            </div>
            <div className="aa-footer-col">
              <h4>Company</h4>
              <button className="aa-footer-link" onClick={() => go('timeline')}>Milestones</button>
              <button className="aa-footer-link" onClick={() => go('community')}>Community</button>
              <button className="aa-footer-link" onClick={() => navigate('/webinar')}>Events & Webinars</button>
            </div>
            <div className="aa-footer-col">
              <h4>Support & Contact</h4>
              <p style={{ color: 'var(--textSub)', fontSize: '0.86rem' }}>Email: support@atyant.in</p>
              <p style={{ color: 'var(--textSub)', fontSize: '0.86rem' }}>Intelligence HQ: Nagpur, Maharashtra</p>
            </div>
          </div>
          <div className="aa-footer-bottom">
            <p>© {new Date().getFullYear()} Atyant. All rights reserved. Built in Nagpur, India.</p>
            <div className="aa-footer-legal">
              <button onClick={() => navigate('/privacy')}>Privacy Policy</button>
              <button onClick={() => navigate('/terms')}>Terms of Service</button>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
