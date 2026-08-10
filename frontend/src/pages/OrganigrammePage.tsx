import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMatrixStore } from '../store/useMatrixStore';
import { theme } from '../styles/theme';
import type { Fonction } from '../types';

const PALETTE = [theme.color.acCom, theme.color.acAch, theme.color.acFin, theme.color.acDig, theme.color.acMar];

/** Enfants directs d'un nœud (parentId). */
function childrenOf(fonctions: Fonction[], parentId: string | null): Fonction[] {
  return fonctions.filter((f) => (f.parentId ?? null) === parentId);
}

export function OrganigrammePage() {
  const { fonctions } = useMatrixStore();
  const canvasRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [paths, setPaths] = useState<string[]>([]);
  const [svg, setSvg] = useState({ w: 0, h: 0 });

  const register = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) nodeRefs.current.set(id, el);
    else nodeRefs.current.delete(id);
  }, []);

  // Racines : fonctions sans parent (ou parent introuvable).
  const ids = useMemo(() => new Set(fonctions.map((f) => f.id)), [fonctions]);
  const roots = useMemo(
    () => fonctions.filter((f) => !f.parentId || !ids.has(f.parentId)),
    [fonctions, ids],
  );

  // Couleur d'accent : chaque branche (enfant direct d'une racine) reçoit une teinte, héritée par ses descendants.
  const accentMap = useMemo(() => {
    const map: Record<string, string> = {};
    let branch = 0;
    const assign = (id: string, color: string) => {
      map[id] = color;
      for (const c of childrenOf(fonctions, id)) assign(c.id, color);
    };
    for (const r of roots) {
      map[r.id] = theme.color.dir;
      for (const child of childrenOf(fonctions, r.id)) {
        assign(child.id, PALETTE[branch % PALETTE.length]);
        branch++;
      }
    }
    return map;
  }, [fonctions, roots]);

  // Calcul des connecteurs (bus à angle droit), mesurés après rendu.
  const compute = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cr = canvas.getBoundingClientRect();
    const geom = (id: string) => {
      const el = nodeRefs.current.get(id);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { cx: r.left - cr.left + r.width / 2, top: r.top - cr.top, bottom: r.bottom - cr.top };
    };
    const next: string[] = [];
    for (const f of fonctions) {
      const kids = childrenOf(fonctions, f.id);
      if (kids.length === 0) continue;
      const p = geom(f.id);
      const kg = kids.map((k) => geom(k.id)).filter((x): x is NonNullable<typeof x> => !!x);
      if (!p || kg.length === 0) continue;
      const minTop = Math.min(...kg.map((k) => k.top));
      const busY = p.bottom + Math.max(18, (minTop - p.bottom) / 2);
      const xs = kg.map((k) => k.cx).concat([p.cx]);
      const left = Math.min(...xs);
      const right = Math.max(...xs);
      let d = `M ${p.cx} ${p.bottom} L ${p.cx} ${busY} M ${left} ${busY} L ${right} ${busY}`;
      for (const k of kg) d += ` M ${k.cx} ${busY} L ${k.cx} ${k.top}`;
      next.push(d);
    }
    const w = canvas.scrollWidth;
    const h = canvas.scrollHeight;
    setPaths((prev) => (prev.join('|') === next.join('|') ? prev : next));
    setSvg((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
  }, [fonctions]);

  useEffect(() => {
    const raf = requestAnimationFrame(compute);
    const t1 = setTimeout(compute, 300);
    const t2 = setTimeout(compute, 800);
    const onResize = () => compute();
    window.addEventListener('resize', onResize);
    if (document.fonts?.ready) document.fonts.ready.then(compute).catch(() => void 0);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', onResize);
    };
  }, [compute]);

  return (
    <div style={{ padding: '48px 34px 72px', fontFamily: theme.font, color: theme.color.ink, overflowX: 'auto' }}>
      <div style={{ width: 'max-content', maxWidth: '100%', margin: '0 auto 44px', textAlign: 'center' }}>
        <div style={{ fontSize: 12, letterSpacing: '.2em', textTransform: 'uppercase', color: theme.color.muted, fontWeight: 600 }}>
          Structure organisationnelle
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-.025em', margin: '8px 0 0' }}>Organigramme</h1>
        <div style={{ width: 52, height: 3, background: theme.color.acFin, borderRadius: 2, margin: '16px auto 0' }} />
      </div>

      <div ref={canvasRef} style={{ position: 'relative', width: 'max-content', margin: '0 auto', padding: 8 }}>
        <svg
          width={svg.w}
          height={svg.h}
          style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible', pointerEvents: 'none', zIndex: 0 }}
        >
          {paths.map((d, i) => (
            <path key={i} d={d} fill="none" stroke={theme.color.offBorder} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
          ))}
        </svg>

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 64 }}>
          {roots.map((r) => (
            <Node key={r.id} f={r} fonctions={fonctions} depth={0} accent={accentMap} register={register} />
          ))}
        </div>
      </div>
    </div>
  );
}

interface NodeProps {
  f: Fonction;
  fonctions: Fonction[];
  depth: number;
  accent: Record<string, string>;
  register: (id: string, el: HTMLDivElement | null) => void;
}

function Node({ f, fonctions, depth, accent, register }: NodeProps) {
  const kids = childrenOf(fonctions, f.id);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 52 }}>
      <Card f={f} depth={depth} color={accent[f.id] ?? theme.color.ope} register={register} />
      {kids.length > 0 && (
        <div style={{ display: 'flex', gap: depth === 0 ? 44 : 22, alignItems: 'flex-start', justifyContent: 'center' }}>
          {kids.map((k) => (
            <Node key={k.id} f={k} fonctions={fonctions} depth={depth + 1} accent={accent} register={register} />
          ))}
        </div>
      )}
    </div>
  );
}

function Card({
  f,
  depth,
  color,
  register,
}: {
  f: Fonction;
  depth: number;
  color: string;
  register: (id: string, el: HTMLDivElement | null) => void;
}) {
  // Sommet (DG) : carte foncée.
  if (depth === 0) {
    return (
      <div
        ref={(el) => register(f.id, el)}
        style={{
          background: theme.color.dir,
          color: '#fff',
          borderRadius: 14,
          padding: '16px 32px',
          textAlign: 'center',
          boxShadow: '0 2px 4px rgba(20,20,30,.12), 0 16px 34px rgba(20,20,30,.16)',
          minWidth: 264,
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase' }}>{f.libelle}</div>
        {f.personnes.length > 0 && <div style={{ fontSize: 13.5, opacity: 0.72, marginTop: 5, fontWeight: 500 }}>{f.personnes.join(' · ')}</div>}
      </div>
    );
  }

  const isManager = depth === 1;
  const width = isManager ? 230 : 200;
  const accentH = isManager ? 6 : 3;
  return (
    <div
      ref={(el) => register(f.id, el)}
      style={{
        width,
        background: '#fff',
        border: `1px solid ${theme.color.border}`,
        borderRadius: isManager ? 14 : 12,
        boxShadow: theme.shadow.sub,
        overflow: 'hidden',
      }}
    >
      <div style={{ height: accentH, background: color }} />
      <div style={{ padding: isManager ? '15px 17px 16px' : '13px 15px 15px' }}>
        <div style={{ fontWeight: 700, fontSize: isManager ? 14.5 : 13.5, color: theme.color.ink, lineHeight: 1.25, letterSpacing: '-.01em' }}>
          {f.libelle}
        </div>
        <div style={{ height: 1, background: theme.color.sep, margin: isManager ? '10px 0' : '9px 0' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 12.5, color: theme.color.muted, lineHeight: 1.4 }}>
          {f.personnes.length ? f.personnes.map((p) => <span key={p}>{p}</span>) : <span style={{ color: theme.color.muted2 }}>—</span>}
        </div>
      </div>
    </div>
  );
}
