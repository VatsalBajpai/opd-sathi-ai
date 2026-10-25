export type FloorId = 0 | 1 | 2 | 3;

export type Room = {
  id: string;
  name: string;
  code: string;
  floor: FloorId;
  category: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  icon: string;
};

export const floorNames = ["Ground floor", "First floor", "Second floor", "Third floor"] as const;

const rooms: Omit<Room, "floor">[][] = [
  [
    { id: "reception", name: "Reception & registration", code: "G-01", category: "Help & information", x: 154, y: 58, width: 225, height: 130, color: "#3B82F6", icon: "help" },
    { id: "emergency", name: "Emergency", code: "G-02", category: "Urgent care", x: 403, y: 58, width: 225, height: 130, color: "#F97373", icon: "emergency" },
    { id: "pharmacy", name: "Pharmacy", code: "G-03", category: "Medicines", x: 154, y: 318, width: 225, height: 130, color: "#10B981", icon: "pharmacy" },
    { id: "lab", name: "Sample collection", code: "G-04", category: "Diagnostics", x: 403, y: 318, width: 225, height: 130, color: "#A78BFA", icon: "lab" },
  ],
  [
    { id: "general", name: "General medicine OPD", code: "1-101", category: "Consultation", x: 154, y: 58, width: 225, height: 130, color: "#3B82F6", icon: "help" },
    { id: "pediatrics", name: "Pediatrics", code: "1-102", category: "Children's care", x: 403, y: 58, width: 225, height: 130, color: "#FB923C", icon: "help" },
    { id: "cardiology", name: "Cardiology", code: "1-103", category: "Heart care", x: 154, y: 318, width: 225, height: 130, color: "#EF6A92", icon: "help" },
    { id: "orthopedics", name: "Orthopedics", code: "1-104", category: "Bone & joint care", x: 403, y: 318, width: 225, height: 130, color: "#A78BFA", icon: "help" },
  ],
  [
    { id: "radiology", name: "Radiology", code: "2-201", category: "Imaging", x: 154, y: 58, width: 225, height: 130, color: "#3B82F6", icon: "help" },
    { id: "pathology", name: "Pathology", code: "2-202", category: "Lab tests", x: 403, y: 58, width: 225, height: 130, color: "#A78BFA", icon: "help" },
    { id: "physiotherapy", name: "Physiotherapy", code: "2-203", category: "Rehabilitation", x: 154, y: 318, width: 225, height: 130, color: "#10B981", icon: "help" },
    { id: "billing", name: "Billing & insurance", code: "2-204", category: "Payments", x: 403, y: 318, width: 225, height: 130, color: "#FB923C", icon: "help" },
  ],
  [
    { id: "admin", name: "Administration", code: "3-301", category: "Hospital services", x: 154, y: 58, width: 225, height: 130, color: "#3B82F6", icon: "help" },
    { id: "counselling", name: "Counselling", code: "3-302", category: "Patient support", x: 403, y: 58, width: 225, height: 130, color: "#A78BFA", icon: "help" },
    { id: "ward-a", name: "Ward A", code: "3-303", category: "Inpatient", x: 154, y: 318, width: 225, height: 130, color: "#10B981", icon: "help" },
    { id: "ward-b", name: "Ward B", code: "3-304", category: "Inpatient", x: 403, y: 318, width: 225, height: 130, color: "#FB923C", icon: "help" },
  ],
];

export const ROOMS: Room[] = rooms.flatMap((floorRooms, floor) =>
  floorRooms.map((room) => ({ ...room, floor: floor as FloorId }))
);

export function getRoom(id: string): Room {
  return ROOMS.find((room) => room.id === id) ?? ROOMS[0];
}

export function routeForRoom(room: Room, accessible: boolean) {
  // This is a fictional four-floor hospital, and the route is a deliberately
  // simplified corridor route. Never use this for navigation in a real building.
  const doorX = room.x + room.width / 2;
  const upper = room.y < 240;
  const doorY = upper ? room.y + room.height : room.y;
  const startX = !accessible && room.floor > 0 ? 684 : 104;
  return {
    path: `M ${startX} 253 L ${doorX} 253 L ${doorX} ${doorY}`,
    anchorX: doorX,
    anchorY: doorY,
    startX,
    upper,
    steps: [
      "Start at the main entrance on the ground floor.",
      ...(room.floor > 0
        ? [`Take the ${accessible ? "lift" : "stairs or lift"} to ${floorNames[room.floor]}.`]
        : []),
      `Follow the central corridor to ${room.code}.`,
      `Enter ${room.name} through the highlighted doorway.`,
    ],
  };
}

export type SafetyKind =
  | "hydrant"
  | "fire-hose"
  | "extinguisher"
  | "fire-alarm"
  | "aed"
  | "first-aid"
  | "emergency-exit"
  | "assembly"
  | "toilet"
  | "accessible-toilet"
  | "oxygen"
  | "no-smoking";

export type SafetySign = {
  id: string;
  floor: FloorId;
  kind: SafetyKind;
  label: string;
  short: string;
  color: string;
  x: number;
  y: number;
  worldX: number;
  worldZ: number;
};

const FLOOR_SAFETY: Omit<SafetySign, "floor" | "id">[] = [
  { kind: "hydrant", label: "Fire hydrant", short: "H", color: "#DC2626", x: 334, y: 204, worldX: 40, worldZ: 27 },
  { kind: "fire-hose", label: "Fire hose reel", short: "HOSE", color: "#B91C1C", x: 481, y: 204, worldX: 61, worldZ: 27 },
  { kind: "extinguisher", label: "Fire extinguisher", short: "FX", color: "#EF4444", x: 334, y: 332, worldX: 40, worldZ: 45 },
  { kind: "fire-alarm", label: "Fire alarm", short: "AL", color: "#F43F5E", x: 481, y: 332, worldX: 61, worldZ: 45 },
  { kind: "aed", label: "AED / defibrillator", short: "AED", color: "#059669", x: 555, y: 279, worldX: 72, worldZ: 35 },
  { kind: "first-aid", label: "First aid", short: "+", color: "#16A34A", x: 262, y: 279, worldX: 28, worldZ: 35 },
  { kind: "emergency-exit", label: "Emergency exit", short: "EXIT", color: "#16A34A", x: 676, y: 92, worldX: 96, worldZ: 8 },
  { kind: "toilet", label: "Toilet", short: "WC", color: "#475569", x: 416, y: 292, worldX: 50, worldZ: 39 },
  { kind: "accessible-toilet", label: "Accessible toilet", short: "♿", color: "#2563EB", x: 416, y: 246, worldX: 50, worldZ: 31 },
  { kind: "oxygen", label: "Medical oxygen shutoff", short: "O₂", color: "#0891B2", x: 655, y: 391, worldX: 91, worldZ: 57 },
  { kind: "no-smoking", label: "No smoking", short: "NO SMK", color: "#64748B", x: 151, y: 391, worldX: 8, worldZ: 57 },
];

export const SAFETY_SIGNS: SafetySign[] = ([0, 1, 2, 3] as FloorId[]).flatMap((floor) =>
  FLOOR_SAFETY.map((sign, index) => ({ ...sign, floor, id: `${floor}-${sign.kind}-${index}` }))
).concat([
  { id: "0-assembly", floor: 0, kind: "assembly", label: "Emergency assembly point", short: "AP", color: "#15803D", x: 72, y: 392, worldX: -4, worldZ: 56 },
]);
