"use client";

import { useEffect, useRef, useState } from "react";

type Mode = "tailor" | "build";

type WorkExperience = {
  title: string;
  employer: string;
  duration: string;
  bullets: string[];
};

type CvData = {
  name: string;

  contact: {
    phone: string;
    email: string;
    location: string;
  };

  profile: string;

  workExperience: WorkExperience[];

  skills: string[];
  languages: string[];

  drivingLicence: string[];
  vca: string[];
  documents: string[];
  certificates: string[];
  education: string[];
  additionalInformation: string[];
};

type Result = {
  matchScore?: number;
  missingKeywords?: string[];
  cv?: CvData;
  coverLetter?: string;
  creditsRemaining?: number | null;
  locked?: boolean;
  generationId?: string;
  previewName?: string;
  previewEmail?: string;
  accountEmail?: string;
};

const placeholderValues = new Set([
  "not provided",
  "not specified",
  "unknown",
  "n/a",
  "none",
]);

function cleanText(value?: string) {
  const cleaned = typeof value === "string" ? value.trim() : "";

  return placeholderValues.has(cleaned.toLowerCase())
    ? ""
    : cleaned;
}

function hasItems(items?: string[]) {
  return cleanItems(items).length > 0;
}

function cleanItems(items?: string[]) {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => cleanText(item))
    .filter(Boolean);
}


function extractEmailFromText(text: string) {
  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match?.[0] || "";
}

function extractNameFromText(text: string) {
  const firstLine = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);

  if (!firstLine) return "";

  if (firstLine.includes("@") || /\d{4,}/.test(firstLine)) {
    return "";
  }

  return firstLine.slice(0, 80);
}

function getDrivingLicenceItems(items?: string[]) {
  const cleaned = cleanItems(items);

  const genericLicenceWords = [
    "driving licence",
    "driving license",
    "driver licence",
    "driver license",
  ];

  const specificItems = cleaned.filter(
    (item) =>
      !genericLicenceWords.includes(item.toLowerCase())
  );

  return {
    exists: cleaned.length > 0,
    specificItems,
  };
}

export default function Home() {
  const [mode, setMode] = useState<Mode>("tailor");

  const [cvText, setCvText] = useState("");
  const [jobDescription, setJobDescription] = useState("");

  const [aboutMe, setAboutMe] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [result, setResult] = useState<Result | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [lockedGenerationId, setLockedGenerationId] = useState("");
  const [lockedPreviewName, setLockedPreviewName] = useState("");
  const [lockedPreviewEmail, setLockedPreviewEmail] = useState("");
  const [lockedMatchScore, setLockedMatchScore] = useState<number | null>(null);

  const [paymentEmail, setPaymentEmail] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");
  const [paymentNotice, setPaymentNotice] = useState("");
  const [unlockLoading, setUnlockLoading] = useState(false);

  const [accountEmail, setAccountEmail] = useState("");
  const [accountCredits, setAccountCredits] = useState<number | null>(null);
  const [accountLoading, setAccountLoading] = useState(true);

  const [returningOpen, setReturningOpen] = useState(false);
  const [returningEmail, setReturningEmail] = useState("");
  const [returningLoading, setReturningLoading] = useState(false);
  const [returningMessage, setReturningMessage] = useState("");

  const resultRef = useRef<HTMLElement | null>(null);

  async function handleLogout() {
    try {
      setAccountLoading(true);

      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Could not sign out.");
      }

      // IMPORTANT:
      // Never restore the previous customer's paid CV/account after logout.
      window.localStorage.removeItem("applyfast_last_unlocked");
      window.sessionStorage.removeItem("applyfast_locked_preview");
      window.sessionStorage.removeItem("applyfast_draft");

      setAccountEmail("");
      setAccountCredits(null);
      setReturningOpen(false);
      setReturningMessage("");
      setResult(null);
      setPaymentNotice("");
      setPaymentMessage("");
      setPaymentEmail("");
      setLockedGenerationId("");
      setLockedPreviewName("");
      setLockedPreviewEmail("");
      setLockedMatchScore(null);

      // Full reload guarantees the browser re-checks the cleared Supabase cookies.
      window.location.replace("/");
    } catch (error) {
      console.error("ApplyFast logout failed:", error);
      setAccountLoading(false);
    }
  }

  useEffect(() => {
    const canonicalHost = "applyfast-six.vercel.app";

    if (
      window.location.hostname.endsWith(".vercel.app") &&
      window.location.hostname !== canonicalHost
    ) {
      window.location.replace(
        `https://${canonicalHost}${window.location.pathname}${window.location.search}${window.location.hash}`
      );
      return;
    }

    async function loadAccount() {
      try {
        const response = await fetch("/api/account", {
          method: "GET",
          cache: "no-store",
        });

        const data = await response.json().catch(() => ({}));

        if (response.ok && data?.authenticated) {
          setAccountEmail(
            typeof data.email === "string" ? data.email : ""
          );

          setAccountCredits(
            typeof data.credits === "number" ? data.credits : 0
          );

          setReturningOpen(false);
          setReturningMessage("");
        } else {
          setAccountEmail("");
          setAccountCredits(null);
        }
      } catch {
        setAccountEmail("");
        setAccountCredits(null);
      } finally {
        setAccountLoading(false);
      }
    }

    async function unlockGeneration(
      generationId: string,
      sessionId: string,
      restoring: boolean
    ) {
      setUnlockLoading(true);

      if (!restoring) {
        setPaymentNotice("Payment confirmed. Unlocking your CV...");
      }

      try {
        const response = await fetch("/api/unlock", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            generationId,
            sessionId,
          }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            data.message ||
              data.error ||
              "Payment succeeded, but we could not unlock the CV yet."
          );
        }

        setResult(data);
        setLockedGenerationId("");
        setLockedPreviewName("");
        setLockedPreviewEmail("");
        setLockedMatchScore(null);
        setPaymentMessage("");

        if (typeof data.accountEmail === "string") {
          setAccountEmail(data.accountEmail);
        }

        if (typeof data.creditsRemaining === "number") {
          setAccountCredits(data.creditsRemaining);
        }

        setPaymentNotice(
          restoring
            ? "Your last unlocked CV has been restored."
            : typeof data.creditsRemaining === "number"
              ? `Unlocked. ${data.creditsRemaining} application credits remaining.`
              : "Your CV is unlocked."
        );

        /*
          Keep ONLY the Stripe session + generation id locally.
          The full paid CV stays in Supabase and is fetched again securely.
        */
        window.localStorage.setItem(
          "applyfast_last_unlocked",
          JSON.stringify({
            generationId,
            sessionId,
          })
        );

        window.sessionStorage.removeItem("applyfast_locked_preview");
        window.sessionStorage.removeItem("applyfast_draft");

        if (!restoring) {
          window.history.replaceState(
            {},
            "",
            window.location.pathname
          );
        }
      } finally {
        setUnlockLoading(false);
      }
    }

    async function restoreAndUnlock() {
      try {
        const savedDraft = window.sessionStorage.getItem("applyfast_draft");

        if (savedDraft) {
          const draft = JSON.parse(savedDraft);

          if (draft.mode === "tailor" || draft.mode === "build") {
            setMode(draft.mode);
          }

          if (typeof draft.cvText === "string") setCvText(draft.cvText);
          if (typeof draft.jobDescription === "string") {
            setJobDescription(draft.jobDescription);
          }
          if (typeof draft.aboutMe === "string") setAboutMe(draft.aboutMe);
          if (typeof draft.fullName === "string") setFullName(draft.fullName);
          if (typeof draft.email === "string") setEmail(draft.email);
          if (typeof draft.phone === "string") setPhone(draft.phone);
        }

        const savedLocked = window.sessionStorage.getItem(
          "applyfast_locked_preview"
        );

        if (savedLocked) {
          const locked = JSON.parse(savedLocked);

          if (typeof locked.generationId === "string") {
            setLockedGenerationId(locked.generationId);
          }

          if (typeof locked.previewName === "string") {
            setLockedPreviewName(locked.previewName);
          }

          if (typeof locked.previewEmail === "string") {
            setLockedPreviewEmail(locked.previewEmail);
          }

          if (typeof locked.matchScore === "number") {
            setLockedMatchScore(locked.matchScore);
          }
        }

        await loadAccount();

        const params = new URLSearchParams(window.location.search);
        const payment = params.get("payment");
        const sessionId = params.get("session_id");
        const generationId = params.get("generation_id");

        if (payment === "cancel") {
          setPaymentNotice("Payment was cancelled. Nothing was charged.");
          return;
        }

        if (
          payment === "success" &&
          sessionId &&
          generationId
        ) {
          await unlockGeneration(
            generationId,
            sessionId,
            false
          );
          return;
        }

        /*
          Fix for refresh, browser crash, accidental navigation, etc.
          If the user already paid, restore the last unlocked CV from
          Supabase instead of forcing them to start over.
        */
        const lastUnlockedRaw = window.localStorage.getItem(
          "applyfast_last_unlocked"
        );

        if (!lastUnlockedRaw) {
          return;
        }

        const lastUnlocked = JSON.parse(lastUnlockedRaw);

        if (
          typeof lastUnlocked.generationId === "string" &&
          typeof lastUnlocked.sessionId === "string"
        ) {
          await unlockGeneration(
            lastUnlocked.generationId,
            lastUnlocked.sessionId,
            true
          );
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Could not restore your ApplyFast session."
        );
      }
    }

    restoreAndUnlock();
  }, []);

  useEffect(() => {
    if (!result || !resultRef.current) return;

    const timer = window.setTimeout(() => {
      resultRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 150);

    return () => window.clearTimeout(timer);
  }, [result]);

  function saveDraft() {
    try {
      window.sessionStorage.setItem(
        "applyfast_draft",
        JSON.stringify({
          mode,
          cvText,
          jobDescription,
          aboutMe,
          fullName,
          email,
          phone,
        })
      );
    } catch {
      // Ignore storage errors.
    }
  }

  function saveLockedPreview(data: {
    generationId: string;
    previewName?: string;
    previewEmail?: string;
    matchScore?: number;
  }) {
    try {
      window.sessionStorage.setItem(
        "applyfast_locked_preview",
        JSON.stringify(data)
      );
    } catch {
      // Ignore storage errors.
    }
  }

  async function sendReturningSignIn() {
    setReturningMessage("");

    const normalizedEmail = returningEmail.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setReturningMessage("Enter a valid email address.");
      return;
    }

    setReturningLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: normalizedEmail,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error || "Could not send the sign-in email."
        );
      }

      setReturningMessage(
        "Check your email and open the ApplyFast sign-in link. When you return, your saved credit balance will appear at the top."
      );
    } catch (err) {
      setReturningMessage(
        err instanceof Error
          ? err.message
          : "Could not send the sign-in email."
      );
    } finally {
      setReturningLoading(false);
    }
  }

  async function startCheckout() {
    setPaymentMessage("");

    const normalizedEmail = paymentEmail.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setPaymentMessage("Enter a valid email address first.");
      return;
    }

    if (!lockedGenerationId) {
      setPaymentMessage("Generate your CV preview first.");
      return;
    }

    setPaymentLoading(true);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: normalizedEmail,
          generationId: lockedGenerationId,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error || "Could not start checkout. Please try again."
        );
      }

      if (!data.url) {
        throw new Error("Checkout link was not returned.");
      }

      saveDraft();

      window.location.href = data.url;
    } catch (err) {
      setPaymentMessage(
        err instanceof Error
          ? err.message
          : "Could not start checkout."
      );
      setPaymentLoading(false);
    }
  }

  async function generate() {
    setError("");
    setPaymentMessage("");
    setPaymentNotice("");
    setResult(null);

    if (
      mode === "tailor" &&
      (!cvText.trim() || !jobDescription.trim())
    ) {
      setError("Paste your CV and the job description first.");
      return;
    }

    if (mode === "build" && !aboutMe.trim()) {
      setError("Tell us a little about yourself first.");
      return;
    }

    saveDraft();
    setLoading(true);

    try {
      const response = await fetch("/api/tailor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode,
          cvText,
          jobDescription,
          aboutMe,
          fullName,
          email,
          phone,
        }),
      });

      const rawBody = await response.text();

      let data: Result & {
        error?: string;
        message?: string;
      } = {};

      if (rawBody.trim()) {
        try {
          data = JSON.parse(rawBody);
        } catch {
          throw new Error(
            "We couldn't process your request. Please try again."
          );
        }
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.error ||
            "We couldn't process your request. Please try again."
        );
      }

      if (data.locked && data.generationId) {
        const nextPreviewName =
          cleanText(data.previewName) ||
          cleanText(fullName) ||
          (mode === "tailor" ? extractNameFromText(cvText) : "") ||
          "Your CV";

        const nextPreviewEmail =
          cleanText(data.previewEmail) ||
          cleanText(email) ||
          (mode === "tailor" ? extractEmailFromText(cvText) : "");

        setLockedGenerationId(data.generationId);
        setLockedPreviewName(nextPreviewName);
        setLockedPreviewEmail(nextPreviewEmail);
        setLockedMatchScore(
          typeof data.matchScore === "number"
            ? data.matchScore
            : null
        );

        if (
          nextPreviewEmail &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextPreviewEmail)
        ) {
          setPaymentEmail(nextPreviewEmail);
        }

        saveLockedPreview({
          generationId: data.generationId,
          previewName: nextPreviewName,
          previewEmail: nextPreviewEmail,
          matchScore:
            typeof data.matchScore === "number"
              ? data.matchScore
              : undefined,
        });

        window.setTimeout(() => {
          document
            .getElementById("locked-preview")
            ?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
        }, 100);

        return;
      }

      setLockedGenerationId("");
      setLockedPreviewName("");
      setLockedPreviewEmail("");
      setLockedMatchScore(null);
      setResult(data);

      if (typeof data.creditsRemaining === "number") {
        setAccountCredits(data.creditsRemaining);
      }

      if (typeof data.accountEmail === "string") {
        setAccountEmail(data.accountEmail);
      }

      try {
        window.sessionStorage.removeItem("applyfast_locked_preview");
        window.sessionStorage.removeItem("applyfast_draft");
      } catch {
        // Ignore storage errors.
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "We couldn't process your request."
      );
    } finally {
      setLoading(false);
    }
  }

  function switchMode(newMode: Mode) {
    setMode(newMode);
    setResult(null);
    setError("");
    setPaymentMessage("");
    setPaymentNotice("");
    setLockedGenerationId("");
    setLockedPreviewName("");
    setLockedPreviewEmail("");
    setLockedMatchScore(null);

    try {
      window.sessionStorage.removeItem("applyfast_locked_preview");
    } catch {
      // Ignore storage errors.
    }
  }

  const cv = result?.cv;

  const displayedPhone =
    cleanText(cv?.contact?.phone) || cleanText(phone);

  const displayedEmail =
    cleanText(cv?.contact?.email) || cleanText(email);

  const drivingLicence =
    getDrivingLicenceItems(cv?.drivingLicence);

  const previewName =
    cleanText(lockedPreviewName) ||
    cleanText(fullName) ||
    (mode === "tailor" ? extractNameFromText(cvText) : "") ||
    "Your Name";

  const previewEmail =
    cleanText(lockedPreviewEmail) ||
    cleanText(paymentEmail) ||
    cleanText(email) ||
    (mode === "tailor" ? extractEmailFromText(cvText) : "") ||
    "your@email.com";

  function downloadCvPdf() {
    if (!cv) return;

    const escapeHtml = (value: string) =>
      value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

    const list = (items?: string[]) =>
      cleanItems(items)
        .map((item) => `<li>${escapeHtml(item)}</li>`)
        .join("");

    const work = Array.isArray(cv.workExperience)
      ? cv.workExperience
          .map(
            (job) => `
              <section>
                ${
                  cleanText(job.title)
                    ? `<h3>${escapeHtml(cleanText(job.title))}</h3>`
                    : ""
                }
                ${
                  cleanText(job.employer)
                    ? `<p><strong>${escapeHtml(cleanText(job.employer))}</strong></p>`
                    : ""
                }
                ${
                  cleanText(job.duration)
                    ? `<p>${escapeHtml(cleanText(job.duration))}</p>`
                    : ""
                }
                ${
                  cleanItems(job.bullets).length
                    ? `<ul>${list(job.bullets)}</ul>`
                    : ""
                }
              </section>
            `
          )
          .join("")
      : "";

    const popup = window.open("", "_blank");

    if (!popup) {
      setError("Please allow pop-ups, then try Download CV again.");
      return;
    }

    popup.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(cleanText(cv.name) || previewName)} - CV</title>
          <style>
            body {
              font-family: Arial, Helvetica, sans-serif;
              max-width: 820px;
              margin: 40px auto;
              padding: 0 28px;
              color: #111;
              line-height: 1.5;
            }
            h1 { margin-bottom: 6px; }
            h2 {
              margin-top: 28px;
              padding-bottom: 6px;
              border-bottom: 1px solid #ddd;
              font-size: 18px;
            }
            h3 { margin-bottom: 4px; font-size: 16px; }
            p { margin: 4px 0; }
            ul { margin-top: 8px; }
            .contact { margin-bottom: 24px; color: #444; }
            @media print {
              body { margin: 0 auto; }
            }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(cleanText(cv.name) || previewName)}</h1>

          <div class="contact">
            ${displayedEmail ? escapeHtml(displayedEmail) : ""}
            ${displayedEmail && displayedPhone ? " · " : ""}
            ${displayedPhone ? escapeHtml(displayedPhone) : ""}
            ${
              cleanText(cv.contact.location)
                ? ` · ${escapeHtml(cleanText(cv.contact.location))}`
                : ""
            }
          </div>

          ${
            cleanText(cv.profile)
              ? `<h2>Professional Profile</h2><p>${escapeHtml(
                  cleanText(cv.profile)
                )}</p>`
              : ""
          }

          ${work ? `<h2>Work Experience</h2>${work}` : ""}

          ${
            cleanItems(cv.skills).length
              ? `<h2>Skills</h2><ul>${list(cv.skills)}</ul>`
              : ""
          }

          ${
            cleanItems(cv.languages).length
              ? `<h2>Languages</h2><p>${escapeHtml(
                  cleanItems(cv.languages).join(" · ")
                )}</p>`
              : ""
          }

          ${
            drivingLicence.exists
              ? `<h2>Driving Licence</h2><p>${escapeHtml(
                  drivingLicence.specificItems.length
                    ? drivingLicence.specificItems.join(" · ")
                    : "Driving licence"
                )}</p>`
              : ""
          }

          ${
            cleanItems(cv.vca).length
              ? `<h2>VCA</h2><p>${escapeHtml(
                  cleanItems(cv.vca).join(" · ")
                )}</p>`
              : ""
          }

          ${
            cleanItems(cv.documents).length
              ? `<h2>Documents</h2><ul>${list(cv.documents)}</ul>`
              : ""
          }

          ${
            cleanItems(cv.certificates).length
              ? `<h2>Certificates</h2><ul>${list(cv.certificates)}</ul>`
              : ""
          }

          ${
            cleanItems(cv.education).length
              ? `<h2>Education</h2><ul>${list(cv.education)}</ul>`
              : ""
          }

          ${
            cleanItems(cv.additionalInformation).length
              ? `<h2>Additional Information</h2><ul>${list(
                  cv.additionalInformation
                )}</ul>`
              : ""
          }

          <script>
            window.onload = () => window.print();
          </script>
        </body>
      </html>
    `);

    popup.document.close();
  }

  return (
    <main className="appShell">
      <div
        className="organicBackdrop"
        aria-hidden="true"
      />

      <header className="navBar">
        <a
          className="wordmark"
          href="#top"
        >
          <span className="wordmarkMark">
            A
          </span>

          ApplyFast
        </a>

        <div
          style={{
            display: "flex",
            gap: "0.65rem",
            alignItems: "center",
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          {!accountLoading && accountCredits !== null ? (
            <>
              <span
                style={{
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.06)",
                  borderRadius: "999px",
                  padding: "0.55rem 0.8rem",
                  whiteSpace: "nowrap",
                }}
                title={accountEmail || undefined}
              >
                ✓ Signed in
              </span>

              <span
                style={{
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.06)",
                  borderRadius: "999px",
                  padding: "0.55rem 0.8rem",
                  whiteSpace: "nowrap",
                }}
                title={accountEmail || undefined}
              >
                {accountCredits} credits remaining
              </span>

              <button
                type="button"
                onClick={handleLogout}
                style={{
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "transparent",
                  color: "inherit",
                  borderRadius: "999px",
                  padding: "0.55rem 0.8rem",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                Log out
              </button>
            </>
          ) : (
            !accountLoading && (
              <button
                type="button"
                onClick={() => {
                  setReturningOpen((value) => !value);
                  setReturningMessage("");
                }}
                style={{
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "transparent",
                  color: "inherit",
                  borderRadius: "999px",
                  padding: "0.55rem 0.8rem",
                  cursor: "pointer",
                }}
              >
                Already have credits? Sign in
              </button>
            )
          )}

          <span className="pricePill">
            10 applications — €6.99 one-time
          </span>
        </div>
      </header>

      <section
        className="toolPage"
        id="top"
      >
        <div className="intro">
          <h1>
            Make your CV fit the job
          </h1>

          <p className="introCopy">
            Already have a CV? Tailor it.
            Don&apos;t have one? Build one in minutes.
          </p>
        </div>

        {returningOpen && accountCredits === null && (
          <div
            style={{
              margin: "0 auto 1rem",
              maxWidth: "760px",
              padding: "1rem",
              borderRadius: "16px",
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.05)",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Use your saved credits</h3>

            <p style={{ opacity: 0.78 }}>
              Enter the same email you used when you paid.
            </p>

            <div
              style={{
                display: "grid",
                gap: "0.75rem",
              }}
            >
              <input
                type="email"
                value={returningEmail}
                onChange={(e) => setReturningEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />

              <button
                type="button"
                className="generateButton"
                onClick={sendReturningSignIn}
                disabled={returningLoading}
              >
                <span>
                  {returningLoading
                    ? "Sending sign-in email..."
                    : "Send sign-in email"}
                </span>
                <span>→</span>
              </button>

              {returningMessage && (
                <p style={{ margin: 0 }}>
                  {returningMessage}
                </p>
              )}
            </div>
          </div>
        )}

        {paymentNotice && (
          <div
            style={{
              margin: "0 auto 1rem",
              maxWidth: "760px",
              padding: "0.9rem 1rem",
              borderRadius: "14px",
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.05)",
            }}
          >
            {paymentNotice}
          </div>
        )}

        <div className="modeSelector">
          <button
            type="button"
            className={
              mode === "tailor"
                ? "modeButton active"
                : "modeButton"
            }
            onClick={() =>
              switchMode("tailor")
            }
          >
            <strong>
              I already have a CV
            </strong>

            <span>
              Tailor it to a specific job
            </span>
          </button>

          <button
            type="button"
            className={
              mode === "build"
                ? "modeButton active"
                : "modeButton"
            }
            onClick={() =>
              switchMode("build")
            }
          >
            <strong>
              Build my CV
            </strong>

            <span>
              Create one from simple information
            </span>
          </button>
        </div>

        <section className="toolCard">
          {mode === "tailor" ? (
            <>
              <div className="stepRow">
                <span>1</span>

                <div>
                  <h2>
                    Paste your current CV
                  </h2>

                  <p>
                    Copy and paste the text from your CV
                  </p>
                </div>
              </div>

              <textarea
                rows={9}
                value={cvText}
                onChange={(e) =>
                  setCvText(e.target.value)
                }
                placeholder="Paste your current CV here..."
              />

              <div className="stepRow">
                <span>2</span>

                <div>
                  <h2>
                    Paste the job description
                  </h2>

                  <p>
                    Paste the job you want to apply for
                  </p>
                </div>
              </div>

              <textarea
                rows={7}
                value={jobDescription}
                onChange={(e) =>
                  setJobDescription(
                    e.target.value
                  )
                }
                placeholder="Paste the job description here..."
              />
            </>
          ) : (
            <>
              <div className="stepRow">
                <span>1</span>

                <div>
                  <h2>
                    Tell us about yourself
                  </h2>

                  <p>
                    Write normally. We&apos;ll turn it into a professional CV.
                  </p>
                </div>
              </div>

              <textarea
                rows={9}
                value={aboutMe}
                onChange={(e) =>
                  setAboutMe(e.target.value)
                }
                placeholder={`Example:

cleaning 2 years
offices
english
team work
physical work
can start soon`}
              />

              <div className="contactTitle">
                <h3>
                  Contact details
                </h3>

                <p>
                  Optional — add what you want included in your CV.
                </p>
              </div>

              <div className="contactGrid">
                <input
                  value={fullName}
                  onChange={(e) =>
                    setFullName(
                      e.target.value
                    )
                  }
                  placeholder="Full name"
                />

                <input
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  placeholder="Email"
                />

                <input
                  type="tel"
                  value={phone}
                  onChange={(e) =>
                    setPhone(e.target.value)
                  }
                  placeholder="Phone number"
                />
              </div>
            </>
          )}

          <button
            type="button"
            className="generateButton"
            onClick={generate}
            disabled={loading}
          >
            <span>
              {loading
                ? mode === "tailor"
                  ? "Tailoring your CV..."
                  : "Building your CV..."
                : mode === "tailor"
                ? "Tailor My CV"
                : "Build My CV"}
            </span>

            <span>→</span>
          </button>

          <p className="truthNote">
            We never invent experience, skills or qualifications.
          </p>

          {error && (
            <div
              className="error"
              role="alert"
            >
              {error}
            </div>
          )}

          {lockedGenerationId && (
            <div
              id="locked-preview"
              style={{
                marginTop: "1.2rem",
              }}
            >
              <div
                style={{
                  position: "relative",
                  overflow: "hidden",
                  minHeight: "560px",
                  borderRadius: "18px",
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "#fff",
                  color: "#111",
                  padding: "2rem",
                }}
              >
                <div style={{ position: "relative", zIndex: 1 }}>
                  <h2 style={{ marginBottom: "0.25rem" }}>
                    {previewName}
                  </h2>

                  <p style={{ marginTop: 0, opacity: 0.7 }}>
                    {paymentEmail.trim() || previewEmail}
                  </p>

                  {typeof lockedMatchScore === "number" && (
                    <p
                      style={{
                        display: "inline-block",
                        marginTop: "0.5rem",
                        padding: "0.4rem 0.65rem",
                        borderRadius: "999px",
                        background: "#f1f1f1",
                      }}
                    >
                      {mode === "tailor"
                        ? `Match score: ${lockedMatchScore}%`
                        : `Profile strength: ${lockedMatchScore}%`}
                    </p>
                  )}

                  <div
                    style={{
                      filter: "blur(8px)",
                      userSelect: "none",
                      opacity: 0.52,
                      marginTop: "2rem",
                    }}
                    aria-hidden="true"
                  >
                    <h3>Professional Profile</h3>

                    <p>
                      Experienced and reliable professional with practical
                      experience, relevant strengths and a clear professional
                      profile tailored to the selected opportunity.
                    </p>

                    <h3 style={{ marginTop: "2rem" }}>
                      Work Experience
                    </h3>

                    <p>
                      Relevant work history, responsibilities and professional
                      achievements prepared from the information provided.
                    </p>

                    <p>
                      Job-specific wording and transferable experience are
                      included in the unlocked version.
                    </p>

                    <h3 style={{ marginTop: "2rem" }}>Skills</h3>

                    <p>
                      Communication · Teamwork · Reliability · Relevant
                      job-specific skills
                    </p>

                    <h3 style={{ marginTop: "2rem" }}>
                      Cover Letter
                    </h3>

                    <p>
                      A tailored cover letter is included with the full
                      application package.
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    zIndex: 2,
                    display: "grid",
                    placeItems: "center",
                    padding: "1.25rem",
                    background:
                      "linear-gradient(to bottom, rgba(255,255,255,0.02), rgba(8,8,8,0.72))",
                  }}
                >
                  <div
                    style={{
                      width: "min(94%, 460px)",
                      padding: "1.25rem",
                      borderRadius: "18px",
                      background: "rgba(10,10,10,0.96)",
                      color: "#fff",
                      boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
                    }}
                  >
                    <p
                      className="eyebrow"
                      style={{ marginTop: 0 }}
                    >
                      YOUR APPLICATION IS READY
                    </p>

                    <h3 style={{ margin: "0.35rem 0" }}>
                      Unlock your full CV
                    </h3>

                    <p style={{ opacity: 0.78 }}>
                      Enter your email first. Your 10 credits will be saved
                      to this email after payment.
                    </p>

                    <input
                      type="email"
                      value={paymentEmail}
                      onChange={(e) => {
                        setPaymentEmail(e.target.value);
                        setPaymentMessage("");
                      }}
                      placeholder="you@example.com"
                      autoComplete="email"
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        margin: "0.45rem 0 0.75rem",
                      }}
                    />

                    <button
                      type="button"
                      className="generateButton"
                      onClick={startCheckout}
                      disabled={
                        paymentLoading ||
                        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                          paymentEmail.trim()
                        )
                      }
                    >
                      <span>
                        {paymentLoading
                          ? "Opening secure checkout..."
                          : "Continue to payment — €6.99"}
                      </span>
                      <span>→</span>
                    </button>

                    <p
                      style={{
                        marginBottom: 0,
                        marginTop: "0.7rem",
                        opacity: 0.7,
                        fontSize: "0.9rem",
                      }}
                    >
                      One-time payment · 10 application credits
                    </p>

                    {paymentMessage && (
                      <p
                        style={{
                          marginBottom: 0,
                          marginTop: "0.75rem",
                        }}
                      >
                        {paymentMessage}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {unlockLoading && (
            <div
              style={{
                marginTop: "1rem",
                padding: "1rem",
                borderRadius: "14px",
                border: "1px solid rgba(255,255,255,0.14)",
              }}
            >
              Verifying payment and unlocking your CV...
            </div>
          )}
        </section>

        {result && cv && (
          <section
            className="resultSection"
            ref={resultRef}
          >
            <div className="resultHeader">
              <div>
                <p className="eyebrow">
                  APPLICATION READY
                </p>

                <h2>
                  Your CV is ready
                </h2>

                <p>
                  Review your tailored CV and cover letter below.
                </p>
              </div>

              <div className="resultScore">
                <span>
                  {mode === "tailor"
                    ? "Match score"
                    : "Profile strength"}
                </span>

                <strong>
                  {result.matchScore ?? "—"}
                  <small>%</small>
                </strong>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.75rem",
                alignItems: "center",
                marginBottom: "1rem",
              }}
            >
              <button
                type="button"
                className="generateButton"
                onClick={downloadCvPdf}
                style={{ width: "auto", minWidth: "220px" }}
              >
                <span>Download CV as PDF</span>
                <span>↓</span>
              </button>

              {typeof result.creditsRemaining === "number" && (
                <span style={{ opacity: 0.75 }}>
                  {result.creditsRemaining} application credits remaining
                </span>
              )}
            </div>

            {(result.accountEmail || accountEmail) &&
              accountCredits !== null &&
              accountCredits > 0 && (
                <p
                  style={{
                    marginTop: "-0.35rem",
                    marginBottom: "1rem",
                    opacity: 0.72,
                  }}
                >
                  Your remaining credits are saved to {result.accountEmail || accountEmail}.
                </p>
              )}

            {hasItems(
              result.missingKeywords
            ) && (
              <div className="keywordPanel">
                <span>
                  {mode === "tailor"
                    ? "Missing keywords"
                    : "Recommended improvements"}
                </span>

                <div className="chips">
                  {cleanItems(
                    result.missingKeywords
                  )
                    .slice(0, 3)
                    .map((item) => (
                      <span key={item}>
                        {item}
                      </span>
                    ))}
                </div>
              </div>
            )}

            <article className="cvDocument">
              <div className="cvIdentity">
                <div>
                  <h1>
                    {cleanText(cv.name) ||
                      cleanText(fullName) ||
                      "Professional CV"}
                  </h1>

                  {cleanText(cv.contact.location) ? (
                    <p className="cvLocation">
                      {cleanText(cv.contact.location)}
                    </p>
                  ) : (
                    <p className="cvLocation">
                      Professional Curriculum Vitae
                    </p>
                  )}
                </div>
              </div>

              {(displayedPhone ||
                displayedEmail) && (
                <div className="cvContactBar">
                  {displayedPhone && (
                    <div>
                      <strong>
                        Phone
                      </strong>

                      <span>
                        {displayedPhone}
                      </span>
                    </div>
                  )}

                  {displayedEmail && (
                    <div>
                      <strong>
                        Email
                      </strong>

                      <span>
                        {displayedEmail}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="cvBody">
                {cleanText(cv.profile) && (
                  <section className="cvSection">
                    <h2>
                      Professional Profile
                    </h2>

                    <p className="cvParagraph">
                      {cleanText(cv.profile)}
                    </p>
                  </section>
                )}

                {cv.workExperience.length >
                  0 && (
                  <section className="cvSection">
                    <h2>
                      Work Experience
                    </h2>

                    <div className="cvTextBlock">
                      {cv.workExperience.map(
                        (job, index) => (
                          <div
                            key={`${job.title}-${index}`}
                            style={{
                              marginBottom: "0.8rem",
                            }}
                          >
                            {cleanText(job.title) && (
                              <p
                                className="cvParagraph"
                                style={{
                                  fontWeight: 700,
                                }}
                              >
                                {cleanText(job.title)}
                              </p>
                            )}

                            {cleanText(job.employer) && (
                              <p className="cvParagraph">
                                {cleanText(job.employer)}
                              </p>
                            )}

                            {cleanText(job.duration) && (
                              <p className="cvParagraph">
                                {cleanText(job.duration)}
                              </p>
                            )}

                            {cleanItems(
                              job.bullets
                            ).map(
                              (
                                bullet,
                                bulletIndex
                              ) => (
                                <div
                                  className="cvBullet"
                                  key={bulletIndex}
                                >
                                  <span>
                                    •
                                  </span>

                                  <p>
                                    {bullet}
                                  </p>
                                </div>
                              )
                            )}
                          </div>
                        )
                      )}
                    </div>
                  </section>
                )}

                {hasItems(cv.skills) && (
                  <section className="cvSection">
                    <h2>
                      Skills
                    </h2>

                    <div className="cvSkills">
                      {cleanItems(
                        cv.skills
                      ).map((skill) => (
                        <span key={skill}>
                          {skill}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                {hasItems(
                  cv.languages
                ) && (
                  <section className="cvSection">
                    <h2>
                      Languages
                    </h2>

                    <p className="languageLine">
                      {cleanItems(
                        cv.languages
                      ).join(" · ")}
                    </p>
                  </section>
                )}

                {drivingLicence.exists && (
                  <section className="cvSection">
                    <h2>
                      Driving Licence
                    </h2>

                    {drivingLicence.specificItems.length > 0 && (
                      <p className="languageLine">
                        {drivingLicence.specificItems.join(" · ")}
                      </p>
                    )}
                  </section>
                )}

                {hasItems(cv.vca) && (
                  <section className="cvSection">
                    <h2>
                      VCA
                    </h2>

                    <p className="languageLine">
                      {cleanItems(
                        cv.vca
                      ).join(" · ")}
                    </p>
                  </section>
                )}

                {hasItems(
                  cv.documents
                ) && (
                  <section className="cvSection">
                    <h2>
                      Documents
                    </h2>

                    <p className="languageLine">
                      {cleanItems(
                        cv.documents
                      ).join(" · ")}
                    </p>
                  </section>
                )}

                {hasItems(
                  cv.certificates
                ) && (
                  <section className="cvSection">
                    <h2>
                      Certificates
                    </h2>

                    <p className="languageLine">
                      {cleanItems(
                        cv.certificates
                      ).join(" · ")}
                    </p>
                  </section>
                )}

                {hasItems(
                  cv.education
                ) && (
                  <section className="cvSection">
                    <h2>
                      Education
                    </h2>

                    <div className="cvTextBlock">
                      {cleanItems(
                        cv.education
                      ).map((item) => (
                        <p
                          className="cvParagraph"
                          key={item}
                        >
                          {item}
                        </p>
                      ))}
                    </div>
                  </section>
                )}

                {hasItems(
                  cv.additionalInformation
                ) && (
                  <section className="cvSection">
                    <h2>
                      Additional Information
                    </h2>

                    <div className="cvTextBlock">
                      {cleanItems(
                        cv.additionalInformation
                      ).map((item) => (
                        <p
                          className="cvParagraph"
                          key={item}
                        >
                          {item}
                        </p>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            </article>

            <article className="coverDocument">
              <div className="coverDocumentHeader">
                <span>
                  Cover Letter
                </span>

                <strong>
                  Ready to use
                </strong>
              </div>

              <div className="coverLetterText">
                {(result.coverLetter || "")
                  .split(/\n{2,}/)
                  .filter(Boolean)
                  .map(
                    (
                      paragraph,
                      index
                    ) => (
                      <p key={index}>
                        {paragraph.trim()}
                      </p>
                    )
                  )}
              </div>
            </article>
          </section>
        )}

        <section className="offerSection">
          <div>
            <p className="eyebrow">
              WHAT YOU&apos;LL GET
            </p>

            <h2>
              A complete application package
            </h2>

            <p>
              Professional CV, cover letter and application insights built around your real experience.
            </p>
          </div>

          <div className="offerPrice">
            <strong>
              €6.99
            </strong>

            <span>
              10 applications · one-time
            </span>
          </div>
        </section>
      </section>

      <footer>
        ApplyFast · Simple, truthful CV creation
      </footer>
    </main>
  );
}
