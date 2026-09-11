export interface ProgressPhoto {
  id: string;
  progressId: string;
  url: string;
  createdAt: string;
}

export interface ProgressEntry {
  id: string;
  userId: string;
  recordedAt: string;
  weight: string; // Decimal fields serialize as strings over JSON
  chest: string | null;
  waist: string | null;
  hips: string | null;
  arms: string | null;
  thighs: string | null;
  bodyFatPercent: string | null;
  createdAt: string;
  updatedAt: string;
  photos?: ProgressPhoto[];
}
