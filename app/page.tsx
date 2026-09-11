"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, CheckCheck, ChevronDown, FileText, LockKeyhole, PenLine, ShieldCheck, Sparkles } from "lucide-react";
import { cleanText, previewLines, shortKeywords } from "@/lib/preview";

type Mode = "tailor" | "build";
type Result = { matchScore?: number; missingKeywords?: string[]; cvPreview?: string; coverLetterPreview?: string };
function LockedLines() {
  return <div className="lockedLines" aria-hidden="true"><div /><div /><div /><div /><div /><div /></div>;
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
  const [activeDocument, setActiveDocument] = useState<"cv" | "letter">("cv");
  const resultRef = useRef<HTMLElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const requestInFlight = useRef(false);
  useEffect(() => {
    if (result) {
      resultRef.current?.focus({ preventScroll: true });
      resultRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
    }
  }, [result]);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
  async function generate() {
    if (requestInFlight.current) return;
    setError("");
    if (mode === "tailor" && (!cvText.trim() || !jobDescription.trim())) {
      setError("Paste your CV and the job description to create your preview."); return;
    }
    if (mode === "build" && !aboutMe.trim()) {
      setError("Tell us a little about your experience to create your preview."); return;
    }
    requestInFlight.current = true;
    setLoading(true); setResult(null);
    try {
      const response = await fetch("/api/tailor", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, cvText, jobDescription, aboutMe, fullName, email, phone }),
      });
      const rawBody = await response.text();
      let payload: Result & { error?: string };
      try { payload = JSON.parse(rawBody); }
      catch { throw new Error("We couldn't read your preview. Please try again."); }
      if (!response.ok) throw new Error(payload?.error || "We couldn't create your preview. Please try again.");
      if (!payload || typeof payload !== "object" ||
        !(typeof payload.cvPreview === "string" && cleanText(payload.cvPreview)) ||
        !(typeof payload.coverLetterPreview === "string" && cleanText(payload.coverLetterPreview))) {
        throw new Error("Your preview came back incomplete. Please try again.");
      }
      setActiveDocument("cv"); setResult(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally { requestInFlight.current = false; setLoading(false); }
  }
  function switchMode(newMode: Mode) {
    if (loading || mode === newMode) return;
    setMode(newMode); setResult(null); setError("");
  }
  const score = typeof result?.matchScore === "number" && Number.isFinite(result.matchScore)
    ? Math.round(Math.max(0, Math.min(100, result.matchScore))) : null;
  const keywords = shortKeywords(result?.missingKeywords);
  const lines = previewLines(activeDocument === "cv" ? result?.cvPreview : result?.coverLetterPreview);
  return (
    <main className="appShell" id="top">
      <a className="skipLink" href="#application">Skip to your application</a>
      <header className="navBar">
        <a className="wordmark" href="#top" aria-label="ApplyFast home"><span className="wordmarkMark"><CheckCheck size={21} /></span>ApplyFast<span className="brandDot">.</span></a>
        <div className="navPrice"><span>10 applications</span><strong>€6.99</strong><span className="oneTime">One-time payment</span></div>
      </header>
      <div className="pageContent">
        <section className="intro" aria-labelledby="page-title">
          <p className="eyebrow"><span />YOUR NEXT APPLICATION STARTS HERE</p>
          <h1 id="page-title">Your experience.<br /><span>A stronger application.</span></h1>
          <p>Turn your CV or a few simple notes into a professional CV and cover letter. See a free preview first.</p>
          <ol className="flowSteps" aria-label="How it works">
            <li><span>1</span>Add your details</li><li><span>2</span>See your preview</li><li><LockKeyhole size={14} />Unlock the full application</li>
          </ol>
        </section>
        <div className="workspace">
          <section className="editorCard" id="application" aria-labelledby="editor-title">
            <div className="cardHeading"><div><p className="eyebrow">LET’S GET STARTED</p><h2 id="editor-title">What are you starting with?</h2></div><span className="stepTag">Step 1 of 3</span></div>
            <div className="modeSelector" role="group" aria-label="Choose how to create your CV">
              <button type="button" aria-pressed={mode === "tailor"} disabled={loading} onClick={() => switchMode("tailor")}><FileText size={20} /><span>I already have a CV<small>Make it fit the job</small></span><span className="radioMark">{mode === "tailor" && <Check size={12} />}</span></button>
              <button type="button" aria-pressed={mode === "build"} disabled={loading} onClick={() => switchMode("build")}><PenLine size={20} /><span>Build my CV<small>Start with simple notes</small></span><span className="radioMark">{mode === "build" && <Check size={12} />}</span></button>
            </div>
            <form onSubmit={(event) => { event.preventDefault(); void generate(); }} aria-busy={loading}>
              <fieldset disabled={loading}>
                {mode === "tailor" ? <>
                  <div className="fieldHeading"><label htmlFor="cv">Your current CV</label><span>Required</span></div>
                  <p className="fieldHint" id="cv-hint">Copy the text from your CV and paste it below.</p>
                  <textarea id="cv" aria-describedby="cv-hint" rows={7} value={cvText} onChange={e => setCvText(e.target.value)} placeholder="Paste your experience, education and skills here…" />
                  <div className="fieldHeading"><label htmlFor="job">The job you want</label><span>Required</span></div>
                  <p className="fieldHint" id="job-hint">Paste the job description, including the responsibilities and requirements.</p>
                  <textarea id="job" aria-describedby="job-hint" rows={5} value={jobDescription} onChange={e => setJobDescription(e.target.value)} placeholder="Paste the job description here…" />
                </> : <>
                  <div className="fieldHeading"><label htmlFor="about">Tell us about yourself</label><span>Required</span></div>
                  <p className="fieldHint" id="about-hint">Write how you normally speak. Short notes are enough, in any language.</p>
                  <textarea id="about" aria-describedby="about-hint about-prompts" rows={8} value={aboutMe} onChange={e => setAboutMe(e.target.value)} placeholder="For example: I work in scaffolding and have 2 years of experience. I have a VCA certificate, speak English and Bulgarian, and have a driving licence. I live in Amsterdam." />
                  <p className="writingPrompt" id="about-prompts"><Sparkles size={16} /><span>Useful things to mention: work, skills, education, certificates and languages.</span></p>
                  <details className="contactDetails"><summary>Contact details <span>Optional <ChevronDown size={16} /></span></summary><p className="fieldHint">Add only the details you want included in your CV.</p><div className="contactGrid">
                    <label className="fullWidth" htmlFor="name">Full name<input id="name" autoComplete="name" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" /></label>
                    <label htmlFor="email">Email<input id="email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></label>
                    <label htmlFor="phone">Phone number<input id="phone" type="tel" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Include country code" /></label>
                  </div></details>
                </>}
              </fieldset>
              {error && <div className="errorMessage" role="alert" tabIndex={-1} ref={errorRef}>{error} <span>Your entered details are still here.</span></div>}
              <button className="primaryButton generateButton" type="submit" disabled={loading}>{loading ? <><span className="spinner" />{mode === "tailor" ? "Tailoring your application…" : "Building your application…"}</> : <>Create my free preview<ArrowRight size={18} /></>}</button>
              <p className="buttonNote" role="status">{loading ? "This may take a moment. Keep this page open." : "No payment needed to preview your application."}</p>
            </form>
          </section>
          <aside className="packageAside" aria-labelledby="package-title">
            <div className="packageIllustration" aria-hidden="true"><div className="miniDocument"><div className="miniTop" /><div className="miniTitle" /><div className="miniRule" /><LockedLines /><div className="miniRule" /><LockedLines /></div><span className="documentSeal"><CheckCheck size={23} /></span><span className="illustrationLabel">MADE FROM YOUR EXPERIENCE</span></div>
            <p className="eyebrow">YOUR APPLICATION PACKAGE</p><h2 id="package-title">Ready for your<br />next opportunity.</h2>
            <ul className="benefits"><li><Check size={17} /><div><strong>A professional CV</strong><p>Clear structure and stronger wording.</p></div></li><li><Check size={17} /><div><strong>A matching cover letter</strong><p>A clear introduction to your experience.</p></div></li><li><Check size={17} /><div><strong>Useful application insights</strong><p>See what could strengthen your profile.</p></div></li></ul>
            <div className="asidePrice"><div><strong>€6.99</strong><span>for 10 applications</span></div><p>One payment. No subscription.</p></div>
            <div className="truthNote"><ShieldCheck size={20} /><p>Your experience, honestly presented.<br /><span>No invented skills or qualifications.</span></p></div>
          </aside>
        </div>
        {result && <section className="resultSection" ref={resultRef} tabIndex={-1} aria-labelledby="result-title">
          <div className="resultHeading"><div><p className="eyebrow">STEP 2 · YOUR FREE PREVIEW</p><h2 id="result-title">A first look at your application.</h2><p>Review a short excerpt. Your full CV and cover letter remain locked.</p></div><span className="readyBadge"><Check size={15} />Preview ready</span></div>
          <div className="insights"><div className="scoreBlock"><div className="scoreNumber">{score ?? "—"}{score !== null && <span>/100</span>}</div><div><h3>{mode === "tailor" ? "Job match" : "Profile strength"}</h3><p>{mode === "tailor" ? "AI estimate based on your CV and this job." : "AI estimate of how complete your information is."}</p></div></div><div className="keywordsBlock"><h3>{mode === "tailor" ? "Requirements to review" : "Ideas to strengthen your profile"}</h3>{keywords.length ? <div className="chips">{keywords.map(keyword => <span key={keyword}>{keyword}</span>)}</div> : <p>No keyword suggestions returned.</p>}<p>Only add skills or qualifications you actually have.</p></div></div>
          <div className="resultGrid"><div className="documentFrame">
            <div className="documentToolbar"><div className="documentTabs" role="group" aria-label="Choose document preview"><button aria-pressed={activeDocument === "cv"} onClick={() => setActiveDocument("cv")}><FileText size={16} />CV preview</button><button aria-pressed={activeDocument === "letter"} onClick={() => setActiveDocument("letter")}><PenLine size={16} />Cover letter</button></div><LockKeyhole className="toolbarLock" size={16} aria-label="Limited preview" /></div>
            <article className="paper" aria-label={activeDocument === "cv" ? "CV excerpt" : "Cover letter excerpt"}><div className="paperHeader"><span>{activeDocument === "cv" ? "CURRICULUM VITAE" : "COVER LETTER"}</span><span>EXCERPT</span></div><div className="paperContent" key={activeDocument}>{lines.map((line, i) => line.heading ? <h3 key={i}>{line.text}</h3> : <p className={line.bullet ? "documentBullet" : undefined} key={i}>{line.text}</p>)}</div><div className="paperLocked"><LockedLines /><div className="paperLockLabel"><LockKeyhole size={16} />Full document locked</div></div><div className="paperFooter"><span>ApplyFast</span><span>Preview only</span></div></article>
            <p className="previewCaption">A short excerpt of your result. The full documents are not included in this preview.</p>
          </div><aside className="unlockCard" aria-labelledby="unlock-title"><span className="unlockIcon"><LockKeyhole size={23} /></span><p className="eyebrow">TAKE THE NEXT STEP</p><h3 id="unlock-title">Your next application.<br />All in one place.</h3><p>Unlock the complete CV and cover letter, plus a total of 10 applications.</p><div className="unlockPrice"><strong>€6.99</strong><span>one-time payment</span></div><ul><li><Check size={17} />Full professional CV</li><li><Check size={17} />Complete cover letter</li><li><Check size={17} />10 application packages</li><li><Check size={17} />No subscription</li></ul>
            {/* No checkout route exists. Never simulate payment or release full documents. */}
            <button className="primaryButton unlockButton" disabled aria-describedby="checkout-status"><LockKeyhole size={16} />Unlock 10 applications · €6.99</button><p id="checkout-status" className="checkoutStatus">Payments are not available yet.<br />Your full documents remain locked.</p><a className="editLink" href="#application">Refine your details and preview again</a></aside></div>
        </section>}
        <section className="questions" aria-labelledby="questions-title"><h2 id="questions-title">A little clarity before you start.</h2><div><details><summary>Do I need a CV to get started?<ChevronDown size={18} /></summary><p>No. Choose “Build my CV” and describe your work, skills and background in your own words. We’ll organise your notes into a CV.</p></details><details><summary>What can I see for free?<ChevronDown size={18} /></summary><p>A short CV excerpt, a cover letter excerpt and application insights. The complete documents stay locked before payment.</p></details><details><summary>Is €6.99 a subscription?<ChevronDown size={18} /></summary><p>No. The price is €6.99 for 10 applications, paid once. Each application includes a CV and cover letter. Payments are not available yet.</p></details></div></section>
      </div>
      <footer><a className="wordmark" href="#top">ApplyFast<span className="brandDot">.</span></a><p>A clearer way to tell your story.</p><span>Built around your real experience.</span></footer>
    </main>
  );
}
