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
    const lowerSafe = safe.toLowerCase();
    const lowerMarker = marker.toLowerCase();

    const index = lowerSafe.indexOf(lowerMarker);

    if (index !== -1 && index < cutIndex) {
      cutIndex = index;
    }
  }

  safe = safe.slice(0, cutIndex).trim();

  return safe
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => {
      const trimmed = line.trim();

      if (!trimmed) return true;

      if (
        trimmed === "." ||
        trimmed === "•" ||
        trimmed === "-" ||
        trimmed === "·"
      ) {
        return false;
      }

      return true;
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

    const prompt =
      mode === "tailor"
        ? `
You are a senior professional CV writer and recruiter.

Your task is to improve a real person's CV for a specific job vacancy.

The result must look and read like a real professional CV written by a human.

TRUTH RULE

Never invent:
- employers
- company names
- dates
- education
- qualifications
- certificates
- licences
- achievements
- metrics
- software knowledge
- languages
- years of experience
- locations
- duties the candidate did not actually mention

You may improve wording and presentation, but not facts.

CV STRUCTURE

The CV text must contain ONLY CV content.

Allowed sections:

Candidate Name

Professional Profile

Work Experience

Skills

Languages

Driving Licence

Certifications

Education

Only include sections that have real information.

IMPORTANT:
After the final CV section, STOP.

Do not append:
- Cover Letter
- Recommended Improvements
- Missing Keywords
- Match Score
- Profile Strength
- Suggestions
- Notes
- Commentary
- Explanations

Those belong in separate JSON fields only.

PROFESSIONAL PROFILE

Write approximately 3 to 5 natural sentences.

Keep it:
- professional
- direct
- recruiter-friendly
- natural
- concise

Do not include nationality or country of origin unless professionally relevant.

WORK EXPERIENCE

Use only truthful experience.

Improve raw notes into strong professional wording.

Use 3 to 5 bullet points when enough factual information exists.

Do not invent responsibilities.

SKILLS

Use specific useful skills supported by the CV.

Prefer:
- Customer service
- Driving
- Parcel delivery
- Cleaning services
- Warehouse work
- Scaffolding
- Safety awareness
- Teamwork
- Time management

Avoid meaningless filler such as:
- Reliable work attitude
- Highly motivated
- Dynamic professional

LANGUAGES

Only include languages explicitly mentioned.

DRIVING LICENCE

This section must contain ONLY driving licence information.

Examples:

Driving Licence
Category B

or:

Driving Licence
Driving licence

Do not place any other information in this section.

Do not put:
- recommendations
- missing keywords
- cover letter
- employer suggestions
- dates suggestions
- commentary

CERTIFICATIONS

Only include real certificates supplied by the candidate.

MATCH SCORE

Return a realistic score from 0 to 100 based on alignment with the vacancy.

MISSING KEYWORDS

Return maximum 3 useful missing requirements from the vacancy.

They must be returned ONLY in missingKeywords.

Do not place them inside the CV.

COVER LETTER

Write a natural 4 to 6 paragraph cover letter.

Return it ONLY in coverLetter.

Never include it inside tailoredResume.

FORMATTING

Plain text only.

Use bullet character:
•

Do not use markdown:
#
##
**
__
code fences

CURRENT CV

${cvText}

JOB DESCRIPTION

${jobDescription}
`
        : `
You are a senior professional CV writer and recruiter.

A normal person has written rough, simple, possibly messy notes about themselves.

The notes may:
- contain spelling mistakes
- be unstructured
- use slang
- mix Bulgarian, Dutch, English or Turkish
- use Bulgarian written with Latin letters
- contain only short phrases

Your job is to understand the obvious meaning and convert those notes into a professional English CV.

TRUTH RULE

Never invent:
- employers
- company names
- dates
- education
- qualifications
- certificates
- licences
- achievements
- numbers
- software knowledge
- languages
- years of experience
- locations
- responsibilities that are not supported

You may professionally rewrite obvious meaning.

Example:

"rabotil sum dostavki s kola"

may become:

"Package Delivery Worker"

and a bullet such as:

"Delivered parcels to customer addresses using a car."

But do not invent employer, dates, route software or delivery numbers.

CV STRUCTURE

The tailoredResume field must contain ONLY the CV.

Use these sections when information exists:

Candidate Name

Professional Profile

Work Experience

Skills

Languages

Driving Licence

Certifications

Education

IMPORTANT:
After the final CV section, STOP.

Do not append anything else.

Do not append:
- Recommended Improvements
- Suggestions
- Missing Keywords
- Profile Strength
- Match Score
- Cover Letter
- Notes
- Commentary

Those belong ONLY in separate JSON fields.

PROFESSIONAL PROFILE

Write approximately 3 to 5 natural sentences.

The profile should explain:
- what kind of work the person has done
- useful experience
- practical strengths
- employability

Avoid:
- exaggerated wording
- AI filler
- nationality unless relevant
- phrases such as "Originally from Bulgaria"

WORK EXPERIENCE

If the user gives a type of job, create a reasonable simple role title.

Examples:

"pochistvah ofisi"
→ Cleaner

"raznasqh paketi"
→ Package Delivery Worker

Do not create senior titles.

If no employer is given, do not invent one.

If no exact dates are given, do not invent dates.

If duration is given, you may use it.

Create 3 to 5 useful bullets when enough real information exists.

Make them sound professional but factual.

SKILLS

Use only supported skills.

Prefer concrete useful skills.

Examples when supported:
- Cleaning services
- Driving
- Parcel delivery
- Physical work
- Customer communication
- Teamwork
- Time management
- Warehouse work
- Scaffolding
- Safety awareness

Avoid weak filler:
- Reliable work attitude
- Hardworking person
- Highly motivated
- Dynamic worker

LANGUAGES

Only include languages explicitly mentioned.

DRIVING LICENCE

This section must contain ONLY licence information.

If category is known:

Driving Licence
Category B

If category is not known:

Driving Licence
Driving licence

Do not place anything else here.

Never put:
- Recommended Improvements
- employer name suggestions
- employment date suggestions
- certifications suggestions
- Cover Letter
- commentary

CERTIFICATIONS

Only include certificates actually mentioned.

ADDITIONAL INFORMATION

Avoid this section unless truly necessary.

Do not include:
- nationality
- country of origin
- "From Bulgaria"

PROFILE STRENGTH

Return a realistic score between 0 and 100.

Use roughly:

85 to 95:
Strong and detailed profile.

70 to 84:
Solid profile with good useful information.

55 to 69:
Usable but limited.

Below 55:
Very little usable information.

Do not reduce the score just because exact employer names or dates are absent.

RECOMMENDED IMPROVEMENTS

Return maximum 3 improvements.

They must appear ONLY in missingKeywords.

Do not place them inside tailoredResume.

Examples:
- Employer name
- Exact employment dates
- Specific job duties
- Licence category
- Relevant certificate

Keep them relevant.

COVER LETTER

Write a natural general cover letter of approximately 4 to 6 short paragraphs.

Use only truthful information.

Return it ONLY in coverLetter.

Do not include the cover letter inside tailoredResume.

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

    const safeCv = sanitizeCvText(result.tailoredResume || "");

    return Response.json({
      matchScore:
        typeof result.matchScore === "number"
          ? Math.max(0, Math.min(100, Math.round(result.matchScore)))
          : 0,

      missingKeywords: Array.isArray(result.missingKeywords)
        ? result.missingKeywords.slice(0, 3)
        : [],

      cvPreview: safeCv,

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
