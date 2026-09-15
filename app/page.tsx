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
  const [authMessage, setAuthMessage] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const resultRef = useRef<HTMLElement | null>(null);

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

  async function sendLoginLink() {
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
          data.error || "Could not send the login email. Please try again."
        );
      }

      setAuthMessage("Check your email. We sent you a secure login link.");
    } catch (err) {
      setAuthMessage(
        err instanceof Error
          ? err.message
          : "Could not send the login email."
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
      setResult(data);
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
                Enter your email. We&apos;ll send you a secure login link — no password.
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
                />

                <button
                  type="button"
                  className="generateButton"
                  onClick={sendLoginLink}
                  disabled={authLoading}
                >
                  <span>
                    {authLoading ? "Sending login link..." : "Email me a login link"}
                  </span>
                  <span>→</span>
                </button>
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
            <div
              style={{
                marginTop: "1rem",
                padding: "1rem",
                border: "1px solid rgba(255,255,255,0.14)",
                borderRadius: "16px",
                background: "rgba(255,255,255,0.04)",
              }}
            >
              <p className="eyebrow" style={{ marginTop: 0 }}>
                READY TO CONTINUE
              </p>

              <h3 style={{ marginTop: "0.3rem" }}>
                Get 10 application credits
              </h3>

              <p style={{ opacity: 0.78 }}>
                One-time payment of €6.99. Each successful CV uses 1 credit.
                AI errors do not use a credit.
              </p>

              <button
                type="button"
                className="generateButton"
                onClick={startCheckout}
                disabled={authLoading}
              >
                <span>
                  {authLoading ? "Opening checkout..." : "Get 10 credits — €6.99"}
                </span>
                <span>→</span>
              </button>

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
