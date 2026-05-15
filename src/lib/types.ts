export type EventMode = "individual" | "teams";

export type FishSpecies =
  | "Kapr"
  | "Štika"
  | "Candát"
  | "Sumec"
  | "Amur"
  | "Tolstolobik"
  | "Okoun"
  | "Cejn"
  | "Lín"
  | "Pstruh duhový"
  | "Pstruh obecný"
  | "Lipan"
  | "Bolen"
  | "Plotice"
  | "Jiné";

export const FISH_SPECIES: FishSpecies[] = [
  "Kapr",
  "Štika",
  "Candát",
  "Sumec",
  "Amur",
  "Tolstolobik",
  "Okoun",
  "Cejn",
  "Lín",
  "Pstruh duhový",
  "Pstruh obecný",
  "Lipan",
  "Bolen",
  "Plotice",
  "Jiné",
];

export interface Profile {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
}

export interface Event {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string;
  mode: EventMode;
  invite_code: string;
  master_user_id: string;
  created_at: string;
}

export interface Team {
  id: string;
  event_id: string;
  name: string;
  created_at: string;
}

export interface EventParticipant {
  id: string;
  event_id: string;
  user_id: string;
  team_id: string | null;
  joined_at: string;
  profile?: Profile;
  team?: Team;
}

export interface Catch {
  id: string;
  event_id: string;
  user_id: string;
  species: FishSpecies;
  weight_kg: number;
  length_cm: number | null;
  photo_url: string | null;
  note: string | null;
  caught_at: string;
  created_at: string;
  updated_at: string;
  profile?: Profile;
}

export interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  total_weight: number;
  catch_count: number;
  biggest_fish: number;
  team_id: string | null;
  team_name: string | null;
}

export interface TeamLeaderboardEntry {
  team_id: string;
  team_name: string;
  total_weight: number;
  catch_count: number;
  member_count: number;
  members: LeaderboardEntry[];
}
