"use client";

import { useState } from "react";

type Mode = "tailor" | "build";

type Result = {
  matchScore?: number;
  missingKeywords?: string[];
  cvPreview?: string;
  coverLetterPreview?: string;
};

export default function Home() {
  const [mode, setMode] = useState<Mode>("tailor");

  const [cvText, setCvText] = useState("");
  const [jobDescription, setJobDescription] = useState("");

  const [targetJob, setTargetJob] = useState("");
  const [experience, setExperience] = useState("");
  const [skills, setSkills] = useState("");
  const [education, setEducation] = useState("");
  const [languages, setLanguages] = useState("");
  const [location, setLocation] = useState("");

  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      if (!targetJob.trim() || !experience.trim()) {
        setError("Tell us the job you want and your experience.");
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
          cvText,
          jobDescription,
          targetJob,
          experience,
          skills,
          education,
          languages,
          location,
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
                  <p>Copy the text from your CV</p>
                </div>
              </div>

              <textarea
                rows={9}
                value={cvText}
                onChange={(e) => setCvText(e.target.value)}
                placeholder="Paste your CV here..."
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
                  <h2>What job do you want?</h2>
                  <p>Example: Office Administrator</p>
                </div>
              </div>

              <input
                value={targetJob}
                onChange={(e) => setTargetJob(e.target.value)}
                placeholder="Job title"
                style={{
                  width: "100%",
                  padding: "15px",
                  borderRadius: "12px",
                  marginBottom: "18px",
                }}
              />

              <div className="stepRow">
                <span>2</span>
                <div>
                  <h2>Your experience</h2>
                  <p>Keep it simple — we&apos;ll do the writing</p>
                </div>
              </div>

              <textarea
                rows={6}
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                placeholder="Example: 3 years customer service, answering emails, planning appointments..."
              />

              <div className="stepRow">
                <span>3</span>
                <div>
                  <h2>Skills</h2>
                  <p>What are you good at?</p>
                </div>
              </div>

              <textarea
                rows={3}
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                placeholder="Excel, customer service, planning, sales..."
              />

              <div className="stepRow">
                <span>4</span>
                <div>
                  <h2>Education</h2>
                </div>
              </div>

              <input
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                placeholder="School, diploma or qualification"
                style={{
                  width: "100%",
                  padding: "15px",
                  borderRadius: "12px",
                  marginBottom: "18px",
                }}
              />

              <div className="stepRow">
                <span>5</span>
                <div>
                  <h2>Languages & location</h2>
                </div>
              </div>

              <input
                value={languages}
                onChange={(e) => setLanguages(e.target.value)}
                placeholder="English, Dutch..."
                style={{
                  width: "100%",
                  padding: "15px",
                  borderRadius: "12px",
                  marginBottom: "10px",
                }}
              />

              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Amsterdam, Netherlands"
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
              ? "Creating your CV..."
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

        {result && (
          <section className="previewSection">
            <div className="sectionHeader">
              <p className="eyebrow">YOUR PREVIEW</p>
              <h2>Your CV is ready</h2>
            </div>

            <div className="previewGrid">
              <div className="previewItem scoreItem">
                <span>
                  {mode === "tailor" ? "Match score" : "CV score"}
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
                  {result.missingKeywords?.slice(0, 3).map((keyword) => (
                    <span key={keyword}>{keyword}</span>
                  ))}
                </div>
              </div>

              <div className="previewItem documentItem">
                <h3>CV preview</h3>

                <pre>
                  {result.cvPreview ||
                    "Your CV preview will appear here."}
                </pre>

                <div className="unlockBox">
                  <span className="lockIcon">🔒</span>

                  <strong>Unlock your full CV</strong>

                  <p>Full CV + cover letter + 10 applications</p>

                  <button className="unlockButton">
                    Unlock for €6.99
                  </button>
                </div>
              </div>

              <div className="previewItem documentItem">
                <h3>Cover letter preview</h3>

                <pre>
                  {result.coverLetterPreview ||
                    "Your cover letter preview will appear here."}
                </pre>

                <div className="unlockBox">
                  <span className="lockIcon">🔒</span>

                  <strong>Unlock the full application</strong>

                  <p>10 applications included</p>

                  <button className="unlockButton">
                    Unlock for €6.99
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

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
            <p className="eyebrow">WHAT YOU&apos;LL GET</p>

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
              <strong>Tailored CV</strong>
              <p
                style={{
                  margin: "6px 0 0",
                  opacity: 0.65,
                  lineHeight: 1.45,
                }}
              >
                Better summary, stronger wording, cleaner structure and
                experience matched to the role.
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
                A professional cover letter written specifically for the job
                you&apos;re applying to.
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
              <strong>Match insights</strong>
              <p
                style={{
                  margin: "6px 0 0",
                  opacity: 0.65,
                  lineHeight: 1.45,
                }}
              >
                See your match score and important keywords before you apply.
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

            <strong style={{ fontSize: "22px" }}>€6.99</strong>
          </div>
        </section>
      </section>

      <footer>ApplyFast · Simple, truthful CV creation</footer>
    </main>
  );
}
