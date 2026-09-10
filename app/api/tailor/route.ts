import OpenAI from "openai";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type RequestBody = {
  mode?: "tailor" | "build";
  cvText?: string;
  jobDescription?: string;
  targetJob?: string;
  experience?: string;
  skills?: string;
  education?: string;
  languages?: string;
  location?: string;
};

function makePreview(text: string, percent = 0.05) {
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
        { error: "Invalid request mode." },
        { status: 400 }
      );
    }

    let prompt = "";

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

Your job:
- Compare the CV with the job description.
- Improve wording, structure, relevance and emphasis.
- Make the CV better aligned with the role.
- Never invent any experience.
- Never invent skills.
- Never invent education.
- Never invent certifications.
- Never invent dates.
- Never invent achievements.
- Never invent job titles.
- Only use facts already present in the user's CV.

Return:
1. A realistic matchScore from 0 to 100.
2. Up to 8 important missing or weak keywords.
3. A complete tailored CV in clean plain text.
4. A short professional cover letter.
      `.trim();
    }

    if (mode === "build") {
      const targetJob = String(body.targetJob || "").trim();
      const experience = String(body.experience || "").trim();
      const skills = String(body.skills || "").trim();
      const education = String(body.education || "").trim();
      const languages = String(body.languages || "").trim();
      const location = String(body.location || "").trim();

      if (!targetJob || !experience) {
        return Response.json(
          {
            error:
              "Tell us the job you want and your experience.",
          },
          { status: 400 }
        );
      }

      prompt = `
You are ApplyFast, a professional CV builder.

The user wants you to create a CV from the information below.

TARGET JOB:
${targetJob}

EXPERIENCE:
${experience}

SKILLS:
${skills || "Not provided"}

EDUCATION:
${education || "Not provided"}

LANGUAGES:
${languages || "Not provided"}

LOCATION:
${location || "Not provided"}

Your job:
- Create a professional CV targeted toward the requested job.
- Improve the wording and presentation of the user's real information.
- Never invent employment.
- Never invent experience.
- Never invent skills.
- Never invent education.
- Never invent qualifications.
- Never invent certifications.
- Never invent dates.
- Never invent achievements.
- If some information is missing, simply omit that detail instead of inventing it.

Return:
1. A realistic cvScore from 0 to 100, using the matchScore field.
2. Up to 8 useful keywords the user may want to include if truthful.
3. A complete professional CV in clean plain text.
4. A short professional cover letter for the target job.
      `.trim();
    }

    console.log("[ApplyFast] Request starting", { mode });

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

    console.log("[ApplyFast] Response received");

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

    let result;

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

    return Response.json({
      matchScore: result.matchScore,
      missingKeywords: Array.isArray(result.missingKeywords)
        ? result.missingKeywords.slice(0, 3)
        : [],
      cvPreview: makePreview(result.tailoredResume, 0.05),
      coverLetterPreview: makePreview(
        result.coverLetter,
        0.05
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
