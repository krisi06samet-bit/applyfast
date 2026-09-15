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

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
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

    const baseRules = `
You are a senior professional CV writer and recruiter.

Create a genuinely strong, recruiter-ready CV while staying completely truthful.

ABSOLUTE TRUTH RULE

Never invent:
- employers
- company names
- dates
- duration
- education
- qualifications
- licences
- documents
- certificates
- achievements
- numbers
- software knowledge
- languages
- locations
- responsibilities unsupported by the candidate

You MAY:
- rewrite rough information professionally
- make weak wording stronger
- organise information clearly
- turn obvious real duties into professional CV bullet points
- use professional terminology when it accurately describes the user's real work

The final writing should NOT sound like copied user notes.

PROFILE

Write a natural professional profile of approximately 3 to 5 sentences.

It should sound polished and employable.

Do not fill it with generic AI phrases.

Avoid:
- highly motivated individual
- dynamic professional
- results-driven professional
- originally from [country]

WORK EXPERIENCE

Use professional wording.

When enough factual information exists, create 3 to 5 strong concise bullets.

Example:

Raw:
"raznasqh paketi po adresi"

Professional:
"Delivered parcels to customer addresses while managing daily delivery tasks efficiently."

This is allowed because it expresses the same real activity professionally.

Do not invent extra responsibilities.

SKILLS

Extract useful professional skills supported by the information.

Prefer concrete skills over generic personality traits.

LANGUAGES

Only include languages explicitly supplied.

DRIVING LICENCE

This is completely separate.

If a driving licence exists:
return ONLY the licence item inside drivingLicence.

Examples:
["Category B"]

or if category is unknown:
["Driving licence"]

Nothing else.

VCA

If VCA exists:
return ONLY the VCA item inside vca.

Examples:
["VCA"]
["VCA Basic"]
["VCA VOL"]

Nothing else.

DOCUMENTS

If other work or legal documents are explicitly mentioned:
return ONLY their names inside documents.

CERTIFICATES

If certificates are explicitly mentioned:
return ONLY their names inside certificates.

Do not mix any of these categories together.

Do not put driving licence inside certificates.
Do not put VCA inside documents.
Do not put documents inside skills.

COVER LETTER

Write a natural professional cover letter.

Approximately 4 to 6 short paragraphs.

Use only truthful information.

It must sound human, not like a generic AI template.

RECOMMENDATIONS

Return maximum 3 useful improvements in missingKeywords.

These are ONLY recommendations.

They must never appear inside any CV section.
`;

    const prompt =
      mode === "tailor"
        ? `
${baseRules}

MODE: TAILOR EXISTING CV

Improve the candidate's real CV for the supplied vacancy.

Emphasise relevant real experience without inventing missing requirements.

MATCH SCORE

Return a realistic job match score from 0 to 100.

Judge:
- experience
- skills
- qualifications
- languages
- licences
- actual alignment with the vacancy

MISSING KEYWORDS

Return maximum 3 genuinely relevant missing or unclear requirements from the vacancy.

CURRENT CV

${cvText}

JOB DESCRIPTION

${jobDescription}
`
        : `
${baseRules}

MODE: BUILD CV FROM ROUGH NOTES

The user may write badly organised, casual or broken notes.

They may mix:
- English
- Dutch
- Bulgarian
- Bulgarian written with Latin letters
- Turkish

Understand the obvious meaning.

Turn the information into strong professional English.

Do NOT simply repeat the user's wording.

Example:

Raw:
"rabotil sum dostavki s kola nqkolko meseca"

Good professional interpretation:
Package Delivery Worker

Possible bullet:
"Delivered parcels by car to customer addresses as part of daily delivery work."

Do not invent employer names or exact dates.

PROFILE STRENGTH SCORE

Return:

85-95:
Strong and detailed profile.

70-84:
Solid profile with useful experience and skills.

55-69:
Usable but missing useful detail.

Below 55:
Very little usable information.

Do not punish the user just because employer names or exact dates are missing.

CONTACT DETAILS PROVIDED SEPARATELY

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
          name: "applyfast_structured_cv",
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

              cv: {
                type: "object",
                additionalProperties: false,
                properties: {
                  name: {
                    type: "string",
                  },

                  contact: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      phone: {
                        type: "string",
                      },
                      email: {
                        type: "string",
                      },
                      location: {
                        type: "string",
                      },
                    },
                    required: [
                      "phone",
                      "email",
                      "location",
                    ],
                  },

                  profile: {
                    type: "string",
                  },

                  workExperience: {
                    type: "array",
                    items: {
                      type: "object",
                      additionalProperties: false,
                      properties: {
                        title: {
                          type: "string",
                        },
                        employer: {
                          type: "string",
                        },
                        duration: {
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
                        "employer",
                        "duration",
                        "bullets",
                      ],
                    },
                  },

                  skills: {
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

                  drivingLicence: {
                    type: "array",
                    items: {
                      type: "string",
                    },
                  },

                  vca: {
                    type: "array",
                    items: {
                      type: "string",
                    },
                  },

                  documents: {
                    type: "array",
                    items: {
                      type: "string",
                    },
                  },

                  certificates: {
                    type: "array",
                    items: {
                      type: "string",
                    },
                  },

                  education: {
                    type: "array",
                    items: {
                      type: "string",
                    },
                  },
                },
                required: [
                  "name",
                  "contact",
                  "profile",
                  "workExperience",
                  "skills",
                  "languages",
                  "drivingLicence",
                  "vca",
                  "documents",
                  "certificates",
                  "education",
                ],
              },

              coverLetter: {
                type: "string",
              },
            },

            required: [
              "matchScore",
              "missingKeywords",
              "cv",
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

    const result = JSON.parse(outputText);

    return Response.json({
      matchScore: Math.max(
        0,
        Math.min(
          100,
          Math.round(result.matchScore || 0)
        )
      ),

      missingKeywords: Array.isArray(result.missingKeywords)
        ? result.missingKeywords.slice(0, 3)
        : [],

      cv: result.cv,

      coverLetter: result.coverLetter || "",
    });
  } catch (error) {
    console.error("ApplyFast generation error:", error);

    return Response.json(
      {
        error:
          "We couldn't generate your application. Please try again.",
      },
      {
        status: 500,
      }
    );
  }
}
