import OpenAI from "openai";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type Mode = "tailor" | "build";

type TailorRequest = {
  mode?: Mode;
  cvText?: string;
  jobDescription?: string;
  aboutMe?: string;
  fullName?: string;
  email?: string;
  phone?: string;
};

type AiResult = {
  matchScore: number;
  missingKeywords: string[];
  tailoredResume: string;
  coverLetter: string;
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function sanitizeCvText(text: string) {
  if (!text) return "";

  const stopMarkers = [
    "Cover Letter",
    "Recommended Improvements",
    "Missing Keywords",
    "Profile Strength",
    "Match Score",
    "Suggestions",
    "Recommendations",
  ];

  let safe = text.trim();
  let cutIndex = safe.length;

  for (const marker of stopMarkers) {
    const index = safe.toLowerCase().indexOf(marker.toLowerCase());

    if (index !== -1 && index < cutIndex) {
      cutIndex = index;
    }
  }

  return safe
    .slice(0, cutIndex)
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => {
      const trimmed = line.trim();

      if (!trimmed) return true;

      return ![".", "•", "-", "·"].includes(trimmed);
    })
    .join("\n")
    .trim();
}

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return Response.json(
        { error: "OpenAI is not configured." },
        { status: 500 }
      );
    }

    const body = (await request.json()) as TailorRequest;

    const mode = body.mode;

    const cvText = clean(body.cvText);
    const jobDescription = clean(body.jobDescription);

    const aboutMe = clean(body.aboutMe);
    const fullName = clean(body.fullName);
    const email = clean(body.email);
    const phone = clean(body.phone);

    if (mode !== "tailor" && mode !== "build") {
      return Response.json(
        { error: "Invalid mode." },
        { status: 400 }
      );
    }

    if (mode === "tailor" && (!cvText || !jobDescription)) {
      return Response.json(
        { error: "CV and job description are required." },
        { status: 400 }
      );
    }

    if (mode === "build" && !aboutMe) {
      return Response.json(
        { error: "Tell us about yourself first." },
        { status: 400 }
      );
    }

    const sharedRules = `
You are a senior professional CV writer and recruiter.

ABSOLUTE TRUTH RULE

Never invent:
- employers
- company names
- dates
- education
- qualifications
- licences
- certificates
- documents
- achievements
- numbers
- software knowledge
- languages
- years of experience
- locations
- responsibilities not supported by the user

You may improve wording, structure and presentation only.

CV CONTENT RULE

The tailoredResume field must contain ONLY the CV.

Never include:
- Cover Letter
- Recommended Improvements
- Missing Keywords
- Profile Strength
- Match Score
- Suggestions
- Commentary
- Notes

Those belong only in separate JSON fields.

CV STRUCTURE

Use sections only when relevant information exists.

Possible sections:

Candidate Name

Professional Profile

Work Experience

Skills

Languages

Driving Licence

VCA

Documents

Certificates

Education

IMPORTANT RULE FOR LICENCES, DOCUMENTS AND CERTIFICATES

Every type must be its OWN separate small section.

Do NOT combine them.

Example:

Driving Licence
Category B

VCA
VCA Basic

Documents
Work Permit

Certificates
Forklift Certificate

If only a driving licence is mentioned:

Driving Licence
Driving licence

If only VCA is mentioned:

VCA
VCA

If documents are mentioned:

Documents
[document name]

If certificates are mentioned:

Certificates
[certificate name]

VERY IMPORTANT:

Inside these sections write ONLY the actual item.

Do NOT write sentences.

Do NOT write explanations.

Do NOT write:
- "Holds a driving licence"
- "Driving licence held"
- "This licence allows..."
- "Valid driving licence"
- recommendations
- commentary

Only the short factual item.

Example:

Driving Licence
Category B

NOT:

Driving Licence
Holds a Category B driving licence and is able to travel between work locations.

Same rule for VCA, Documents and Certificates.

PROFESSIONAL PROFILE

Write around 3 to 5 natural sentences.

Keep it:
- professional
- direct
- concise
- recruiter-friendly
- natural

Do not include nationality or country of origin unless professionally relevant.

WORK EXPERIENCE

Use only real experience.

If enough information exists, create 3 to 5 concise bullet points.

Improve wording without inventing responsibilities.

SKILLS

Use useful, specific skills supported by the user.

Avoid weak filler such as:
- Highly motivated
- Dynamic worker
- Reliable work attitude

LANGUAGES

Only include languages explicitly mentioned.

Do not put licences, documents, VCA or certificates in Languages.

FORMATTING

Plain text only.

Use bullet character:
•

Do not use:
#
##
**
__
code fences

After the final CV section, STOP.
`;

    const prompt =
      mode === "tailor"
        ? `
${sharedRules}

You are tailoring an existing CV for a specific vacancy.

MATCH SCORE

Return a realistic score from 0 to 100 based on:
- relevant experience
- supported skills
- qualifications
- languages
- licence requirements
- alignment with the vacancy

MISSING KEYWORDS

Return maximum 3 genuinely relevant missing requirements.

Return them ONLY in missingKeywords.

COVER LETTER

Write a natural cover letter of approximately 4 to 6 short paragraphs.

Use only truthful information.

Return it ONLY in coverLetter.

CURRENT CV

${cvText}

JOB DESCRIPTION

${jobDescription}
`
        : `
${sharedRules}

The user has written rough, casual notes about themselves.

The notes may:
- contain spelling mistakes
- be badly organised
- use slang
- mix English, Dutch, Bulgarian or Turkish
- contain Bulgarian written with Latin letters

Understand the obvious meaning and create a professional English CV.

Do not invent anything.

ROLE TITLES

You may create a simple role title when the type of work is obvious.

Examples:

"pochistvah"
→ Cleaner

"raznasqh paketi"
→ Package Delivery Worker

Do not make titles more senior than the information supports.

PROFILE STRENGTH

Return a realistic score from 0 to 100.

Rough guide:

85-95:
Strong detailed profile.

70-84:
Solid profile.

55-69:
Usable but limited.

Below 55:
Very little useful information.

Do not lower the score only because employer names or exact dates are missing.

RECOMMENDED IMPROVEMENTS

Return maximum 3 useful improvements.

Return them ONLY in missingKeywords.

Examples:
- Employer name
- Exact employment dates
- Specific job duties
- Licence category
- Relevant certificate

Never place them inside tailoredResume.

COVER LETTER

Write a natural general cover letter of approximately 4 to 6 short paragraphs.

Return it ONLY in coverLetter.

CONTACT DETAILS

Name:
${fullName || "Not provided"}

Email:
${email || "Not provided"}

Phone:
${phone || "Not provided"}

ROUGH USER NOTES

${aboutMe}
`;

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

    const outputText = response.output_text?.trim();

    if (!outputText) {
      return Response.json(
        { error: "Could not generate your application." },
        { status: 500 }
      );
    }

    let result: AiResult;

    try {
      result = JSON.parse(outputText) as AiResult;
    } catch (error) {
      console.error("Could not parse OpenAI response:", error);
      console.error("Raw response:", outputText);

      return Response.json(
        { error: "Could not process the generated application." },
        { status: 500 }
      );
    }

    return Response.json({
      matchScore:
        typeof result.matchScore === "number"
          ? Math.max(0, Math.min(100, Math.round(result.matchScore)))
          : 0,

      missingKeywords: Array.isArray(result.missingKeywords)
        ? result.missingKeywords.slice(0, 3)
        : [],

      cvPreview: sanitizeCvText(result.tailoredResume || ""),

      coverLetterPreview: result.coverLetter || "",
    });
  } catch (error) {
    console.error("ApplyFast generation error:", error);

    return Response.json(
      {
        error: "We couldn't generate your application. Please try again.",
      },
      {
        status: 500,
      }
    );
  }
}
