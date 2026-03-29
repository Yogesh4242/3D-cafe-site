'use client';

import { useEffect, useRef, useState } from 'react';
import Lenis from 'lenis';
import { CafeMenuOverlay } from './components/CafeMenu';

/* ─── Config ────────────────────────────────────────────────────────────── */
const FRAME_COUNT  = 270;
const FRAME_DIGITS = 3;
const FRAME_ZONE   = 0.80;   // 0→80% of scroll plays frames 0→269
const MENU_START   = 0.75;   // menu overlay begins fading in at 75%
const MAX_DPR      = 2;      // cap for performance

const pad     = (n: number, d: number) => String(n).padStart(d, '0');
const frameSrc = (i: number) => `/frames/ezgif-frame-${pad(i + 1, FRAME_DIGITS)}.jpg`;
const clamp01  = (n: number) => Math.min(1, Math.max(0, n));

/* ─── Main ──────────────────────────────────────────────────────────────── */
export default function HeroFramesWheel() {
  const heroRef   = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef   = useRef<HTMLDivElement>(null);
  const [menuProgress, setMenuProgress] = useState(0);

  useEffect(() => {
    const heroEl = heroRef.current;
    const canvas = canvasRef.current;
    if (!heroEl || !canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    /* Lenis — buttery smooth scroll */
    const lenis = new Lenis({
      duration: 1.4,
      smoothWheel: true,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });

    let destroyed = false;

    /* ── Storage ──────────────────────────────────────────────────────── */
    // ImageBitmap = GPU-ready, drawImage is near-instant (no CPU decode on draw)
    const bitmaps: (ImageBitmap | HTMLImageElement | null)[] = new Array(FRAME_COUNT).fill(null);
    const requested = new Uint8Array(FRAME_COUNT); // 0 = not requested, 1 = requested

    /* ── Frame Loader ─────────────────────────────────────────────────── */
    const loadFrame = (idx: number) => {
      if (idx < 0 || idx >= FRAME_COUNT || requested[idx]) return;
      requested[idx] = 1;

      const img = new Image();
      img.decoding = 'async';
      img.src = frameSrc(idx);

      const store = () => {
        if (destroyed) return;
        if (typeof createImageBitmap !== 'undefined') {
          createImageBitmap(img)
            .then(bm => { if (!destroyed) bitmaps[idx] = bm; })
            .catch(() => { if (!destroyed) bitmaps[idx] = img; });
        } else {
          bitmaps[idx] = img;
        }
      };

      if (img.decode) {
        img.decode().then(store).catch(store);
      } else {
        img.onload = store;
      }
    };

    /* ── Priority Bootstrap ───────────────────────────────────────────── */
    // Load first 20 immediately for instant first paint
    for (let i = 0; i < Math.min(20, FRAME_COUNT); i++) loadFrame(i);

    // Load everything else during browser idle time
    const idleLoad = () => {
      if (destroyed) return;
      for (let i = 0; i < FRAME_COUNT; i++) loadFrame(i);
    };
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(idleLoad, { timeout: 800 });
    } else {
      setTimeout(idleLoad, 120);
    }

    /* ── Canvas Resize (capped DPR for perf) ─────────────────────────── */
    const needsRedraw = { current: true };
    const resize = () => {
      const dpr  = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const rect = canvas.getBoundingClientRect();
      const w    = Math.max(1, Math.round(rect.width  * dpr));
      const h    = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width  = w;
        canvas.height = h;
        needsRedraw.current = true;
      }
    };
    resize();

    const ro = new ResizeObserver(() => { resize(); needsRedraw.current = true; });
    ro.observe(canvas);

    /* ── drawCover: object-fit: cover math ───────────────────────────── */
    const drawCover = (bm: ImageBitmap | HTMLImageElement) => {
      const cw = canvas.width, ch = canvas.height;
      if (!cw || !ch) return;
      const iw = (bm as HTMLImageElement).naturalWidth  || (bm as ImageBitmap).width  || 0;
      const ih = (bm as HTMLImageElement).naturalHeight || (bm as ImageBitmap).height || 0;
      if (!iw || !ih) return;
      const scale = Math.max(cw / iw, ch / ih);
      const dw = iw * scale, dh = ih * scale;
      ctx.drawImage(bm as CanvasImageSource, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
    };

    /* ── Sub-frame Blending ───────────────────────────────────────────── *
     * Instead of snapping to the nearest frame, we cross-fade between    *
     * floor and ceil frames using globalAlpha. This is what makes it     *
     * feel completely filmlike — zero stepping sensation.                *
     * ─────────────────────────────────────────────────────────────────── */
    const drawBlended = (frameFloat: number) => {
      const lo    = Math.max(0, Math.min(FRAME_COUNT - 2, Math.floor(frameFloat)));
      const hi    = lo + 1;
      const alpha = frameFloat - lo; // 0.0 → 1.0

      const bmLo = bitmaps[lo];
      const bmHi = bitmaps[hi];

      if (!bmLo && !bmHi) return;

      ctx.globalAlpha = 1;
      if (bmLo) drawCover(bmLo);

      if (bmHi && alpha > 0.004) {
        ctx.globalAlpha = alpha;
        drawCover(bmHi);
        ctx.globalAlpha = 1;
      }
    };

    /* ── Smooth lerped frame position ─────────────────────────────────── */
    let smoothFrame  = 0;
    let lastDrawFrame = -1;

    /* ── RAF Tick ─────────────────────────────────────────────────────── */
    let rafId = 0;

    const tick = (time: number) => {
      if (destroyed) return;
      lenis.raf(time);

      const start   = heroEl.offsetTop;
      const end     = start + heroEl.offsetHeight - window.innerHeight;
      const scrollY = (lenis as any).scroll ?? window.scrollY;
      const t       = clamp01((scrollY - start) / Math.max(1, end - start));

      // Map first FRAME_ZONE% of scroll → full frame range
      const frameT      = clamp01(t / FRAME_ZONE);
      const targetFrame = frameT * (FRAME_COUNT - 1);

      // Lerp smoothly toward target — eliminates all stepping/stuttering
      smoothFrame += (targetFrame - smoothFrame) * 0.15;

      // Preload ahead of current position
      const ci = Math.round(smoothFrame);
      for (let d = -15; d <= 25; d++) {
        const raw = ci + d;
        if (raw >= 0 && raw < FRAME_COUNT) loadFrame(raw);
      }

      // Subtle parallax on canvas wrapper
      if (wrapRef.current) {
        const s = 1.08 - t * 0.04;
        const r = (t - 0.5) * -0.8;
        wrapRef.current.style.transform = `scale(${s}) rotate(${r}deg)`;
      }

      // Draw only if frame moved meaningfully or canvas was resized
      if (Math.abs(smoothFrame - lastDrawFrame) > 0.01 || needsRedraw.current) {
        drawBlended(smoothFrame);
        lastDrawFrame = smoothFrame;
        needsRedraw.current = false;
      }

      // Menu overlay progress (0 → 1 in scroll range MENU_START → 1.0)
      const mp = clamp01((t - MENU_START) / (1 - MENU_START));
      setMenuProgress(mp);

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      destroyed = true;
      lenis.destroy();
      cancelAnimationFrame(rafId);
      ro.disconnect();
      bitmaps.forEach(bm => {
        if (bm && typeof (bm as ImageBitmap).close === 'function') {
          (bm as ImageBitmap).close(); // free GPU memory
        }
      });
    };
  }, []);

  return (
    <>
      {/* ── Google Fonts ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800&family=Inter:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        html { scroll-behavior: auto; } /* Lenis handles this */

        body {
          background: #080808;
          font-family: 'Inter', system-ui, sans-serif;
          -webkit-font-smoothing: antialiased;
          overscroll-behavior: none;
        }

        /* Custom scrollbar */
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0a0a0a; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.3); }

        /* Menu cards horizontal scroll */
        .menu-scroll {
          display: flex;
          gap: 20px;
          padding: 0 48px 24px;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .menu-scroll::-webkit-scrollbar { display: none; }
        .menu-scroll > * { scroll-snap-align: center; }

        /* Floating ambient orbs */
        @keyframes orb-float {
          0%, 100% { transform: translateY(0) scale(1); }
          50%       { transform: translateY(-18px) scale(1.06); }
        }
        .orb { animation: orb-float 7s ease-in-out infinite; }
        .orb:nth-child(2) { animation-delay: -3.5s; }

        /* Menu section fade-slide */
        @keyframes menu-in {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ── Mobile Responsiveness Overrides ── */
        @media (max-width: 768px) {
          .hero-header {
            padding: 20px 24px !important;
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 16px;
          }
          .hero-nav {
            gap: 20px !important;
          }
          .menu-header-container {
            padding: 0 24px 20px !important;
          }
          .menu-title-text {
            font-size: 34px !important;
          }
          .menu-scroll {
            padding: 0 24px 16px !important;
            gap: 12px;
          }
          .bottom-tagline {
            padding: 16px 24px 24px !important;
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 16px;
          }
          .orb-1 { width: 200px !important; height: 200px !important; top: 10% !important; }
          .orb-2 { width: 160px !important; height: 160px !important; right: -10% !important; }
        }
      `}</style>

      <main style={{ position: 'relative', width: '100%', background: '#080808', color: '#fff' }}>

        {/* ══════════════════════════════════════════════════════════════
            HERO — scroll-synced frame animation + menu overlay
        ══════════════════════════════════════════════════════════════ */}
        <section
          ref={heroRef}
          style={{ position: 'relative', height: '500vh', width: '100%', background: '#080808' }}
        >
          <div style={{ position: 'sticky', top: 0, zIndex: 10, height: '100vh', width: '100%', overflow: 'hidden' }}>

            {/* Canvas wrapper with parallax */}
            <div ref={wrapRef} style={{ position: 'absolute', inset: 0, willChange: 'transform' }}>
              <canvas
                ref={canvasRef}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
              />

              {/* Vignette gradient */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.22) 60%, rgba(0,0,0,0.88) 100%)',
                pointerEvents: 'none',
              }} />
              {/* Radial light bloom */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'radial-gradient(55% 55% at 50% 42%, rgba(255,255,255,0.07), transparent 65%)',
                pointerEvents: 'none',
              }} />
            </div>

            {/* ── Hero Brand Text (always visible at top) ── */}
            <div className="hero-header" style={{
              position: 'absolute', top: 0, left: 0, right: 0,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '28px 48px', zIndex: 20, pointerEvents: 'none',
            }}>
              <div>
                <p style={{
                  fontSize: 11, letterSpacing: '0.25em', textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.45)', fontWeight: 500,
                }}>Est. 2019</p>
                <h1 style={{
                  fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em',
                  fontFamily: '"Playfair Display", Georgia, serif',
                }}>LUMIÈRE CAFÉ</h1>
              </div>
              <nav className="hero-nav" style={{ display: 'flex', gap: 32 }}>
                {['Menu', 'Story', 'Reserve'].map(item => (
                  <span key={item} style={{
                    fontSize: 13, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.05em',
                    fontWeight: 500, cursor: 'pointer', pointerEvents: 'auto', transition: 'color 0.2s',
                  }}>{item}</span>
                ))}
              </nav>
            </div>

            {/* ── Scroll hint (fades out as user scrolls) ── */}
            <div style={{
              position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              zIndex: 20, pointerEvents: 'none',
              opacity: Math.max(0, 1 - menuProgress * 4),
              transition: 'opacity 0.3s',
            }}>
              <p style={{ fontSize: 11, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>
                Scroll to explore
              </p>
              <div style={{
                width: 1, height: 48,
                background: 'linear-gradient(to bottom, rgba(255,255,255,0.4), transparent)',
                animation: 'orb-float 1.8s ease-in-out infinite',
              }} />
            </div>

            {/* ══════════════════════════════════════════════════════════
                MENU OVERLAY — fades in at end of frame animation
            ══════════════════════════════════════════════════════════ */}
            <div style={{
              position: 'absolute', inset: 0, zIndex: 30,
              opacity: menuProgress,
              pointerEvents: menuProgress > 0.1 ? 'auto' : 'none',
              transition: 'opacity 0.1s',
              display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
              paddingBottom: 0,
            }}>
              {/* Frosted bottom gradient */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to top, rgba(4,4,8,0.92) 0%, rgba(4,4,8,0.6) 50%, transparent 100%)',
                pointerEvents: 'none',
              }} />

              {/* Ambient orbs */}
              <div className="orb orb-1" style={{
                position: 'absolute', top: '18%', left: '10%',
                width: 300, height: 300, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(200,134,10,0.18), transparent 70%)',
                filter: 'blur(40px)', pointerEvents: 'none',
              }} />
              <div className="orb orb-2" style={{
                position: 'absolute', top: '25%', right: '8%',
                width: 260, height: 260, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(139,92,246,0.15), transparent 70%)',
                filter: 'blur(40px)', pointerEvents: 'none',
              }} />

              {/* Menu header */}
              <div className="menu-header-container" style={{
                position: 'relative', zIndex: 2,
                padding: '0 48px 24px',
                opacity: menuProgress,
                transform: `translateY(${(1 - menuProgress) * 20}px)`,
                transition: 'all 0.4s ease',
              }}>
                <p style={{
                  fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.4)', marginBottom: 6, fontWeight: 500,
                }}>Curated Selection</p>
                <h2 className="menu-title-text" style={{
                  fontSize: 42, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em',
                  fontFamily: '"Playfair Display", Georgia, serif', lineHeight: 1,
                }}>Our Menu</h2>
              </div>

              {/* Cards horizontal scroll */}
              <div>
                <CafeMenuOverlay progress={menuProgress} />
              </div>

              {/* Bottom tagline */}
              <div className="bottom-tagline" style={{
                position: 'relative', zIndex: 2,
                padding: '18px 48px 32px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                opacity: menuProgress,
                transform: `translateY(${(1 - menuProgress) * 10}px)`,
                transition: 'all 0.5s ease 0.2s',
              }}>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.05em' }}>
                  Tap any card to reveal nutrition facts
                </p>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 20px', borderRadius: 50,
                  background: 'rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  cursor: 'pointer',
                }}>
                  <span style={{ fontSize: 13, color: '#fff', fontWeight: 500 }}>Reserve a Table</span>
                  <span style={{ fontSize: 14 }}>→</span>
                </div>
              </div>

            </div>
            {/* end menu overlay */}

          </div>
        </section>
        {/* end hero */}

      </main>
    </>
  );
}