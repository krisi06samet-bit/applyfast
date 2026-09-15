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
};

type Result = {
  matchScore?: number;
  missingKeywords?: string[];
  cv?: CvData;
  coverLetter?: string;
};

function hasItems(items?: string[]) {
  return Array.isArray(items) && items.length > 0;
}

function cleanItems(items?: string[]) {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => item.trim())
    .filter(Boolean);
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

  async function generate() {
    setError("");
    setResult(null);

    if (
      mode === "tailor" &&
      (!cvText.trim() || !jobDescription.trim())
    ) {
      setError(
        "Paste your CV and the job description first."
      );

      return;
    }

    if (mode === "build" && !aboutMe.trim()) {
      setError(
        "Tell us a little about yourself first."
      );

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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "We couldn't process your request."
        );
      }

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
  }

  const cv = result?.cv;

  const displayedPhone =
    cv?.contact?.phone || phone;

  const displayedEmail =
    cv?.contact?.email || email;

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
            Don&apos;t have one? Build one in
            minutes.
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
                    Copy and paste the text from
                    your CV
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
                    Paste the job you want to
                    apply for
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
                    Write normally. We&apos;ll
                    turn it into a professional
                    CV.
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

rabotil sum dostavki s kola nqkolko meseca
raznasqh paketi po adresi
imam knijka B
govorq bulgarski i angliiski
jiveq v Amsterdam
sviknal sum da karam dosta prez denq`}
              />

              <div className="contactTitle">
                <h3>
                  Contact details
                </h3>

                <p>
                  Optional — add what you want
                  included in your CV.
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
            We never invent experience, skills
            or qualifications.
          </p>

          {error && (
            <div
              className="error"
              role="alert"
            >
              {error}
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
                  FULL RESULT · TEST MODE
                </p>

                <h2>
                  Your CV is ready
                </h2>

                <p>
                  Review the full result before
                  we enable downloads and payment.
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
                    {cv.name ||
                      fullName ||
                      "Professional CV"}
                  </h1>

                  {cv.contact.location ? (
                    <p className="cvLocation">
                      {cv.contact.location}
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
                {cv.profile && (
                  <section className="cvSection">
                    <h2>
                      Professional Profile
                    </h2>

                    <p className="cvParagraph">
                      {cv.profile}
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
                              marginBottom:
                                "0.8rem",
                            }}
                          >
                            {job.title && (
                              <p
                                className="cvParagraph"
                                style={{
                                  fontWeight: 700,
                                }}
                              >
                                {job.title}
                              </p>
                            )}

                            {job.employer && (
                              <p className="cvParagraph">
                                {job.employer}
                              </p>
                            )}

                            {job.duration && (
                              <p className="cvParagraph">
                                {job.duration}
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
                                  key={
                                    bulletIndex
                                  }
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

                {hasItems(
                  cv.drivingLicence
                ) && (
                  <section className="cvSection">
                    <h2>
                      Driving Licence
                    </h2>

                    <p className="languageLine">
                      {cleanItems(
                        cv.drivingLicence
                      ).join(" · ")}
                    </p>
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
              Professional CV, cover letter and
              application insights built around
              your real experience.
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
