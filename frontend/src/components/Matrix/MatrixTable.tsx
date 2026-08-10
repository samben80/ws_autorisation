// Table des autorisations virtualisée (react-window) — reproduction fidèle du prototype.
import { forwardRef, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { VariableSizeList, type ListChildComponentProps } from 'react-window';
import type { Fonction, NiveauCode, PermMap, Role } from '../../types';
import { theme, niveauMeta } from '../../styles/theme';
import { permKey } from '../../store/useMatrixStore';
import { BAND_HEIGHT, ROW_HEIGHT, type MatrixItem } from '../../data/catalogHelpers';

const INT_W = 180;
const FONC_W = 150;
const LEFT_W = INT_W + FONC_W;
const POSTE_W = 36;
const HEAD_LEVEL_H = 34;
const HEAD_POSTE_H = 176;
const HEAD_H = HEAD_LEVEL_H + HEAD_POSTE_H;

interface Column {
  fonction: Fonction;
  code: NiveauCode | string;
  firstOfLevel: boolean;
}
interface LevelBand {
  code: NiveauCode | string;
  label: string;
  head: string;
  count: number;
}

function metaFor(code: string): { label: string; head: string; col: string } {
  return (niveauMeta as Record<string, { label: string; head: string; col: string }>)[code]
    ?? { label: code, head: theme.color.enc, col: theme.color.colEnc };
}

interface Props {
  roles: Role[];
  fonctions: Fonction[];
  items: MatrixItem[];
  perms: PermMap;
  counts: Record<string, number>;
  onToggle: (fonctionId: string, objet: string, intitule: string, fonction: string) => void;
}

/** Force la largeur totale de l'élément interne pour activer le scroll horizontal + sticky. */
const makeInner = (totalWidth: number) =>
  forwardRef<HTMLDivElement, { style: React.CSSProperties }>(function Inner({ style, ...rest }, ref) {
    return <div ref={ref} style={{ ...style, width: totalWidth, position: 'relative' }} {...rest} />;
  });

export function MatrixTable({ roles, fonctions, items, perms, counts, onToggle }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const listOuterRef = useRef<HTMLDivElement>(null);
  const headInnerRef = useRef<HTMLDivElement>(null);
  const [viewW, setViewW] = useState(1000);

  // Largeur visible (pour dimensionner la liste et le viewport de l'en-tête).
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => setViewW(entries[0].contentRect.width));
    ro.observe(el);
    setViewW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  // Colonnes ordonnées par rôle (niveau), bandeaux de niveau.
  const { columns, bands, totalWidth } = useMemo(() => {
    const ordered = [...roles].sort((a, b) => a.ordre - b.ordre);
    const cols: Column[] = [];
    const bnds: LevelBand[] = [];
    for (const role of ordered) {
      const fs = fonctions.filter((f) => f.roleId === role.id);
      if (fs.length === 0) continue;
      bnds.push({ code: role.code, label: metaFor(role.code).label, head: metaFor(role.code).head, count: fs.length });
      fs.forEach((f, idx) => cols.push({ fonction: f, code: role.code, firstOfLevel: idx === 0 }));
    }
    return { columns: cols, bands: bnds, totalWidth: LEFT_W + cols.length * POSTE_W };
  }, [roles, fonctions]);

  // Synchronise le scroll horizontal de l'en-tête sur celui du corps (react-window).
  useEffect(() => {
    const outer = listOuterRef.current;
    if (!outer) return;
    const onScroll = () => {
      if (headInnerRef.current) headInnerRef.current.style.transform = `translateX(${-outer.scrollLeft}px)`;
    };
    outer.addEventListener('scroll', onScroll, { passive: true });
    return () => outer.removeEventListener('scroll', onScroll);
  }, [totalWidth]);

  const listKey = useMemo(
    () => `${items.length}|${columns.map((c) => c.fonction.id).join(',')}`,
    [items, columns],
  );

  const itemSize = (index: number) => (items[index].kind === 'band' ? BAND_HEIGHT : ROW_HEIGHT);
  const totalRowsH = useMemo(
    () => items.reduce((s, it) => s + (it.kind === 'band' ? BAND_HEIGHT : ROW_HEIGHT), 0),
    [items],
  );
  const bodyH = Math.max(120, Math.min(totalRowsH, Math.round(window.innerHeight * 0.62)));

  const Inner = useMemo(() => makeInner(totalWidth), [totalWidth]);

  const Row = ({ index, style }: ListChildComponentProps) => {
    const it = items[index];
    if (it.kind === 'band') {
      return (
        <div style={style}>
          <div
            style={{
              position: 'sticky',
              left: 0,
              width: viewW,
              height: BAND_HEIGHT,
              display: 'flex',
              alignItems: 'center',
              background: theme.color.objetBand,
              color: '#fff',
              fontWeight: 700,
              fontSize: 11.5,
              letterSpacing: '.1em',
              textTransform: 'uppercase',
              padding: '0 12px',
              zIndex: 3,
            }}
          >
            {it.objet}
          </div>
        </div>
      );
    }

    const rowBg = it.parity ? '#faf8f4' : '#ffffff';
    const topB = it.showIntitule ? '2px solid #eae3d5' : undefined;
    return (
      <div style={{ ...style, display: 'flex' }}>
        {/* Colonnes gauche figées */}
        <div
          style={{
            position: 'sticky',
            left: 0,
            width: INT_W,
            minWidth: INT_W,
            height: ROW_HEIGHT,
            background: rowBg,
            padding: '0 12px',
            display: 'flex',
            alignItems: 'center',
            fontWeight: 600,
            fontSize: 12,
            color: theme.color.ink,
            borderRight: `1px solid ${theme.color.sep2}`,
            borderTop: topB,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            zIndex: 2,
          }}
          title={it.intitule}
        >
          {it.showIntitule ? it.intitule : ''}
        </div>
        <div
          style={{
            position: 'sticky',
            left: INT_W,
            width: FONC_W,
            minWidth: FONC_W,
            height: ROW_HEIGHT,
            background: rowBg,
            padding: '0 12px',
            display: 'flex',
            alignItems: 'center',
            fontSize: 12,
            color: '#5a5852',
            borderRight: `2px solid #e6ddcd`,
            borderTop: topB,
            whiteSpace: 'nowrap',
            zIndex: 2,
          }}
          title={it.fonction}
        >
          {it.fonction}
        </div>
        {/* Cellules par poste */}
        {columns.map((c) => {
          const on = !!perms[permKey(c.fonction.id, it.objet, it.intitule, it.fonction)];
          const m = metaFor(c.code);
          return (
            <div
              key={c.fonction.id}
              onClick={() => onToggle(c.fonction.id, it.objet, it.intitule, it.fonction)}
              title={`${c.fonction.libelle} · ${it.fonction}`}
              style={{
                width: POSTE_W,
                minWidth: POSTE_W,
                height: ROW_HEIGHT,
                background: m.col,
                borderBottom: `1px solid ${theme.color.sep}`,
                borderLeft: c.firstOfLevel ? '2px solid #e6ddcd' : '1px solid #eee9df',
                borderTop: topB,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: theme.radius.box,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 800,
                  color: on ? '#fff' : 'transparent',
                  background: on ? theme.color.on : '#fff',
                  border: `1px solid ${on ? theme.color.on : theme.color.offBorder}`,
                }}
              >
                {on ? '✓' : ''}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      {/* EN-TÊTE (figé verticalement, scroll horizontal synchronisé) */}
      <div style={{ position: 'relative', width: viewW, height: HEAD_H, overflow: 'hidden' }}>
        <div ref={headInnerRef} style={{ position: 'absolute', top: 0, left: 0, width: totalWidth, willChange: 'transform' }}>
          {/* Bandeaux de niveau */}
          <div style={{ display: 'flex', height: HEAD_LEVEL_H, marginLeft: LEFT_W }}>
            {bands.map((b, i) => (
              <div
                key={b.code + i}
                style={{
                  width: b.count * POSTE_W,
                  height: HEAD_LEVEL_H,
                  background: b.head,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '.08em',
                  borderLeft: i === 0 ? '2px solid #4a4a52' : '2px solid rgba(255,255,255,.3)',
                }}
              >
                {b.label}
              </div>
            ))}
          </div>
          {/* En-têtes de poste (texte vertical + badge) */}
          <div style={{ display: 'flex', height: HEAD_POSTE_H, marginLeft: LEFT_W }}>
            {columns.map((c) => {
              const m = metaFor(c.code);
              return (
                <div
                  key={c.fonction.id}
                  title={`${c.fonction.libelle} — ${c.fonction.personnes.join(' · ')}`}
                  style={{
                    width: POSTE_W,
                    height: HEAD_POSTE_H,
                    background: m.head,
                    color: '#fff',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 0 6px',
                    borderLeft: c.firstOfLevel ? '2px solid #fff' : '1px solid rgba(255,255,255,.18)',
                  }}
                >
                  <div
                    style={{
                      writingMode: 'vertical-rl',
                      transform: 'rotate(180deg)',
                      whiteSpace: 'nowrap',
                      fontSize: 11,
                      fontWeight: 600,
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      lineHeight: 1.1,
                    }}
                  >
                    {c.fonction.libelle}
                  </div>
                  <div
                    style={{
                      fontSize: 9.5,
                      fontWeight: 700,
                      background: 'rgba(255,255,255,.22)',
                      borderRadius: theme.radius.pill,
                      padding: '1px 6px',
                      marginTop: 6,
                    }}
                  >
                    {counts[c.fonction.id] ?? 0}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {/* Coin figé gauche (Intitulé / Fonction) superposé */}
        <div style={{ position: 'absolute', top: 0, left: 0, height: HEAD_H, display: 'flex', zIndex: 5 }}>
          <div style={{ width: INT_W, height: HEAD_H, background: theme.color.headLeft, color: '#fff', display: 'flex', alignItems: 'flex-end', padding: '0 12px 10px', fontSize: 12, fontWeight: 700 }}>
            Intitulé
          </div>
          <div style={{ width: FONC_W, height: HEAD_H, background: theme.color.headLeft, color: '#fff', display: 'flex', alignItems: 'flex-end', padding: '0 12px 10px', fontSize: 12, fontWeight: 700, borderRight: '2px solid #4a4a52' }}>
            Fonction
          </div>
        </div>
      </div>

      {/* CORPS virtualisé */}
      <VariableSizeList
        key={listKey}
        outerRef={listOuterRef}
        className="wv-scroll"
        height={bodyH}
        width={viewW}
        itemCount={items.length}
        itemSize={itemSize}
        estimatedItemSize={ROW_HEIGHT}
        innerElementType={Inner}
        overscanCount={6}
      >
        {Row}
      </VariableSizeList>
    </div>
  );
}
