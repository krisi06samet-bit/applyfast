import OpenAI from "openai";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

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

const placeholderValues = new Set([
  "not provided",
  "not specified",
  "unknown",
  "n/a",
  "none",
]);

function cleanOutputString(value: unknown) {
  const cleaned = clean(value);

  return placeholderValues.has(cleaned.toLowerCase())
    ? ""
    : cleaned;
}

function cleanOutputItems(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map(cleanOutputString)
    .filter(Boolean);
}

function cleanCv(cv: any) {
  const contact = cv?.contact || {};
  const workExperience = Array.isArray(cv?.workExperience)
    ? cv.workExperience
        .map((job: any) => ({
          title: cleanOutputString(job?.title),
          employer: cleanOutputString(job?.employer),
          duration: cleanOutputString(job?.duration),
          bullets: cleanOutputItems(job?.bullets),
        }))
        .filter(
          (job: any) =>
            job.title ||
            job.employer ||
            job.duration ||
            job.bullets.length > 0
        )
    : [];

  return {
    name: cleanOutputString(cv?.name),
    contact: {
      phone: cleanOutputString(contact.phone),
      email: cleanOutputString(contact.email),
      location: cleanOutputString(contact.location),
    },
    profile: cleanOutputString(cv?.profile),
    workExperience,
    skills: cleanOutputItems(cv?.skills),
    languages: cleanOutputItems(cv?.languages),
    drivingLicence: cleanOutputItems(cv?.drivingLicence),
    vca: cleanOutputItems(cv?.vca),
    documents: cleanOutputItems(cv?.documents),
    certificates: cleanOutputItems(cv?.certificates),
    education: cleanOutputItems(cv?.education),
    additionalInformation: cleanOutputItems(
      cv?.additionalInformation
    ),
  };
}

export async function POST(request: Request) {
  try {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_ANON_KEY ||
      !process.env.SUPABASE_SECRET_KEY
    ) {
      return Response.json(
        { error: "Supabase is not configured." },
        { status: 500 }
      );
    }

    const cookieStore = await cookies();

    const authSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SECRET_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const {
      data: { user },
    } = await authSupabase.auth.getUser();

    let currentCredits = 0;

    if (user) {
      const { data: profile, error: profileError } = await adminSupabase
        .from("profiles")
        .select("credits")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("ApplyFast profile lookup error:", profileError);

        return Response.json(
          { error: "Could not load your credits." },
          { status: 500 }
        );
      }

      currentCredits =
        typeof profile?.credits === "number" ? profile.credits : 0;
    }

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

COMPLETE INFORMATION COVERAGE

Read the candidate's entire input by meaning, not by looking only for a fixed
list of keywords. People may describe the same fact in many languages, with
spelling mistakes, abbreviations, informal wording or unfamiliar terminology.

Before writing the CV, internally identify every clear candidate-provided fact,
including experience, duties, skills, languages, availability, locations,
personal facts, licences, credentials, qualifications, documents and
certificates. Place each fact in the most natural structured field.

After writing the CV, compare it against that internal fact inventory. Do not
silently discard any clear, useful, real-looking fact supplied by the candidate.

This is a semantic task. Do not require exact words such as "document",
"certificate", "licence" or "VCA" when the surrounding meaning clearly
identifies the type of information.

If an unfamiliar term is clearly presented as a document, certificate, licence
or credential, preserve the candidate's wording professionally in the relevant
field. Do not rename it to a familiar credential and do not guess what it means.

If a clear candidate-provided fact does not naturally belong in any existing CV
field, preserve it in additionalInformation. For example, "from Italy" becomes
"From Italy". Do not convert that into nationality unless the candidate
explicitly states their nationality.

Examples illustrate the rule but are not an exhaustive vocabulary list. Apply
the same reasoning to all occupations, countries, languages, documents,
credentials, personal circumstances and other candidate inputs.

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

If other work, legal or administrative documents are supplied or clearly
described by context:
return ONLY their names inside documents.

If the document is unfamiliar, keep its original meaning and wording. You may
fix normal casing, spacing and obvious presentation issues, but must not infer
or substitute another document.

CERTIFICATES

If certificates are supplied or clearly described by context:
return ONLY their names inside certificates.

If the certificate is unfamiliar, keep its original meaning and wording. You
may fix normal casing, spacing and obvious presentation issues, but must not
infer or substitute another certificate.

Do not mix any of these categories together.

Do not put driving licence inside certificates.
Do not put VCA inside documents.
Do not put documents inside skills.

ADDITIONAL INFORMATION

Use additionalInformation for clear candidate-provided facts that are useful
but do not naturally fit profile, workExperience, skills, languages,
drivingLicence, vca, documents, certificates or education.

Keep each fact as a short standalone item. Preserve its meaning without making
assumptions.

EMPTY VALUES

Use an empty string or empty array when information is absent. Never output
placeholder values such as "Not provided", "Not specified", "Unknown", "N/A"
or "None". Do not create employer or duration lines when they were not supplied.

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
${fullName}

Email:
${email}

Phone:
${phone}

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

                  additionalInformation: {
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
                  "additionalInformation",
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

    if (user && currentCredits > 0) {
      const nextCredits = currentCredits - 1;

      const { data: updatedProfile, error: creditError } = await adminSupabase
        .from("profiles")
        .update({
          credits: nextCredits,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)
        .eq("credits", currentCredits)
        .select("credits")
        .maybeSingle();

      if (creditError) {
        console.error("ApplyFast credit update error:", creditError);

        return Response.json(
          { error: "Could not update your credits. Please try again." },
          { status: 500 }
        );
      }

      if (!updatedProfile) {
        return Response.json(
          {
            error: "CREDIT_CONFLICT",
            message: "Your credits changed. Please try again.",
          },
          { status: 409 }
        );
      }

      await adminSupabase.from("credit_transactions").insert({
        user_id: user.id,
        type: "generation",
        amount: -1,
      });

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

        cv: cleanCv(result.cv),

        coverLetter: cleanOutputString(result.coverLetter),

        locked: false,
        creditsRemaining: updatedProfile.credits,
      });
    }

    const lockedResult = {
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

      cv: cleanCv(result.cv),

      coverLetter: cleanOutputString(result.coverLetter),
    };

    const { data: generation, error: generationError } =
      await adminSupabase
        .from("generations")
        .insert({
          user_id: user?.id ?? null,
          email: user?.email?.toLowerCase() ?? null,
          result: lockedResult,
          status: "locked",
        })
        .select("id")
        .single();

    if (generationError || !generation?.id) {
      console.error("ApplyFast generation save error:", generationError);

      return Response.json(
        { error: "Could not save your application. Please try again." },
        { status: 500 }
      );
    }

    return Response.json({
      locked: true,
      generationId: generation.id,
      previewName:
        lockedResult.cv.name ||
        clean(fullName) ||
        "Your CV",
      previewEmail:
        lockedResult.cv.contact.email ||
        clean(email) ||
        "",
      matchScore: lockedResult.matchScore,
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
