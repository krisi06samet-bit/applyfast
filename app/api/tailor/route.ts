import OpenAI from "openai";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type RequestBody = {
  mode?: "tailor" | "build";

  // Tailor mode
  cvText?: string;
  jobDescription?: string;

  // Build mode
  aboutMe?: string;
  fullName?: string;
  email?: string;
  phone?: string;
};

function makePreview(text: string, percent: number) {
  if (!text) return "";

  const minChars = 90;

  const previewLength = Math.max(
    minChars,
    Math.floor(text.length * percent)
  );

  return text.slice(0, previewLength).trim() + "...";
}

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.error("[ApplyFast] Missing OPENAI_API_KEY");

      return Response.json(
        {
          error:
            "We couldn't process your request right now. Please try again.",
        },
        { status: 500 }
      );
    }

    const body: RequestBody = await request.json();

    const mode = body.mode;

    if (mode !== "tailor" && mode !== "build") {
      return Response.json(
        {
          error: "Invalid request.",
        },
        { status: 400 }
      );
    }

    let prompt = "";

    // =====================================================
    // MODE 1 — USER ALREADY HAS A CV
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
You are ApplyFast, a professional CV tailoring assistant.

The user already has a CV and wants to adapt it to a specific job.

ORIGINAL CV:

${cvText}

JOB DESCRIPTION:

${jobDescription}

YOUR TASK:

Create a stronger and more professional version of the user's CV for this specific job.

Improve:
- wording
- clarity
- structure
- relevance
- professional presentation
- ordering of information
- emphasis on experience that is relevant to the job

Use relevant keywords from the job description ONLY when they are genuinely supported by information already present in the CV.

Also create a short professional cover letter for this specific role.

STRICT TRUTH RULE:

Never invent information.

DO NOT invent:
- employers
- company names
- work experience
- responsibilities
- job titles
- dates
- years of experience
- achievements
- education
- qualifications
- certificates
- licences
- languages
- technical skills
- personal details

If the job requires something the user has not mentioned, DO NOT add it to the CV.

Instead, include it in missingKeywords.

MATCH SCORE:

Give a realistic matchScore from 0 to 100 based only on the information in the user's real CV compared with the job description.

MISSING KEYWORDS:

Return useful missing or weak keywords, requirements, skills or certifications that appear important for the job but are not clearly supported by the user's CV.

TAILORED CV:

Create a complete, clean and professional CV.

Do not use fake placeholders.

If information such as phone number, email, address or another detail is not present, simply omit it.

COVER LETTER:

Write a short professional cover letter for the job using only information that is actually supported by the CV.

Return:
- matchScore
- missingKeywords
- tailoredResume
- coverLetter
      `.trim();
    }

    // =====================================================
    // MODE 2 — BUILD A CV FROM SIMPLE HUMAN INPUT
    // =====================================================

    if (mode === "build") {
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
You are ApplyFast, a professional CV builder.

The user does NOT need to know how to write a CV.

They may give you extremely short, casual, badly written, mixed-language or incomplete information.

Your job is to understand their information and turn it into a clean professional CV.

USER'S INFORMATION:

${aboutMe}

OPTIONAL CONTACT DETAILS:

Full name:
${fullName || "Not provided"}

Email:
${email || "Not provided"}

Phone:
${phone || "Not provided"}

IMPORTANT EXAMPLE:

The user might write only:

"Steigerbouw
2 jaar ervaring
VCA
English and Bulgarian
Rijbewijs B
Amsterdam"

You should understand the meaning of this information.

For example:
- Steigerbouw = scaffolding / scaffolding work
- 2 jaar ervaring = 2 years of experience
- VCA = VCA certificate
- English and Bulgarian = languages
- Rijbewijs B = driving licence category B
- Amsterdam = location

You may professionally rewrite and organize those facts.

But you MUST NOT add facts the user never provided.

STRICT TRUTH RULE:

DO NOT invent:
- employer names
- company names
- exact employment dates
- exact job dates
- years of experience
- job titles that are unsupported
- responsibilities the user did not provide or clearly imply
- achievements
- education
- diplomas
- certificates
- licences
- languages
- technical skills
- addresses
- phone numbers
- email addresses

You MAY:
- correct grammar
- translate simple terms when needed
- professionally phrase the user's information
- organize information into CV sections
- infer the obvious meaning of simple statements

Example:

If the user says:
"2 jaar ervaring"

You can write:
"2 years of experience"

But you cannot invent:
"Worked at ABC Scaffolding from 2022–2024."

If the user says:
"Steigerbouw"

You can describe their field professionally as scaffolding work.

If the user says:
"VCA"

You can include VCA under Certifications.

If the user says:
"Rijbewijs B"

You can include Driving Licence B.

If information is missing, OMIT IT.

DO NOT output placeholders such as:
[FULL NAME]
[EMAIL]
[PHONE]
[COMPANY NAME]
[DATE]

If the user did not provide it, leave it out.

CREATE A PROFESSIONAL CV WITH RELEVANT SECTIONS SUCH AS:

- Name/contact information, only if provided
- Professional profile
- Work experience
- Skills
- Certifications
- Driving licence
- Languages
- Location
- Education, only if provided

Only include sections that make sense from the information given.

PROFESSIONAL PROFILE:

Turn the user's simple information into a short, strong professional introduction without inventing facts.

WORK EXPERIENCE:

If the user gives experience but no employer or dates, create a professional experience description WITHOUT inventing employer names or dates.

SKILLS:

Include skills explicitly provided or directly supported by the user's described work.

Do not invent unrelated skills.

PROFILE STRENGTH:

Use the matchScore field as a Profile Strength score from 0 to 100.

This is NOT a job match score.

Judge the strength based on:
- amount of useful information provided
- experience clarity
- skills provided
- certificates/licences
- languages
- contact information
- overall completeness

RECOMMENDED KEYWORDS:

Return useful keywords that could strengthen the person's profile IF they are truthful.

Do NOT claim the person already has these skills.

COVER LETTER:

Create a short professional general cover letter suitable for the type of work described.

If there is no exact company or vacancy, do not invent one.

Return:
- matchScore
- missingKeywords
- tailoredResume
- coverLetter
      `.trim();
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
      console.error("[ApplyFast] JSON parse failed", error);

      return Response.json(
        {
          error:
            "We couldn't process your request right now. Please try again.",
        },
        { status: 502 }
      );
    }

    // IMPORTANT:
    // The full CV and full cover letter stay on the server.
    // Before payment, the browser receives only a limited preview.

    return Response.json({
      matchScore: result.matchScore,

      missingKeywords: Array.isArray(result.missingKeywords)
        ? result.missingKeywords.slice(0, 3)
        : [],

      // 12% CV preview
      cvPreview: makePreview(
        result.tailoredResume,
        0.12
      ),

      // 8% cover letter preview
      coverLetterPreview: makePreview(
        result.coverLetter,
        0.08
      ),
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
