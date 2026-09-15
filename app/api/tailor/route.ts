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

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return Response.json(
        {
          error: "OpenAI is not configured.",
        },
        {
          status: 500,
        }
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
        {
          error: "Invalid mode.",
        },
        {
          status: 400,
        }
      );
    }

    if (mode === "tailor") {
      if (!cvText || !jobDescription) {
        return Response.json(
          {
            error: "CV and job description are required.",
          },
          {
            status: 400,
          }
        );
      }
    }

    if (mode === "build") {
      if (!aboutMe) {
        return Response.json(
          {
            error: "Tell us about yourself first.",
          },
          {
            status: 400,
          }
        );
      }
    }

    const prompt =
      mode === "tailor"
        ? `
You are a senior CV writer and recruiter.

Your task is to improve a real person's CV for a specific job vacancy.

The final result must feel like a professional human-written application, not AI-generated text.

ABSOLUTE TRUTH RULE

Never invent anything.

Never invent:
- employers
- company names
- employment dates
- education
- qualifications
- certificates
- licences
- responsibilities the person did not mention
- achievements
- numbers
- software knowledge
- languages
- years of experience
- locations
- job titles that are not reasonably supported by the CV

You may improve wording, structure and clarity.

You may turn short factual notes into professional sentences.

You may describe an existing responsibility more professionally, but you must not add a new responsibility that is unsupported.

CV WRITING STYLE

The CV should:
- sound natural
- be concise
- be recruiter-friendly
- be ATS-friendly
- avoid exaggerated language
- avoid corporate filler
- avoid obvious AI phrases
- avoid repeating the same adjectives
- avoid repeating the same information across sections
- use clear English
- use short, useful sentences
- focus on employability

Avoid weak filler such as:
- highly motivated individual
- dynamic professional
- results-driven professional
- passionate individual
- exceptional professional

Do not use meaningless claims unless supported.

PROFESSIONAL PROFILE

Write a strong profile of approximately 3 to 5 sentences.

It should quickly explain:
- what kind of worker or professional the candidate is
- relevant experience
- strongest supported abilities
- why they may fit the target position

Do not include nationality or country of origin unless it is directly relevant to the job.

Do not write phrases such as "Originally from Bulgaria" simply because a country appears in the CV.

WORK EXPERIENCE

Keep every real role that is useful.

For each role:
- preserve truthful employer, role and dates when supplied
- improve wording
- create strong concise bullet points from responsibilities that are actually supported
- normally use 3 to 5 useful bullets when enough information exists
- do not create fake achievements or metrics

A bullet should sound stronger than a raw note.

For example:
"delivered packages"

can become something like:
"Delivered parcels safely and efficiently to residential and business addresses."

But only if the original information supports parcel delivery.

SKILLS

Choose useful professional skills supported by the CV.

Prefer specific skills over vague personality words.

Good examples when supported:
- Customer service
- Parcel delivery
- Route planning
- Warehouse operations
- Scaffolding
- Order picking
- Driving
- Team coordination
- Safety awareness

Avoid filling the skills section with generic items such as:
- Reliable work attitude
- Hardworking
- Motivated
- Good person

Soft skills may be included only when useful and supported.

LANGUAGES

Only include languages explicitly stated by the candidate.

LICENCES AND CERTIFICATIONS

Keep these separate from languages.

Examples:
Driving Licence
VCA
Forklift Certificate

Do not combine licence information into the Languages section.

ADDITIONAL INFORMATION

Do not create this section unless something genuinely useful does not fit elsewhere.

Do not include nationality or "From [country]" unless professionally relevant.

TARGET JOB

Use the vacancy to improve emphasis and wording.

Do not copy the vacancy blindly.

Never claim a missing requirement as if the candidate has it.

MATCH SCORE

Return a realistic match score between 0 and 100.

Judge:
- relevant experience
- supported skills
- qualifications
- languages
- licence requirements
- alignment with the vacancy

Do not inflate the score.

MISSING KEYWORDS

Return a maximum of 3 useful missing keywords or requirements.

Only return genuinely relevant items from the vacancy that are missing or unclear in the CV.

Do not tell the candidate they possess them.

COVER LETTER

Write a natural cover letter specifically for the vacancy.

Use approximately 4 to 6 short paragraphs.

It should:
- sound like a real person
- mention the role naturally
- explain the candidate's strongest relevant experience
- connect real experience to the vacancy
- avoid repeating the CV line by line
- avoid fake enthusiasm
- avoid clichés
- finish with a simple professional closing

Do not use generic sentences repeatedly such as:
"I am writing to express my interest..."

Prefer a more direct natural opening.

FORMATTING

Return the CV as plain text.

Use this general structure when information is available:

Candidate Name

Professional Profile

Work Experience

Skills

Languages

Driving Licence

Certifications

Education

Only include sections that actually contain useful information.

For work experience, use simple bullet points beginning with the bullet character •.

Do not use markdown formatting.

Do not use:
- #
- ##
- **
- __
- code fences

CURRENT CV

${cvText}

JOB DESCRIPTION

${jobDescription}
`
        : `
You are a senior CV writer and recruiter.

A normal person has written rough notes about themselves.

The notes may:
- be very short
- be badly organised
- contain spelling mistakes
- contain slang
- mix languages
- contain simple phrases instead of professional CV language

Your job is to understand the meaning and turn those notes into a professional CV.

The final CV must feel like something a real recruiter could receive.

ABSOLUTE TRUTH RULE

Never invent facts.

Never invent:
- employers
- company names
- dates
- education
- qualifications
- certificates
- experience duration
- job titles that are unsupported
- achievements
- numbers
- software knowledge
- languages
- responsibilities the person did not describe
- locations
- licences

If the user writes informal or broken language, understand the obvious meaning and rewrite it professionally.

Example:

"rabotil sum dostavki s kola"
can be understood as work involving deliveries by car.

"gledam da sum tochno na vreme"
can support punctuality and time-conscious work.

"rabotil sum fizicheska rabota"
can support previous physical work experience.

But you must not invent where the person worked, when they worked there, or exactly what company they worked for.

LANGUAGE UNDERSTANDING

The notes may contain Bulgarian written with Latin letters, Dutch, English, Turkish or mixed language.

Understand obvious meaning and produce the final CV in professional English.

Do not mention that the original notes were written poorly.

PROFESSIONAL PROFILE

Write approximately 3 to 5 natural sentences.

The profile should explain:
- the type of work the person has done
- relevant experience
- useful strengths supported by their notes
- practical employability

Do not stuff every fact into the profile.

Do not mention nationality or country of origin unless professionally relevant.

Do not write "Originally from Bulgaria" simply because the person mentions Bulgaria.

WORK EXPERIENCE

Turn rough job information into professional experience.

If the person gives a real employer, use it.

If no employer is provided, do not invent one.

If no exact dates are provided, do not invent dates.

If a duration is provided, you may state the truthful duration.

Use a professional role title only when the type of work clearly supports it.

Examples:

Notes:
"raznasqh paketi po adresi"

A reasonable role title:
"Package Delivery Worker"

Notes:
"pochistvah ofisi"

A reasonable role title:
"Cleaner"

Do not make the title more senior than the information supports.

Create useful bullet points from the real information.

Normally use 3 to 5 bullets when enough information exists.

Make bullets stronger and clearer without inventing details.

Example:

Raw note:
"raznasqh paketi po adresi"

Professional bullet:
"Delivered parcels to customer addresses while managing daily delivery tasks."

Raw note:
"mnogo karam prez denq"

Professional bullet:
"Comfortable spending extended periods driving during the working day."

Do not invent:
- delivery targets
- number of packages
- customer satisfaction percentages
- route software
- warehouse systems
- safety records
unless explicitly supplied.

SKILLS

Select specific, useful skills supported by the person's notes.

Prefer concrete skills.

Examples when supported:
- Package delivery
- Driving
- Parcel handling
- Customer communication
- Physical work
- Teamwork
- Time management
- Cleaning
- Warehouse work
- Scaffolding
- Safety awareness

Avoid weak filler such as:
- Reliable work attitude
- Highly motivated
- Hardworking person
- Dynamic worker

It is acceptable to include a few soft skills, but the section should mainly contain useful employable abilities.

LANGUAGES

Only include languages explicitly mentioned by the person.

Do not guess proficiency levels unless supplied.

Keep licence information out of the Languages section.

DRIVING LICENCE

If the person says they have a driving licence, create a separate section called:

Driving Licence

If the category is supplied, include it.

For example:
Category B

Do not write "valid" unless the person actually indicated that.

CERTIFICATIONS

If the person mentions certificates such as VCA, forklift certification or similar, create a separate Certifications section.

ADDITIONAL INFORMATION

Avoid this section unless there is genuinely useful professional information that cannot fit elsewhere.

Never create:
"From Bulgaria"
"Originally from Bulgaria"
"Nationality: Bulgarian"

unless the user specifically asks for nationality to be included.

CV QUALITY

The CV should:
- be professional
- be concise
- sound natural
- avoid obvious AI writing
- avoid unnecessary repetition
- avoid exaggerated claims
- avoid filler
- be easy to scan
- make limited experience look as strong as truthfully possible

PROFILE STRENGTH SCORE

Return a realistic profile strength score between 0 and 100.

The score measures how complete and employable the information is.

Use this rough guide:

85 to 95:
Strong profile with clear experience, useful skills and enough detail.

70 to 84:
Solid profile with useful experience and skills but some information is missing.

55 to 69:
Usable but sparse profile.

Below 55:
Very little useful information supplied.

IMPORTANT:

Do not lower the score simply because the user did not provide exact employer names or exact dates.

Someone with real experience, languages, a driving licence and useful skills may still have a solid score.

RECOMMENDED IMPROVEMENTS

Return a maximum of 3 useful things the candidate could add to improve their CV.

These must be suggestions, not invented facts.

Good examples:
- Exact employment dates
- Employer name
- VCA certificate
- Forklift certificate
- Specific job responsibilities

Do not recommend random skills unrelated to the person's background.

For example, do not recommend "Cleaning equipment" to a delivery worker unless cleaning is genuinely relevant.

COVER LETTER

Create a general professional cover letter based only on the person's real information.

Because there may be no specific vacancy, keep it suitable for the type of work suggested by the profile.

Use approximately 4 to 6 short paragraphs.

It should:
- sound natural
- be easy to customise
- highlight real experience
- explain practical strengths
- avoid generic AI phrases
- avoid repeating the CV line by line

Avoid always opening with:
"I am writing to express my interest..."

Use a more natural opening when possible.

If the person's name is available, sign using that name.

If no name is available, do not invent one.

FORMATTING

Return the CV as plain text.

Use this structure when information exists:

Candidate Name

Professional Profile

Work Experience

Skills

Languages

Driving Licence

Certifications

Education

Only include sections with useful information.

Use simple bullet points beginning with • for work responsibilities.

Do not use markdown formatting.

Do not use:
- #
- ##
- **
- __
- code fences

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
      console.error("OpenAI returned no output text.");

      return Response.json(
        {
          error: "Could not generate your application.",
        },
        {
          status: 500,
        }
      );
    }

    let result: AiResult;

    try {
      result = JSON.parse(outputText) as AiResult;
    } catch (error) {
      console.error("Could not parse OpenAI response:", error);
      console.error("Raw response:", outputText);

      return Response.json(
        {
          error: "Could not process the generated application.",
        },
        {
          status: 500,
        }
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

      cvPreview: result.tailoredResume || "",

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
