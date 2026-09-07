import type { ProfileKey, Role } from "./types";
export const FAMILY_ID = "00000000-0000-4000-8000-000000000001";
export const INITIAL_PROFILES: ReadonlyArray<{
  id: string;
  key: ProfileKey;
  displayName: string;
  role: Role;
  avatar: string;
  color: string;
}> = [
  {
    id: "00000000-0000-4000-8000-000000000011",
    key: "mia",
    displayName: "Mia",
    role: "child",
    avatar: "star",
    color: "#e6aa96",
  },
  {
    id: "00000000-0000-4000-8000-000000000012",
    key: "mom",
    displayName: "Mom",
    role: "admin",
    avatar: "moon",
    color: "#d3bc82",
  },
  {
    id: "00000000-0000-4000-8000-000000000013",
    key: "dad",
    displayName: "Dad",
    role: "admin",
    avatar: "leaf",
    color: "#b2c2a2",
  },
];
