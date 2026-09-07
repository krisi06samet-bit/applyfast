import OpenAI from "openai";

export const runtime = "nodejs";
export const maxDuration = 60;

const maxJobLength = 50000;

function jsonError(message: string, status: number, detail?: string) {
  return Response.json(
    { error: message, ...(detail ? { detail } : {}) },
    { status },
  );
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return jsonError("The OpenAI API key is not configured.", 503);
    }

    const form = await request.formData();
    const file = form.get("cv");
    const jobDescription = String(
      form.get("jobDescription") || "",
    ).trim();

    if (!(file instanceof File) || !jobDescription) {
      return jsonError(
        "CV and job description are required.",
        400,
      );
    }

    if (
      file.type !== "application/pdf" ||
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      return jsonError(
        "For this MVP, upload a PDF CV.",
        400,
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return jsonError(
        "Please upload a PDF smaller than 10 MB.",
        400,
      );
    }

    if (jobDescription.length > maxJobLength) {
      return jsonError(
        "Please keep the job description under 50,000 characters.",
        400,
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64Pdf = Buffer
      .from(arrayBuffer)
      .toString("base64");

    const client = new OpenAI({
      apiKey,
    });

    try {
      const response = await client.responses.create({
        model: process.env.OPENAI_MODEL || "gpt-5.6-luna",

        input: [
          {
            role: "user",
            content: [
              {
                type: "input_file",
                filename: file.name,
                file_data: base64Pdf,
              },
              {
                type: "input_text",
                text: `
You are a truthful resume tailoring assistant.

Analyze the attached CV against this job description:

${jobDescription}

Rules:
- Never invent employment.
- Never invent education.
- Never invent achievements.
- Never invent skills.
- Never invent dates.
- Never invent certifications.
- Never invent numbers or metrics.
- Never invent languages.
- Never invent experience.

You may:
- Improve wording.
- Reorder existing information.
- Prioritize relevant experience.
- Improve clarity.
- Highlight existing skills that match the job.

Return:
1. A realistic match score from 0 to 100.
2. Up to 12 important missing or weak keywords.
3. A clean tailored CV in plain text.
4. A short tailored cover letter.
                `.trim(),
              },
            ],
          },
        ],

        text: {
          format: {
            type: "json_schema",
            name: "tailored_application",
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

      const output = response.output_text?.trim();

      if (!output) {
        return jsonError(
          "OpenAI returned an empty result. Please try again.",
          502,
        );
      }

      let result;

      try {
        result = JSON.parse(output);
      } catch {
        console.error(
          "[ApplyFast] Could not parse OpenAI JSON:",
          output,
        );

        return jsonError(
          "OpenAI returned an invalid result. Please try again.",
          502,
        );
      }

      if (
        typeof result?.matchScore !== "number" ||
        !Array.isArray(result?.missingKeywords) ||
        typeof result?.tailoredResume !== "string" ||
        typeof result?.coverLetter !== "string"
      ) {
        return jsonError(
          "OpenAI returned an incomplete result. Please try again.",
          502,
        );
      }

      return Response.json(result);
    } catch (error: any) {
      const status = Number(error?.status || 502);
      const detail =
        error?.message || String(error);

      console.error(
        "[ApplyFast] OpenAI request failed:",
        {
          status,
          detail,
        },
      );

      if (status === 401) {
        return jsonError(
          "OpenAI API key was rejected.",
          502,
          detail,
        );
      }

      if (status === 429) {
        return jsonError(
          "OpenAI API quota or billing limit reached.",
          502,
          detail,
        );
      }

      return jsonError(
        "OpenAI could not generate the application right now.",
        502,
        detail,
      );
    }
  } catch (error) {
    const detail =
      error instanceof Error
        ? error.message
        : String(error);

    console.error(
      "[ApplyFast] Unhandled tailoring error:",
      detail,
    );

    return jsonError(
      "Could not generate the tailored application.",
      500,
      detail,
    );
  }
}
