"use client";

import { FormEvent, useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/lib/auth-context";
import { ApiError, apiFetch } from "@/lib/api";
import { MEAL_TYPE_OPTIONS, NutritionEntry, NutritionForDate } from "@/lib/nutrition-types";

interface FormState {
  foodName: string;
  mealType: string;
  servingSize: string;
  calories: string;
  proteinGrams: string;
  carbohydratesGrams: string;
  fatGrams: string;
  consumedAt: string; // datetime-local format
}

function todayUtcDateString(): string {
  // Matches the backend's UTC calendar-day boundary for ?date=, so the
  // client's "today" and the server's "today" agree without needing
  // per-user timezone handling.
  return new Date().toISOString().slice(0, 10);
}

function nowAsDatetimeLocal(): string {
  const d = new Date();
  d.setSeconds(0, 0);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function emptyForm(consumedAtDefault: string): FormState {
  return {
    foodName: "",
    mealType: "",
    servingSize: "",
    calories: "",
    proteinGrams: "",
    carbohydratesGrams: "",
    fatGrams: "",
    consumedAt: consumedAtDefault,
  };
}

function entryToForm(e: NutritionEntry): FormState {
  const d = new Date(e.consumedAt);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return {
    foodName: e.foodName,
    mealType: e.mealType,
    servingSize: e.servingSize,
    calories: e.calories.toString(),
    proteinGrams: e.proteinGrams?.toString() ?? "",
    carbohydratesGrams: e.carbohydratesGrams?.toString() ?? "",
    fatGrams: e.fatGrams?.toString() ?? "",
    consumedAt: local.toISOString().slice(0, 16),
  };
}

function numberOrNull(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

function formToBody(form: FormState) {
  return {
    foodName: form.foodName,
    mealType: form.mealType || null,
    servingSize: form.servingSize,
    calories: numberOrNull(form.calories),
    proteinGrams: numberOrNull(form.proteinGrams),
    carbohydratesGrams: numberOrNull(form.carbohydratesGrams),
    fatGrams: numberOrNull(form.fatGrams),
    consumedAt: form.consumedAt ? new Date(form.consumedAt).toISOString() : null,
  };
}

function mealTypeLabel(value: string): string {
  return MEAL_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

function NutritionContent() {
  const { accessToken } = useAuth();
  const [selectedDate, setSelectedDate] = useState(todayUtcDateString());
  const [data, setData] = useState<NutritionForDate | null>(null);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm(nowAsDatetimeLocal()));
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function loadEntries() {
    setLoading(true);
    setListError(null);
    apiFetch<NutritionForDate>(`/nutrition?date=${selectedDate}`, { accessToken })
      .then(setData)
      .catch((err) => {
        setListError(err instanceof ApiError ? err.message : "Couldn't load your nutrition entries.");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!accessToken) return;
    loadEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, selectedDate]);

  function openCreateForm() {
    setEditingId(null);
    setForm(emptyForm(nowAsDatetimeLocal()));
    setFormError(null);
    setFieldErrors({});
    setFormOpen(true);
  }

  function openEditForm(e: NutritionEntry) {
    setEditingId(e.id);
    setForm(entryToForm(e));
    setFormError(null);
    setFieldErrors({});
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    setFieldErrors({});

    try {
      const body = formToBody(form);
      if (editingId) {
        await apiFetch<NutritionEntry>(`/nutrition/${editingId}`, { method: "PUT", body, accessToken });
        setSuccessMessage("Entry updated.");
      } else {
        await apiFetch<NutritionEntry>("/nutrition", { method: "POST", body, accessToken });
        setSuccessMessage("Entry added.");
      }
      closeForm();
      loadEntries();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
        const next: Record<string, string> = {};
        for (const detail of err.details) {
          if (typeof detail === "object" && detail !== null && "path" in detail && "message" in detail) {
            const { path, message } = detail as { path: string; message: string };
            next[path] = message;
          }
        }
        setFieldErrors(next);
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(e: NutritionEntry) {
    if (!confirm(`Delete "${e.foodName}"? This can't be undone.`)) return;
    setBusyId(e.id);
    setActionError(null);
    try {
      await apiFetch(`/nutrition/${e.id}`, { method: "DELETE", accessToken });
      setSuccessMessage("Entry deleted.");
      loadEntries();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Couldn't delete entry.");
    } finally {
      setBusyId(null);
    }
  }

  const totals = data?.totals;

  return (
    <main className="flex flex-1 justify-center px-6 py-10">
      <div className="w-full max-w-3xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Nutrition</h1>
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded border border-gray-300 px-3 py-2 text-sm"
            />
            {!formOpen && (
              <button
                onClick={openCreateForm}
                className="rounded bg-black px-4 py-2 text-sm font-medium text-white"
              >
                + Log food
              </button>
            )}
          </div>
        </div>

        {successMessage && <p className="mt-4 text-sm text-green-600">{successMessage}</p>}
        {actionError && <p className="mt-4 text-sm text-red-600">{actionError}</p>}

        {totals && !loading && !listError && (
          <div className="mt-6 grid grid-cols-2 gap-3 rounded border border-gray-200 p-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-gray-500">Calories</p>
              <p className="text-lg font-semibold">{totals.calories}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Protein</p>
              <p className="text-lg font-semibold">{totals.proteinGrams}g</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Carbs</p>
              <p className="text-lg font-semibold">{totals.carbohydratesGrams}g</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Fat</p>
              <p className="text-lg font-semibold">{totals.fatGrams}g</p>
            </div>
          </div>
        )}

        {formOpen && (
          <form
            onSubmit={handleSubmit}
            className="mt-6 grid grid-cols-1 gap-4 rounded border border-gray-200 p-4 sm:grid-cols-2"
          >
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              Food name
              <input
                type="text"
                value={form.foodName}
                onChange={(e) => setForm((f) => ({ ...f, foodName: e.target.value }))}
                className="rounded border border-gray-300 px-3 py-2"
                required
              />
              {fieldErrors.foodName && <span className="text-xs text-red-600">{fieldErrors.foodName}</span>}
            </label>

            <label className="flex flex-col gap-1 text-sm">
              Meal
              <select
                value={form.mealType}
                onChange={(e) => setForm((f) => ({ ...f, mealType: e.target.value }))}
                className="rounded border border-gray-300 bg-white px-3 py-2"
                required
              >
                <option value="">Select meal</option>
                {MEAL_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {fieldErrors.mealType && <span className="text-xs text-red-600">{fieldErrors.mealType}</span>}
            </label>

            <label className="flex flex-col gap-1 text-sm">
              Serving size
              <input
                type="text"
                placeholder="e.g. 1 cup, 200g"
                value={form.servingSize}
                onChange={(e) => setForm((f) => ({ ...f, servingSize: e.target.value }))}
                className="rounded border border-gray-300 px-3 py-2"
                required
              />
              {fieldErrors.servingSize && (
                <span className="text-xs text-red-600">{fieldErrors.servingSize}</span>
              )}
            </label>

            <label className="flex flex-col gap-1 text-sm">
              Calories
              <input
                type="number"
                value={form.calories}
                onChange={(e) => setForm((f) => ({ ...f, calories: e.target.value }))}
                className="rounded border border-gray-300 px-3 py-2"
                required
              />
              {fieldErrors.calories && <span className="text-xs text-red-600">{fieldErrors.calories}</span>}
            </label>

            <label className="flex flex-col gap-1 text-sm">
              Logged at
              <input
                type="datetime-local"
                value={form.consumedAt}
                onChange={(e) => setForm((f) => ({ ...f, consumedAt: e.target.value }))}
                className="rounded border border-gray-300 px-3 py-2"
                required
              />
              {fieldErrors.consumedAt && (
                <span className="text-xs text-red-600">{fieldErrors.consumedAt}</span>
              )}
            </label>

            <label className="flex flex-col gap-1 text-sm">
              Protein (g)
              <input
                type="number"
                step="0.1"
                value={form.proteinGrams}
                onChange={(e) => setForm((f) => ({ ...f, proteinGrams: e.target.value }))}
                className="rounded border border-gray-300 px-3 py-2"
              />
              {fieldErrors.proteinGrams && (
                <span className="text-xs text-red-600">{fieldErrors.proteinGrams}</span>
              )}
            </label>

            <label className="flex flex-col gap-1 text-sm">
              Carbohydrates (g)
              <input
                type="number"
                step="0.1"
                value={form.carbohydratesGrams}
                onChange={(e) => setForm((f) => ({ ...f, carbohydratesGrams: e.target.value }))}
                className="rounded border border-gray-300 px-3 py-2"
              />
              {fieldErrors.carbohydratesGrams && (
                <span className="text-xs text-red-600">{fieldErrors.carbohydratesGrams}</span>
              )}
            </label>

            <label className="flex flex-col gap-1 text-sm">
              Fat (g)
              <input
                type="number"
                step="0.1"
                value={form.fatGrams}
                onChange={(e) => setForm((f) => ({ ...f, fatGrams: e.target.value }))}
                className="rounded border border-gray-300 px-3 py-2"
              />
              {fieldErrors.fatGrams && <span className="text-xs text-red-600">{fieldErrors.fatGrams}</span>}
            </label>

            {formError && <p className="text-sm text-red-600 sm:col-span-2">{formError}</p>}

            <div className="flex gap-3 sm:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {saving ? "Saving…" : editingId ? "Save changes" : "Add entry"}
              </button>
              <button
                type="button"
                onClick={closeForm}
                className="rounded border border-gray-300 px-4 py-2 text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="mt-6">
          {loading ? (
            <p className="text-sm text-gray-500">Loading your nutrition entries…</p>
          ) : listError ? (
            <p className="text-sm text-red-600">{listError}</p>
          ) : !data || data.entries.length === 0 ? (
            <p className="text-sm text-gray-500">No entries logged for this date yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {data.entries.map((e) => (
                <li key={e.id} className="rounded border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-semibold">{e.foodName}</h2>
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                          {mealTypeLabel(e.mealType)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        {e.servingSize} · {e.calories} kcal
                        {e.proteinGrams != null ? ` · P ${e.proteinGrams}g` : ""}
                        {e.carbohydratesGrams != null ? ` · C ${e.carbohydratesGrams}g` : ""}
                        {e.fatGrams != null ? ` · F ${e.fatGrams}g` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                      <button
                        onClick={() => openEditForm(e)}
                        className="rounded border border-gray-300 px-3 py-1.5 text-xs"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(e)}
                        disabled={busyId === e.id}
                        className="rounded border border-red-300 px-3 py-1.5 text-xs text-red-600 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}

export default function NutritionPage() {
  return (
    <ProtectedRoute>
      <NutritionContent />
    </ProtectedRoute>
  );
}
