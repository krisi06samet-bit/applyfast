"use client";

import { useEffect, useRef, useState } from "react";

type Mode = "tailor" | "build";

type ExperienceItem = {
  title: string;
  organization: string;
  dates: string;
  location: string;
  bullets: string[];
};

type EducationItem = {
  qualification: string;
  institution: string;
  dates: string;
};

type CV = {
  fullName: string;
  contactLine: string;
  headline: string;
  profile: string;
  skills: string[];
  experience: ExperienceItem[];
  education: EducationItem[];
  certifications: string[];
  languages: string[];
  additional: string[];
};

type Result = {
  matchScore: number;
  keywords: string[];
  cv: CV;
  coverLetter: string;
};

function hasText(value?: string) {
  return Boolean(value && value.trim());
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

    if (mode === "tailor" && (!cvText.trim() || !jobDescription.trim())) {
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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "We couldn't create your CV. Please try again."
        );
      }

      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "We couldn't create your CV. Please try again."
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
          Full result unlocked for testing
        </span>
      </header>

      <section className="toolPage" id="top">
        <div className="intro">
          <p className="eyebrow">APPLY WITH A STRONGER CV</p>

          <h1>Make your CV fit the job</h1>

          <p className="introCopy">
            Already have a CV? Tailor it. Don&apos;t have one? Build one from
            simple notes in minutes.
          </p>
        </div>

        <div className="modeSelector">
          <button
            type="button"
            className={mode === "tailor" ? "modeButton active" : "modeButton"}
            onClick={() => switchMode("tailor")}
          >
            <span className="modeTitle">
              I already have a CV
            </span>

            <span className="modeCopy">
              Tailor it to a specific job
            </span>
          </button>

          <button
            type="button"
            className={mode === "build" ? "modeButton active" : "modeButton"}
            onClick={() => switchMode("build")}
          >
            <span className="modeTitle">
              Build my CV
            </span>

            <span className="modeCopy">
              Turn simple notes into a professional CV
            </span>
          </button>
        </div>

        <section className="toolCard">
          {mode === "tailor" ? (
            <>
              <div className="stepRow">
                <span>1</span>

                <div>
                  <h2>Paste your current CV</h2>
                  <p>Copy and paste the text from your CV.</p>
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
                  <p>Paste the vacancy you want to apply for.</p>
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
                    Write normally. Short notes are fine — ApplyFast will
                    organize them professionally.
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

              <div className="contactHeading">
                <div>
                  <h3>Contact details</h3>

                  <p>
                    Optional — only add what you want included in your CV.
                  </p>
                </div>
              </div>

              <div className="contactGrid">
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Full name"
                />

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                />

                <input
                  className="fullInput"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
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
            {loading
              ? mode === "tailor"
                ? "Tailoring your CV..."
                : "Building your CV..."
              : mode === "tailor"
              ? "Tailor My CV"
              : "Build My CV"}

            <span aria-hidden="true">→</span>
          </button>

          <p className="truthNote">
            We improve presentation and wording — we never invent your
            experience or qualifications.
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
            <div className="resultHeading">
              <div>
                <p className="eyebrow">
                  FULL RESULT · TEST MODE
                </p>

                <h2>Your application is ready</h2>

                <p>
                  The full CV and cover letter are visible while we test
                  quality.
                </p>
              </div>

              <span className="readyBadge">
                Full result unlocked
              </span>
            </div>

            <div className="insights">
              <div className="scoreBlock">
                <div className="scoreNumber">
                  {result.matchScore}
                  <span>%</span>
                </div>

                <div>
                  <h3>
                    {mode === "tailor"
                      ? "Match score"
                      : "Profile strength"}
                  </h3>

                  <p>
                    {mode === "tailor"
                      ? "Based only on the experience supported by your CV."
                      : "Based on how complete and useful your supplied information is."}
                  </p>
                </div>
              </div>

              <div className="keywordsBlock">
                <h3>
                  {mode === "tailor"
                    ? "Useful job keywords"
                    : "Ways to strengthen the profile"}
                </h3>

                <div className="chips">
                  {result.keywords?.length ? (
                    result.keywords
                      .slice(0, 3)
                      .map((keyword) => (
                        <span key={keyword}>
                          {keyword}
                        </span>
                      ))
                  ) : (
                    <span className="muted">
                      No extra suggestions needed
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="documentStack">
              <article className="cvPaper">
                <div className="cvTop">
                  <div>
                    {hasText(result.cv.fullName) && (
                      <h2>
                        {result.cv.fullName}
                      </h2>
                    )}

                    {hasText(result.cv.headline) && (
                      <p className="cvHeadline">
                        {result.cv.headline}
                      </p>
                    )}
                  </div>

                  {hasText(result.cv.contactLine) && (
                    <p className="contactLine">
                      {result.cv.contactLine}
                    </p>
                  )}
                </div>

                {hasText(result.cv.profile) && (
                  <section className="cvSection">
                    <h3>Professional Profile</h3>

                    <p>
                      {result.cv.profile}
                    </p>
                  </section>
                )}

                {result.cv.skills?.length > 0 && (
                  <section className="cvSection">
                    <h3>Core Skills</h3>

                    <div className="skillGrid">
                      {result.cv.skills.map((skill) => (
                        <span key={skill}>
                          {skill}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                {result.cv.experience?.length > 0 && (
                  <section className="cvSection">
                    <h3>Experience</h3>

                    <div className="entryList">
                      {result.cv.experience.map(
                        (item, index) => (
                          <div
                            className="cvEntry"
                            key={`${item.title}-${index}`}
                          >
                            <div className="entryHeader">
                              <div>
                                {hasText(item.title) && (
                                  <h4>
                                    {item.title}
                                  </h4>
                                )}

                                {hasText(item.organization) && (
                                  <p>
                                    {item.organization}
                                  </p>
                                )}
                              </div>

                              <div className="entryMeta">
                                {hasText(item.dates) && (
                                  <span>
                                    {item.dates}
                                  </span>
                                )}

                                {hasText(item.location) && (
                                  <span>
                                    {item.location}
                                  </span>
                                )}
                              </div>
                            </div>

                            {item.bullets?.length > 0 && (
                              <ul>
                                {item.bullets.map(
                                  (bullet, bulletIndex) => (
                                    <li key={bulletIndex}>
                                      {bullet}
                                    </li>
                                  )
                                )}
                              </ul>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  </section>
                )}

                {result.cv.education?.length > 0 && (
                  <section className="cvSection">
                    <h3>Education</h3>

                    <div className="entryList">
                      {result.cv.education.map(
                        (item, index) => (
                          <div
                            className="cvEntry compactEntry"
                            key={`${item.qualification}-${index}`}
                          >
                            <div>
                              {hasText(item.qualification) && (
                                <h4>
                                  {item.qualification}
                                </h4>
                              )}

                              {hasText(item.institution) && (
                                <p>
                                  {item.institution}
                                </p>
                              )}
                            </div>

                            {hasText(item.dates) && (
                              <div className="entryMeta">
                                <span>
                                  {item.dates}
                                </span>
                              </div>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  </section>
                )}

                {result.cv.certifications?.length > 0 && (
                  <section className="cvSection">
                    <h3>
                      Certifications & Licences
                    </h3>

                    <ul className="simpleList">
                      {result.cv.certifications.map(
                        (item) => (
                          <li key={item}>
                            {item}
                          </li>
                        )
                      )}
                    </ul>
                  </section>
                )}

                {result.cv.languages?.length > 0 && (
                  <section className="cvSection">
                    <h3>Languages</h3>

                    <p>
                      {result.cv.languages.join(" · ")}
                    </p>
                  </section>
                )}

                {result.cv.additional?.length > 0 && (
                  <section className="cvSection">
                    <h3>
                      Additional Information
                    </h3>

                    <ul className="simpleList">
                      {result.cv.additional.map(
                        (item) => (
                          <li key={item}>
                            {item}
                          </li>
                        )
                      )}
                    </ul>
                  </section>
                )}
              </article>

              <article className="letterPaper">
                <div className="letterTop">
                  <div>
                    <p className="eyebrow">
                      COVER LETTER
                    </p>

                    <h2>Ready to use</h2>
                  </div>
                </div>

                <div className="letterText">
                  {result.coverLetter
                    .split(/\n{2,}/)
                    .filter(Boolean)
                    .map((paragraph, index) => (
                      <p key={index}>
                        {paragraph.trim()}
                      </p>
                    ))}
                </div>
              </article>
            </div>
          </section>
        )}

        <section className="offerSection">
          <div>
            <p className="eyebrow">
              LAUNCH OFFER
            </p>

            <h2>
              10 full applications for €6.99
            </h2>

            <p>
              The payment wall is temporarily disabled while we test the final
              CV quality.
            </p>
          </div>

          <div className="offerPrice">
            <strong>€6.99</strong>

            <span>
              one-time · no subscription
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
