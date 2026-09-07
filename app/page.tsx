"use client";

import { useState } from "react";

type Result = {
  matchScore?: number;
  missingKeywords?: string[];
  tailoredResume?: string;
  coverLetter?: string;
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [job, setJob] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    if (!file || !job.trim()) {
      setError("Upload your CV and paste the job description first.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = new FormData();
      data.append("cv", file);
      data.append("jobDescription", job);
      const response = await fetch("/api/tailor", { method: "POST", body: data });
      const rawBody = await response.text();
      let payload: Result & { error?: string } = {};

      if (rawBody.trim()) {
        try {
          payload = JSON.parse(rawBody);
        } catch {
          throw new Error(`The server returned an invalid response (${response.status}). Please try again.`);
        }
      }

      if (!response.ok) {
        throw new Error(payload.error || `The tailoring request failed (${response.status}). Please try again.`);
      }
      if (typeof payload.matchScore !== "number" || !Array.isArray(payload.missingKeywords) || !payload.tailoredResume || !payload.coverLetter) {
        throw new Error("The tailoring result was incomplete. Please try again.");
      }
      setResult(payload);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="appShell">
      <div className="organicBackdrop" aria-hidden="true" />
      <header className="navBar">
        <a className="wordmark" href="#top"><span className="wordmarkMark">A</span> ApplyFast</a>
        <span className="pricePill">10 applications — €6.99 one-time</span>
      </header>

      <section className="toolPage" id="top">
        <div className="intro">
          <p className="eyebrow">APPLY WITH INTENTION</p>
          <h1>Tailor your CV for this job</h1>
          <p className="introCopy">Upload your CV, paste the job description, and get a better matched version in seconds.</p>
        </div>

        <section className="toolCard" aria-label="CV tailoring tool">
          <div className="stepRow"><span>1</span><div><h2>Upload your CV</h2><p>PDF format</p></div></div>
          <label className="uploadZone" htmlFor="cv"><span className="uploadIcon">↑</span><strong>{file ? file.name : "Choose a PDF file"}</strong><em>{file ? "CV ready" : "Click to browse"}</em><input id="cv" type="file" accept="application/pdf,.pdf" onChange={(event) => setFile(event.target.files?.[0] || null)} /></label>

          <div className="stepRow"><span>2</span><div><h2>Paste the job description</h2><p>Include the full posting for the best match</p></div></div>
          <textarea id="job" rows={7} value={job} onChange={(event) => setJob(event.target.value)} placeholder="Paste the job description here..." />

          <button className="generateButton" onClick={generate} disabled={loading}>{loading ? "Tailoring your CV..." : "Tailor My CV"}<span>→</span></button>
          <p className="truthNote">Uses only the experience already in your CV.</p>
          {error && <div className="error" role="alert">{error}</div>}
        </section>

        <section className="previewSection" aria-label="Result preview">
          <div className="sectionHeader"><p className="eyebrow">RESULT PREVIEW</p><h2>See what you&apos;ll get</h2></div>
          <div className="previewGrid">
            <div className="previewItem scoreItem"><span>Match score</span><strong>{result?.matchScore ?? "—"}<small>{result ? "%" : ""}</small></strong></div>
            <div className="previewItem"><h3>Missing keywords</h3><div className="chips">{result?.missingKeywords?.length ? result.missingKeywords.map((keyword) => <span key={keyword}>{keyword}</span>) : <span className="muted">Found after tailoring</span>}</div></div>
            <div className="previewItem documentItem"><h3>Tailored CV</h3><pre>{result?.tailoredResume || "Your tailored CV will appear here."}</pre></div>
            <div className="previewItem documentItem"><h3>Cover letter</h3><pre>{result?.coverLetter || "Your cover letter will appear here."}</pre></div>
          </div>
        </section>
      </section>
      <footer>ApplyFast · Simple, truthful CV tailoring</footer>
    </main>
  );
}
