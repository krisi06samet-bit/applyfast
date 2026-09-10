"use client";

import { useEffect, useRef, useState } from "react";

type Mode = "tailor" | "build";

type Result = {
  matchScore?: number;
  missingKeywords?: string[];
  cvPreview?: string;
  coverLetterPreview?: string;
};

export default function Home() {
  const [mode, setMode] = useState<Mode>("tailor");

  // Tailor mode
  const [cvText, setCvText] = useState("");
  const [jobDescription, setJobDescription] = useState("");

  // Build mode
  const [aboutMe, setAboutMe] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const resultRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (result && resultRef.current) {
      setTimeout(() => {
        resultRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 150);
    }
  }, [result]);

  async function generate() {
    setError("");
    setResult(null);

    if (mode === "tailor") {
      if (!cvText.trim() || !jobDescription.trim()) {
        setError("Paste your CV and the job description first.");
        return;
      }
    }

    if (mode === "build") {
      if (!aboutMe.trim()) {
        setError("Tell us a little about yourself first.");
        return;
      }
    }

    setLoading(true);

    try {
      const response = await fetch("/api/tailor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode,

          // Tailor
          cvText,
          jobDescription,

          // Build
          aboutMe,
          fullName,
          email,
          phone,
        }),
      });

      const rawBody = await response.text();

      let payload: Result & { error?: string } = {};

      if (rawBody.trim()) {
        try {
          payload = JSON.parse(rawBody);
        } catch {
          throw new Error(
            "We couldn't process your request. Please try again."
          );
        }
      }

      if (!response.ok) {
        throw new Error(
          payload.error ||
            "We couldn't process your request. Please try again."
        );
      }

      setResult(payload);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "We couldn't process your request. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function switchMode(newMode: Mode) {
    setMode(newMode);
    setResult(null);
    setError("");
  }

  return (
    <main className="appShell">
      <div className="organicBackdrop" aria-hidden="true" />

      <header className="navBar">
        <a className="wordmark" href="#top">
          <span className="wordmarkMark">A</span> ApplyFast
        </a>

        <span className="pricePill">
          10 applications — €6.99 one-time
        </span>
      </header>

      <section className="toolPage" id="top">
        <div className="intro">
          <h1>Make your CV fit the job</h1>

          <p className="introCopy">
            Already have a CV? Tailor it. Don&apos;t have one? Build one in
            minutes.
          </p>
        </div>

        {/* MODE SELECTOR */}
        <div
          style={{
            display: "flex",
            gap: "10px",
            marginBottom: "18px",
            maxWidth: "720px",
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          <button
            onClick={() => switchMode("tailor")}
            style={{
              flex: 1,
              padding: "14px",
              borderRadius: "14px",
              border:
                mode === "tailor"
                  ? "1px solid #d4b483"
                  : "1px solid rgba(255,255,255,.12)",
              background:
                mode === "tailor"
                  ? "rgba(212,180,131,.14)"
                  : "rgba(255,255,255,.04)",
              color: "white",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            I already have a CV
          </button>

          <button
            onClick={() => switchMode("build")}
            style={{
              flex: 1,
              padding: "14px",
              borderRadius: "14px",
              border:
                mode === "build"
                  ? "1px solid #d4b483"
                  : "1px solid rgba(255,255,255,.12)",
              background:
                mode === "build"
                  ? "rgba(212,180,131,.14)"
                  : "rgba(255,255,255,.04)",
              color: "white",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Build my CV
          </button>
        </div>

        <section className="toolCard">
          {mode === "tailor" ? (
            <>
              <div className="stepRow">
                <span>1</span>

                <div>
                  <h2>Paste your current CV</h2>
                  <p>Copy and paste the text from your CV</p>
                </div>
              </div>

              <textarea
                rows={9}
                value={cvText}
                onChange={(e) => setCvText(e.target.value)}
                placeholder={`Example:

John Smith
Sales assistant
2 years experience
Customer service
Good communication
English
Driving licence
Manchester`}
              />

              <div className="stepRow">
                <span>2</span>

                <div>
                  <h2>Paste the job description</h2>
                  <p>Paste the job you want to apply for</p>
                </div>
              </div>

              <textarea
                rows={7}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the job description here..."
              />
            </>
          ) : (
            <>
              <div className="stepRow">
                <span>1</span>

                <div>
                  <h2>Tell us about yourself</h2>

                  <p>
                    Keep it simple. Write normally — we&apos;ll turn it into a
                    professional CV.
                  </p>
                </div>
              </div>

              <textarea
                rows={9}
                value={aboutMe}
                onChange={(e) => setAboutMe(e.target.value)}
                placeholder={`Example:

Sales assistant
2 years experience
Customer service
Good communication
English
Driving licence
Manchester

You can write as little or as much as you want.`}
              />

              <div
                style={{
                  marginTop: "22px",
                  marginBottom: "12px",
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: "15px",
                  }}
                >
                  Contact details
                </h3>

                <p
                  style={{
                    margin: "5px 0 0",
                    opacity: 0.55,
                    fontSize: "13px",
                  }}
                >
                  Optional — add them if you want them included in your CV.
                </p>
              </div>

              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Full name"
                style={{
                  width: "100%",
                  padding: "15px",
                  borderRadius: "12px",
                  marginBottom: "10px",
                }}
              />

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                style={{
                  width: "100%",
                  padding: "15px",
                  borderRadius: "12px",
                  marginBottom: "10px",
                }}
              />

              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone number"
                style={{
                  width: "100%",
                  padding: "15px",
                  borderRadius: "12px",
                  marginBottom: "18px",
                }}
              />
            </>
          )}

          <button
            className="generateButton"
            onClick={generate}
            disabled={loading}
          >
            {loading
              ? mode === "tailor"
                ? "Tailoring your CV..."
                : "Building your CV..."
              : mode === "tailor"
              ? "Tailor My CV"
              : "Build My CV"}

            <span>→</span>
          </button>

          <p className="truthNote">
            We never invent experience, skills or qualifications.
          </p>

          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
        </section>

        {/* RESULT */}
        {result && (
          <section
            className="previewSection"
            ref={resultRef}
            style={{
              scrollMarginTop: "30px",
            }}
          >
            <div className="sectionHeader">
              <p className="eyebrow">YOUR PREVIEW</p>

              <h2>Your CV is ready</h2>

              <p
                style={{
                  marginTop: "7px",
                  opacity: 0.6,
                }}
              >
                Here&apos;s a preview of your result.
              </p>
            </div>

            <div className="previewGrid">
              <div className="previewItem scoreItem">
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

              <div className="previewItem">
                <h3>
                  {mode === "tailor"
                    ? "Missing keywords"
                    : "Recommended keywords"}
                </h3>

                <div className="chips">
                  {result.missingKeywords?.length ? (
                    result.missingKeywords
                      .slice(0, 3)
                      .map((keyword) => (
                        <span key={keyword}>{keyword}</span>
                      ))
                  ) : (
                    <span className="muted">
                      No suggestions yet
                    </span>
                  )}
                </div>
              </div>

              <div className="previewItem documentItem">
                <h3>CV preview</h3>

                <pre>
                  {result.cvPreview ||
                    "Your CV preview will appear here."}
                </pre>
              </div>

              <div className="previewItem documentItem">
                <h3>Cover letter preview</h3>

                <pre>
                  {result.coverLetterPreview ||
                    "Your cover letter preview will appear here."}
                </pre>
              </div>
            </div>

            {/* SINGLE UNLOCK BOX */}
            <div
              className="unlockBox"
              style={{
                maxWidth: "720px",
                margin: "16px auto 0",
                textAlign: "center",
                padding: "24px",
              }}
            >
              <span
                className="lockIcon"
                style={{
                  display: "block",
                  fontSize: "22px",
                  marginBottom: "8px",
                }}
              >
                🔒
              </span>

              <strong
                style={{
                  display: "block",
                  fontSize: "20px",
                  marginBottom: "6px",
                }}
              >
                Unlock your full application
              </strong>

              <p
                style={{
                  margin: "0 0 16px",
                  opacity: 0.7,
                }}
              >
                Full CV + cover letter + 10 applications
              </p>

              <button
                className="unlockButton"
                style={{
                  width: "100%",
                  maxWidth: "420px",
                }}
              >
                Unlock for €6.99
              </button>

              <p
                style={{
                  margin: "10px 0 0",
                  fontSize: "13px",
                  opacity: 0.5,
                }}
              >
                One-time payment. No subscription.
              </p>
            </div>
          </section>
        )}

        {/* WHAT YOU'LL GET */}
        <section
          style={{
            maxWidth: "720px",
            margin: "36px auto 0",
            padding: "24px",
            borderRadius: "20px",
            border: "1px solid rgba(255,255,255,.1)",
            background: "rgba(255,255,255,.035)",
          }}
        >
          <div style={{ marginBottom: "20px" }}>
            <p className="eyebrow">
              WHAT YOU&apos;LL GET
            </p>

            <h2
              style={{
                margin: "6px 0 8px",
                fontSize: "24px",
              }}
            >
              Everything you need to apply
            </h2>

            <p
              style={{
                opacity: 0.7,
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              A complete application package built around your real
              experience.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gap: "12px",
            }}
          >
            <div
              style={{
                padding: "16px",
                borderRadius: "14px",
                background: "rgba(255,255,255,.04)",
                border: "1px solid rgba(255,255,255,.07)",
              }}
            >
              <strong>Professional CV</strong>

              <p
                style={{
                  margin: "6px 0 0",
                  opacity: 0.65,
                  lineHeight: 1.45,
                }}
              >
                Clean structure, stronger wording and your real experience
                presented professionally.
              </p>
            </div>

            <div
              style={{
                padding: "16px",
                borderRadius: "14px",
                background: "rgba(255,255,255,.04)",
                border: "1px solid rgba(255,255,255,.07)",
              }}
            >
              <strong>Cover letter</strong>

              <p
                style={{
                  margin: "6px 0 0",
                  opacity: 0.65,
                  lineHeight: 1.45,
                }}
              >
                A professional cover letter ready for your application.
              </p>
            </div>

            <div
              style={{
                padding: "16px",
                borderRadius: "14px",
                background: "rgba(255,255,255,.04)",
                border: "1px solid rgba(255,255,255,.07)",
              }}
            >
              <strong>Application insights</strong>

              <p
                style={{
                  margin: "6px 0 0",
                  opacity: 0.65,
                  lineHeight: 1.45,
                }}
              >
                See useful keywords and how strong your CV is before applying.
              </p>
            </div>
          </div>

          <div
            style={{
              marginTop: "18px",
              paddingTop: "18px",
              borderTop: "1px solid rgba(255,255,255,.08)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <strong>10 full applications</strong>

              <p
                style={{
                  margin: "4px 0 0",
                  opacity: 0.6,
                  fontSize: "14px",
                }}
              >
                One payment. No subscription.
              </p>
            </div>

            <strong style={{ fontSize: "22px" }}>
              €6.99
            </strong>
          </div>
        </section>
      </section>

      <footer>
        ApplyFast · Simple, truthful CV creation
      </footer>
    </main>
  );
}
