"use client";

import { type ReactNode, useMemo, useState } from "react";
import {
  Accessibility,
  Box,
  Layers3,
  LocateFixed,
  RotateCcw,
  Sparkles,
  Volume2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { ROOMS, SAFETY_SIGNS, floorNames, routeForRoom, type FloorId, type Room } from "@/lib/hospital";

type Props = {
  floor: FloorId;
  selectedId: string;
  accessible: boolean;
  onSelect: (room: Room) => void;
  onFloorChange: (floor: FloorId) => void;
};

type P3 = { x: number; y: number; z: number };
type P2 = { x: number; y: number };

const ROOM_SLOTS = [
  { x: 8, z: 7, w: 34, d: 18 },
  { x: 58, z: 7, w: 34, d: 18 },
  { x: 8, z: 44, w: 34, d: 18 },
  { x: 58, z: 44, w: 34, d: 18 },
];

function pts(points: P2[]) {
  return points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
}

export default function Indoor3DMap({ floor, selectedId, accessible, onSelect, onFloorChange }: Props) {
  const [yaw, setYaw] = useState(34);
  const [zoom, setZoom] = useState(1);
  const [stacked, setStacked] = useState(true);

  const selected = ROOMS.find((room) => room.id === selectedId) ?? ROOMS[0];
  const floorRooms = ROOMS.filter((room) => room.floor === floor);
  const selectedSlot = ROOM_SLOTS[Math.max(0, floorRooms.findIndex((room) => room.id === selected.id))] ?? ROOM_SLOTS[0];
  const routeData = routeForRoom(selected, accessible);
  const steps = routeData.steps;

  const project = useMemo(() => {
    const angle = (yaw * Math.PI) / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return (point: P3): P2 => {
      const cx = point.x - 50;
      const cz = point.z - 35;
      const xr = cx * cos - cz * sin;
      const zr = cx * sin + cz * cos;
      return {
        x: 420 + xr * 5.6 * zoom,
        y: 340 + zr * 2.35 * zoom - point.y * 5.6 * zoom,
      };
    };
  }, [yaw, zoom]);

  function prism(x: number, z: number, w: number, d: number, y: number, h: number) {
    const a = project({ x, y, z });
    const b = project({ x: x + w, y, z });
    const c = project({ x: x + w, y, z: z + d });
    const d0 = project({ x, y, z: z + d });
    const at = project({ x, y: y + h, z });
    const bt = project({ x: x + w, y: y + h, z });
    const ct = project({ x: x + w, y: y + h, z: z + d });
    const dt = project({ x, y: y + h, z: z + d });
    return {
      base: [a, b, c, d0],
      top: [at, bt, ct, dt],
      front: [d0, c, ct, dt],
      right: [b, c, ct, bt],
      left: [a, d0, dt, at],
      center: project({ x: x + w / 2, y: y + h + 1.6, z: z + d / 2 }),
    };
  }

  function floorPlate(level: FloorId, active: boolean) {
    const plateY = level * 12;
    const body = prism(1, 1, 98, 68, plateY, 1.8);
    return (
      <g
        key={`plate-${level}`}
        className="cursor-pointer"
        opacity={active ? 1 : 0.38}
        onClick={() => onFloorChange(level)}
      >
        <polygon points={pts(body.front)} fill={active ? "#C9DBF1" : "#DDE7F1"} />
        <polygon points={pts(body.right)} fill={active ? "#B8D1EE" : "#D1DDEA"} />
        <polygon points={pts(body.top)} fill={active ? "#FBFEFF" : "#F0F5FA"} stroke={active ? "#8EB4DE" : "#C7D7E6"} strokeWidth="1.5" />
        <text
          x={project({ x: 4, y: plateY + 2.5, z: 4 }).x}
          y={project({ x: 4, y: plateY + 2.5, z: 4 }).y}
          fill={active ? "#1D5CB9" : "#7F97AE"}
          fontSize="11"
          fontWeight="900"
        >
          {level === 0 ? "GROUND" : `FLOOR ${level}`}
        </text>
      </g>
    );
  }

  const routePoints = [
    project({ x: -3, y: 4, z: 35 }),
    project({ x: 50, y: 4, z: 35 }),
    project({ x: selectedSlot.x + selectedSlot.w / 2, y: 4, z: 35 }),
    project({
      x: selectedSlot.x + selectedSlot.w / 2,
      y: 4,
      z: selectedSlot.z + (selectedSlot.z < 30 ? selectedSlot.d : 0),
    }),
  ];

  const distance = floor > 0 ? `${18 + floor * 9} m` : "12 m";
  const eta = floor > 0 ? `${2 + floor} min` : "1 min";

  return (
    <div className="overflow-hidden rounded-[30px] border border-[#D7E6F4] bg-[linear-gradient(180deg,#FDFEFF_0%,#F6FAFE_100%)] shadow-[0_18px_60px_rgba(31,77,123,.08)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E3EDF7] bg-white/90 px-4 py-4 backdrop-blur sm:px-5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#0EA5E9] text-white shadow-lg shadow-blue-100">
            <Box size={18} />
          </span>
          <div>
            <p className="text-[12px] font-black uppercase tracking-[0.18em] text-blue-700">3D Indoor Navigator</p>
            <h3 className="mt-1 text-[18px] font-black tracking-tight text-[#17385D]">{floorNames[floor]}</h3>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setStacked((value) => !value)} className={`map-3d-tool ${stacked ? "map-3d-tool-active" : ""}`}>
            <Layers3 size={14} /> {stacked ? "Stacked building" : "Single floor"}
          </button>
          <button type="button" onClick={() => setYaw((value) => value - 12)} className="map-3d-icon" aria-label="Rotate left"><RotateCcw size={15} /></button>
          <button type="button" onClick={() => setYaw((value) => value + 12)} className="map-3d-icon" aria-label="Rotate right"><RotateCcw size={15} className="scale-x-[-1]" /></button>
          <button type="button" onClick={() => setZoom((value) => Math.max(0.82, value - 0.08))} className="map-3d-icon" aria-label="Zoom out"><ZoomOut size={15} /></button>
          <button type="button" onClick={() => setZoom((value) => Math.min(1.24, value + 0.08))} className="map-3d-icon" aria-label="Zoom in"><ZoomIn size={15} /></button>
        </div>
      </div>

      <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_290px]">
        <div className="relative overflow-hidden bg-[radial-gradient(circle_at_48%_22%,#FFFFFF_0%,#F2F8FF_48%,#EAF2FA_100%)] px-2 py-2 sm:px-3 sm:py-3">
          <div className="pointer-events-none absolute left-5 top-5 rounded-full border border-white/80 bg-white/92 px-3 py-1.5 text-[10px] font-black tracking-[0.2em] text-slate-500 shadow-sm">N ↑</div>
          <div className="pointer-events-none absolute right-5 top-5 rounded-2xl border border-white/85 bg-white/95 px-3 py-2 text-[10px] font-extrabold text-slate-500 shadow-sm">
            <div className="flex items-center gap-1.5"><Sparkles size={12} className="text-blue-600" /> Premium visual demo</div>
          </div>
          <svg viewBox="0 0 840 590" className="w-full select-none" role="img" aria-label={`3D simulated indoor map for ${floorNames[floor]}`}>
            <defs>
              <filter id="navShadow" x="-40%" y="-40%" width="180%" height="200%"><feDropShadow dx="0" dy="16" stdDeviation="12" floodColor="#2D5885" floodOpacity=".18" /></filter>
              <filter id="navGlow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="10" /></filter>
              <linearGradient id="routeGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#0EA5E9" /><stop offset=".5" stopColor="#2563EB" /><stop offset="1" stopColor="#8B5CF6" /></linearGradient>
            </defs>

            <ellipse cx="420" cy="494" rx="325" ry="64" fill="#C7D8E8" opacity=".32" />

            {(stacked ? ([0, 1, 2, 3] as FloorId[]) : [floor]).map((level) => floorPlate(level, level === floor))}

            {(() => {
              const plateY = stacked ? floor * 12 + 2.4 : 2.4;
              const horizontal = prism(0, 28, 100, 14, plateY, 1.3);
              const vertical = prism(43, 0, 14, 70, plateY, 1.3);
              const lift = prism(45.5, 28.8, 9, 11.2, plateY + 1.2, 11);
              const stairs = prism(58.5, 28.8, 9, 11.2, plateY + 1.2, 9.5);
              const info = prism(22, 29.5, 8.8, 8, plateY + 1.2, 5.5);

              return (
                <g filter="url(#navShadow)">
                  <polygon points={pts(horizontal.top)} fill="#EDF3FA" stroke="#CCDAE9" />
                  <polygon points={pts(vertical.top)} fill="#F2F7FC" stroke="#CCDAE9" />

                  <polygon points={pts(info.front)} fill="#FFF3D7" stroke="#E9C96B" />
                  <polygon points={pts(info.right)} fill="#FCE8BF" stroke="#E9C96B" />
                  <polygon points={pts(info.top)} fill="#FFF9EC" stroke="#E9C96B" />
                  <text x={info.center.x} y={info.center.y + 3} textAnchor="middle" fill="#B67800" fontSize="8.5" fontWeight="900">INFO</text>

                  <polygon points={pts(lift.front)} fill="#C9F1E1" stroke="#73C9A8" />
                  <polygon points={pts(lift.right)} fill="#B2E6D2" stroke="#73C9A8" />
                  <polygon points={pts(lift.top)} fill="#EBFCF5" stroke="#73C9A8" />
                  <text x={lift.center.x} y={lift.center.y + 2} textAnchor="middle" fill="#157A5B" fontSize="8.6" fontWeight="900">LIFT</text>

                  <polygon points={pts(stairs.front)} fill="#E7E3FF" stroke="#9D89E8" />
                  <polygon points={pts(stairs.right)} fill="#D8D0FF" stroke="#9D89E8" />
                  <polygon points={pts(stairs.top)} fill="#F3F0FF" stroke="#9D89E8" />
                  <text x={stairs.center.x} y={stairs.center.y + 2} textAnchor="middle" fill="#5F49BF" fontSize="8.2" fontWeight="900">STAIRS</text>
                </g>
              );
            })()}

            {SAFETY_SIGNS.filter((sign) => sign.floor === floor).map((sign) => {
              const point = project({ x: sign.worldX, y: (stacked ? floor * 12 : 0) + 16, z: sign.worldZ });
              const width = sign.short.length > 3 ? 42 : sign.short.length > 2 ? 34 : 26;
              return <g key={sign.id}>
                <title>{sign.label} · simulated demo location</title>
                <rect x={point.x - width / 2} y={point.y - 10} width={width} height="20" rx="6" fill="#FFFFFF" stroke={sign.color} strokeWidth="1.6" />
                <circle cx={point.x - width / 2 + 6} cy={point.y} r="3" fill={sign.color} />
                <text x={point.x + 4} y={point.y + 3} textAnchor="middle" fill={sign.color} fontSize={sign.short.length > 4 ? "6" : "7.5"} fontWeight="900">{sign.short}</text>
              </g>;
            })}

            {floorRooms.map((room, index) => {
              const slot = ROOM_SLOTS[index];
              const active = room.id === selected.id;
              const baseY = stacked ? floor * 12 + 4.4 : 4.4;
              const block = prism(slot.x, slot.z, slot.w, slot.d, baseY, active ? 11.5 : 8.5);
              return (
                <g
                  key={room.id}
                  onClick={() => onSelect(room)}
                  role="button"
                  tabIndex={0}
                  className="cursor-pointer"
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") onSelect(room);
                  }}
                >
                  {active && <polygon points={pts(block.top)} fill={room.color} opacity=".18" filter="url(#navGlow)" />}
                  <polygon points={pts(block.front)} fill={active ? "#D7E6FF" : "#DEE9F3"} stroke={active ? room.color : "#BFD1E1"} strokeWidth={active ? 2.2 : 1.1} />
                  <polygon points={pts(block.right)} fill={active ? "#BFD8FF" : "#CFDCE8"} stroke={active ? room.color : "#BFD1E1"} strokeWidth={active ? 2.2 : 1.1} />
                  <polygon points={pts(block.top)} fill={active ? "#FCFEFF" : "#FFFFFF"} stroke={active ? room.color : "#CCDAE7"} strokeWidth={active ? 2.4 : 1.2} />
                  <circle cx={block.center.x} cy={block.center.y - 1} r={active ? 16 : 13} fill={room.color} opacity={active ? 1 : 0.88} />
                  <text x={block.center.x} y={block.center.y + 3} textAnchor="middle" fill="#fff" fontSize="8.6" fontWeight="900">{room.code}</text>
                  <rect x={block.center.x - 66} y={block.center.y + 18} width="132" height="28" rx="14" fill={active ? "#183E7D" : "#FFFFFF"} stroke={active ? "#183E7D" : "#D7E2ED"} />
                  <text x={block.center.x} y={block.center.y + 35} textAnchor="middle" fill={active ? "#FFFFFF" : "#36536F"} fontSize="10" fontWeight="900">
                    {room.name.length > 19 ? `${room.name.slice(0, 18)}…` : room.name}
                  </text>
                </g>
              );
            })}

            <polyline points={pts(routePoints)} fill="none" stroke="#9CC8FE" strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" opacity=".22" />
            <polyline points={pts(routePoints)} fill="none" stroke="url(#routeGrad)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="14 10" className="route-motion" />
            <circle cx={routePoints[0].x} cy={routePoints[0].y} r="11" fill="#10B981" stroke="#fff" strokeWidth="4" />
            <circle cx={routePoints[routePoints.length - 1].x} cy={routePoints[routePoints.length - 1].y} r="12" fill="#2563EB" stroke="#fff" strokeWidth="4">
              <animate attributeName="r" values="10;14;10" dur="1.8s" repeatCount="indefinite" />
            </circle>
          </svg>
        </div>

        <div className="border-t border-[#E5EDF6] bg-white p-4 xl:border-l xl:border-t-0 xl:p-5">
          <div className="rounded-[24px] border border-[#E3ECF6] bg-[linear-gradient(180deg,#F8FBFF_0%,#F1F7FE_100%)] p-4 shadow-[0_12px_30px_rgba(28,79,129,.06)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Selected destination</p>
                <h4 className="mt-1 text-[18px] font-black tracking-tight text-[#183A5A]">{selected.name}</h4>
              </div>
              <span className="rounded-2xl bg-white px-3 py-2 text-[10px] font-black text-blue-700 shadow-sm">{selected.code}</span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <Metric label="ETA" value={eta} />
              <Metric label="Distance" value={distance} />
              <Metric label="Mode" value={accessible ? "Lift" : "Mixed"} />
              <Metric label="Floor" value={floor === 0 ? "Ground" : `Floor ${floor}`} />
            </div>

            <div className="mt-4 rounded-2xl bg-white/90 p-4">
              <div className="flex items-center gap-2 text-[12px] font-black text-[#1D4ED8]"><LocateFixed size={15} /> Route summary</div>
              <ol className="mt-3 space-y-2">
                {steps.map((step, index) => (
                  <li key={step} className="flex items-start gap-2.5 text-[11px] leading-5 text-slate-600">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-[10px] font-black text-white">{index + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Badge icon={<Accessibility size={12} />} label={accessible ? "Accessible path enabled" : "Standard route"} tone="mint" />
              <Badge icon={<Volume2 size={12} />} label="Voice-ready" tone="blue" />
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {([0, 1, 2, 3] as FloorId[]).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => onFloorChange(level)}
                className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                  floor === level
                    ? "border-blue-200 bg-blue-50 shadow-sm"
                    : "border-slate-200 bg-white hover:border-blue-100 hover:bg-slate-50"
                }`}
              >
                <div>
                  <p className={`text-[11px] font-black uppercase tracking-[0.16em] ${floor === level ? "text-blue-600" : "text-slate-400"}`}>{level === 0 ? "Ground" : `Floor ${level}`}</p>
                  <p className="mt-1 text-[13px] font-black text-[#244464]">{floorNames[level]}</p>
                </div>
                <span className={`rounded-xl px-2.5 py-1.5 text-[10px] font-black ${floor === level ? "bg-white text-blue-700" : "bg-slate-100 text-slate-500"}`}>{ROOMS.filter((room) => room.floor === level).length} rooms</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#E5EDF7] bg-white px-3 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-1 text-[16px] font-black text-[#183A5A]">{value}</p>
    </div>
  );
}

function Badge({ icon, label, tone }: { icon: ReactNode; label: string; tone: "mint" | "blue" }) {
  const cls = tone === "mint"
    ? "border-emerald-100 bg-emerald-50 text-emerald-700"
    : "border-blue-100 bg-blue-50 text-blue-700";
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-[10px] font-black ${cls}`}>{icon}{label}</span>;
}
