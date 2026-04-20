'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/* ─── Data ─────────────────────────────────────────────────────────────── */
const ITEMS = [
  {
    id: 1, name: 'Signature Espresso', category: 'Coffee',
    description: 'Bold concentrated arabica with rich golden crema and a silky, velvety body that lingers.',
    price: '$4.50', accent: '#C8860A',
    img: 'https://images.unsplash.com/photo-1509785307050-d4066910ec1e?w=800&q=85',
    nutrition: { Calories:'5 kcal', Protein:'0.1g', Carbs:'0.8g', Fat:'0.2g', Caffeine:'63mg' },
    origin: 'Ethiopia & Colombia Blend', tags: ['Vegan','Gluten-Free'],
  },
  {
    id: 2, name: 'Velvet Oat Latte', category: 'Coffee',
    description: 'Double espresso pulled slow, swirled with silky steamed oat milk and a rosetted micro-foam.',
    price: '$6.50', accent: '#B07040',
    img: 'https://images.unsplash.com/photo-1561047029-3000c68339ca?w=800&q=85',
    nutrition: { Calories:'180 kcal', Protein:'6g', Carbs:'22g', Fat:'7g', Caffeine:'126mg' },
    origin: 'Single-Origin Brazil', tags: ['Plant-Based','Low-Sugar'],
  },
  {
    id: 3, name: 'Ceremonial Matcha', category: 'Tea',
    description: 'Grade-A Uji matcha hand-whisked to a smooth froth with warm almond milk and raw honey.',
    price: '$7.00', accent: '#3D9B6A',
    img: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=800&q=85',
    nutrition: { Calories:'140 kcal', Protein:'4g', Carbs:'18g', Fat:'5g', Caffeine:'70mg' },
    origin: 'Uji, Kyoto Japan', tags: ['Antioxidant','Vegan'],
  },
  {
    id: 4, name: 'Avocado Toast', category: 'Food',
    description: 'House-baked sourdough, smashed hass avocado, soft poached egg, cherry tomatoes and everything seasoning.',
    price: '$12.50', accent: '#5A9E6F',
    img: 'https://images.unsplash.com/photo-1541519227354-08fa5d50c820?w=800&q=85',
    nutrition: { Calories:'380 kcal', Protein:'14g', Carbs:'32g', Fat:'22g', Caffeine:'—' },
    origin: 'Locally Sourced', tags: ['High-Protein','Fresh'],
  },
  {
    id: 5, name: 'Butter Croissant', category: 'Pastry',
    description: '72-hour cold-fermented laminated dough, rolled with French AOP butter and baked golden every morning.',
    price: '$5.00', accent: '#D4A017',
    img: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&q=85',
    nutrition: { Calories:'290 kcal', Protein:'5g', Carbs:'31g', Fat:'18g', Caffeine:'—' },
    origin: 'House-Baked Daily', tags: ['Vegetarian','Fresh'],
  },
  {
    id: 6, name: 'Acaí Power Bowl', category: 'Food',
    description: 'Organic Amazonian acai blended thick, topped with house granola, seasonal berries, chia seeds and honey.',
    price: '$14.00', accent: '#8B5CF6',
    img: 'https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?w=800&q=85',
    nutrition: { Calories:'420 kcal', Protein:'8g', Carbs:'68g', Fat:'14g', Caffeine:'—' },
    origin: 'Amazon, Brasil', tags: ['Superfood','Vegan'],
  },
];

/* ═══════════════════════════════════════════════════ OVERLAY */
export function CafeMenuOverlay({ progress }: { progress: number }) {
  const [current, setCurrent] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Sync scroll position to the current active item
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const scrollLeft = scrollContainerRef.current.scrollLeft;
    const width = scrollContainerRef.current.clientWidth;
    const activeIndex = Math.round(scrollLeft / width);
    if (activeIndex !== current) {
      setCurrent(activeIndex);
    }
  }, [current]);

  // Programmatic scrolling (for buttons/keyboard)
  const goTo = useCallback((idx: number) => {
    if (!scrollContainerRef.current) return;
    const width = scrollContainerRef.current.clientWidth;
    scrollContainerRef.current.scrollTo({ left: idx * width, behavior: 'smooth' });
  }, []);

  const prev = () => goTo(Math.max(0, current - 1));
  const next = () => goTo(Math.min(ITEMS.length - 1, current + 1));

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft')  prev();
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [current, next, prev]);

  const shown = progress > 0.14;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,800;1,700&family=Inter:wght@300;400;500;600&display=swap');
        
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        .cafe-nav-btn:hover { background: rgba(255,255,255,0.16) !important; }
        .cafe-dot-btn:hover { background: rgba(255,255,255,0.55) !important; }

        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-18px); }
          100% { transform: translateY(0px); }
        }
        .floating-image {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>

      <div style={{
        position: 'absolute', inset: 0, zIndex: 30,
        opacity: progress,
        pointerEvents: progress > 0.05 ? 'auto' : 'none',
        fontFamily: '"Inter", system-ui, sans-serif',
            // background: '#0a0a0a', // Solid sleek dark background
        color: '#fff',
      }}>

        {/* ── Top Bar (Fixed) ── */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 40,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '28px 60px',
          opacity: shown ? 1 : 0, transition: 'opacity 0.5s ease',
        }}>
          <div>
            <p style={{ fontSize: 10, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 3, fontWeight: 500 }}>
              Lumière Café
            </p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em' }}>
              Est. 2019
            </p>
          </div>
          <p style={{
            fontSize: 14, color: 'rgba(255,255,255,0.4)',
            fontFamily: '"Playfair Display", Georgia, serif',
            letterSpacing: '0.08em',
          }}>
            <span style={{ color: '#fff' }}>{String(current + 1).padStart(2, '0')}</span> 
            <span style={{ color: 'rgba(255,255,255,0.15)', margin: '0 8px' }}>/</span> 
            {String(ITEMS.length).padStart(2, '0')}
          </p>
        </div>

        {/* ── Main Scrollable Track ── */}
        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="hide-scrollbar"
          style={{
            position: 'absolute', inset: 0,
            display: 'flex',
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            scrollBehavior: 'smooth',
          }}
        >
          {ITEMS.map((item, i) => (
            <div key={item.id} style={{
              minWidth: '100vw', height: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0 8%',
              scrollSnapAlign: 'start',
            }}>
              
              {/* Left: Text Details */}
              <div style={{
                flex: '1', maxWidth: 460,
                opacity: shown ? 1 : 0,
                transform: `translateY(${shown ? 0 : 20}px)`,
                transition: `opacity 0.6s ease ${i === current ? '0.2s' : '0s'}, transform 0.6s ease ${i === current ? '0.2s' : '0s'}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
                  <div style={{ width: 28, height: 2, background: item.accent, borderRadius: 1 }} />
                  <p style={{ fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: item.accent, fontWeight: 600 }}>
                    {item.category}
                  </p>
                </div>
                <h2 style={{
                  fontSize: 'clamp(40px, 5vw, 72px)', fontWeight: 800, color: '#fff',
                  fontFamily: '"Playfair Display", Georgia, serif',
                  lineHeight: 1, letterSpacing: '-0.02em', marginBottom: 24,
                }}>{item.name}</h2>
                <p style={{
                  fontSize: 15.5, color: 'rgba(255,255,255,0.58)', lineHeight: 1.7, marginBottom: 32, fontWeight: 300,
                }}>{item.description}</p>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 22, marginBottom: 24 }}>
                  <span style={{ fontSize: 38, fontWeight: 800, fontFamily: '"Playfair Display", Georgia, serif' }}>
                    {item.price}
                  </span>
                  <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.18)' }} />
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    {item.origin}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  {item.tags.map(t => (
                    <span key={t} style={{
                      fontSize: 10.5, padding: '5px 14px', borderRadius: 20,
                      border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.03)',
                      color: 'rgba(255,255,255,0.6)', letterSpacing: '0.06em', textTransform: 'uppercase',
                    }}>{t}</span>
                  ))}
                </div>
              </div>

              {/* Center: The Floating Image */}
              <div style={{ flex: '1', display: 'flex', justifyContent: 'center', padding: '0 40px' }}>
                <div className="floating-image" style={{ animationDelay: `${i * 0.5}s` }}>
                  <img 
                    src={item.img} 
                    alt={item.name}
                    style={{
                      width: '100%', maxWidth: '420px', aspectRatio: '3/4', objectFit: 'cover',
                      borderRadius: '24px',
                      boxShadow: `0 30px 60px -12px rgba(0,0,0,0.8), 0 0 40px ${item.accent}20`,
                      border: '1px solid rgba(255,255,255,0.08)',
                    }} 
                  />
                </div>
              </div>

              {/* Right: Nutrition Info */}
              <div style={{
                flex: '0 0 240px',
                padding: '32px', borderRadius: '20px',
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                backdropFilter: 'blur(10px)',
                opacity: shown ? 1 : 0,
                transform: `translateY(${shown ? 0 : 20}px)`,
                transition: `opacity 0.6s ease ${i === current ? '0.4s' : '0s'}, transform 0.6s ease ${i === current ? '0.4s' : '0s'}`,
              }}>
                <p style={{ fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 20, fontWeight: 500 }}>
                  Per Serving
                </p>
                {Object.entries(item.nutrition).map(([key, val], idx, arr) => (
                  <div key={key} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0',
                    borderBottom: idx < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 300 }}>{key}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>{val}</span>
                  </div>
                ))}
                {/* <div style={{ marginTop: 24, height: 2, borderRadius: 1, background: `linear-gradient(90deg, ${item.accent}, transparent)`, opacity: 0.8 }} /> */}
              </div>

            </div>
          ))}
        </div>

        {/* ── Bottom Navigation (Fixed) ── */}
        <div style={{
          position: 'absolute', bottom: 36, left: 0, right: 0, zIndex: 40,
          display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 28,
          opacity: shown ? 1 : 0, transition: 'opacity 0.5s ease 0.2s',
          pointerEvents: 'none', // let scroll track catch clicks where there are no buttons
        }}>
          <button className="cafe-nav-btn" onClick={prev} style={{
            pointerEvents: 'auto', width: 46, height: 46, borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff', fontSize: 17, cursor: current === 0 ? 'default' : 'pointer',
            opacity: current === 0 ? 0.3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            outline: 'none', transition: 'all 0.2s',
          }}>←</button>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', pointerEvents: 'auto' }}>
            {ITEMS.map((_, i) => (
              <button key={i} className="cafe-dot-btn" onClick={() => goTo(i)} style={{
                width: i === current ? 26 : 6, height: 6, borderRadius: 3, border: 'none', padding: 0, cursor: 'pointer',
                background: i === current ? '#fff' : 'rgba(255,255,255,0.15)',
                transition: 'width 0.35s ease, background 0.25s ease', outline: 'none',
              }} />
            ))}
          </div>

          <button className="cafe-nav-btn" onClick={next} style={{
            pointerEvents: 'auto', width: 46, height: 46, borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff', fontSize: 17, cursor: current === ITEMS.length - 1 ? 'default' : 'pointer',
            opacity: current === ITEMS.length - 1 ? 0.3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            outline: 'none', transition: 'all 0.2s',
          }}>→</button>
        </div>

      </div>
    </>
  );
}