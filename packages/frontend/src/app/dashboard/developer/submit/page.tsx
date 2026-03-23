"use client";

import { useState, useRef } from "react";
import api from "@/lib/api";

const ACCEPTED_MIME = "application/zip";
const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

type SubmissionType = "plugin" | "theme";

interface ManifestPreview {
  name?: string;
  version?: string;
  description?: string;
  author?: string;
  category?: string;
  price?: number;
  licenseType?: string;
  [key: string]: unknown;
}

export default function DeveloperSubmitPage() {
  const [type, setType] = useState<SubmissionType>("plugin");
  const [file, setFile] = useState<File | null>(null);
  const [manifest, setManifest] = useState<ManifestPreview | null>(null);
  const [manifestError, setManifestError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    setManifest(null);
    setManifestError(null);
    setError(null);

    if (f.type !== ACCEPTED_MIME && !f.name.endsWith(".zip")) {
      setError("Only .zip files are accepted.");
      setFile(null);
      return;
    }
    if (f.size > MAX_BYTES) {
      setError("File size must be 50 MB or less.");
      setFile(null);
      return;
    }

    setFile(f);

    // Try to extract manifest.json preview using the browser's native ZIP reading
    try {
      const { BlobReader, ZipReader, TextWriter } =
        await import("@zip.js/zip.js").catch(() => {
          throw new Error("zip.js not available — manifest preview skipped.");
        });
      const reader = new ZipReader(new BlobReader(f));
      // Cast to any[] because Entry is FileEntry|DirectoryEntry; getData only on FileEntry
      const entries = (await reader.getEntries()) as any[];
      const manifestEntry = entries.find(
        (e: any) => !e.directory && e.filename === "manifest.json",
      );
      if (manifestEntry?.getData) {
        const text = await manifestEntry.getData(new TextWriter());
        setManifest(JSON.parse(text) as ManifestPreview);
      }
      await reader.close();
    } catch {
      // Manifest preview is optional; silently skip errors
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const result = await api.submitPluginPackage(formData);
      setSubmitted(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-6">
          Submit {type === "plugin" ? "Plugin" : "Theme"}
        </h1>
        <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
          <div className="text-4xl mb-4">🎉</div>
          <h2 className="text-lg font-semibold text-green-800 mb-2">
            Submission received!
          </h2>
          <p className="text-sm text-green-700 mb-2">
            Your {type} has been queued for automated security scanning. You'll
            receive an email once the review is complete.
          </p>
          {submitted.id && (
            <p className="text-xs text-green-600 font-mono">
              Submission ID: {submitted.id}
            </p>
          )}
          <button
            onClick={() => {
              setSubmitted(null);
              setFile(null);
              setManifest(null);
            }}
            className="mt-6 text-sm text-brand-600 hover:underline"
          >
            Submit another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          Submit Plugin / Theme
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Upload a ZIP package. Submitted items go through automated security
          scanning before admin review.
        </p>
      </div>

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Type selector */}
          <div className="bg-white border rounded-xl p-5">
            <label className="block text-sm font-medium text-slate-700 mb-3">
              What are you submitting?
            </label>
            <div className="flex gap-3">
              {(["plugin", "theme"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex-1 py-3 rounded-lg border text-sm font-medium transition-colors ${
                    type === t
                      ? "border-brand-600 bg-brand-50 text-brand-700"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {t === "plugin" ? "🧩 Plugin" : "🎨 Theme"}
                </button>
              ))}
            </div>
          </div>

          {/* ZIP upload */}
          <div className="bg-white border rounded-xl p-5">
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Package ZIP{" "}
              <span className="text-slate-400 font-normal">(max 50 MB)</span>
            </label>

            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                file
                  ? "border-brand-300 bg-brand-50"
                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              }`}
              onClick={() => fileRef.current?.click()}
            >
              {file ? (
                <>
                  <div className="text-3xl mb-2">📦</div>
                  <p className="text-sm font-medium text-slate-900">
                    {file.name}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      setManifest(null);
                      if (fileRef.current) fileRef.current.value = "";
                    }}
                    className="mt-2 text-xs text-red-500 hover:underline"
                  >
                    Remove
                  </button>
                </>
              ) : (
                <>
                  <div className="text-3xl mb-2">📂</div>
                  <p className="text-sm text-slate-600">
                    Click to select a ZIP file
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    or drag and drop
                  </p>
                </>
              )}
            </div>

            <input
              ref={fileRef}
              type="file"
              accept=".zip,application/zip"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Manifest preview */}
          {manifest && (
            <div className="bg-white border rounded-xl p-5">
              <h3 className="text-sm font-medium text-slate-700 mb-3">
                manifest.json preview
              </h3>
              <div className="space-y-2 text-sm">
                {(
                  [
                    "name",
                    "version",
                    "description",
                    "author",
                    "category",
                    "licenseType",
                  ] as const
                ).map((field) =>
                  manifest[field] ? (
                    <div key={field} className="flex gap-3">
                      <span className="text-slate-400 capitalize w-24 shrink-0">
                        {field}
                      </span>
                      <span className="text-slate-700 font-medium">
                        {String(manifest[field])}
                      </span>
                    </div>
                  ) : null,
                )}
                {manifest.price !== undefined && (
                  <div className="flex gap-3">
                    <span className="text-slate-400 capitalize w-24 shrink-0">
                      price
                    </span>
                    <span className="text-slate-700 font-medium">
                      {manifest.price === 0
                        ? "Free"
                        : new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: "USD",
                          }).format(manifest.price / 100)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {manifestError && (
            <p className="text-xs text-amber-600">{manifestError}</p>
          )}

          {/* Requirements */}
          <div className="bg-slate-50 border rounded-xl p-5 text-xs text-slate-500 space-y-1.5">
            <p className="font-medium text-slate-700 text-sm mb-2">
              Submission requirements
            </p>
            <p>
              ✓ ZIP must contain a valid{" "}
              <code className="font-mono">manifest.json</code> at the root
            </p>
            <p>
              ✓ No use of <code className="font-mono">eval()</code>,{" "}
              <code className="font-mono">exec()</code>, or{" "}
              <code className="font-mono">child_process</code>
            </p>
            <p>✓ No HIGH-severity npm audit vulnerabilities</p>
            <p>✓ Max file size: 50 MB</p>
            <p>
              ✓ Package type must be{" "}
              <code className="font-mono">application/zip</code>
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!file || submitting}
            className="w-full py-3 bg-brand-600 text-white font-medium rounded-xl hover:bg-brand-700 disabled:opacity-50 transition-colors text-sm"
          >
            {submitting
              ? "Uploading…"
              : `Submit ${type === "plugin" ? "Plugin" : "Theme"}`}
          </button>
        </form>
      </div>
    </div>
  );
}
