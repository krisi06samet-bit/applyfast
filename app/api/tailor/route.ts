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

Avoid empty phrases unless the user's information actually supports them.

HEADLINE:

Create a clean professional job title based only on the user's real experience or target job.

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
- avoid fake numbers
- avoid fake achievements

If the user says something like:
"2 years scaffolding"

you may create an experience entry with:
Title: Scaffolder
Dates: 2 years

But:
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

contactLine should combine real available contact or location details using a middle dot separator.

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

Do not output hash headings, bold markdown, underscores or code fences.

The website handles the visual formatting.
`;

    let taskPrompt = "";

    if (mode === "tailor") {
      taskPrompt = `
MODE:
TAILOR EXISTING CV TO A SPECIFIC JOB

CURRENT CV:

${cvText}

JOB DESCRIPTION:

${jobDescription}

TASK:

Create a stronger professional version of this CV for this vacancy.

Keep all factual information truthful.

Improve:
- wording
- relevance
- structure
- clarity
- professional presentation

Prioritize the candidate's real experience that is relevant to the job.

Never add job requirements as skills unless the candidate's CV supports them.

MATCH SCORE:

matchScore should represent the realistic fit between the person's supported background and the vacancy.

Do not artificially inflate the score.

General guide:

85-95:
Very strong supported fit.

70-84:
Good fit with some gaps.

55-69:
Partial fit.

Below 55:
Weak fit or major requirements missing.

KEYWORDS:

Return no more than 3 short useful vacancy keywords.

Normally 1 to 4 words each.

These are suggestions only.

Do not pretend the candidate already has a missing skill.
`;
    }

    if (mode === "build") {
      taskPrompt = `
MODE:
BUILD A PROFESSIONAL CV FROM SIMPLE USER NOTES

USER NOTES:

${aboutMe}

OPTIONAL CONTACT DETAILS:

Name:
${fullName || "(not supplied)"}

Email:
${email || "(not supplied)"}

Phone:
${phone || "(not supplied)"}

TASK:

Turn these notes into a polished professional CV.

The user may:
- write very little
- use broken grammar
- use another language
- write simple bullet points
- write casually

Understand what they mean and organize the real information professionally.

Do not punish someone just because they did not write a professionally formatted CV themselves.

PROFILE STRENGTH SCORE:

matchScore represents PROFILE STRENGTH in Build mode.

It is not a vacancy match score.

General guide:

85-95:
The user provided strong useful information such as experience plus multiple supported skills, languages, licences, certifications or responsibilities.

70-84:
The user's role and experience are clear and there is enough information to create a solid professional CV.

55-69:
Useful information exists but the profile is still quite sparse.

Below 55:
Very little useful information was supplied.

Do NOT lower the score simply because:
- exact employer names are missing
- exact dates are missing

if the user still gave meaningful professional information.

KEYWORDS:

Return no more than 3 short suggestions that could strengthen the profile.

Do not claim the user already has these skills.

Keep each suggestion short.
`;
    }

    const response = await openai.responses.create({
      model: "gpt-5.6-luna",

      input: `
You are ApplyFast's professional CV writer.

${truthRules}

${qualityRules}

${taskPrompt}

Return only the structured result requested by the JSON schema.
`,

      text: {
        format: {
          type: "json_schema",
          name: "applyfast_cv_result",
          strict: true,
          schema: resultSchema,
        },
      },
    });

    if (!response.output_text) {
      throw new Error(
        "OpenAI returned an empty response."
      );
    }

    const result = JSON.parse(
      response.output_text
    );

    return Response.json(result);
  } catch (error) {
    console.error(
      "ApplyFast tailor error:",
      error
    );

    return Response.json(
      {
        error:
          "We couldn't create your CV. Please try again.",
      },
      {
        status: 500,
      }
    );
  }
}
