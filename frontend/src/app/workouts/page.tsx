"use client";

import { FormEvent, useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/lib/auth-context";
import { ApiError, apiFetch } from "@/lib/api";
import { WORKOUT_TYPE_OPTIONS } from "@/lib/profile-types";
import { Workout } from "@/lib/workout-types";

interface FormState {
  title: string;
  workoutType: string;
  description: string;
  scheduledDate: string; // yyyy-mm-dd, <input type="date"> format
  durationMinutes: string;
}

const emptyForm: FormState = {
  title: "",
  workoutType: "",
  description: "",
  scheduledDate: "",
  durationMinutes: "",
};

function workoutToForm(w: Workout): FormState {
  return {
    title: w.title,
    workoutType: w.workoutType ?? "",
    description: w.description ?? "",
    scheduledDate: w.scheduledDate ? w.scheduledDate.slice(0, 10) : "",
    durationMinutes: w.durationMinutes?.toString() ?? "",
  };
}

function numberOrNull(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

function formToBody(form: FormState) {
  return {
    title: form.title,
    workoutType: form.workoutType || null,
    description: form.description.trim() || null,
    scheduledDate: form.scheduledDate ? new Date(form.scheduledDate).toISOString() : null,
    durationMinutes: numberOrNull(form.durationMinutes),
  };
}

function formatDate(iso: string | null): string {
  if (!iso) return "No date set";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function WorkoutsContent() {
  const { accessToken } = useAuth();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function loadWorkouts() {
    setLoading(true);
    setListError(null);
    apiFetch<Workout[]>("/workouts", { accessToken })
      .then(setWorkouts)
      .catch((err) => {
        setListError(err instanceof ApiError ? err.message : "Couldn't load your workouts.");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!accessToken) return;
    loadWorkouts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  function openCreateForm() {
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
    setFieldErrors({});
    setFormOpen(true);
  }

  function openEditForm(w: Workout) {
    setEditingId(w.id);
    setForm(workoutToForm(w));
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
        const updated = await apiFetch<Workout>(`/workouts/${editingId}`, {
          method: "PUT",
          body,
          accessToken,
        });
        setWorkouts((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
        setSuccessMessage("Workout updated.");
      } else {
        const created = await apiFetch<Workout>("/workouts", { method: "POST", body, accessToken });
        setWorkouts((prev) => [created, ...prev]);
        setSuccessMessage("Workout created.");
      }
      closeForm();
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

  async function handleComplete(w: Workout) {
    if (w.status === "COMPLETED") return;
    setBusyId(w.id);
    setActionError(null);
    try {
      const updated = await apiFetch<Workout>(`/workouts/${w.id}/complete`, {
        method: "PATCH",
        accessToken,
      });
      setWorkouts((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Couldn't mark workout complete.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(w: Workout) {
    if (!confirm(`Delete "${w.title}"? This can't be undone.`)) return;
    setBusyId(w.id);
    setActionError(null);
    try {
      await apiFetch(`/workouts/${w.id}`, { method: "DELETE", accessToken });
      setWorkouts((prev) => prev.filter((x) => x.id !== w.id));
      setSuccessMessage("Workout deleted.");
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Couldn't delete workout.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="flex flex-1 justify-center px-6 py-10">
      <div className="w-full max-w-3xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Workouts</h1>
          {!formOpen && (
            <button
              onClick={openCreateForm}
              className="rounded bg-black px-4 py-2 text-sm font-medium text-white"
            >
              + New workout
            </button>
          )}
        </div>

        {successMessage && <p className="mt-4 text-sm text-green-600">{successMessage}</p>}
        {actionError && <p className="mt-4 text-sm text-red-600">{actionError}</p>}

        {formOpen && (
          <form
            onSubmit={handleSubmit}
            className="mt-6 grid grid-cols-1 gap-4 rounded border border-gray-200 p-4 sm:grid-cols-2"
          >
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              Title
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="rounded border border-gray-300 px-3 py-2"
                required
              />
              {fieldErrors.title && <span className="text-xs text-red-600">{fieldErrors.title}</span>}
            </label>

            <label className="flex flex-col gap-1 text-sm">
              Workout type
              <select
                value={form.workoutType}
                onChange={(e) => setForm((f) => ({ ...f, workoutType: e.target.value }))}
                className="rounded border border-gray-300 bg-white px-3 py-2"
              >
                <option value="">Not set</option>
                {WORKOUT_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {fieldErrors.workoutType && (
                <span className="text-xs text-red-600">{fieldErrors.workoutType}</span>
              )}
            </label>

            <label className="flex flex-col gap-1 text-sm">
              Duration (minutes)
              <input
                type="number"
                value={form.durationMinutes}
                onChange={(e) => setForm((f) => ({ ...f, durationMinutes: e.target.value }))}
                className="rounded border border-gray-300 px-3 py-2"
              />
              {fieldErrors.durationMinutes && (
                <span className="text-xs text-red-600">{fieldErrors.durationMinutes}</span>
              )}
            </label>

            <label className="flex flex-col gap-1 text-sm">
              Scheduled date
              <input
                type="date"
                value={form.scheduledDate}
                onChange={(e) => setForm((f) => ({ ...f, scheduledDate: e.target.value }))}
                className="rounded border border-gray-300 px-3 py-2"
              />
              {fieldErrors.scheduledDate && (
                <span className="text-xs text-red-600">{fieldErrors.scheduledDate}</span>
              )}
            </label>

            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              Notes
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="rounded border border-gray-300 px-3 py-2"
                rows={3}
              />
              {fieldErrors.description && (
                <span className="text-xs text-red-600">{fieldErrors.description}</span>
              )}
            </label>

            {formError && <p className="text-sm text-red-600 sm:col-span-2">{formError}</p>}

            <div className="flex gap-3 sm:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {saving ? "Saving…" : editingId ? "Save changes" : "Create workout"}
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
            <p className="text-sm text-gray-500">Loading your workouts…</p>
          ) : listError ? (
            <p className="text-sm text-red-600">{listError}</p>
          ) : workouts.length === 0 ? (
            <p className="text-sm text-gray-500">
              No workouts yet. Create your first one to get started.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {workouts.map((w) => (
                <li key={w.id} className="rounded border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-semibold">{w.title}</h2>
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-medium ${
                            w.status === "COMPLETED"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {w.status === "COMPLETED" ? "Completed" : "Planned"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        {formatDate(w.scheduledDate)}
                        {w.durationMinutes ? ` · ${w.durationMinutes} min` : ""}
                        {w.workoutType
                          ? ` · ${WORKOUT_TYPE_OPTIONS.find((o) => o.value === w.workoutType)?.label ?? w.workoutType}`
                          : ""}
                      </p>
                      {w.description && <p className="mt-2 text-sm text-gray-600">{w.description}</p>}
                    </div>
                    <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                      {w.status !== "COMPLETED" && (
                        <button
                          onClick={() => handleComplete(w)}
                          disabled={busyId === w.id}
                          className="rounded border border-gray-300 px-3 py-1.5 text-xs disabled:opacity-50"
                        >
                          Mark complete
                        </button>
                      )}
                      <button
                        onClick={() => openEditForm(w)}
                        className="rounded border border-gray-300 px-3 py-1.5 text-xs"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(w)}
                        disabled={busyId === w.id}
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

export default function WorkoutsPage() {
  return (
    <ProtectedRoute>
      <WorkoutsContent />
    </ProtectedRoute>
  );
}
