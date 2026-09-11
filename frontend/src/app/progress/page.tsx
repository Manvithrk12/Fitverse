"use client";

import { FormEvent, useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/lib/auth-context";
import { ApiError, apiFetch } from "@/lib/api";
import { ProgressEntry, ProgressPhoto } from "@/lib/progress-types";

interface FormState {
  recordedAt: string;
  weight: string;
  chest: string;
  waist: string;
  hips: string;
  arms: string;
  thighs: string;
  bodyFatPercent: string;
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyForm(): FormState {
  return {
    recordedAt: todayDateString(),
    weight: "",
    chest: "",
    waist: "",
    hips: "",
    arms: "",
    thighs: "",
    bodyFatPercent: "",
  };
}

function entryToForm(e: ProgressEntry): FormState {
  return {
    recordedAt: e.recordedAt.slice(0, 10),
    weight: e.weight,
    chest: e.chest ?? "",
    waist: e.waist ?? "",
    hips: e.hips ?? "",
    arms: e.arms ?? "",
    thighs: e.thighs ?? "",
    bodyFatPercent: e.bodyFatPercent ?? "",
  };
}

function numberOrNull(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

function formToBody(form: FormState) {
  return {
    recordedAt: form.recordedAt ? new Date(`${form.recordedAt}T00:00:00.000Z`).toISOString() : null,
    weight: numberOrNull(form.weight),
    chest: numberOrNull(form.chest),
    waist: numberOrNull(form.waist),
    hips: numberOrNull(form.hips),
    arms: numberOrNull(form.arms),
    thighs: numberOrNull(form.thighs),
    bodyFatPercent: numberOrNull(form.bodyFatPercent),
  };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function PhotosSection({ entryId, accessToken }: { entryId: string; accessToken: string | null }) {
  const [photos, setPhotos] = useState<ProgressPhoto[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [adding, setAdding] = useState(false);

  function load() {
    setLoading(true);
    apiFetch<ProgressPhoto[]>(`/progress/${entryId}/photos`, { accessToken })
      .then(setPhotos)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load photos."))
      .finally(() => setLoading(false));
  }

  useEffect(load, [entryId, accessToken]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setAdding(true);
    setError(null);
    try {
      await apiFetch(`/progress/${entryId}/photos`, { method: "POST", body: { url }, accessToken });
      setUrl("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't add photo.");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(photoId: string) {
    try {
      await apiFetch(`/progress/${entryId}/photos/${photoId}`, { method: "DELETE", accessToken });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't delete photo.");
    }
  }

  return (
    <div className="mt-3 border-t border-gray-100 pt-3">
      {loading ? (
        <p className="text-xs text-gray-400">Loading photos…</p>
      ) : (
        <>
          {photos && photos.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {photos.map((p) => (
                // eslint-disable-next-line @next/next/no-img-element
                <div key={p.id} className="relative">
                  <img
                    src={p.url}
                    alt="Progress"
                    className="h-16 w-16 rounded border border-gray-200 object-cover"
                  />
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1.5 text-xs text-white"
                    title="Delete photo"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              type="text"
              placeholder="Photo URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs"
            />
            <button
              type="submit"
              disabled={adding}
              className="rounded border border-gray-300 px-2 py-1 text-xs disabled:opacity-50"
            >
              Add
            </button>
          </form>
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </>
      )}
    </div>
  );
}

function ProgressContent() {
  const { accessToken } = useAuth();
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function loadEntries() {
    setLoading(true);
    setListError(null);
    apiFetch<ProgressEntry[]>("/progress", { accessToken })
      .then(setEntries)
      .catch((err) => {
        setListError(err instanceof ApiError ? err.message : "Couldn't load your progress history.");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!accessToken) return;
    loadEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  function openCreateForm() {
    setEditingId(null);
    setForm(emptyForm());
    setFormError(null);
    setFieldErrors({});
    setFormOpen(true);
  }

  function openEditForm(e: ProgressEntry) {
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
        await apiFetch<ProgressEntry>(`/progress/${editingId}`, { method: "PUT", body, accessToken });
        setSuccessMessage("Progress entry updated.");
      } else {
        await apiFetch<ProgressEntry>("/progress", { method: "POST", body, accessToken });
        setSuccessMessage("Progress entry added.");
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

  async function handleDelete(e: ProgressEntry) {
    if (!confirm(`Delete the entry from ${formatDate(e.recordedAt)}? This can't be undone.`)) return;
    setBusyId(e.id);
    setActionError(null);
    try {
      await apiFetch(`/progress/${e.id}`, { method: "DELETE", accessToken });
      setSuccessMessage("Progress entry deleted.");
      loadEntries();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Couldn't delete entry.");
    } finally {
      setBusyId(null);
    }
  }

  const chartData = [...entries]
    .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime())
    .map((e) => ({ date: formatDate(e.recordedAt), weight: parseFloat(e.weight) }));

  return (
    <main className="flex flex-1 justify-center px-6 py-10">
      <div className="w-full max-w-3xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Progress</h1>
          {!formOpen && (
            <button
              onClick={openCreateForm}
              className="rounded bg-black px-4 py-2 text-sm font-medium text-white"
            >
              + Log progress
            </button>
          )}
        </div>

        {successMessage && <p className="mt-4 text-sm text-green-600">{successMessage}</p>}
        {actionError && <p className="mt-4 text-sm text-red-600">{actionError}</p>}

        {!loading && !listError && chartData.length >= 2 && (
          <div className="mt-6 h-56 rounded border border-gray-200 p-4">
            <p className="mb-2 text-xs font-medium text-gray-500">Weight trend</p>
            <ResponsiveContainer width="100%" height="90%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
                <Tooltip />
                <Line type="monotone" dataKey="weight" stroke="#000000" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {formOpen && (
          <form
            onSubmit={handleSubmit}
            className="mt-6 grid grid-cols-1 gap-4 rounded border border-gray-200 p-4 sm:grid-cols-2"
          >
            <label className="flex flex-col gap-1 text-sm">
              Date recorded
              <input
                type="date"
                value={form.recordedAt}
                onChange={(e) => setForm((f) => ({ ...f, recordedAt: e.target.value }))}
                className="rounded border border-gray-300 px-3 py-2"
                required
              />
              {fieldErrors.recordedAt && (
                <span className="text-xs text-red-600">{fieldErrors.recordedAt}</span>
              )}
            </label>

            <label className="flex flex-col gap-1 text-sm">
              Weight (kg)
              <input
                type="number"
                step="0.1"
                value={form.weight}
                onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))}
                className="rounded border border-gray-300 px-3 py-2"
                required
              />
              {fieldErrors.weight && <span className="text-xs text-red-600">{fieldErrors.weight}</span>}
            </label>

            <label className="flex flex-col gap-1 text-sm">
              Body fat (%)
              <input
                type="number"
                step="0.1"
                value={form.bodyFatPercent}
                onChange={(e) => setForm((f) => ({ ...f, bodyFatPercent: e.target.value }))}
                className="rounded border border-gray-300 px-3 py-2"
              />
              {fieldErrors.bodyFatPercent && (
                <span className="text-xs text-red-600">{fieldErrors.bodyFatPercent}</span>
              )}
            </label>

            <label className="flex flex-col gap-1 text-sm">
              Chest (cm)
              <input
                type="number"
                step="0.1"
                value={form.chest}
                onChange={(e) => setForm((f) => ({ ...f, chest: e.target.value }))}
                className="rounded border border-gray-300 px-3 py-2"
              />
              {fieldErrors.chest && <span className="text-xs text-red-600">{fieldErrors.chest}</span>}
            </label>

            <label className="flex flex-col gap-1 text-sm">
              Waist (cm)
              <input
                type="number"
                step="0.1"
                value={form.waist}
                onChange={(e) => setForm((f) => ({ ...f, waist: e.target.value }))}
                className="rounded border border-gray-300 px-3 py-2"
              />
              {fieldErrors.waist && <span className="text-xs text-red-600">{fieldErrors.waist}</span>}
            </label>

            <label className="flex flex-col gap-1 text-sm">
              Hips (cm)
              <input
                type="number"
                step="0.1"
                value={form.hips}
                onChange={(e) => setForm((f) => ({ ...f, hips: e.target.value }))}
                className="rounded border border-gray-300 px-3 py-2"
              />
              {fieldErrors.hips && <span className="text-xs text-red-600">{fieldErrors.hips}</span>}
            </label>

            <label className="flex flex-col gap-1 text-sm">
              Arms (cm)
              <input
                type="number"
                step="0.1"
                value={form.arms}
                onChange={(e) => setForm((f) => ({ ...f, arms: e.target.value }))}
                className="rounded border border-gray-300 px-3 py-2"
              />
              {fieldErrors.arms && <span className="text-xs text-red-600">{fieldErrors.arms}</span>}
            </label>

            <label className="flex flex-col gap-1 text-sm">
              Thighs (cm)
              <input
                type="number"
                step="0.1"
                value={form.thighs}
                onChange={(e) => setForm((f) => ({ ...f, thighs: e.target.value }))}
                className="rounded border border-gray-300 px-3 py-2"
              />
              {fieldErrors.thighs && <span className="text-xs text-red-600">{fieldErrors.thighs}</span>}
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
            <p className="text-sm text-gray-500">Loading your progress history…</p>
          ) : listError ? (
            <p className="text-sm text-red-600">{listError}</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-gray-500">
              No progress logged yet. Add your first entry to get started.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {entries.map((e) => (
                <li key={e.id} className="rounded border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="font-semibold">{formatDate(e.recordedAt)}</h2>
                      <p className="mt-1 text-xs text-gray-500">
                        {e.weight} kg
                        {e.bodyFatPercent != null ? ` · ${e.bodyFatPercent}% body fat` : ""}
                        {e.chest != null ? ` · Chest ${e.chest}cm` : ""}
                        {e.waist != null ? ` · Waist ${e.waist}cm` : ""}
                        {e.hips != null ? ` · Hips ${e.hips}cm` : ""}
                        {e.arms != null ? ` · Arms ${e.arms}cm` : ""}
                        {e.thighs != null ? ` · Thighs ${e.thighs}cm` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                      <button
                        onClick={() => setExpandedId(expandedId === e.id ? null : e.id)}
                        className="rounded border border-gray-300 px-3 py-1.5 text-xs"
                      >
                        {expandedId === e.id ? "Hide photos" : "Photos"}
                      </button>
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
                  {expandedId === e.id && <PhotosSection entryId={e.id} accessToken={accessToken} />}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}

export default function ProgressPage() {
  return (
    <ProtectedRoute>
      <ProgressContent />
    </ProtectedRoute>
  );
}
