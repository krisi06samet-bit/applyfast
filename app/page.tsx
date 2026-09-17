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
  creditsRemaining?: number;
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

  const [authStep, setAuthStep] = useState<"login" | "payment" | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authCode, setAuthCode] = useState("");
  const [authCodeSent, setAuthCodeSent] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [paymentNotice, setPaymentNotice] = useState("");

  const resultRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
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

      const params = new URLSearchParams(window.location.search);

      if (params.get("payment") === "success") {
        setPaymentNotice(
          "Payment successful. Your 10 credits are ready. Press the button below to generate your unlocked CV."
        );
        setAuthStep(null);
      }

      if (params.get("payment") === "cancel") {
        setPaymentNotice("Payment was cancelled. Nothing was charged.");
      }

      if (params.get("auth_error")) {
        setError("The login link could not be completed. Please try again.");
      }
    } catch {
      // Keep the app usable even if browser storage is unavailable.
    }
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

  async function sendLoginCode() {
    setAuthMessage("");

    const normalizedEmail = authEmail.trim();

    if (!normalizedEmail) {
      setAuthMessage("Enter your email address.");
      return;
    }

    setAuthLoading(true);

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
          data.error || "Could not send the login code. Please try again."
        );
      }

      setAuthCodeSent(true);
      setAuthMessage("We sent a 6-digit login code to your email.");
    } catch (err) {
      setAuthMessage(
        err instanceof Error
          ? err.message
          : "Could not send the login code."
      );
    } finally {
      setAuthLoading(false);
    }
  }

  async function verifyLoginCode() {
    setAuthMessage("");

    const normalizedEmail = authEmail.trim();
    const normalizedCode = authCode.trim();

    if (!normalizedEmail) {
      setAuthMessage("Enter your email address.");
      return;
    }

    if (!/^\d{6}$/.test(normalizedCode)) {
      setAuthMessage("Enter the 6-digit code from your email.");
      return;
    }

    setAuthLoading(true);

    try {
      const response = await fetch("/api/auth/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: normalizedEmail,
          token: normalizedCode,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error || "That code is invalid or expired. Please try again."
        );
      }

      setAuthMessage("Signed in successfully.");
      setAuthStep(null);

      // Continue immediately using the text that is still on the page.
      window.setTimeout(() => {
        generate();
      }, 100);
    } catch (err) {
      setAuthMessage(
        err instanceof Error
          ? err.message
          : "Could not verify the login code."
      );
    } finally {
      setAuthLoading(false);
    }
  }

  async function startCheckout() {
    setAuthMessage("");
    setAuthLoading(true);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401) {
          setAuthStep("login");
          throw new Error("Sign in first, then continue to payment.");
        }

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
      setAuthMessage(
        err instanceof Error
          ? err.message
          : "Could not start checkout."
      );
      setAuthLoading(false);
    }
  }

  async function generate() {
    setError("");
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
    setPaymentNotice("");
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
        credits?: number;
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

      if (response.status === 401) {
        setAuthStep("login");
        setAuthMessage("");
        return;
      }

      if (response.status === 402) {
        setAuthStep("payment");
        setAuthMessage("");
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.error ||
            "We couldn't process your request. Please try again."
        );
      }

      setAuthStep(null);
      setPaymentNotice("");
      setResult(data);

      try {
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
    setAuthStep(null);
    setAuthMessage("");
  }

  const cv = result?.cv;

  const displayedPhone =
    cleanText(cv?.contact?.phone) || cleanText(phone);

  const displayedEmail =
    cleanText(cv?.contact?.email) || cleanText(email);

  const drivingLicence =
    getDrivingLicenceItems(cv?.drivingLicence);

  const previewName =
    cleanText(fullName) ||
    (mode === "tailor" ? extractNameFromText(cvText) : "") ||
    "Your Name";

  const previewEmail =
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

        <span className="pricePill">
          10 applications — €6.99 one-time
        </span>
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

          {authStep === "login" && (
            <div
              style={{
                marginTop: "1rem",
                padding: "1rem",
                border: "1px solid rgba(255,255,255,0.14)",
                borderRadius: "16px",
                background: "rgba(255,255,255,0.04)",
              }}
            >
              <h3 style={{ margin: 0 }}>Sign in to continue</h3>

              <p style={{ marginTop: "0.45rem", opacity: 0.78 }}>
                Stay on this page. We&apos;ll email you a 6-digit login code.
              </p>

              <div
                style={{
                  display: "grid",
                  gap: "0.75rem",
                  marginTop: "0.9rem",
                }}
              >
                <input
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  disabled={authCodeSent}
                />

                {!authCodeSent ? (
                  <button
                    type="button"
                    className="generateButton"
                    onClick={sendLoginCode}
                    disabled={authLoading}
                  >
                    <span>
                      {authLoading ? "Sending code..." : "Send 6-digit code"}
                    </span>
                    <span>→</span>
                  </button>
                ) : (
                  <>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={authCode}
                      onChange={(e) =>
                        setAuthCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                      placeholder="6-digit code"
                      autoComplete="one-time-code"
                    />

                    <button
                      type="button"
                      className="generateButton"
                      onClick={verifyLoginCode}
                      disabled={authLoading}
                    >
                      <span>
                        {authLoading ? "Checking code..." : "Verify & continue"}
                      </span>
                      <span>→</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAuthCodeSent(false);
                        setAuthCode("");
                        setAuthMessage("");
                      }}
                      style={{
                        background: "transparent",
                        border: 0,
                        color: "inherit",
                        opacity: 0.7,
                        cursor: "pointer",
                      }}
                    >
                      Use a different email
                    </button>
                  </>
                )}
              </div>

              {authMessage && (
                <p
                  style={{
                    marginTop: "0.8rem",
                    marginBottom: 0,
                  }}
                >
                  {authMessage}
                </p>
              )}
            </div>
          )}

          {authStep === "payment" && (
            <div style={{ marginTop: "1rem" }}>
              <div
                style={{
                  position: "relative",
                  overflow: "hidden",
                  minHeight: "520px",
                  borderRadius: "18px",
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "#fff",
                  color: "#111",
                  padding: "2rem",
                }}
              >
                <div style={{ position: "relative", zIndex: 1 }}>
                  <h2 style={{ marginBottom: "0.25rem" }}>{previewName}</h2>
                  <p style={{ marginTop: 0, opacity: 0.7 }}>{previewEmail}</p>

                  <div
                    style={{
                      filter: "blur(7px)",
                      userSelect: "none",
                      opacity: 0.55,
                      marginTop: "2rem",
                    }}
                    aria-hidden="true"
                  >
                    <h3>Professional Profile</h3>
                    <p>
                      Experienced and reliable professional with practical
                      experience and a strong work ethic. Skilled in daily
                      operations, teamwork and completing tasks efficiently.
                    </p>

                    <h3 style={{ marginTop: "2rem" }}>Work Experience</h3>
                    <p>
                      Professional experience tailored to the selected vacancy,
                      including relevant responsibilities and transferable skills.
                    </p>
                    <p>
                      Key achievements and job-specific experience are included
                      in the unlocked version.
                    </p>

                    <h3 style={{ marginTop: "2rem" }}>Skills</h3>
                    <p>
                      Communication · Teamwork · Reliability · Job-specific skills
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
                      "linear-gradient(to bottom, rgba(255,255,255,0.06), rgba(8,8,8,0.70))",
                  }}
                >
                  <div
                    style={{
                      width: "min(92%, 430px)",
                      padding: "1.25rem",
                      borderRadius: "18px",
                      background: "rgba(10,10,10,0.95)",
                      color: "#fff",
                      textAlign: "center",
                      boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
                    }}
                  >
                    <p className="eyebrow" style={{ marginTop: 0 }}>
                      YOUR CV IS READY TO UNLOCK
                    </p>

                    <h3 style={{ margin: "0.4rem 0" }}>
                      Unlock the full CV + 10 applications
                    </h3>

                    <p style={{ opacity: 0.78 }}>
                      One-time payment of €6.99. Your full generated CV stays
                      locked until you have credits.
                    </p>

                    <button
                      type="button"
                      className="generateButton"
                      onClick={startCheckout}
                      disabled={authLoading}
                    >
                      <span>
                        {authLoading ? "Opening checkout..." : "Unlock — €6.99"}
                      </span>
                      <span>→</span>
                    </button>

                    {authMessage && (
                      <p style={{ marginBottom: 0 }}>{authMessage}</p>
                    )}
                  </div>
                </div>
              </div>
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
