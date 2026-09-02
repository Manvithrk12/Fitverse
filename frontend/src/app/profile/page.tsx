"use client";

import { FormEvent, useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/lib/auth-context";
import { ApiError, apiFetch } from "@/lib/api";
import {
  ACTIVITY_LEVEL_OPTIONS,
  DIETARY_PREFERENCE_OPTIONS,
  FITNESS_GOAL_OPTIONS,
  Profile,
  WORKOUT_TYPE_OPTIONS,
} from "@/lib/profile-types";

interface FormState {
  age: string;
  heightCm: string;
  weightKg: string;
  targetWeightKg: string;
  fitnessGoal: string;
  activityLevel: string;
  workoutFrequency: string;
  availableEquipment: string;
  dietaryPreference: string;
  preferredWorkoutType: string;
}

const emptyForm: FormState = {
  age: "",
  heightCm: "",
  weightKg: "",
  targetWeightKg: "",
  fitnessGoal: "",
  activityLevel: "",
  workoutFrequency: "",
  availableEquipment: "",
  dietaryPreference: "",
  preferredWorkoutType: "",
};

function profileToForm(profile: Profile): FormState {
  return {
    age: profile.age?.toString() ?? "",
    heightCm: profile.heightCm?.toString() ?? "",
    weightKg: profile.weightKg?.toString() ?? "",
    targetWeightKg: profile.targetWeightKg?.toString() ?? "",
    fitnessGoal: profile.fitnessGoal ?? "",
    activityLevel: profile.activityLevel ?? "",
    workoutFrequency: profile.workoutFrequency?.toString() ?? "",
    availableEquipment: profile.availableEquipment.join(", "),
    dietaryPreference: profile.dietaryPreference ?? "",
    preferredWorkoutType: profile.preferredWorkoutType ?? "",
  };
}

function numberOrNull(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

function ProfileForm() {
  const { accessToken } = useAuth();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isNewProfile, setIsNewProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;

    apiFetch<Profile>("/profiles/me", { accessToken })
      .then((profile) => {
        if (cancelled) return;
        setForm(profileToForm(profile));
        setIsNewProfile(false);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.code === "PROFILE_NOT_FOUND") {
          // Sensible empty state — not an error, just a fresh profile.
          setForm(emptyForm);
          setIsNewProfile(true);
        } else {
          setLoadError(
            err instanceof ApiError ? err.message : "Couldn't load your profile. Please try again."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setFieldErrors({});
    setSavedMessage(null);

    const body = {
      age: numberOrNull(form.age),
      heightCm: numberOrNull(form.heightCm),
      weightKg: numberOrNull(form.weightKg),
      targetWeightKg: numberOrNull(form.targetWeightKg),
      fitnessGoal: form.fitnessGoal || null,
      activityLevel: form.activityLevel || null,
      workoutFrequency: numberOrNull(form.workoutFrequency),
      availableEquipment: form.availableEquipment
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      dietaryPreference: form.dietaryPreference || null,
      preferredWorkoutType: form.preferredWorkoutType || null,
    };

    try {
      const profile = await apiFetch<Profile>("/profiles/me", {
        method: "PUT",
        body,
        accessToken,
      });
      setForm(profileToForm(profile));
      setIsNewProfile(false);
      setSavedMessage("Profile saved.");
    } catch (err) {
      if (err instanceof ApiError) {
        setSaveError(err.message);
        const nextFieldErrors: Record<string, string> = {};
        for (const detail of err.details) {
          if (
            typeof detail === "object" &&
            detail !== null &&
            "path" in detail &&
            "message" in detail
          ) {
            const { path, message } = detail as { path: string; message: string };
            nextFieldErrors[path] = message;
          }
        }
        setFieldErrors(nextFieldErrors);
      } else {
        setSaveError("Something went wrong. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-sm text-gray-500">Loading your profile…</p>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="flex flex-1 items-center justify-center px-6">
        <p className="text-sm text-red-600">{loadError}</p>
      </main>
    );
  }

  return (
    <main className="flex flex-1 justify-center px-6 py-10">
      <div className="w-full max-w-2xl">
        <h1 className="text-2xl font-bold">Fitness Profile</h1>
        <p className="mt-1 text-sm text-gray-500">
          {isNewProfile
            ? "Set up your profile so FITVERSE can tailor your experience."
            : "Update your profile at any time — saving replaces the full profile."}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <NumberField
            label="Age"
            value={form.age}
            onChange={(v) => updateField("age", v)}
            error={fieldErrors.age}
          />
          <NumberField
            label="Height (cm)"
            value={form.heightCm}
            onChange={(v) => updateField("heightCm", v)}
            error={fieldErrors.heightCm}
          />
          <NumberField
            label="Weight (kg)"
            value={form.weightKg}
            onChange={(v) => updateField("weightKg", v)}
            error={fieldErrors.weightKg}
          />
          <NumberField
            label="Target weight (kg)"
            value={form.targetWeightKg}
            onChange={(v) => updateField("targetWeightKg", v)}
            error={fieldErrors.targetWeightKg}
          />
          <SelectField
            label="Fitness goal"
            value={form.fitnessGoal}
            onChange={(v) => updateField("fitnessGoal", v)}
            options={FITNESS_GOAL_OPTIONS}
            error={fieldErrors.fitnessGoal}
          />
          <SelectField
            label="Activity level"
            value={form.activityLevel}
            onChange={(v) => updateField("activityLevel", v)}
            options={ACTIVITY_LEVEL_OPTIONS}
            error={fieldErrors.activityLevel}
          />
          <NumberField
            label="Workout frequency (days/week)"
            value={form.workoutFrequency}
            onChange={(v) => updateField("workoutFrequency", v)}
            error={fieldErrors.workoutFrequency}
          />
          <SelectField
            label="Dietary preference"
            value={form.dietaryPreference}
            onChange={(v) => updateField("dietaryPreference", v)}
            options={DIETARY_PREFERENCE_OPTIONS}
            error={fieldErrors.dietaryPreference}
          />
          <SelectField
            label="Preferred workout type"
            value={form.preferredWorkoutType}
            onChange={(v) => updateField("preferredWorkoutType", v)}
            options={WORKOUT_TYPE_OPTIONS}
            error={fieldErrors.preferredWorkoutType}
          />
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            Available equipment
            <input
              type="text"
              placeholder="e.g. dumbbells, resistance bands, pull-up bar"
              value={form.availableEquipment}
              onChange={(e) => updateField("availableEquipment", e.target.value)}
              className="rounded border border-gray-300 px-3 py-2"
            />
            <span className="text-xs text-gray-400">Comma-separated.</span>
            {fieldErrors.availableEquipment && (
              <span className="text-xs text-red-600">{fieldErrors.availableEquipment}</span>
            )}
          </label>

          <div className="sm:col-span-2">
            {saveError && <p className="mb-3 text-sm text-red-600">{saveError}</p>}
            {savedMessage && <p className="mb-3 text-sm text-green-600">{savedMessage}</p>}
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save profile"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

function NumberField({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label}
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-gray-300 px-3 py-2"
      />
      {error && <span className="text-xs text-red-600">{error}</span>}
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  error?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-gray-300 bg-white px-3 py-2"
      >
        <option value="">Not set</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </label>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileForm />
    </ProtectedRoute>
  );
}