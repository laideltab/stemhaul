"use client";

import { cn } from "@/lib/format";

// Simplified outlines of Colombia, Ecuador and Peru as [longitude, latitude] pairs.
const COLOMBIA: [number, number][] = [
  [-77.3, 8.6], [-76.2, 9.4], [-75.5, 10.6], [-74.2, 11.2], [-73.2, 11.3], [-72.2, 12.0], [-71.3, 12.4], [-71.1, 11.6], [-72.2, 11.1],
  [-72.9, 9.2], [-72.3, 7.4], [-70.1, 7.0], [-67.8, 6.2], [-67.3, 3.4], [-67.8, 2.8], [-67.2, 1.2], [-69.8, 1.1], [-69.4, -1.2],
  [-70.0, -4.2], [-70.9, -2.3], [-73.6, -1.3], [-75.2, -0.1], [-77.4, 0.4], [-78.8, 1.4], [-78.6, 2.4], [-77.3, 3.8], [-77.5, 6.7], [-77.9, 7.2],
];
const ECUADOR: [number, number][] = [
  [-78.8, 1.4], [-77.4, 0.4], [-75.2, -0.1], [-75.6, -1.6], [-76.6, -2.6], [-78.2, -3.4], [-78.4, -4.6], [-79.2, -5.0], [-80.4, -4.4],
  [-80.3, -3.4], [-79.8, -2.6], [-80.9, -2.2], [-80.9, -1.0], [-80.1, 0.8],
];
const PERU: [number, number][] = [
  [-80.3, -3.4], [-80.4, -4.4], [-79.2, -5.0], [-78.4, -4.6], [-78.2, -3.4], [-76.6, -2.6], [-75.6, -1.6], [-75.2, -0.1], [-73.6, -1.3],
  [-70.9, -2.3], [-70.0, -4.2], [-72.9, -5.3], [-73.9, -7.5], [-72.9, -9.5], [-70.6, -9.6], [-69.6, -10.9], [-68.7, -12.6], [-69.4, -15.3],
  [-69.9, -18.3], [-70.4, -18.4], [-75.2, -15.3], [-76.3, -13.5], [-77.8, -11.0], [-79.4, -7.9], [-81.3, -5.9], [-81.3, -4.2],
];
const AIRPORTS: Record<string, [number, number]> = { UIO: [-78.36, -0.12], BOG: [-74.15, 4.7], MDE: [-75.43, 6.16], LIM: [-77.11, -12.02] };

const W = [-82, -66];
const LAT = [12.8, -13.6];
const K = 22;
const x = (lng: number) => (lng - W[0]) * K;
const y = (lat: number) => (LAT[0] - lat) * K;
const path = (pts: [number, number][]) => "M" + pts.map(([lo, la]) => `${x(lo).toFixed(1)},${y(la).toFixed(1)}`).join("L") + "Z";
const VW = (W[1] - W[0]) * K;
const VH = (LAT[0] - LAT[1]) * K;

export interface MapPin {
  id: string;
  lat: number;
  lng: number;
  name: string;
}

export function FarmMap({ pins, selected, onSelect, className, compact }: { pins: MapPin[]; selected?: string; onSelect?: (id: string) => void; className?: string; compact?: boolean }) {
  const sel = pins.find((p) => p.id === selected);
  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className={cn("block h-full w-full", className)} style={{ background: "var(--map-sea)" }} role="img" aria-label="Map of farms in Colombia, Ecuador and Peru">
      <rect width={VW} height={VH} fill="var(--map-sea)" />
      {[COLOMBIA, ECUADOR, PERU].map((c, i) => (
        <path key={i} d={path(c)} fill="var(--map-land)" stroke="var(--map-border)" strokeWidth={1.5} strokeLinejoin="round" />
      ))}
      {!compact && (
        <g fill="var(--muted)" fontSize={11} letterSpacing={3} fontWeight={600} opacity={0.75}>
          <text x={x(-73.4)} y={y(3.2)} textAnchor="middle">COLOMBIA</text>
          <text x={x(-78.6)} y={y(-2.0)} textAnchor="middle">ECUADOR</text>
          <text x={x(-74.6)} y={y(-9.0)} textAnchor="middle">PERU</text>
          <text x={x(-80.3)} y={y(-9.5)} textAnchor="middle" fontStyle="italic" letterSpacing={1} fontWeight={400}>Pacific Ocean</text>
        </g>
      )}
      {!compact &&
        Object.entries(AIRPORTS).map(([code, [lo, la]]) => (
          <g key={code} transform={`translate(${x(lo) - 44},${y(la) - 8})`}>
            <rect width={32} height={16} rx={3} fill="var(--surface)" stroke="var(--line)" />
            <text x={16} y={12} textAnchor="middle" fontSize={10} fontFamily="var(--font-mono)" fill="var(--fg)">{code}</text>
          </g>
        ))}
      {pins.map((p) => {
        const on = p.id === selected;
        return (
          <g
            key={p.id}
            transform={`translate(${x(p.lng)},${y(p.lat)})`}
            onClick={onSelect ? () => onSelect(p.id) : undefined}
            className={onSelect ? "cursor-pointer" : undefined}
            role={onSelect ? "button" : undefined}
            aria-label={onSelect ? `Show ${p.name}` : undefined}
          >
            <title>{p.name}</title>
            {onSelect && <circle r={16} fill="transparent" />}
            {on && <circle r={15} fill="var(--accent)" opacity={0.18} />}
            <circle r={on ? 8 : 6.5} fill={on ? "var(--accent)" : "var(--brand)"} stroke="var(--surface)" strokeWidth={2} />
          </g>
        );
      })}
      {sel && !compact && (
        <text x={x(sel.lng) + 12} y={y(sel.lat) + 4} fontSize={12} fontWeight={600} fill="var(--fg)" paintOrder="stroke" stroke="var(--map-land)" strokeWidth={4}>
          {sel.name}
        </text>
      )}
    </svg>
  );
}
