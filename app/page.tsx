"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Mode = "tailor" | "build";

type Result = {
  matchScore?: number;
  missingKeywords?: string[];
  cvPreview?: string;
  coverLetterPreview?: string;
};

type CvSection = {
  title: string;
  lines: string[];
};

const SECTION_NAMES = [
  "professional profile",
  "profile",

  "work experience",
  "experience",
  "employment history",

  "key skills",
  "core skills",
  "skills",

  "certifications",
  "certification",
  "certificates",
  "certificate",

  "licence",
  "licences",
  "license",
  "licenses",
  "driving licence",
  "driving licences",
  "driving license",
  "driving licenses",

  "languages",
  "language",

  "education",

  "additional information",
];

function cleanLine(line: string) {
  return line
    .replace(/^#{1,6}\s*/, "")
    .replace(/\*\*/g, "")
    .replace(/__/g, "")
    .trim();
}

function normalizeHeading(line: string) {
  return cleanLine(line)
    .replace(/:$/, "")
    .trim()
    .toLowerCase();
}

function isSectionHeading(line: string) {
  return SECTION_NAMES.includes(normalizeHeading(line));
}

function niceHeading(line: string) {
  const normalized = normalizeHeading(line);

  const map: Record<string, string> = {
    "professional profile": "Professional Profile",
    profile: "Professional Profile",

    "work experience": "Work Experience",
    experience: "Work Experience",
    "employment history": "Work Experience",

    "key skills": "Skills",
    "core skills": "Skills",
    skills: "Skills",

    certifications: "Certifications",
    certification: "Certifications",
    certificates: "Certifications",
    certificate: "Certifications",

    licence: "Driving Licence",
    licences: "Driving Licence",
    license: "Driving Licence",
    licenses: "Driving Licence",
    "driving licence": "Driving Licence",
    "driving licences": "Driving Licence",
    "driving license": "Driving Licence",
    "driving licenses": "Driving Licence",

    languages: "Languages",
    language: "Languages",

    education: "Education",

    "additional information": "Additional Information",
  };

  return map[normalized] || cleanLine(line);
}

function parseCv(text: string) {
  const rawLines = text
    .split("\n")
    .map(cleanLine)
    .filter(Boolean);

  let name = "";
  const contactLines: string[] = [];
  const sections: CvSection[] = [];

  let currentSection: CvSection | null = null;

  for (let i = 0; i < rawLines.length; i += 1) {
    const line = rawLines[i];

    if (isSectionHeading(line)) {
      currentSection = {
        title: niceHeading(line),
        lines: [],
      };

      sections.push(currentSection);
      continue;
    }

    if (!currentSection) {
      if (
        !name &&
        !/^(phone|email|address|location|tel|mobile):?/i.test(line)
      ) {
        name = line;
      } else {
        contactLines.push(line);
      }

      continue;
    }

    currentSection.lines.push(line);
  }

  return {
    name,
    contactLines,
    sections,
  };
}

function isBullet(line: string) {
  return /^[•\-–—]\s*/.test(line);
}

function stripBullet(line: string) {
  return line.replace(/^[•\-–—]\s*/, "").trim();
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

  const parsedCv = useMemo(() => {
    if (!result?.cvPreview) {
      return null;
    }

    return parseCv(result.cvPreview);
  }, [result]);

  useEffect(() => {
    if (result && resultRef.current) {
      const timer = window.setTimeout(() => {
        resultRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 150);

      return () => window.clearTimeout(timer);
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
          cvText,
          jobDescription,
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
          <span className="wordmarkMark">A</span>
          ApplyFast
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

        <div className="modeSelector">
          <button
            type="button"
            className={
              mode === "tailor"
                ? "modeButton active"
                : "modeButton"
            }
            onClick={() => switchMode("tailor")}
          >
            <strong>I already have a CV</strong>
            <span>Tailor it to a specific job</span>
          </button>

          <button
            type="button"
            className={
              mode === "build"
                ? "modeButton active"
                : "modeButton"
            }
            onClick={() => switchMode("build")}
          >
            <strong>Build my CV</strong>
            <span>Create one from simple information</span>
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
                onChange={(e) =>
                  setJobDescription(e.target.value)
                }
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
                    Write normally. We&apos;ll turn it into a
                    professional CV.
                  </p>
                </div>
              </div>

              <textarea
                rows={9}
                value={aboutMe}
                onChange={(e) => setAboutMe(e.target.value)}
                placeholder={`Example:

Package delivery
2 months experience
Driving licence
Turkish, English and Dutch
From Amsterdam

You can write as little or as much as you want.`}
              />

              <div className="contactTitle">
                <h3>Contact details</h3>
                <p>
                  Optional — add what you want included in your CV.
                </p>
              </div>

              <div className="contactGrid">
                <input
                  value={fullName}
                  onChange={(e) =>
                    setFullName(e.target.value)
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
            <div className="error" role="alert">
              {error}
            </div>
          )}
        </section>

        {result && (
          <section
            className="resultSection"
            ref={resultRef}
          >
            <div className="resultHeader">
              <div>
                <p className="eyebrow">
                  FULL RESULT · TEST MODE
                </p>

                <h2>Your CV is ready</h2>

                <p>
                  Review the full result before we enable
                  downloads and payment.
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

            {result.missingKeywords?.length ? (
              <div className="keywordPanel">
                <span>
                  {mode === "tailor"
                    ? "Missing keywords"
                    : "Recommended improvements"}
                </span>

                <div className="chips">
                  {result.missingKeywords
                    .slice(0, 3)
                    .map((keyword) => (
                      <span key={keyword}>
                        {keyword}
                      </span>
                    ))}
                </div>
              </div>
            ) : null}

            {parsedCv && (
              <article className="cvDocument">
                <div className="cvIdentity">
                  <div>
                    <h1>
                      {parsedCv.name ||
                        fullName ||
                        "Professional CV"}
                    </h1>

                    {mode === "build" && (
                      <p className="cvLocation">
                        Professional Curriculum Vitae
                      </p>
                    )}
                  </div>
                </div>

                {(phone ||
                  email ||
                  parsedCv.contactLines.length > 0) && (
                  <div className="cvContactBar">
                    {phone && (
                      <div>
                        <strong>Phone</strong>
                        <span>{phone}</span>
                      </div>
                    )}

                    {email && (
                      <div>
                        <strong>Email</strong>
                        <span>{email}</span>
                      </div>
                    )}

                    {!phone &&
                      !email &&
                      parsedCv.contactLines
                        .slice(0, 3)
                        .map((line, index) => (
                          <div key={index}>
                            <strong>
                              {index === 0
                                ? "Contact"
                                : "Details"}
                            </strong>
                            <span>{line}</span>
                          </div>
                        ))}
                  </div>
                )}

                <div className="cvBody">
                  {parsedCv.sections.map(
                    (section, sectionIndex) => (
                      <section
                        className="cvSection"
                        key={`${section.title}-${sectionIndex}`}
                      >
                        <h2>{section.title}</h2>

                        {section.title === "Skills" ? (
                          <div className="cvSkills">
                            {section.lines.map(
                              (line, index) => (
                                <span key={index}>
                                  {stripBullet(line)}
                                </span>
                              )
                            )}
                          </div>
                        ) : section.title ===
                          "Languages" ? (
                          <p className="languageLine">
                            {section.lines
                              .map(stripBullet)
                              .join(" · ")}
                          </p>
                        ) : section.title ===
                          "Driving Licence" ? (
                          <p className="languageLine">
                            {section.lines
                              .map(stripBullet)
                              .join(" · ")}
                          </p>
                        ) : (
                          <div className="cvTextBlock">
                            {section.lines.map(
                              (line, index) =>
                                isBullet(line) ? (
                                  <div
                                    className="cvBullet"
                                    key={index}
                                  >
                                    <span>•</span>
                                    <p>
                                      {stripBullet(line)}
                                    </p>
                                  </div>
                                ) : (
                                  <p
                                    className="cvParagraph"
                                    key={index}
                                  >
                                    {line}
                                  </p>
                                )
                            )}
                          </div>
                        )}
                      </section>
                    )
                  )}
                </div>
              </article>
            )}

            <article className="coverDocument">
              <div className="coverDocumentHeader">
                <span>Cover Letter</span>

                <strong>Ready to use</strong>
              </div>

              <div className="coverLetterText">
                {(result.coverLetterPreview || "")
                  .split(/\n{2,}/)
                  .filter(Boolean)
                  .map((paragraph, index) => (
                    <p key={index}>
                      {cleanLine(paragraph)}
                    </p>
                  ))}
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
              Professional CV, cover letter and application
              insights built around your real experience.
            </p>
          </div>

          <div className="offerPrice">
            <strong>€6.99</strong>
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
