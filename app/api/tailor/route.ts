import OpenAI from "openai";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type Mode = "tailor" | "build";

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return Response.json(
        {
          error:
            "We couldn't process your request right now. Please try again.",
        },
        { status: 500 }
      );
    }

    const body = await request.json();

    const mode = String(body.mode || "") as Mode;

    let prompt = "";

    // =====================================================
    // MODE 1 — TAILOR EXISTING CV TO A JOB
    // =====================================================

    if (mode === "tailor") {
      const cvText = String(body.cvText || "").trim();
      const jobDescription = String(
        body.jobDescription || ""
      ).trim();

      if (!cvText || !jobDescription) {
        return Response.json(
          {
            error:
              "Paste your CV and the job description first.",
          },
          { status: 400 }
        );
      }

      prompt = `
You are ApplyFast, an expert professional CV writer and CV tailoring assistant.

The user already has a CV and wants to adapt it to a specific vacancy.

ORIGINAL CV:

${cvText}

JOB DESCRIPTION:

${jobDescription}

YOUR TASK:

Create a polished, professional and recruiter-ready version of the user's CV for this specific job.

The result should feel like it was written by a skilled professional CV writer, not by an AI chatbot.

Improve:
- wording
- clarity
- structure
- readability
- relevance
- professional presentation
- ordering of information
- emphasis on experience relevant to the vacancy

The finished CV should be:
- professional
- credible
- ATS-friendly
- easy to scan
- concise
- natural
- strong without sounding exaggerated

STRICT TRUTH RULE:

Never invent information.

DO NOT invent:
- employers
- company names
- work experience
- responsibilities
- job titles
- employment dates
- exact years
- achievements
- education
- qualifications
- certificates
- licences
- languages
- technical skills
- software
- tools
- machines
- addresses
- phone numbers
- email addresses
- personal details

You may improve wording and presentation, but every factual claim must remain supported by the original CV.

If the job requires something that the user has not mentioned, DO NOT add it to the CV.

Instead, include it in missingKeywords when appropriate.

PROFESSIONAL PROFILE:

Create a strong professional profile near the top of the CV when enough information exists.

Usually use around 3 to 5 concise sentences.

Summarize:
- actual field or role
- real experience
- strongest supported abilities
- relevant licences, certificates or languages
- realistic value the candidate can bring

Avoid generic filler.

SKILLS:

Use concise recruiter-friendly skill names.

Only include skills that are explicitly stated or clearly supported by the user's CV.

EXPERIENCE:

Improve experience descriptions professionally.

Use clear action-oriented wording where appropriate.

Do not create fake:
- responsibilities
- projects
- metrics
- achievements
- management experience

MATCH SCORE:

Give a realistic matchScore from 0 to 100 based only on the candidate's supported experience compared with the job description.

General guidance:

85-95:
Very strong supported fit.

70-84:
Good fit with some gaps.

55-69:
Partial fit.

Below 55:
Weak fit or major requirements missing.

Do not artificially inflate the score.

MISSING KEYWORDS:

Return no more than 3 important missing or weak keywords, requirements, skills or certifications from the vacancy.

Keep each suggestion short.

Do not claim the candidate already has them.

TAILORED CV:

Create the complete CV.

Use clear section headings where useful, such as:

Professional Profile
Work Experience
Core Skills
Education
Certifications
Languages
Additional Information

Only include sections supported by the candidate's information.

If contact details or another section are missing, simply omit them.

Do not use fake placeholders.

FORMATTING:

Do not use markdown formatting.

Do not use:
- #
- ##
- **
- __
- code fences

Write clean plain text because the website will handle the visual formatting.

COVER LETTER:

Write a professional cover letter for this specific vacancy.

Use around 4 to 6 short paragraphs.

The letter should:
- sound natural
- sound confident but realistic
- use only supported information
- focus on relevant experience
- avoid repeating the CV word-for-word

Never invent the hiring company if it is not clearly provided.

Return:
- matchScore
- missingKeywords
- tailoredResume
- coverLetter
      `.trim();
    }

    // =====================================================
    // MODE 2 — BUILD CV FROM SIMPLE HUMAN INPUT
    // =====================================================

    else if (mode === "build") {
      const aboutMe = String(body.aboutMe || "").trim();

      const fullName = String(body.fullName || "").trim();
      const email = String(body.email || "").trim();
      const phone = String(body.phone || "").trim();

      if (!aboutMe) {
        return Response.json(
          {
            error:
              "Tell us a little about yourself first.",
          },
          { status: 400 }
        );
      }

      prompt = `
You are ApplyFast, an expert professional CV writer.

The user does NOT need to know how to write a CV.

They may give you:
- very short notes
- broken grammar
- mixed languages
- casual wording
- incomplete sentences
- simple bullet points

Your job is to understand the real information they provided and turn it into a polished, professional and recruiter-ready CV.

USER'S INFORMATION:

${aboutMe}

OPTIONAL CONTACT DETAILS:

Full name:
${fullName || "Not provided"}

Email:
${email || "Not provided"}

Phone:
${phone || "Not provided"}

The finished CV should feel like it was created by a skilled professional CV writer.

It should be:
- professional
- clean
- credible
- recruiter-friendly
- ATS-friendly
- easy to scan
- concise
- natural
- strong without sounding fake

UNDERSTAND SIMPLE INPUT:

For example, the user might write:

Steigerbouw
2 jaar ervaring
VCA
English and Bulgarian
Rijbewijs B
Amsterdam

You should correctly understand:

Steigerbouw = scaffolding work
2 jaar ervaring = 2 years of experience
VCA = VCA certificate
English and Bulgarian = languages
Rijbewijs B = driving licence category B
Amsterdam = location

You may professionally rewrite and organize these facts.

STRICT TRUTH RULE:

Never invent information.

DO NOT invent:
- employer names
- company names
- exact employment dates
- exact job dates
- years of experience
- unsupported job titles
- unsupported responsibilities
- achievements
- education
- diplomas
- certificates
- licences
- languages
- technical skills
- software
- tools
- machines
- addresses
- phone numbers
- email addresses

You MAY:
- correct grammar
- translate simple terms
- professionally rewrite information
- organize information into CV sections
- infer obvious meaning from simple statements

Example:

If the user says:
2 jaar ervaring

You may write:
2 years of experience

But you may NOT invent:
Worked at ABC Scaffolding from 2022 to 2024.

If the user says:
Steigerbouw

You may describe the field professionally as scaffolding work.

If the user says:
VCA

You may include VCA under Certifications.

If the user says:
Rijbewijs B

You may include Driving Licence B.

If information is missing, OMIT IT.

Never output placeholders such as:
FULL NAME
EMAIL
PHONE
COMPANY NAME
DATE

PROFESSIONAL PROFILE:

Create a strong professional profile when enough information exists.

Usually use around 3 to 5 concise sentences.

Summarize the user's:
- actual field
- real experience
- strongest supported skills
- certificates
- licences
- languages
- realistic value to an employer

Avoid generic filler.

WORK EXPERIENCE:

If the user provides experience but no employer name or exact dates, still create a professional experience section.

Example:

Scaffolder
2 years of experience

Then write only responsibilities or abilities that are directly supported or obviously implied by the user's information.

Do NOT invent an employer.

Do NOT invent exact employment years.

SKILLS:

Use short professional skill names.

Only include skills that are explicitly supplied or directly supported by the work described.

Do not invent unrelated skills.

CERTIFICATIONS:

Only include certifications supplied by the user.

DRIVING LICENCE:

Only include a driving licence if the user provided it.

LANGUAGES:

Only include languages explicitly provided by the user.

EDUCATION:

Only include education when the user supplied it.

PROFILE STRENGTH:

Use matchScore as a Profile Strength score from 0 to 100.

This is NOT a job match score.

Use approximately:

85-95:
Strong amount of useful information including experience and several supported skills, certificates, licences, languages or responsibilities.

70-84:
Clear role and experience plus enough supporting information to produce a solid professional CV.

55-69:
Useful information exists but the profile is sparse.

Below 55:
Very little useful professional information was supplied.

IMPORTANT:

Do NOT reduce the score just because exact employer names or exact dates are missing.

Judge the quality of the usable information the person actually provided.

RECOMMENDED KEYWORDS:

Return no more than 3 short suggestions that could strengthen the profile if they are true.

Do not pretend the person already has these skills.

FORMATTING:

Do not use markdown formatting.

Do not use:
- #
- ##
- **
- __
- code fences

Create clean plain text.

COVER LETTER:

Create a professional general cover letter suitable for the type of work described.

Use around 4 to 6 short paragraphs.

The letter should:
- sound natural
- sound professional
- use the user's actual experience
- avoid fake claims
- avoid repeating the CV word-for-word

If there is no exact company or vacancy, never invent one.

Return:
- matchScore
- missingKeywords
- tailoredResume
- coverLetter
      `.trim();
    }

    // =====================================================
    // INVALID MODE
    // =====================================================

    else {
      return Response.json(
        {
          error: "Invalid mode.",
        },
        { status: 400 }
      );
    }

    console.log("[ApplyFast] Request starting", {
      mode,
    });

    const response = await openai.responses.create({
      model: "gpt-5.6-luna",

      input: prompt,

      text: {
        format: {
          type: "json_schema",
          name: "applyfast_result",
          strict: true,

          schema: {
            type: "object",
            additionalProperties: false,

            properties: {
              matchScore: {
                type: "number",
                minimum: 0,
                maximum: 100,
              },

              missingKeywords: {
                type: "array",
                maxItems: 3,
                items: {
                  type: "string",
                },
              },

              tailoredResume: {
                type: "string",
              },

              coverLetter: {
                type: "string",
              },
            },

            required: [
              "matchScore",
              "missingKeywords",
              "tailoredResume",
              "coverLetter",
            ],
          },
        },
      },
    });

    console.log("[ApplyFast] Response received", {
      mode,
    });

    if (!response.output_text) {
      console.error("[ApplyFast] Empty response");

      return Response.json(
        {
          error:
            "We couldn't process your request right now. Please try again.",
        },
        { status: 502 }
      );
    }

    let result: {
      matchScore: number;
      missingKeywords: string[];
      tailoredResume: string;
      coverLetter: string;
    };

    try {
      result = JSON.parse(response.output_text);
    } catch (error) {
      console.error(
        "[ApplyFast] JSON parse failed",
        error
      );

      return Response.json(
        {
          error:
            "We couldn't process your request right now. Please try again.",
        },
        { status: 502 }
      );
    }

    // =====================================================
    // TEMPORARY TEST MODE
    // Full CV + full cover letter are visible.
    // Later we will restore the paid preview.
    // =====================================================

    return Response.json({
      matchScore: result.matchScore,

      missingKeywords: Array.isArray(
        result.missingKeywords
      )
        ? result.missingKeywords.slice(0, 3)
        : [],

      cvPreview:
        result.tailoredResume,

      coverLetterPreview:
        result.coverLetter,
    });
  } catch (error: any) {
    console.error("[ApplyFast] Server error", {
      status: error?.status,
      message: error?.message,
      code: error?.code,
    });

    return Response.json(
      {
        error:
          "We couldn't process your request right now. Please try again.",
      },
      { status: 500 }
    );
  }
}
