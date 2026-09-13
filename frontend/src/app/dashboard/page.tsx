"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/lib/auth-context";
import { ApiError, apiFetch } from "@/lib/api";
import { FITNESS_GOAL_OPTIONS, Profile } from "@/lib/profile-types";
import { Workout } from "@/lib/workout-types";
import { NutritionForDate } from "@/lib/nutrition-types";
import { ProgressEntry } from "@/lib/progress-types";
import { GamificationState } from "@/lib/gamification-types";

type SectionStatus = "loading" | "ready" | "error";

function todayUtcDateString(): string {
  // Same convention already used by the Nutrition and Progress pages —
  // UTC calendar day, so "today" agrees with how the backend filters
  // Nutrition's ?date= and how Workout/Progress dates are stored.
  return new Date().toISOString().slice(0, 10);
}

function fitnessGoalLabel(goal: Profile["fitnessGoal"]): string {
  return FITNESS_GOAL_OPTIONS.find((o) => o.value === goal)?.label ?? String(goal);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

// Picks today's workout if one is scheduled today, otherwise the nearest
// upcoming planned workout. Workouts is already fetched in full (no
// separate "upcoming" endpoint exists), so this is computed client-side.
function pickRelevantWorkout(workouts: Workout[], today: string): { workout: Workout; isToday: boolean } | null {
  const todays = workouts.find((w) => w.scheduledDate?.slice(0, 10) === today);
  if (todays) return { workout: todays, isToday: true };

  const upcoming = workouts
    .filter((w) => w.status === "PLANNED" && w.scheduledDate && w.scheduledDate.slice(0, 10) > today)
    .sort((a, b) => new Date(a.scheduledDate!).getTime() - new Date(b.scheduledDate!).getTime());

  return upcoming.length > 0 ? { workout: upcoming[0], isToday: false } : null;
}

function DashboardContent() {
  const { user, accessToken, logout } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileStatus, setProfileStatus] = useState<SectionStatus>("loading");
  const [profileError, setProfileError] = useState<string | null>(null);

  const [workouts, setWorkouts] = useState<Workout[] | null>(null);
  const [workoutStatus, setWorkoutStatus] = useState<SectionStatus>("loading");
  const [workoutError, setWorkoutError] = useState<string | null>(null);

  const [nutrition, setNutrition] = useState<NutritionForDate | null>(null);
  const [nutritionStatus, setNutritionStatus] = useState<SectionStatus>("loading");
  const [nutritionError, setNutritionError] = useState<string | null>(null);

  const [progressEntries, setProgressEntries] = useState<ProgressEntry[] | null>(null);
  const [progressStatus, setProgressStatus] = useState<SectionStatus>("loading");
  const [progressError, setProgressError] = useState<string | null>(null);

  const [gamification, setGamification] = useState<GamificationState | null>(null);
  const [gamificationStatus, setGamificationStatus] = useState<SectionStatus>("loading");
  const [gamificationError, setGamificationError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    const today = todayUtcDateString();

    apiFetch<Profile>("/profiles/me", { accessToken })
      .then((data) => {
        setProfile(data);
        setProfileStatus("ready");
      })
      .catch((err) => {
        if (err instanceof ApiError && err.code === "PROFILE_NOT_FOUND") {
          setProfile(null);
          setProfileStatus("ready");
        } else {
          setProfileError(err instanceof ApiError ? err.message : "Couldn't load your profile.");
          setProfileStatus("error");
        }
      });

    apiFetch<Workout[]>("/workouts", { accessToken })
      .then((data) => {
        setWorkouts(data);
        setWorkoutStatus("ready");
      })
      .catch((err) => {
        setWorkoutError(err instanceof ApiError ? err.message : "Couldn't load your workouts.");
        setWorkoutStatus("error");
      });

    apiFetch<NutritionForDate>(`/nutrition?date=${today}`, { accessToken })
      .then((data) => {
        setNutrition(data);
        setNutritionStatus("ready");
      })
      .catch((err) => {
        setNutritionError(err instanceof ApiError ? err.message : "Couldn't load today's nutrition.");
        setNutritionStatus("error");
      });

    apiFetch<ProgressEntry[]>("/progress", { accessToken })
      .then((data) => {
        setProgressEntries(data);
        setProgressStatus("ready");
      })
      .catch((err) => {
        setProgressError(err instanceof ApiError ? err.message : "Couldn't load your progress.");
        setProgressStatus("error");
      });

    apiFetch<GamificationState>("/gamification/me", { accessToken })
      .then((data) => {
        setGamification(data);
        setGamificationStatus("ready");
      })
      .catch((err) => {
        setGamificationError(err instanceof ApiError ? err.message : "Couldn't load your level and XP.");
        setGamificationStatus("error");
      });
  }, [accessToken]);

  const today = todayUtcDateString();
  const relevantWorkout = workouts ? pickRelevantWorkout(workouts, today) : null;
  const latestProgress = progressEntries && progressEntries.length > 0 ? progressEntries[0] : null;
  const previousProgress = progressEntries && progressEntries.length > 1 ? progressEntries[1] : null;
  const weightDelta =
    latestProgress && previousProgress
      ? parseFloat(latestProgress.weight) - parseFloat(previousProgress.weight)
      : null;

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-10">
      <div className="w-full max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Welcome, {user?.email}</h1>
            <p className="text-sm text-gray-500">Here&apos;s where things stand today.</p>
          </div>
          <button
            onClick={() => logout()}
            className="rounded border border-gray-300 px-4 py-2 text-sm"
          >
            Log out
          </button>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/profile" className="rounded border border-gray-300 px-4 py-2 text-sm">
            Profile
          </Link>
          <Link href="/workouts" className="rounded border border-gray-300 px-4 py-2 text-sm">
            Workouts
          </Link>
          <Link href="/nutrition" className="rounded border border-gray-300 px-4 py-2 text-sm">
            Nutrition
          </Link>
          <Link href="/progress" className="rounded border border-gray-300 px-4 py-2 text-sm">
            Progress
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Profile summary */}
          <section className="rounded border border-gray-200 p-4">
            <h2 className="font-semibold">Fitness Profile</h2>
            {profileStatus === "loading" && <p className="mt-2 text-sm text-gray-500">Loading…</p>}
            {profileStatus === "error" && <p className="mt-2 text-sm text-red-600">{profileError}</p>}
            {profileStatus === "ready" && !profile && (
              <div className="mt-2">
                <p className="text-sm text-gray-500">You haven&apos;t set up your profile yet.</p>
                <Link href="/profile" className="mt-2 inline-block text-sm underline">
                  Set up profile
                </Link>
              </div>
            )}
            {profileStatus === "ready" && profile && (
              <div className="mt-2 text-sm text-gray-600">
                {profile.fitnessGoal && <p>Goal: {fitnessGoalLabel(profile.fitnessGoal)}</p>}
                {profile.weightKg != null && (
                  <p>
                    Weight: {profile.weightKg}kg
                    {profile.targetWeightKg != null ? ` → ${profile.targetWeightKg}kg` : ""}
                  </p>
                )}
                {profile.activityLevel && <p>Activity: {profile.activityLevel.replaceAll("_", " ").toLowerCase()}</p>}
                {!profile.fitnessGoal && profile.weightKg == null && !profile.activityLevel && (
                  <p className="text-gray-400">Profile created, but no details filled in yet.</p>
                )}
              </div>
            )}
          </section>

          {/* Today's / upcoming workout */}
          <section className="rounded border border-gray-200 p-4">
            <h2 className="font-semibold">Workout</h2>
            {workoutStatus === "loading" && <p className="mt-2 text-sm text-gray-500">Loading…</p>}
            {workoutStatus === "error" && <p className="mt-2 text-sm text-red-600">{workoutError}</p>}
            {workoutStatus === "ready" && !relevantWorkout && (
              <div className="mt-2">
                <p className="text-sm text-gray-500">No upcoming workouts scheduled.</p>
                <Link href="/workouts" className="mt-2 inline-block text-sm underline">
                  Plan a workout
                </Link>
              </div>
            )}
            {workoutStatus === "ready" && relevantWorkout && (
              <div className="mt-2 text-sm text-gray-600">
                <p className="font-medium text-gray-800">{relevantWorkout.workout.title}</p>
                <p>
                  {relevantWorkout.isToday ? "Today" : formatDate(relevantWorkout.workout.scheduledDate!)}
                  {relevantWorkout.workout.durationMinutes ? ` · ${relevantWorkout.workout.durationMinutes} min` : ""}
                </p>
                <p className="text-xs text-gray-400">
                  {relevantWorkout.workout.status === "COMPLETED" ? "Completed" : "Planned"}
                </p>
              </div>
            )}
          </section>

          {/* Today's nutrition */}
          <section className="rounded border border-gray-200 p-4">
            <h2 className="font-semibold">Nutrition Today</h2>
            {nutritionStatus === "loading" && <p className="mt-2 text-sm text-gray-500">Loading…</p>}
            {nutritionStatus === "error" && <p className="mt-2 text-sm text-red-600">{nutritionError}</p>}
            {nutritionStatus === "ready" && nutrition && nutrition.entries.length === 0 && (
              <div className="mt-2">
                <p className="text-sm text-gray-500">No meals logged today.</p>
                <Link href="/nutrition" className="mt-2 inline-block text-sm underline">
                  Log a meal
                </Link>
              </div>
            )}
            {nutritionStatus === "ready" && nutrition && nutrition.entries.length > 0 && (
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-gray-600">
                <p>Calories: {nutrition.totals.calories}</p>
                <p>Protein: {nutrition.totals.proteinGrams}g</p>
                <p>Carbs: {nutrition.totals.carbohydratesGrams}g</p>
                <p>Fat: {nutrition.totals.fatGrams}g</p>
              </div>
            )}
          </section>

          {/* Progress */}
          <section className="rounded border border-gray-200 p-4">
            <h2 className="font-semibold">Progress</h2>
            {progressStatus === "loading" && <p className="mt-2 text-sm text-gray-500">Loading…</p>}
            {progressStatus === "error" && <p className="mt-2 text-sm text-red-600">{progressError}</p>}
            {progressStatus === "ready" && !latestProgress && (
              <div className="mt-2">
                <p className="text-sm text-gray-500">No progress logged yet.</p>
                <Link href="/progress" className="mt-2 inline-block text-sm underline">
                  Log progress
                </Link>
              </div>
            )}
            {progressStatus === "ready" && latestProgress && (
              <div className="mt-2 text-sm text-gray-600">
                <p className="font-medium text-gray-800">{latestProgress.weight}kg</p>
                <p className="text-xs text-gray-400">as of {formatDate(latestProgress.recordedAt)}</p>
                {weightDelta != null && (
                  <p className="mt-1">
                    {weightDelta === 0
                      ? "No change since last entry"
                      : `${weightDelta > 0 ? "+" : ""}${weightDelta.toFixed(1)}kg since last entry`}
                  </p>
                )}
              </div>
            )}
          </section>

          {/* Level & XP */}
          <section className="rounded border border-gray-200 p-4">
            <h2 className="font-semibold">Level & XP</h2>
            {gamificationStatus === "loading" && <p className="mt-2 text-sm text-gray-500">Loading…</p>}
            {gamificationStatus === "error" && <p className="mt-2 text-sm text-red-600">{gamificationError}</p>}
            {gamificationStatus === "ready" && gamification && (
              <div className="mt-2 text-sm text-gray-600">
                <p className="font-medium text-gray-800">Level {gamification.level}</p>
                <p>{gamification.totalXp} XP total</p>
                <div className="mt-2 h-2 w-full overflow-hidden rounded bg-gray-100">
                  <div
                    className="h-full bg-black"
                    style={{ width: `${Math.min(100, Math.max(0, gamification.xpProgress * 100))}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  {gamification.totalXp} / {gamification.xpForNextLevel} XP to level {gamification.level + 1}
                </p>
                {gamification.recentTransactions.length === 0 ? (
                  <p className="mt-3 text-sm text-gray-500">
                    No XP earned yet — complete a workout to get started.
                  </p>
                ) : (
                  <p className="mt-3 text-xs text-gray-400">
                    Last earned: +{gamification.recentTransactions[0].amount} XP (
                    {gamification.recentTransactions[0].eventType.replaceAll("_", " ").toLowerCase()})
                  </p>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
