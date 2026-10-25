"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, Ambulance, ArrowRight, ArrowUpRight, Bell, Bot, Building2, Check,
  CheckCircle2, ChevronRight, ClipboardList, Clock3, Compass, Copy,
  HeartHandshake, HeartPulse, Home, Languages, LayoutDashboard, LocateFixed,
  MapPin, Menu, MessageCircleMore, Navigation2, Phone, Plus, Search, ShieldAlert,
  ShieldCheck, Sparkles, Stethoscope, Ticket, Users, Volume2, WandSparkles,
  X, Accessibility, Layers3, UserRound, RotateCcw
} from "lucide-react";
import {
  ROOMS, SAFETY_SIGNS, floorNames, getRoom, routeForRoom, type FloorId, type Room
} from "@/lib/hospital";
import NearbyHospitalNavigator, { VerifiedHospitalLibrary } from "@/components/NearbyHospitalNavigator";
import Indoor3DMap from "@/components/Indoor3DMap";
import GoogleSignInButton from "@/components/GoogleSignInButton";

type Role = "patient" | "staff";
type PatientScreen = "home" | "nearby" | "verified" | "navigate" | "visit" | "assistant";
type StaffScreen = "overview" | "queue";
type ChatMessage = { role: "user" | "assistant"; content: string; kind?: "system" };
type PatientRecord = { id: number; name: string; department: string; createdAt: string };
type QueueState = { serving: number; next: number; patients: PatientRecord[] };

const INITIAL_QUEUE: QueueState = {
  serving: 38,
  next: 43,
  patients: [
    { id: 39, name: "Demo patient 1", department: "General medicine OPD", createdAt: "09:12" },
    { id: 40, name: "Demo patient 2", department: "Pediatrics", createdAt: "09:16" },
    { id: 41, name: "Demo patient 3", department: "Cardiology", createdAt: "09:21" },
    { id: 42, name: "Demo patient 4", department: "Orthopedics", createdAt: "09:25" },
  ],
};
const QUEUE_KEY = "opd-saathi-demo-queue-v2";

const patientNav = [
  { id: "home", label: "Overview", Icon: Home },
  { id: "nearby", label: "Best hospital nearby", Icon: LocateFixed },
  { id: "verified", label: "Verified Hospitals", Icon: ShieldCheck },
  { id: "navigate", label: "Find a department", Icon: Compass },
  { id: "visit", label: "My visit & token", Icon: Ticket },
  { id: "assistant", label: "Ask Saathi AI", Icon: MessageCircleMore },
] as const;
const staffNav = [
  { id: "overview", label: "Command center", Icon: LayoutDashboard },
  { id: "queue", label: "Manage OPD queue", Icon: ClipboardList },
] as const;

function tokenNumber(n: number) {
  return `A${String(n).padStart(3, "0")}`;
}

function roomLines(label: string) {
  const words = label.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (line && `${line} ${word}`.length > 21) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 2);
}

function FloorPlan({
  floor, selectedId, onSelect, accessible,
}: {
  floor: FloorId;
  selectedId: string;
  onSelect: (room: Room) => void;
  accessible: boolean;
}) {
  const rooms = ROOMS.filter((room) => room.floor === floor);
  const selected = rooms.find((room) => room.id === selectedId) ?? rooms[0];
  const route = routeForRoom(selected, accessible);
  const routeMinutes = floor === 0 ? 2 : floor + 2;
  const routeMeters = 42 + floor * 24;

  return (
    <div className="wayfinding-stage relative overflow-hidden rounded-[28px] border border-[#DCE8F5] bg-white">
      <div className="map-toolbar flex flex-wrap items-center justify-between gap-3 border-b border-[#E6EEF7] px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E9F3FF] text-blue-600"><Navigation2 size={17} /></span>
          <div>
            <p className="text-[11px] font-black tracking-[.08em] text-[#234A75]">{floorNames[floor]}</p>
            <p className="text-[10px] font-semibold text-slate-400">Interactive hospital wayfinding</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="map-metric"><Clock3 size={13} /> {routeMinutes} min</span>
          <span className="map-metric"><LocateFixed size={13} /> ~{routeMeters} m</span>
        </div>
      </div>

      <div className="relative overflow-hidden bg-[#F4F9FF] p-2 sm:p-4">
        <div className="pointer-events-none absolute left-5 top-5 z-10 flex items-center gap-2 rounded-full border border-white/90 bg-white/95 px-3 py-2 text-[10px] font-extrabold uppercase tracking-[.12em] text-slate-600 shadow-[0_8px_24px_rgba(32,77,130,.10)] backdrop-blur">
          <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,.12)]" /> Live route preview
        </div>
        <div className="pointer-events-none absolute right-5 top-5 z-10 rounded-full border border-white bg-white/95 px-3 py-2 text-[10px] font-extrabold text-slate-500 shadow-sm">N ↑</div>

        <svg
          viewBox="0 0 820 560"
          role="group"
          aria-label={`${floorNames[floor]} illustrative floor plan. Select a room to preview directions.`}
          className="w-full"
        >
          <defs>
            <pattern id={`microGrid-${floor}`} width="18" height="18" patternUnits="userSpaceOnUse">
              <path d="M18 0H0V18" fill="none" stroke="#DCE8F4" strokeWidth=".9" opacity=".75" />
            </pattern>
            <linearGradient id={`mapBg-${floor}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#F9FCFF" />
              <stop offset="1" stopColor="#EDF6FF" />
            </linearGradient>
            <linearGradient id={`corridor-${floor}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#EAF2FB" />
              <stop offset=".5" stopColor="#F3F8FD" />
              <stop offset="1" stopColor="#EAF2FB" />
            </linearGradient>
            <filter id={`routeGlow-${floor}`} x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="8" />
            </filter>
            <filter id={`roomShadow-${floor}`} x="-25%" y="-25%" width="150%" height="160%">
              <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#527CA7" floodOpacity=".12" />
            </filter>
          </defs>

          <rect x="0" y="0" width="820" height="560" rx="28" fill={`url(#mapBg-${floor})`} />
          <rect x="0" y="0" width="820" height="560" rx="28" fill={`url(#microGrid-${floor})`} />

          {/* outer building */}
          <rect x="118" y="32" width="585" height="477" rx="30" fill="#D7E5F3" opacity=".75" />
          <rect x="127" y="41" width="567" height="459" rx="24" fill="#FFFFFF" stroke="#B9CEE3" strokeWidth="7" />

          {/* central circulation spine */}
          <rect x="129" y="215" width="563" height="104" fill={`url(#corridor-${floor})`} />
          <rect x="360" y="43" width="92" height="455" fill="#F2F7FC" />
          <path d="M129 215H692M129 319H692M360 43V498M452 43V498" stroke="#D6E3F0" strokeWidth="2" strokeDasharray="5 8" />
          <text x="410" y="274" textAnchor="middle" fontSize="10" letterSpacing="3.4" fill="#A0B3C7" fontWeight="900">CENTRAL CONCOURSE</text>

          {/* entrance + facility cores */}
          <rect x="28" y="207" width="96" height="120" rx="22" fill="#E8F2FF" stroke="#ABCDF7" strokeWidth="2" />
          <circle cx="76" cy="244" r="22" fill="#2563EB" />
          <path d="M66 245h20M76 235v20" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
          <text x="76" y="287" textAnchor="middle" fontSize="12" fill="#1F57A9" fontWeight="900">ENTRANCE</text>
          <text x="76" y="304" textAnchor="middle" fontSize="9" fill="#6E91B8" fontWeight="800">YOU ARE HERE</text>
          <path d="M124 267H129" stroke="#79AFFF" strokeWidth="8" />

          <rect x="704" y="173" width="88" height="89" rx="18" fill="#E9FBF3" stroke="#A8E1C6" strokeWidth="2" />
          <rect x="720" y="188" width="56" height="42" rx="12" fill="#C9F2DE" />
          <path d="M731 210l10-10 10 10M741 200v21M755 200v21" stroke="#148259" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <text x="748" y="246" textAnchor="middle" fontSize="11" fill="#176C50" fontWeight="900">LIFT</text>

          <rect x="704" y="274" width="88" height="89" rx="18" fill="#F1F0FF" stroke="#CBC9F5" strokeWidth="2" />
          <path d="M724 328h11v-12h11v-12h12v-12h12" stroke="#7775C9" strokeWidth="5" strokeLinejoin="round" fill="none" />
          <text x="748" y="348" textAnchor="middle" fontSize="11" fill="#6866A7" fontWeight="900">STAIRS</text>
          <path d="M692 267H704" stroke="#B6CCE2" strokeWidth="8" />
          <path d="M692 319H704" stroke="#B6CCE2" strokeWidth="8" />

          {/* small wayfinding landmarks */}
          <g opacity=".88">
            <rect x="371" y="229" width="70" height="31" rx="10" fill="#FFFFFF" stroke="#D6E5F4" />
            <text x="406" y="249" textAnchor="middle" fontSize="9" fill="#6282A5" fontWeight="900">INFO DESK</text>
            <rect x="371" y="277" width="70" height="28" rx="9" fill="#FFFFFF" stroke="#D6E5F4" />
            <text x="406" y="295" textAnchor="middle" fontSize="9" fill="#6282A5" fontWeight="900">RESTROOM</text>
          </g>

          {/* safety + emergency signage (simulated demo positions) */}
          {SAFETY_SIGNS.filter((sign) => sign.floor === floor).map((sign) => {
            const width = sign.short.length > 3 ? 45 : sign.short.length > 2 ? 37 : 28;
            return <g key={sign.id}>
              <title>{sign.label} · simulated demo location</title>
              <rect x={sign.x - width / 2} y={sign.y - 12} width={width} height="24" rx="7" fill="#FFFFFF" stroke={sign.color} strokeWidth="2" />
              <circle cx={sign.x - width / 2 + 7} cy={sign.y} r="3.5" fill={sign.color} />
              <text x={sign.x + 4} y={sign.y + 3.5} textAnchor="middle" fontSize={sign.short.length > 4 ? "6.5" : "8"} fontWeight="900" fill={sign.color}>{sign.short}</text>
            </g>;
          })}

          {/* Rooms */}
          {rooms.map((room) => {
            const isSelected = room.id === selected.id;
            const labels = roomLines(room.name);
            const roomX = room.x + 3;
            const roomY = room.y + 2;
            const roomW = room.width - 18;
            const roomH = room.height - 8;
            return (
              <g
                key={room.id}
                tabIndex={0}
                role="button"
                aria-pressed={isSelected}
                aria-label={`Show route to ${room.name}, room ${room.code}`}
                onClick={() => onSelect(room)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(room);
                  }
                }}
                className="map-room cursor-pointer outline-none"
                filter={isSelected ? `url(#roomShadow-${floor})` : undefined}
              >
                <rect x={roomX} y={roomY} width={roomW} height={roomH} rx="18" fill={isSelected ? "#EEF5FF" : "#FFFFFF"} stroke={isSelected ? "#2F6FF1" : "#D8E5F2"} strokeWidth={isSelected ? "3" : "1.6"} />
                <rect x={roomX + 14} y={roomY + 14} width="45" height="45" rx="13" fill={`${room.color}1E`} />
                <circle cx={roomX + 36.5} cy={roomY + 36.5} r="10" fill={room.color} opacity=".88" />
                <path d={`M${roomX + 32} ${roomY + 36.5}h9M${roomX + 36.5} ${roomY + 32}v9`} stroke="#fff" strokeWidth="2.3" strokeLinecap="round" />
                <text x={roomX + 70} y={roomY + 31} fontSize="11" fill="#8499AF" fontWeight="900" letterSpacing="1.2">{room.code}</text>
                <text x={roomX + roomW - 15} y={roomY + 31} textAnchor="end" fontSize="9" fill={room.color} fontWeight="900">{isSelected ? "DESTINATION" : room.category.toUpperCase().slice(0, 14)}</text>
                {labels.map((line, index) => (
                  <text key={`${room.id}-${line}`} x={roomX + 17} y={roomY + 82 + index * 20} fontSize={labels.length > 1 ? 15 : 17} fill={isSelected ? "#1747A6" : "#284766"} fontWeight="900">{line}</text>
                ))}
                {isSelected && <circle cx={roomX + roomW - 18} cy={roomY + roomH - 18} r="8" fill="#2563EB"><animate attributeName="r" values="7;10;7" dur="1.7s" repeatCount="indefinite" /></circle>}
              </g>
            );
          })}

          {/* room doors */}
          {rooms.map((room) => {
            const x = room.x + (room.width - 18) / 2 + 3;
            const upper = room.y < 240;
            const y = upper ? room.y + room.height - 6 : room.y + 2;
            return <g key={`${room.id}-door`}>
              <rect x={x - 18} y={y - 5} width="36" height="10" fill="#FFFFFF" />
              <path d={`M${x - 14} ${y}h28`} stroke={room.id === selected.id ? "#2563EB" : "#A7BDD3"} strokeWidth="4" strokeLinecap="round" />
            </g>;
          })}

          {/* navigation route */}
          <path d={route.path} stroke="#60A5FA" strokeWidth="28" opacity=".20" fill="none" filter={`url(#routeGlow-${floor})`} />
          <path d={route.path} stroke="#FFFFFF" strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d={route.path} stroke="#2563EB" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="14 11" fill="none" className="route-motion" />
          <circle cx={route.startX} cy="253" r="18" fill="#2563EB" stroke="#FFFFFF" strokeWidth="6" />
          <circle cx={route.startX} cy="253" r="5" fill="#FFFFFF" />
          <circle cx={route.anchorX} cy={route.anchorY} r="12" fill="#2563EB" stroke="#FFFFFF" strokeWidth="5" />
          <circle cx={route.anchorX} cy={route.anchorY} r="4" fill="#FFFFFF" />

          <rect x="282" y="519" width="255" height="25" rx="12.5" fill="#FFFFFF" stroke="#E1EAF4" />
          <text x="410" y="535" textAnchor="middle" fontSize="9.5" letterSpacing="1.2" fontWeight="900" fill="#7E94AB">SIMULATED HOSPITAL · NOT TO SCALE</text>
        </svg>

        <div className="pointer-events-none absolute bottom-6 left-6 z-10 hidden items-center gap-3 rounded-2xl border border-white bg-white/95 px-3.5 py-2.5 text-[10px] font-extrabold text-slate-600 shadow-[0_8px_24px_rgba(38,77,120,.10)] sm:flex">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-blue-600" /> Route</span>
          <span className="h-3 w-px bg-slate-200" />
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Accessible lift</span>
          <span className="h-3 w-px bg-slate-200" />
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-red-500" /> Safety equipment</span>
          <span className="h-3 w-px bg-slate-200" />
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-green-600" /> Emergency exits</span>
        </div>
      </div>

      <div className="grid gap-3 border-t border-[#E6EEF7] bg-white px-4 py-4 sm:grid-cols-[1fr_auto] sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><MapPin size={19} /></span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-black text-[#1D3D61]">{selected.name}</p>
            <p className="mt-1 text-[10px] font-semibold text-slate-400">{selected.code} · {selected.category} · {floorNames[floor]}</p>
          </div>
        </div>
        <span className="self-center rounded-xl bg-[#F0F6FF] px-3 py-2 text-[10px] font-black text-blue-700">Route ready</span>
      </div>
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`surface-card ${className}`}>{children}</div>;
}

function EmergencyNumberCard({ number, title, note, copied, onCopy }: { number: "112" | "102" | "108"; title: string; note: string; copied: boolean; onCopy: () => void }) {
  return <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600"><Phone size={20}/></div>
      <div className="min-w-0 flex-1"><p className="text-[11px] font-black uppercase tracking-[.12em] text-slate-400">{title}</p><p className="mt-1 text-[30px] font-black tracking-[-.05em] text-[#7F1D1D]">{number}</p><p className="text-[10px] text-slate-500">{note}</p></div>
      <div className="flex gap-2">
        <button type="button" onClick={onCopy} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-black text-slate-600 hover:bg-slate-100">{copied ? "Copied" : "Copy"}</button>
        <a href={`tel:${number}`} className="rounded-xl bg-rose-600 px-3 py-2 text-[10px] font-black text-white hover:bg-rose-700">Open calling app</a>
      </div>
    </div>
  </div>;
}

function MiniStat({ title, value, note, Icon, tone = "blue" }: {
  title: string; value: string; note: string;
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  tone?: "blue" | "mint" | "peach" | "violet";
}) {
  return <Card className="p-5 sm:p-6">
    <div className="flex items-center justify-between">
      <span className={`mini-stat-icon mini-stat-${tone}`}><Icon size={20} strokeWidth={2.3} /></span>
      <ArrowUpRight size={15} className="text-slate-300" />
    </div>
    <p className="mt-5 text-xs font-semibold text-slate-500">{title}</p>
    <p className="mt-1 text-[29px] font-extrabold tracking-[-.05em] text-[#18314F]">{value}</p>
    <p className="mt-1 text-xs text-slate-400">{note}</p>
  </Card>;
}


function clientSaathiDemoReply(raw: string, lang: "English" | "Hindi" | "Kannada") {
  const q = raw.toLowerCase();
  let answer = "I can help with hospital navigation, OPD tokens, departments, common medical terms and visit preparation. For diagnosis or treatment, please speak with a qualified clinician.";
  if (/emergency|chest pain|cannot breathe|can't breathe|unconscious|severe bleeding|stroke/.test(q)) {
    answer = "This may be urgent. Do not wait in an OPD queue. Seek emergency care immediately and use the Emergency Help button for 112 / 102 / 108 options in India.";
  } else if (/cardiology|heart/.test(q)) {
    answer = "Cardiology is on the First Floor, room 1-103 in the simulated hospital. Open Find a Department and select Cardiology to see the route.";
  } else if (/pharmacy|medicine counter/.test(q)) {
    answer = "The demo Pharmacy is on the Ground Floor, room G-03. Open Find a Department and select Pharmacy to see the route.";
  } else if (/pediatric|paediatric|child/.test(q)) {
    answer = "Pediatrics is on the First Floor, room 1-102 in the simulated hospital.";
  } else if (/orthopedic|orthopaedic|bone|joint/.test(q)) {
    answer = "Orthopedics is on the First Floor, room 1-104 in the simulated hospital.";
  } else if (/radiology|x-ray|xray|ct|mri/.test(q)) {
    answer = "Radiology is on the Second Floor, room 2-201 in the simulated hospital. For a real hospital, confirm scan availability directly with that hospital.";
  } else if (/ecg|electrocardiogram/.test(q)) {
    answer = "An ECG records the heart's electrical activity using small electrodes placed on the skin. It is painless and commonly used to check heart rhythm and other cardiac clues.";
  } else if (/token|queue|wait/.test(q)) {
    answer = "Open My Visit & Token, enter a patient name, choose a department, and generate a demo token. The staff workspace can then call the next token.";
  } else if (/opd|prepare|appointment|visit/.test(q)) {
    answer = "For an OPD visit, keep your appointment details, identification, previous reports and medication list ready. Arrive early, register, collect your token, and use the navigation screen to find the department.";
  } else if (/where|department|navigate|floor/.test(q)) {
    answer = "Open Find a Department, search by department or room number, select it, then switch between the 3D and 2D maps. The route updates immediately.";
  }
  if (lang === "Hindi") return `डेमो मोड: ${answer}`;
  if (lang === "Kannada") return `ಡೆಮೊ ಮೋಡ್: ${answer}`;
  return `${answer}\n\nDemo mode — works without any API key.`;
}

export default function HomePage() {
  const [role, setRole] = useState<Role>("patient");
  const [account, setAccount] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginError, setLoginError] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountPicture, setAccountPicture] = useState("");
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [mapView, setMapView] = useState<"3d" | "2d">("3d");
  const [patientScreen, setPatientScreen] = useState<PatientScreen>("home");
  const [staffScreen, setStaffScreen] = useState<StaffScreen>("overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [floor, setFloor] = useState<FloorId>(0);
  const [selectedId, setSelectedId] = useState("reception");
  const [accessible, setAccessible] = useState(true);
  const [roomQuery, setRoomQuery] = useState("");
  const [largeText, setLargeText] = useState(false);
  const [queue, setQueue] = useState<QueueState>(INITIAL_QUEUE);
  const [hydrated, setHydrated] = useState(false);
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("general");
  const [myToken, setMyToken] = useState<number | null>(null);
  const [validation, setValidation] = useState("");
  const [lastCopied, setLastCopied] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([{
    role: "assistant",
    content: "Namaste! 👋 I'm Saathi, your hospital companion. I work in zero-key demo mode for navigation, OPD guidance and common healthcare explanations. If an OpenAI API key is added later, I can also answer open-ended questions.",
    kind: "system",
  }]);
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [aiStatus, setAiStatus] = useState<"checking" | "ready" | "demo">("demo");
  const [lang, setLang] = useState<"English" | "Hindi" | "Kannada">("English");
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [emergencyCopied, setEmergencyCopied] = useState<"112" | "102" | "108" | null>(null);
  const conversationEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadSavedState = window.setTimeout(() => {
      try {
        const savedAccount = sessionStorage.getItem("opd-saathi-demo-account");
        if (savedAccount) {
          setAccount(savedAccount);
          setRole(savedAccount.toLowerCase() === "staff@opdsaathi.demo" ? "staff" : "patient");
          setAccountName(sessionStorage.getItem("opd-saathi-account-name") || "");
          setAccountPicture(sessionStorage.getItem("opd-saathi-account-picture") || "");
        }

        const saved = localStorage.getItem(QUEUE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as QueueState;
          if (typeof parsed.serving === "number" && typeof parsed.next === "number" && Array.isArray(parsed.patients)) {
            setQueue(parsed);
          }
        }

        const previousToken = sessionStorage.getItem("opd-saathi-my-token");
        if (previousToken && Number.isFinite(Number(previousToken))) {
          setMyToken(Number(previousToken));
        }
      } catch {
        // Browser storage may be disabled. The demo still works in memory.
      } finally {
        setHydrated(true);
      }
    }, 0);

    const onStorage = (event: StorageEvent) => {
      if (event.key === QUEUE_KEY && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue) as QueueState;
          if (typeof parsed.serving === "number" && typeof parsed.next === "number" && Array.isArray(parsed.patients)) {
            setQueue(parsed);
          }
        } catch {
          // Ignore malformed demo storage.
        }
      }
    };

    window.addEventListener("storage", onStorage);
    return () => {
      window.clearTimeout(loadSavedState);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(QUEUE_KEY, JSON.stringify(queue)); } catch { /* storage optional */ }
  }, [queue, hydrated]);

  useEffect(() => {
    fetch("/api/chat", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setAiStatus(data.configured ? "ready" : "demo"))
      .catch(() => setAiStatus("demo"));
  }, []);

  useEffect(() => {
    if (myToken === null) return;
    try { sessionStorage.setItem("opd-saathi-my-token", String(myToken)); } catch { /* ignore */ }
  }, [myToken]);

  useEffect(() => {
    if (patientScreen === "assistant") conversationEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chatMessages, patientScreen]);

  const selectedRoom = getRoom(selectedId);
  const myWait = myToken !== null ? Math.max(0, (myToken - queue.serving - 1) * 4) : null;
  const awaiting = Math.max(0, queue.next - queue.serving - 1);
  const navItems = role === "patient" ? patientNav : staffNav;
  const activeScreen = role === "patient" ? patientScreen : staffScreen;
  const matchingRooms = ROOMS.filter((room) => `${room.name} ${room.code} ${room.category}`.toLowerCase().includes(roomQuery.toLowerCase()));

  async function copyText(text: string) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      const field = document.createElement("textarea");
      field.value = text;
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.focus();
      field.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(field);
      return ok;
    } catch {
      return false;
    }
  }

  function copyEmergencyNumber(number: "112" | "102" | "108") {
    void copyText(number).then((ok) => {
      if (ok) {
        setEmergencyCopied(number);
        window.setTimeout(() => setEmergencyCopied(null), 1600);
      } else {
        window.prompt("Copy this emergency number:", number);
      }
    });
  }

  function goTo(screen: PatientScreen) {
    setPatientScreen(screen);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function signIn(email: string, displayName = "", picture = "") {
    const clean = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      setLoginError("Enter a valid email address.");
      return;
    }
    const staffEmails = (process.env.NEXT_PUBLIC_STAFF_EMAILS || "staff@opdsaathi.demo")
      .split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
    const userRole: Role = staffEmails.includes(clean) ? "staff" : "patient";
    setAccount(clean);
    setAccountName(displayName);
    setAccountPicture(picture);
    setRole(userRole);
    setStaffScreen("overview");
    setPatientScreen("home");
    setLoginError("");
    try {
      sessionStorage.setItem("opd-saathi-demo-account", clean);
      if (displayName) sessionStorage.setItem("opd-saathi-account-name", displayName);
      else sessionStorage.removeItem("opd-saathi-account-name");
      if (picture) sessionStorage.setItem("opd-saathi-account-picture", picture);
      else sessionStorage.removeItem("opd-saathi-account-picture");
    } catch { /* storage optional */ }
  }
  function signOut() {
    setAccount(null);
    setRole("patient");
    setLoginEmail("");
    setAccountName("");
    setAccountPicture("");
    setMenuOpen(false);
    try {
      sessionStorage.removeItem("opd-saathi-demo-account");
      sessionStorage.removeItem("opd-saathi-account-name");
      sessionStorage.removeItem("opd-saathi-account-picture");
    } catch { /* storage optional */ }
  }
  function selectRoom(room: Room) {
    setSelectedId(room.id);
    setFloor(room.floor);
  }
  function onFloorChange(newFloor: FloorId) {
    setFloor(newFloor);
    const first = ROOMS.find((room) => room.floor === newFloor);
    if (first) setSelectedId(first.id);
  }
  function register() {
    if (!name.trim() || name.trim().length < 2) {
      setValidation("Please enter a name with at least 2 characters.");
      return;
    }
    if (myToken !== null && myToken > queue.serving) {
      setValidation("You already have an active demo token. Use the existing token below.");
      return;
    }
    const newId = queue.next;
    const chosen = getRoom(department);
    setQueue((previous) => ({
      ...previous,
      next: previous.next + 1,
      patients: [...previous.patients, {
        id: newId,
        name: name.trim().slice(0, 50),
        department: chosen.name,
        createdAt: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
      }],
    }));
    setMyToken(newId);
    setValidation("");
  }
  function nextPatient() {
    setQueue((previous) => ({ ...previous, serving: Math.min(previous.serving + 1, previous.next - 1) }));
  }
  function resetDemo() {
    if (!window.confirm("Reset the fictional demo queue to its original sample data?")) return;
    setQueue(INITIAL_QUEUE);
    setMyToken(null);
    try { sessionStorage.removeItem("opd-saathi-my-token"); } catch { /* ignore */ }
  }
  async function sendChat(question = chatInput) {
    const message = question.trim();
    if (!message || chatBusy) return;
    const updated: ChatMessage[] = [...chatMessages, { role: "user", content: message }];
    setChatMessages(updated);
    setChatInput("");
    setChatBusy(true);

    // In zero-key mode answer instantly in the browser. This keeps the demo usable
    // even if an API route or external provider is unavailable during judging.
    if (aiStatus === "demo") {
      setChatMessages((previous) => [...previous, { role: "assistant", content: clientSaathiDemoReply(message, lang) }]);
      setChatBusy(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 8_000);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updated.filter((item) => item.kind !== "system").slice(-12).map((item) => ({
            role: item.role,
            content: item.role === "user" && item === updated[updated.length - 1] ? `Please answer in ${lang}. ${item.content}` : item.content,
          })),
        }),
        signal: controller.signal,
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || typeof json.reply !== "string") {
        setAiStatus("demo");
        setChatMessages((previous) => [...previous, { role: "assistant", content: clientSaathiDemoReply(message, lang) }]);
      } else {
        setAiStatus(json.demoMode ? "demo" : "ready");
        setChatMessages((previous) => [...previous, { role: "assistant", content: json.reply }]);
      }
    } catch {
      setAiStatus("demo");
      setChatMessages((previous) => [...previous, { role: "assistant", content: clientSaathiDemoReply(message, lang) }]);
    } finally {
      window.clearTimeout(timer);
      setChatBusy(false);
    }
  }

  function copyToken() {
    if (myToken === null) return;
    const text = tokenNumber(myToken);
    void copyText(text).then((ok) => {
      if (ok) {
        setLastCopied(true);
        setTimeout(() => setLastCopied(false), 1600);
      } else {
        window.prompt("Copy your token:", text);
      }
    });
  }
  function speakDirections() {
    if (typeof window === "undefined") return;
    try {
      const route = routeForRoom(selectedRoom, accessible);
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(route.steps.join(" "));
      utterance.rate = 0.93;
      window.speechSynthesis.speak(utterance);
    } catch {
      window.alert("Voice guidance is not supported by this browser. The written route remains available below the map.");
    }
  }

  function Wayfinding({ compact = false }: { compact?: boolean }) {
    const steps = routeForRoom(selectedRoom, accessible).steps;
    return <Card className={compact ? "overflow-hidden p-4 sm:p-6" : "overflow-hidden p-5 sm:p-7"}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="eyebrow mb-2"><Navigation2 size={14} /> SMART WAYFINDING</div>
          <h2 className="section-title">Your route, before you even ask.</h2>
          <p className="mt-2 max-w-xl text-[13px] leading-6 text-slate-500">Choose a floor, tap a department and follow a clear visual route designed for fast scanning and accessible journeys.</p>
        </div>
        <span className="tag tag-mint"><span className="tiny-dot bg-emerald-500" /> Route engine active</span>
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E2EBF5] bg-[#F8FBFF] p-2.5">
        <div className="flex flex-wrap gap-2">
          {([0, 1, 2, 3] as FloorId[]).map((f) => <button
            type="button" key={f}
            onClick={() => onFloorChange(f)}
            className={`floor-tab ${floor === f ? "floor-tab-active" : ""}`}
          ><span className="mr-1.5 opacity-60">{f === 0 ? "G" : f}</span>{f === 0 ? "Ground" : `Floor ${f}`}</button>)}
        </div>
        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-transparent bg-white px-3 py-2 text-[11px] font-extrabold text-slate-600 shadow-sm">
          <input type="checkbox" checked={accessible} onChange={(event) => setAccessible(event.target.checked)} className="accent-blue-600" />
          <Accessibility size={16} className="text-blue-600" /> Accessible route
        </label>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-[#E2EBF5] bg-white p-2">
        <div className="flex items-center gap-2 text-[10px] font-black text-slate-500"><Layers3 size={15} className="text-blue-600"/> Map experience</div>
        <div className="flex rounded-xl bg-[#F2F6FB] p-1">
          <button type="button" onClick={() => setMapView("3d")} className={`map-view-toggle ${mapView === "3d" ? "map-view-toggle-active" : ""}`}>3D navigator</button>
          <button type="button" onClick={() => setMapView("2d")} className={`map-view-toggle ${mapView === "2d" ? "map-view-toggle-active" : ""}`}>2D floor plan</button>
        </div>
      </div>

      {mapView === "3d"
        ? <Indoor3DMap floor={floor} selectedId={selectedId} onSelect={selectRoom} accessible={accessible} onFloorChange={onFloorChange} />
        : <FloorPlan floor={floor} selectedId={selectedId} onSelect={selectRoom} accessible={accessible} />}

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_220px]">
        <div className="route-summary-card rounded-[22px] border border-blue-100 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-black text-[#1D4ED8]"><LocateFixed size={18} /> Route to {selectedRoom.name}</div>
            <span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-black text-blue-700 shadow-sm">{selectedRoom.code}</span>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-500">
            <span className="route-chip">Entrance</span><ChevronRight size={13} />
            {floor > 0 && <><span className="route-chip">{accessible ? "Accessible lift" : "Lift / stairs"}</span><ChevronRight size={13} /></>}
            <span className="route-chip route-chip-active">{selectedRoom.name}</span>
          </div>
          {!compact && <ol className="mt-5 grid gap-2.5 sm:grid-cols-2">
            {steps.map((step, index) => <li key={step} className="flex items-start gap-2.5 rounded-xl border border-white bg-white/75 p-3 text-[11px] leading-5 text-slate-600"><span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-[10px] font-black text-white">{index + 1}</span>{step}</li>)}
          </ol>}
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          <button type="button" onClick={speakDirections} className="map-action-btn"><Volume2 size={17} /><span><b>Speak route</b><small>Voice guidance</small></span></button>
          <button type="button" onClick={() => goTo("assistant")} className="map-action-btn"><Bot size={17} /><span><b>Ask Saathi</b><small>Need help?</small></span></button>
        </div>
      </div>
      <p className="mt-4 text-[10px] leading-5 text-slate-400">Illustrative floor plan only. In a real facility, follow verified hospital signage and staff instructions.</p>
    </Card>;
  }

  function VisitPanel({ compact = false }: { compact?: boolean }) {
    return <Card className="p-5 sm:p-7">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <div className="eyebrow mb-2"><Ticket size={14} /> OPD REGISTRATION</div>
          <h2 className="section-title">Your visit, simplified.</h2>
          <p className="mt-2 text-[13px] text-slate-500">Join the demonstration queue in seconds.</p>
        </div>
        <span className="mini-stat-icon mini-stat-mint"><ClipboardList size={21} /></span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="form-label">Patient name <span className="text-rose-500">*</span></span>
          <input className="form-input" value={name} maxLength={50} onChange={(event) => setName(event.target.value)} placeholder="e.g. Demo visitor" />
        </label>
        <label className="block">
          <span className="form-label">Choose department</span>
          <select className="form-input" value={department} onChange={(event) => setDepartment(event.target.value)}>
            {ROOMS.filter((room) => room.floor === 1).map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}
          </select>
        </label>
      </div>
      {validation && <p className="mt-3 text-xs font-semibold text-rose-600" role="alert">{validation}</p>}
      <button type="button" onClick={register} className="primary-btn mt-4 w-full sm:w-auto"><Plus size={17} /> Generate my token <ArrowRight size={16} /></button>

      {myToken !== null && <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-5 rounded-[22px] border border-emerald-200 bg-gradient-to-br from-[#ECFFF7] to-[#F5FCFF] p-5">
        <div className="mb-2 flex items-center gap-2 text-xs font-extrabold text-emerald-700"><CheckCircle2 size={16} /> YOUR DEMO TOKEN IS READY</div>
        <div className="flex items-end justify-between gap-3">
          <div><p className="text-4xl font-black tracking-[-.07em] text-[#16664C]">{tokenNumber(myToken)}</p><p className="mt-2 text-xs text-emerald-800">{myToken <= queue.serving ? "Your number has been called" : `About ${myWait} min until your turn · estimate`}</p></div>
          <button type="button" onClick={copyToken} className="rounded-xl border border-emerald-200 bg-white p-3 text-emerald-700" aria-label="Copy token">{lastCopied ? <Check size={18} /> : <Copy size={18} />}</button>
        </div>
      </motion.div>}
      <div className={`mt-5 grid grid-cols-2 gap-3 ${compact ? "" : "sm:grid-cols-3"}`}>
        <div className="rounded-2xl bg-slate-50 p-4"><p className="text-[11px] font-bold text-slate-500">Now serving</p><p className="mt-1 text-2xl font-black text-[#1C3B5F]">{tokenNumber(queue.serving)}</p></div>
        <div className="rounded-2xl bg-slate-50 p-4"><p className="text-[11px] font-bold text-slate-500">Ahead in queue</p><p className="mt-1 text-2xl font-black text-[#1C3B5F]">{myToken !== null ? Math.max(0, myToken - queue.serving - 1) : awaiting}</p></div>
        {!compact && <div className="col-span-2 rounded-2xl bg-slate-50 p-4 sm:col-span-1"><p className="text-[11px] font-bold text-slate-500">Queue type</p><p className="mt-2 text-sm font-black text-[#1C3B5F]">General demo</p></div>}
      </div>
      <p className="mt-4 text-[11px] leading-5 text-slate-400">Simulation only. Token data is stored in this browser, shared between its open tabs, and is not connected to a hospital.</p>
    </Card>;
  }

  function ChatPanel({ compact = false }: { compact?: boolean }) {
    return <Card className={`flex flex-col overflow-hidden ${compact ? "min-h-[440px]" : "min-h-[620px]"}`}>
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-7">
        <div className="flex items-center gap-3">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4388F3] to-[#6D5BF6] text-white shadow-md shadow-blue-100"><Sparkles size={24} /><span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-400" /></div>
          <div><h2 className="text-[17px] font-black tracking-tight text-[#1B3658]">Ask Saathi AI</h2><p className="text-[11px] font-medium text-slate-500">Your multilingual companion</p></div>
        </div>
        <span className={`tag ${aiStatus === "ready" ? "tag-mint" : "tag-blue"}`}><span className={`tiny-dot ${aiStatus === "ready" ? "bg-emerald-500" : "bg-blue-400"}`} />{aiStatus === "ready" ? "AI connected" : aiStatus === "demo" ? "Zero-key demo" : "Checking"}</span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-[#FBFDFF] px-5 py-3 sm:px-7">
        <span className="flex items-center gap-2 text-[11px] font-bold text-slate-500"><Languages size={15} /> Reply language</span>
        <div className="flex flex-wrap gap-1">
          {(["English", "Hindi", "Kannada"] as const).map((item) => <button key={item} type="button" onClick={() => setLang(item)} className={`rounded-lg px-3 py-1.5 text-[11px] font-bold ${lang === item ? "bg-blue-100 text-blue-700" : "text-slate-400 hover:bg-slate-100"}`}>{item}</button>)}
        </div>
      </div>
      <div className={`chat-scroll flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-7 ${compact ? "max-h-[330px]" : "max-h-[455px]"}`}>
        {chatMessages.map((msg, index) => <div key={`${index}-${msg.role}`} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
          {msg.role === "assistant" && <div className="mr-2 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Bot size={18} /></div>}
          <div className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-[13px] leading-6 ${msg.role === "user" ? "rounded-br-md bg-blue-600 text-white" : msg.kind === "system" ? "rounded-bl-md bg-[#F1F6FF] text-slate-600" : "rounded-bl-md bg-[#EAF2FF] text-slate-700"}`}>
            {msg.content}
          </div>
        </div>)}
        {chatBusy && <div className="flex items-center gap-2 text-xs text-slate-500"><span className="loading-dots">● ● ●</span> Saathi is thinking...</div>}
        <div ref={conversationEnd} />
      </div>
      {chatMessages.length <= 1 && <div className="flex flex-wrap gap-2 px-5 pb-4 sm:px-7">
        {["What is an ECG?", "Where is cardiology?", "How can I prepare for an OPD visit?"].map((prompt) => <button type="button" key={prompt} onClick={() => sendChat(prompt)} disabled={chatBusy} className="rounded-full border border-slate-200 px-3 py-2 text-[11px] font-semibold text-slate-600 hover:border-blue-200 hover:bg-blue-50">{prompt}</button>)}
      </div>}
      <form className="border-t border-slate-100 p-4 sm:p-5" onSubmit={(event) => { event.preventDefault(); sendChat(); }}>
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-[#FBFDFF] px-3 py-2 focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-50">
          <input type="text" maxLength={3000} className="min-w-0 flex-1 bg-transparent px-2 py-2 text-[13px] text-[#213C5D] outline-none placeholder:text-slate-400" placeholder="Ask me anything..." value={chatInput} onChange={(event) => setChatInput(event.target.value)} aria-label="Ask Saathi" />
          <button disabled={chatBusy || !chatInput.trim()} type="submit" aria-label="Send message" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-700 disabled:opacity-40"><ArrowUpRight size={20} /></button>
        </div>
        <p className="mt-2 text-center text-[10px] text-slate-400">AI responses may be inaccurate. Do not share personal health records or rely on chat for emergencies.</p>
      </form>
    </Card>;
  }

  function StaffPanel({ onlyQueue = false }: { onlyQueue?: boolean }) {
    const waitingPatients = queue.patients.filter((patient) => patient.id > queue.serving);
    return <div className="space-y-5">
      {!onlyQueue && <div className="grid gap-4 sm:grid-cols-3">
        <MiniStat title="Now serving" value={tokenNumber(queue.serving)} note="General OPD demo" Icon={Ticket} tone="blue" />
        <MiniStat title="Patients waiting" value={String(awaiting)} note="Synthetic queue" Icon={Users} tone="violet" />
        <MiniStat title="Est. wait / patient" value="4 min" note="Illustrative assumption" Icon={Clock3} tone="mint" />
      </div>}
      <div className="grid gap-5 xl:grid-cols-[.85fr_1.15fr]">
        <Card className="p-6 sm:p-7">
          <div className="eyebrow"><Activity size={14} /> STAFF CONSOLE · DEMO ONLY</div>
          <h2 className="section-title mt-2">Call the next patient.</h2>
          <div className="mt-6 rounded-[22px] bg-gradient-to-br from-[#245FEB] to-[#6993F7] p-7 text-white shadow-lg shadow-blue-100">
            <p className="text-[11px] font-extrabold tracking-[.16em] text-blue-100">CURRENT TOKEN</p>
            <p className="mt-3 text-6xl font-black tracking-[-.08em]">{tokenNumber(queue.serving)}</p>
            <p className="mt-4 text-xs text-blue-100">Next: {queue.serving < queue.next - 1 ? tokenNumber(queue.serving + 1) : "No patients waiting"}</p>
          </div>
          <button type="button" onClick={nextPatient} disabled={queue.serving >= queue.next - 1} className="primary-btn mt-5 w-full justify-center disabled:opacity-50"><Bell size={18} /> Call next token <ArrowRight size={17} /></button>
          <button type="button" onClick={resetDemo} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-[12px] font-bold text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"><RotateCcw size={14} /> Reset demo queue</button>
        </Card>
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
            <div><h3 className="text-lg font-extrabold text-[#1B3658]">Patient queue</h3><p className="mt-1 text-xs text-slate-400">Synthetic records · browser-local demo</p></div>
            <span className="tag tag-blue">{waitingPatients.length} listed</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[450px] text-left">
              <thead className="bg-[#F8FBFF] text-[10px] font-bold uppercase tracking-widest text-slate-400"><tr><th className="px-6 py-4">Token</th><th className="px-4 py-4">Patient</th><th className="px-4 py-4">Department</th><th className="px-5 py-4">Status</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {waitingPatients.length ? waitingPatients.map((patient) => <tr key={patient.id} className="text-xs"><td className="px-6 py-4 font-black text-blue-700">{tokenNumber(patient.id)}</td><td className="px-4 py-4 font-semibold text-slate-600">{patient.name}</td><td className="px-4 py-4 text-slate-500">{patient.department}</td><td className="px-5 py-4"><span className="rounded-full bg-amber-50 px-2.5 py-1.5 font-bold text-amber-700">Waiting</span></td></tr>) : <tr><td colSpan={4} className="p-8 text-center text-sm text-slate-400">No patients waiting in the demo queue.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-100 px-6 py-4 text-[11px] leading-5 text-slate-400">For a real hospital, staff access requires authentication, patient consent, access controls and a secure database.</div>
        </Card>
      </div>
    </div>;
  }

  const headline = role === "staff"
    ? staffScreen === "overview" ? "Command center" : "Queue management"
    : ({ home: "A better way to care.", nearby: "Find real care near you.", verified: "Verified hospital maps.", navigate: "Find your way.", visit: "Your hospital visit.", assistant: "Meet your AI companion." } as const)[patientScreen];

  if (!account) {
    return <main className="login-backdrop min-h-screen overflow-hidden">
      <div className="login-grid-bg" />
      <div className="login-orb login-orb-a" /><div className="login-orb login-orb-b" />
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1500px] flex-col px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between gap-4 py-2">
          <div className="flex items-center gap-3">
            <span className="brand-mark"><HeartPulse size={25} /></span>
            <div><p className="text-[20px] font-black tracking-[-.05em] text-[#15365B]">OPD<span className="text-blue-600">Saathi</span></p><p className="text-[9px] font-black uppercase tracking-[.24em] text-[#7396B8]">AI · CARE REIMAGINED</p></div>
          </div>
          <div className="hidden items-center gap-3 sm:flex">
            <span className="login-status"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Hackathon prototype</span>
            <span className="login-status"><Accessibility size={14} /> Accessibility-first</span>
          </div>
        </header>

        <div className="grid flex-1 items-center gap-8 py-8 lg:grid-cols-[1.08fr_.92fr] lg:gap-14 xl:gap-20">
          <section className="relative">
            <div className="max-w-[690px]">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/75 px-4 py-2 text-[10px] font-black uppercase tracking-[.15em] text-blue-700 shadow-sm backdrop-blur"><Sparkles size={14} /> One hospital journey. Zero confusion.</div>
              <h1 className="login-display text-[#12375D]">Healthcare that<br/><span>guides you.</span></h1>
              <p className="mt-6 max-w-[570px] text-[15px] leading-8 text-[#54728F]">OPD Saathi combines accessible indoor navigation, live queue awareness and multilingual AI help into one calm patient experience.</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <span className="feature-pill"><LocateFixed size={16} /> Nearest real hospital</span>
                <span className="feature-pill"><Navigation2 size={16} /> Floor-by-floor routes</span>
                <span className="feature-pill"><Ticket size={16} /> Smart OPD tokens</span>
                <span className="feature-pill"><Sparkles size={16} /> AI assistance</span>
              </div>
            </div>

            <div className="login-product-preview relative mt-10 max-w-[760px] overflow-hidden rounded-[30px] border border-white/90 bg-white/75 p-4 shadow-[0_28px_80px_rgba(40,91,151,.14)] backdrop-blur-xl sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white"><Navigation2 size={18} /></span><div><p className="text-[12px] font-black text-[#214466]">Your hospital journey</p><p className="mt-1 text-[10px] font-semibold text-slate-400">Entrance → Cardiology · Floor 1</p></div></div>
                <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[9px] font-black text-emerald-700">ROUTE READY</span>
              </div>
              <div className="preview-map relative h-[205px] overflow-hidden rounded-[22px] border border-[#DCE9F6] bg-[#F4F9FF]">
                <div className="absolute left-[7%] top-[40%] h-[45px] w-[86%] rounded-2xl bg-[#E4EDF7]" />
                <div className="absolute left-[9%] top-[25%] h-[58px] w-[25%] rounded-2xl border border-[#D3E2F2] bg-white shadow-sm" />
                <div className="absolute right-[9%] top-[25%] h-[58px] w-[25%] rounded-2xl border-2 border-blue-400 bg-[#EDF5FF] shadow-sm" />
                <div className="absolute bottom-[16%] left-[9%] h-[58px] w-[25%] rounded-2xl border border-[#D3E2F2] bg-white shadow-sm" />
                <div className="absolute bottom-[16%] right-[9%] h-[58px] w-[25%] rounded-2xl border border-[#D3E2F2] bg-white shadow-sm" />
                <div className="absolute left-[4%] top-[43%] flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow-[0_0_0_7px_rgba(37,99,235,.12)]"><LocateFixed size={16} /></div>
                <div className="preview-route absolute left-[9%] top-[49%] h-[4px] w-[66%] rounded-full bg-blue-500" />
                <div className="absolute right-[20%] top-[31%] h-3 w-3 rounded-full bg-blue-600 shadow-[0_0_0_5px_rgba(37,99,235,.14)]" />
                <span className="absolute left-[12%] top-[31%] text-[9px] font-black text-slate-500">RECEPTION</span>
                <span className="absolute right-[12%] top-[31%] text-[9px] font-black text-blue-700">CARDIOLOGY</span>
                <div className="absolute bottom-3 left-3 rounded-xl border border-white bg-white/90 px-3 py-2 text-[9px] font-black text-slate-500 shadow-sm">2 min · accessible route</div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="preview-stat"><span className="text-blue-600"><Layers3 size={16} /></span><b>4 floors</b><small>Wayfinding</small></div>
                <div className="preview-stat"><span className="text-emerald-600"><Ticket size={16} /></span><b>A038</b><small>Now serving</small></div>
                <div className="preview-stat"><span className="text-violet-600"><Bot size={16} /></span><b>Saathi AI</b><small>3 languages</small></div>
              </div>
            </div>
          </section>

          <section className="login-card mx-auto w-full max-w-[520px] rounded-[32px] border border-white bg-white/90 p-6 shadow-[0_30px_100px_rgba(34,77,129,.16)] backdrop-blur-xl sm:p-9 xl:p-10">
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-[19px] bg-gradient-to-br from-[#E7F2FF] to-[#EEF8FF] text-blue-600 shadow-inner"><UserRound size={26}/></div>
              <span className="rounded-full border border-slate-100 bg-slate-50 px-3 py-2 text-[9px] font-black uppercase tracking-[.12em] text-slate-400">Demo access</span>
            </div>
            <p className="eyebrow mb-3 mt-8">WELCOME TO OPD SAATHI</p>
            <h2 className="text-[34px] font-black leading-tight tracking-[-.055em] text-[#17395F] sm:text-[40px]">Enter the experience.</h2>
            <p className="mt-3 text-[13px] leading-6 text-slate-500">Start instantly with the zero-key patient or staff demo below. Google sign-in is optional and only appears as an upgrade when configured.</p>

            <div className="mt-7 grid grid-cols-2 rounded-2xl bg-[#F1F6FC] p-1">
              <button type="button" onClick={() => setAuthMode("signin")} className={`auth-mode-tab ${authMode === "signin" ? "auth-mode-tab-active" : ""}`}>Sign in</button>
              <button type="button" onClick={() => setAuthMode("signup")} className={`auth-mode-tab ${authMode === "signup" ? "auth-mode-tab-active" : ""}`}>Create account</button>
            </div>

            <div className="mt-5 rounded-[20px] border border-[#E1EAF4] bg-white p-4">
              <p className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[.12em] text-slate-400"><ShieldCheck size={14} className="text-blue-600"/> {authMode === "signup" ? "Sign up with Google" : "Sign in with Google"}</p>
              <GoogleSignInButton
                onSuccess={(user) => signIn(user.email, user.name || "", user.picture || "")}
                onError={(message) => setLoginError(message)}
              />
            </div>

            <div className="my-6 flex items-center gap-3"><span className="h-px flex-1 bg-slate-100"/><span className="text-[9px] font-black uppercase tracking-[.16em] text-slate-400">zero-key email demo</span><span className="h-px flex-1 bg-slate-100"/></div>

            <form onSubmit={(event)=>{event.preventDefault(); signIn(loginEmail);}}>
              <label htmlFor="demoEmail" className="form-label">Demo email address</label>
              <div className="login-input-wrap"><UserRound size={17} className="text-slate-400"/><input id="demoEmail" type="email" required className="min-w-0 flex-1 bg-transparent py-3 text-[13px] font-semibold text-[#294563] outline-none placeholder:text-slate-400" placeholder="you@example.com" autoComplete="email" value={loginEmail} onChange={(event)=>setLoginEmail(event.target.value)}/></div>
              {loginError && <p role="alert" className="mt-2 text-xs font-semibold text-rose-600">{loginError}</p>}
              <button type="submit" className="primary-btn mt-4 w-full justify-center !rounded-[15px] !py-4">{authMode === "signup" ? "Create demo account" : "Continue with demo email"} <ArrowRight size={18}/></button>
            </form>

            <div className="my-6 flex items-center gap-3"><span className="h-px flex-1 bg-slate-100"/><span className="text-[9px] font-black uppercase tracking-[.16em] text-slate-400">recommended — one tap, no keys</span><span className="h-px flex-1 bg-slate-100"/></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={()=>signIn("patient@example.com")} className="role-demo-card role-demo-patient"><span className="role-demo-icon"><HeartHandshake size={20}/></span><span><b>Patient</b><small>Explore the journey</small></span><ChevronRight size={16} className="ml-auto"/></button>
              <button type="button" onClick={()=>signIn("staff@opdsaathi.demo")} className="role-demo-card role-demo-staff"><span className="role-demo-icon"><Stethoscope size={20}/></span><span><b>Staff</b><small>Manage the queue</small></span><ChevronRight size={16} className="ml-auto"/></button>
            </div>

            <div className="mt-7 rounded-2xl border border-[#E6EEF7] bg-[#F8FBFF] p-4">
              <div className="flex items-start gap-3"><ShieldCheck size={18} className="mt-0.5 shrink-0 text-emerald-600"/><div><p className="text-[11px] font-black text-[#294A6B]">Safe hackathon demo</p><p className="mt-1 text-[10px] leading-5 text-slate-400">Patient and staff demo access works with no API keys. Google Sign-In is optional. Demo queue data stays in this browser and is not real patient data.</p></div></div>
            </div>
          </section>
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-3 pb-2 text-[10px] font-semibold text-slate-400"><span>OPD Saathi AI · 2026 hackathon prototype</span><span>Accessible · Multilingual · Patient-first</span></footer>
      </div>
    </main>;
  }

  return <div className={`app-shell ${largeText ? "large-type" : ""}`}>
    <AnimatePresence>
      {emergencyOpen && role === "patient" && <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[90] flex items-center justify-center bg-[#07111F]/60 p-4 backdrop-blur-sm"
        role="dialog" aria-modal="true" aria-label="Emergency help"
      >
        <motion.div initial={{ y: 20, scale: .98 }} animate={{ y: 0, scale: 1 }} exit={{ y: 12, scale: .98 }} className="w-full max-w-[560px] overflow-hidden rounded-[30px] border border-rose-100 bg-white shadow-[0_35px_110px_rgba(88,18,32,.28)]">
          <div className="bg-gradient-to-r from-[#B91C1C] via-[#DC2626] to-[#F43F5E] px-6 py-6 text-white sm:px-7">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15"><Ambulance size={25}/></span>
              <div className="min-w-0 flex-1"><p className="text-[11px] font-black uppercase tracking-[.18em] text-rose-100">Emergency help</p><h2 className="mt-1 text-[26px] font-black tracking-[-.04em]">Call an ambulance</h2><p className="mt-2 text-[12px] leading-5 text-rose-50">On a laptop, direct calling depends on whether Windows Phone Link or another calling app is configured. Use your phone if a call does not open.</p></div>
              <button type="button" onClick={() => setEmergencyOpen(false)} className="rounded-xl bg-white/10 p-2 text-white hover:bg-white/20" aria-label="Close emergency help"><X size={19}/></button>
            </div>
          </div>

          <div className="space-y-4 p-5 sm:p-7">
            <EmergencyNumberCard
              number="112" title="Emergency services" note="India's integrated emergency number"
              copied={emergencyCopied === "112"}
              onCopy={() => copyEmergencyNumber("112")}
            />
            <EmergencyNumberCard
              number="102" title="Ambulance service" note="National Ambulance Service number"
              copied={emergencyCopied === "102"}
              onCopy={() => copyEmergencyNumber("102")}
            />
            <EmergencyNumberCard
              number="108" title="Karnataka Arogya Kavacha" note="24×7 emergency ambulance service across Karnataka"
              copied={emergencyCopied === "108"}
              onCopy={() => copyEmergencyNumber("108")}
            />

            <button type="button" onClick={() => { try { sessionStorage.setItem("opd-saathi-care-need", "emergency"); } catch { /* optional */ } setEmergencyOpen(false); goTo("nearby"); }} className="flex w-full items-center justify-between rounded-2xl border border-rose-100 bg-[#FFF7F7] px-4 py-4 text-left transition hover:border-rose-200 hover:bg-rose-50">
              <span className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600"><LocateFixed size={18}/></span><span><b className="block text-[13px] text-rose-800">Find nearest emergency hospital</b><small className="mt-1 block text-[10px] text-rose-500">Uses the real hospital-location feature</small></span></span>
              <ChevronRight size={17} className="text-rose-400"/>
            </button>

            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-[11px] leading-5 text-amber-800">
              <b>For an immediate life-threatening emergency:</b> use a phone to call emergency services now. OPD Saathi is not an emergency dispatch system.
            </div>
          </div>
        </motion.div>
      </motion.div>}
    </AnimatePresence>

    <div className="app-layout">
      {menuOpen && <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close navigation" className="fixed inset-0 z-30 bg-[#0F2745]/30 lg:hidden" />}
      <aside className={`app-sidebar ${menuOpen ? "app-sidebar-open" : ""}`}>
        <div className="flex items-center gap-3 px-2 pb-9">
          <div className="brand-mark"><HeartPulse size={28} strokeWidth={2.3} /></div>
          <div><p className="text-[22px] font-black tracking-[-.065em] text-[#173A5D]">OPD<span className="text-blue-600">Saathi</span></p><p className="text-[10px] font-extrabold uppercase tracking-[.26em] text-[#75A0C6]">CARE, REIMAGINED</p></div>
          <button type="button" onClick={() => setMenuOpen(false)} className="ml-auto rounded-lg p-2 text-slate-500 lg:hidden" aria-label="Close menu"><X size={19} /></button>
        </div>
        <div className="account-card mb-9">
          <div className="flex items-center gap-3">
            {accountPicture ? <span aria-label="Google profile" className="h-10 w-10 rounded-2xl border border-white bg-cover bg-center shadow-sm" style={{ backgroundImage: `url(${accountPicture})` }} /> : <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm">{role === "staff" ? <Stethoscope size={17}/> : <UserRound size={17}/>}</span>}
            <div className="min-w-0"><span className="inline-flex items-center gap-2 text-[10px] font-black text-blue-700">{role === "staff" ? "STAFF WORKSPACE" : "PATIENT WORKSPACE"}</span>{accountName && <p className="mt-1 truncate text-[11px] font-black text-[#294A6B]">{accountName}</p>}</div>
          </div>
          <p className="mt-2 break-all text-[10px] text-slate-500">{account}</p>
          <button type="button" onClick={signOut} className="mt-3 text-[11px] font-extrabold text-blue-600 hover:underline">Switch account →</button>
        </div>
        <p className="sidebar-heading">{role === "patient" ? "YOUR SPACE" : "STAFF WORKSPACE"}</p>
        <nav className="space-y-1.5" aria-label="Main navigation">
          {navItems.map((item) => <button key={item.id} type="button"
            onClick={() => { if (role === "patient") goTo(item.id as PatientScreen); else { setStaffScreen(item.id as StaffScreen); setMenuOpen(false); } }}
            className={`sidebar-link ${activeScreen === item.id ? "sidebar-link-active" : ""}`}>
            <item.Icon size={18} strokeWidth={2.1} />
            <span className="flex-1 text-left">{item.label}</span>
            {activeScreen === item.id && <ChevronRight size={14} />}
          </button>)}
        </nav>
        <div className="mt-auto space-y-4 pt-10">
          <div className="sidebar-feature">
            <div className="mb-4 inline-flex rounded-xl bg-white/15 p-2"><HeartHandshake size={21} /></div>
            <p className="text-[15px] font-black leading-5">Care without confusion.</p>
            <p className="mt-2 text-[11px] leading-5 text-[#D5E7FF]">Made for everyone, designed with accessibility in mind.</p>
            <span className="mt-4 inline-block rounded-full border border-white/25 px-3 py-1 text-[10px] font-bold">Hackathon prototype</span>
          </div>
          <p className="px-2 text-[10px] leading-5 text-slate-400">© 2026 OPD Saathi · Fictional hospital demo</p>
        </div>
      </aside>

      <main className="app-content min-w-0 flex-1">
        <header className="app-topbar">
          <div className="flex items-center gap-3">
            <button type="button" aria-label="Open navigation" onClick={() => setMenuOpen(true)} className="rounded-xl border border-slate-200 p-2 text-slate-600 lg:hidden"><Menu size={21} /></button>
            <div className="hidden items-center gap-2 text-[12px] font-semibold text-slate-400 sm:flex"><span>Workspace</span><ChevronRight size={13} /><span className="text-[#1D4674]">{role === "patient" ? "Patient experience" : "Staff demo"}</span></div>
            <div className="sm:hidden text-sm font-black text-blue-700">OPD Saathi</div>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="hidden items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-700 md:flex"><span className="tiny-dot bg-emerald-500" /> Prototype active</span>
            <button type="button" title="Toggle larger text" onClick={() => setLargeText((value) => !value)} className={`top-icon-btn text-sm font-black ${largeText ? "!border-blue-300 !bg-blue-50 !text-blue-700" : ""}`} aria-label="Toggle larger text">A<span className="text-[17px]">+</span></button>
            {role === "patient" && <button type="button" onClick={() => goTo("assistant")} aria-label="Open Saathi AI" className="top-icon-btn"><Bot size={19} /></button>}
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#93BAFF] to-[#D1E6FF] text-xs font-black text-blue-900">OS</div>
          </div>
        </header>

        <div className="mx-auto w-full max-w-[1540px] px-4 pb-12 pt-7 sm:px-8 lg:px-10 lg:pt-9">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="eyebrow mb-3"><span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> OPD SAATHI / {role === "patient" ? "PATIENT EXPERIENCE" : "STAFF VIEW"}</div>
              <h1 className="page-title">{headline}</h1>
              <p className="mt-2 text-[13px] leading-6 text-slate-500">{role === "patient" ? "Simple, stress-free hospital journeys, powered by thoughtful design." : "Manage the simulated patient queue with clarity and confidence."}</p>
            </div>
            <span className="tag tag-white"><ShieldCheck size={14} className="text-emerald-600" /> Prototype environment</span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={`${role}-${activeScreen}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              {role === "patient" && patientScreen === "home" && <div className="space-y-6">
                <section className="home-hero relative overflow-hidden rounded-[32px] border border-[#D7E8F7] px-6 py-7 sm:px-8 sm:py-9 xl:px-10 xl:py-10">
                  <div className="home-hero-mesh" />
                  <div className="relative z-10 grid items-center gap-7 xl:grid-cols-[1.05fr_.95fr]">
                    <div>
                      <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/75 bg-white/65 px-3.5 py-2 text-[10px] font-black uppercase tracking-[.12em] text-blue-700 shadow-sm backdrop-blur"><Sparkles size={14} /> Your care journey starts here</div>
                      <h2 className="max-w-[620px] text-[36px] font-black leading-[1.08] tracking-[-.062em] text-[#12385F] sm:text-[50px] xl:text-[58px]">Know where to go.<br/><span className="home-hero-gradient">Know what comes next.</span></h2>
                      <p className="mt-5 max-w-[560px] text-[13px] leading-7 text-[#51718E]">From the entrance to the right department, OPD Saathi keeps navigation, queues and AI help together—so the hospital feels easier to understand.</p>
                      <div className="mt-7 flex flex-wrap gap-3"><button onClick={() => goTo("navigate")} className="primary-btn"><Navigation2 size={17} /> Start navigation <ArrowRight size={16} /></button><button onClick={() => goTo("assistant")} className="secondary-btn"><Bot size={17} /> Ask Saathi AI</button></div>
                      <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-[10px] font-extrabold text-[#64819D]"><span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-500"/> Accessible routes</span><span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-500"/> English · Hindi · Kannada</span><span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-500"/> No real patient data</span></div>
                    </div>

                    <div className="home-journey-card relative mx-auto w-full max-w-[560px] rounded-[28px] border border-white bg-white/80 p-4 shadow-[0_25px_70px_rgba(46,93,145,.13)] backdrop-blur-xl sm:p-5">
                      <div className="flex items-center justify-between gap-3"><div><p className="text-[11px] font-black uppercase tracking-[.1em] text-blue-700">Live journey preview</p><p className="mt-1 text-[10px] font-semibold text-slate-400">Patient experience · simulated</p></div><span className="tag tag-mint"><span className="tiny-dot bg-emerald-500"/> Ready</span></div>
                      <div className="mt-4 rounded-[22px] border border-[#DFEAF5] bg-[#F5F9FE] p-4">
                        <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white"><MapPin size={19}/></span><div><p className="text-[12px] font-black text-[#244565]">Entrance → General OPD</p><p className="mt-1 text-[10px] font-semibold text-slate-400">Floor 1 · Accessible lift</p></div></div><span className="rounded-xl bg-white px-3 py-2 text-[10px] font-black text-blue-700 shadow-sm">3 min</span></div>
                        <div className="journey-line mt-5"><span className="journey-dot journey-dot-start"/><span className="journey-progress"/><span className="journey-dot journey-dot-end"/></div>
                        <div className="mt-2 flex justify-between text-[9px] font-extrabold text-slate-400"><span>ENTRANCE</span><span>DESTINATION</span></div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-[#E7EEF7] bg-white p-4"><div className="flex items-center justify-between"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><Ticket size={16}/></span><span className="text-[9px] font-black text-emerald-600">LIVE</span></div><p className="mt-4 text-[10px] font-bold text-slate-400">NOW SERVING</p><p className="mt-1 text-[26px] font-black tracking-[-.06em] text-[#193B5F]">{tokenNumber(queue.serving)}</p></div>
                        <button type="button" onClick={() => goTo("assistant")} className="group rounded-2xl border border-[#E8E4FF] bg-gradient-to-br from-[#F6F3FF] to-white p-4 text-left transition hover:-translate-y-1 hover:shadow-lg"><div className="flex items-center justify-between"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100 text-violet-600"><Sparkles size={16}/></span><ArrowUpRight size={14} className="text-violet-400"/></div><p className="mt-4 text-[10px] font-bold text-slate-400">SAATHI AI</p><p className="mt-1 text-[13px] font-black text-[#3E3972]">Ask anything</p></button>
                      </div>
                    </div>
                  </div>
                </section>

                <button type="button" onClick={() => goTo("nearby")} className="real-world-cta group w-full overflow-hidden rounded-[26px] border border-[#D8E8F6] bg-white p-5 text-left shadow-[0_16px_45px_rgba(44,94,148,.07)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_55px_rgba(44,94,148,.12)] sm:p-6">
                  <div className="flex flex-wrap items-center gap-4 sm:flex-nowrap">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-100"><LocateFixed size={22}/></span>
                    <span className="min-w-0 flex-1"><span className="eyebrow mb-1">NEW · REAL-WORLD NAVIGATION</span><span className="block text-[17px] font-black tracking-[-.03em] text-[#1D3D60]">Find the best nearby hospital for the care you need.</span><span className="mt-1 block text-[11px] leading-5 text-slate-400">Emergency, ENT, surgery & more · GPS · evidence-based ranking · real routes · verified indoor data where available</span></span>
                    <span className="ml-auto flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-3 text-[11px] font-black text-blue-700 transition group-hover:bg-blue-600 group-hover:text-white">Try it <ArrowRight size={15}/></span>
                  </div>
                </button>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <MiniStat title="Demo departments" value="16" note="Across four floors" Icon={Building2} tone="blue" />
                  <MiniStat title="Hospital floors" value="04" note="Floor-by-floor guidance" Icon={Layers3} tone="violet" />
                  <MiniStat title="Currently serving" value={tokenNumber(queue.serving)} note="Simulated OPD queue" Icon={Ticket} tone="mint" />
                  <MiniStat title="Queue ahead" value={String(awaiting)} note="Synthetic patient data" Icon={Users} tone="peach" />
                </div>

                <div className="grid items-start gap-5 2xl:grid-cols-[1.42fr_.78fr]">
                  {Wayfinding({ compact: true })}
                  <div className="space-y-5">
                    {VisitPanel({ compact: true })}
                    <Card className="overflow-hidden p-0">
                      <div className="ai-teaser relative overflow-hidden p-6">
                        <div className="absolute -right-8 -top-8 h-36 w-36 rounded-full bg-violet-200/30 blur-2xl" />
                        <div className="relative z-10 flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-lg shadow-violet-100"><Bot size={21}/></span><div><h3 className="text-[16px] font-black text-[#1B3658]">Ask Saathi, naturally.</h3><p className="text-[11px] text-slate-500">More than directions.</p></div></div>
                        <p className="relative z-10 mt-4 text-[12px] leading-6 text-slate-500">“Where is cardiology?”, “What does an ECG measure?” or “Explain this in Kannada.”</p>
                        <button type="button" onClick={() => goTo("assistant")} className="secondary-btn relative z-10 mt-4 w-full justify-center">Open AI assistant <ArrowRight size={16}/></button>
                      </div>
                    </Card>
                  </div>
                </div>
              </div>}

              {role === "patient" && patientScreen === "nearby" && <NearbyHospitalNavigator />}

              {role === "patient" && patientScreen === "verified" && <VerifiedHospitalLibrary />}

              {role === "patient" && patientScreen === "navigate" && <div className="grid items-start gap-5 2xl:grid-cols-[1.4fr_.7fr]">
                {Wayfinding({})}
                <div className="space-y-5">
                  <Card className="p-6"><div className="eyebrow mb-2"><Search size={14} /> DEPARTMENT DIRECTORY</div><h3 className="section-title">Where do you need to go?</h3><label className="relative mt-5 block"><Search size={17} className="absolute left-4 top-3.5 text-slate-400" /><input className="form-input pl-11" placeholder="Search departments or room numbers" value={roomQuery} onChange={(event) => setRoomQuery(event.target.value)} /></label><div className="mt-4 max-h-[370px] space-y-1.5 overflow-y-auto pr-1">{matchingRooms.map((room) => <button type="button" key={room.id} onClick={() => selectRoom(room)} className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${selectedId === room.id ? "bg-blue-50" : "hover:bg-slate-50"}`}><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: `${room.color}1C`, color: room.color }}><MapPin size={16} /></span><span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-extrabold text-slate-700">{room.name}</span><span className="mt-1 block text-[10px] font-semibold text-slate-400">{floorNames[room.floor]} · {room.code}</span></span><ChevronRight size={15} className="text-slate-300 group-hover:text-blue-500" /></button>)}{matchingRooms.length === 0 && <p className="py-4 text-center text-xs text-slate-400">No matching departments</p>}</div></Card>
                  <Card className="border-rose-100 bg-[#FFF8F7] p-5"><div className="flex items-start gap-3"><ShieldAlert className="mt-0.5 shrink-0 text-rose-500" size={20} /><div><p className="text-sm font-extrabold text-rose-800">Medical emergency?</p><p className="mt-2 text-[12px] leading-6 text-rose-700">Do not wait in an OPD queue. Ask hospital staff for emergency assistance immediately, or contact local emergency services.</p><button type="button" onClick={() => selectRoom(getRoom("emergency"))} className="mt-3 text-xs font-extrabold text-rose-700 underline">Show demo emergency location →</button></div></div></Card>
                </div>
              </div>}

              {role === "patient" && patientScreen === "visit" && <div className="grid items-start gap-5 xl:grid-cols-[1.1fr_.9fr]">{VisitPanel({})}<Card className="p-6 sm:p-7"><div className="eyebrow mb-2"><Clock3 size={14} /> YOUR JOURNEY</div><h2 className="section-title">Know what happens next.</h2><div className="mt-7 space-y-6">{[{ label: "Register", desc: "Get your demonstration token", complete: myToken !== null }, { label: "Wait for your turn", desc: `Now serving ${tokenNumber(queue.serving)}`, complete: myToken !== null && myToken <= queue.serving }, { label: "Go to your department", desc: "Follow signs and staff instructions", complete: false }].map((step, i) => <div key={step.label} className="flex gap-4"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black ${step.complete ? "bg-emerald-100 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>{step.complete ? <Check size={18} /> : i + 1}</span><div><p className="text-sm font-extrabold text-[#234061]">{step.label}</p><p className="mt-1 text-xs text-slate-500">{step.desc}</p></div></div>)}</div><button onClick={() => { selectRoom(getRoom(department)); goTo("navigate"); }} className="secondary-btn mt-8 w-full justify-center"><Navigation2 size={17} /> Navigate to my department <ArrowRight size={16} /></button></Card></div>}

              {role === "patient" && patientScreen === "assistant" && <div className="grid items-start gap-5 xl:grid-cols-[1.4fr_.65fr]">{ChatPanel({})}<div className="space-y-5"><Card className="p-6"><div className="eyebrow mb-3"><WandSparkles size={15} /> MORE THAN DIRECTIONS</div><h3 className="section-title">Ask about anything.</h3><p className="mt-3 text-[13px] leading-6 text-slate-500">General questions, explanations, health literacy, hospital processes and multilingual help—all powered by a real AI model when connected.</p><div className="mt-5 space-y-3">{["Explain something simply", "Find a hospital department", "Understand common medical terms", "Ask in Hindi or Kannada"].map((item) => <div key={item} className="flex items-center gap-2 text-[12px] font-semibold text-slate-600"><CheckCircle2 size={15} className="text-emerald-500" /> {item}</div>)}</div></Card><Card className="p-6"><div className="mb-3 flex items-center gap-2 text-sm font-black text-[#214369]"><ShieldCheck size={19} className="text-blue-600" /> Privacy by design</div><p className="text-[12px] leading-6 text-slate-500">Chat is sent to the configured AI provider for a response. Do not include names, identification numbers or medical records. Google authentication is available when configured; demo queue data remains local to the browser and is not a real patient database.</p></Card></div></div>}

              {role === "staff" && StaffPanel({ onlyQueue: staffScreen === "queue" })}
            </motion.div>
          </AnimatePresence>

          {role === "patient" && <button type="button" onClick={() => setEmergencyOpen(true)} className="fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-[#B91C1C] to-[#EF4444] px-4 py-3.5 text-white shadow-[0_16px_45px_rgba(185,28,28,.35)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_55px_rgba(185,28,28,.42)] sm:bottom-7 sm:right-7 sm:px-5" aria-label="Open ambulance and emergency help">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15"><Ambulance size={20}/></span>
            <span className="text-left"><b className="block text-[12px] font-black">Call ambulance</b><small className="block text-[9px] font-bold text-rose-100">112 / 102 · laptop help</small></span>
          </button>}

          <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-[#E1EAF4] pt-6 text-[11px] font-medium text-slate-400"><span>© 2026 OPD Saathi AI. Built with care.</span><span className="flex items-center gap-2"><ShieldCheck size={13} /> Google-ready auth · demo queue · real public map data where available</span></footer>
        </div>
      </main>
    </div>
  </div>;
}
