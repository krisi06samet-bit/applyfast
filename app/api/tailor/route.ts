import OpenAI from "openai";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type Mode = "tailor" | "build";

type RequestBody = {
  mode?: Mode;
  cvText?: string;
  jobDescription?: string;
  aboutMe?: string;
  fullName?: string;
  email?: string;
  phone?: string;
};

const resultSchema = {
  type: "object",
  additionalProperties: false,

  properties: {
    matchScore: {
      type: "number",
      minimum: 0,
      maximum: 100,
    },

    keywords: {
      type: "array",
      maxItems: 3,
      items: {
        type: "string",
      },
    },

    cv: {
      type: "object",
      additionalProperties: false,

      properties: {
        fullName: {
          type: "string",
        },

        contactLine: {
          type: "string",
        },

        headline: {
          type: "string",
        },

        profile: {
          type: "string",
        },

        skills: {
          type: "array",
          items: {
            type: "string",
          },
        },

        experience: {
          type: "array",

          items: {
            type: "object",
            additionalProperties: false,

            properties: {
              title: {
                type: "string",
              },

              organization: {
                type: "string",
              },

              dates: {
                type: "string",
              },

              location: {
                type: "string",
              },

              bullets: {
                type: "array",
                items: {
                  type: "string",
                },
              },
            },

            required: [
              "title",
              "organization",
              "dates",
              "location",
              "bullets",
            ],
          },
        },

        education: {
          type: "array",

          items: {
            type: "object",
            additionalProperties: false,

            properties: {
              qualification: {
                type: "string",
              },

              institution: {
                type: "string",
              },

              dates: {
                type: "string",
              },
            },

            required: [
              "qualification",
              "institution",
              "dates",
            ],
          },
        },

        certifications: {
          type: "array",
          items: {
            type: "string",
          },
        },

        languages: {
          type: "array",
          items: {
            type: "string",
          },
        },

        additional: {
          type: "array",
          items: {
            type: "string",
          },
        },
      },

      required: [
        "fullName",
        "contactLine",
        "headline",
        "profile",
        "skills",
        "experience",
        "education",
        "certifications",
        "languages",
        "additional",
      ],
    },

    coverLetter: {
      type: "string",
    },
  },

  required: [
    "matchScore",
    "keywords",
    "cv",
    "coverLetter",
  ],
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return Response.json(
        {
          error: "AI is not configured.",
        },
        {
          status: 500,
        }
      );
    }

    const body = (await request.json()) as RequestBody;

    const mode = body.mode;

    const cvText = clean(body.cvText);
    const jobDescription = clean(body.jobDescription);

    const aboutMe = clean(body.aboutMe);
    const fullName = clean(body.fullName);
    const email = clean(body.email);
    const phone = clean(body.phone);

    if (mode !== "tailor" && mode !== "build") {
      return Response.json(
        {
          error: "Invalid mode.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      mode === "tailor" &&
      (!cvText || !jobDescription)
    ) {
      return Response.json(
        {
          error:
            "Paste your CV and the job description first.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      mode === "build" &&
      !aboutMe
    ) {
      return Response.json(
        {
          error:
            "Tell us a little about yourself first.",
        },
        {
          status: 400,
        }
      );
    }

    const truthRules = `
TRUTH RULES:

- Never invent facts.
- Never invent an employer or company.
- Never invent school or education.
- Never invent dates.
- Never invent exact years.
- Never invent qualifications.
- Never invent certificates.
- Never invent licences.
- Never invent languages.
- Never invent achievements.
- Never invent software knowledge.
- Never invent tools or machines.
- Never invent responsibilities that are not supported by the user's information.
- Never invent locations.

If information is missing, simply omit it.

Do not use fake placeholders such as:
[COMPANY NAME]
[DATE]
[YOUR NAME]
[ADDRESS]

You may:
- correct grammar
- translate simple notes into professional English
- organize information
- improve wording
- make the CV clearer
- make supported experience sound more professional

Everything must remain truthful and defendable in a real job interview.
`;

    const qualityRules = `
CV QUALITY RULES:

You are a highly skilled professional CV writer.

The CV must feel like something a real professional CV writer created.

It should be:

- professional
- clean
- credible
- recruiter-friendly
- ATS-friendly
- concise
- easy to scan
- strong without sounding fake

PROFESSIONAL PROFILE:

Write a polished professional profile of around 3 to 5 sentences when enough information exists.

It should summarize:
- the person's actual field or role
- real experience
- strongest supported abilities
- relevant licences, languages or certificates
- the value they can realistically bring to an employer

Avoid empty phrases such as:
"hard-working individual"
"motivated team player"
"excellent person"

unless the user's information actually supports them.

HEADLINE:

Create a clean professional job title based only on the user's real experience or target job.

Examples:
Sales Assistant
Scaffolder
Warehouse Operative
Customer Service Professional

SKILLS:

Use short recruiter-friendly skill names.

Normally return around 4 to 8 useful skills when the user's information supports them.

Do not invent a skill just because it would improve the CV.

EXPERIENCE:

Turn the user's real work information into professional experience entries.

Experience bullets should:
- sound professional
- begin clearly
- describe real responsibilities or abilities
- avoid fake numbers and fake achievements

If the user says something like:
"2 years scaffolding"

you may create an experience entry such as:

Title: Scaffolder
Dates: 2 years

but:
- do not invent the employer
- do not invent exact years
- do not invent projects
- do not invent management responsibilities

If the employer is unknown, organization must be an empty string.

EDUCATION:

Only include education when the user actually supplied it.

CERTIFICATIONS AND LICENCES:

Only include real supplied certifications and licences.

LANGUAGES:

Only include languages explicitly supplied by the user.

CONTACT INFORMATION:

Only include details supplied by the user.

contactLine should combine real available contact/location details using:
 ·

Example:
Amsterdam · email@example.com · +31...

If information is missing, do not add a placeholder.

COVER LETTER:

Write a professional natural cover letter.

It should normally contain around 4 to 6 short paragraphs.

It should:
- sound human
- be confident but not exaggerated
- use the candidate's real experience
- avoid repeating the CV word-for-word

If there is a specific vacancy, tailor the letter to it.

If no company is known, never invent a company name.

FORMATTING:

Do not use markdown symbols anywhere.

Do not output:
#
##
**
__
