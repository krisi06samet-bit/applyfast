import OpenAI from "openai";
import { PDFParse } from "pdf-parse";

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
    const jobDescription = String(form.get("jobDescription") || "").trim();

    if (!(file instanceof File) || !jobDescription) {
      return jsonError("CV and job description are required.", 400);
    }

    if (file.type !== "application/pdf" || !file.name.toLowerCase().endsWith(".pdf")) {
      return jsonError("For this MVP, upload a PDF CV.", 400);
    }

    if (file.size > 10 * 1024 * 1024) {
      return jsonError("Please upload a PDF smaller than 10 MB.", 400);
    }

    if (jobDescription.length > maxJobLength) {
      return jsonError("Please keep the job description under 50,000 characters.", 400);
    }

    let resumeText = "";
    let parser: PDFParse | null = null;

    try {
      const data = Buffer.from(await file.arrayBuffer());
      parser = new PDFParse({ data });
      const parsed = await parser.getText();
      resumeText = String(parsed.text || "").trim().slice(0, 30000);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      console.error("[ApplyFast] PDF parsing failed:", detail);
      return jsonError("Could not read that PDF. Please try another text-based PDF.", 422, detail);
    } finally {
      if (parser) {
        try {
          await parser.destroy();
        } catch (error) {
          console.error("[ApplyFast] PDF cleanup failed:", error);
        }
      }
    }

    if (!resumeText) {
      return jsonError("Could not extract text from that PDF.", 422);
    }

    const client = new OpenAI({ apiKey });

    try {
      const response = await client.responses.create({
        model: process.env.OPENAI_MODEL || "gpt-5.6-luna",
        input: `You are a truthful resume tailoring assistant.

Rules:
- Never invent employment, education, achievements, skills, dates, certifications, numbers, languages, or experience.
- Improve wording, prioritization, and ordering only when supported by the original CV.
- Return a realistic match score from 0 to 100.
- Return up to 12 important missing or weak keywords.
- Produce a clean tailored CV in plain text.
- Produce a short tailored cover letter.

CANDIDATE RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}`,
        text: {
          format: {
            type: "json_schema",
            name: "tailored_application",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                matchScore: { type: "number" },
                missingKeywords: { type: "array", items: { type: "string" } },
                tailoredResume: { type: "string" },
                coverLetter: { type: "string" },
              },
              required: ["matchScore", "missingKeywords", "tailoredResume", "coverLetter"],
            },
          },
        },
      });

      const output = response.output_text?.trim();
      if (!output) {
        return jsonError("OpenAI returned an empty result. Please try again.", 502);
      }

      const result = JSON.parse(output);
      if (
        typeof result?.matchScore !== "number" ||
        !Array.isArray(result?.missingKeywords) ||
        typeof result?.tailoredResume !== "string" ||
        typeof result?.coverLetter !== "string"
      ) {
        return jsonError("OpenAI returned an incomplete result. Please try again.", 502);
      }

      return Response.json(result);
    } catch (error: any) {
      const status = Number(error?.status || 502);
      const detail = error?.message || String(error);
      console.error("[ApplyFast] OpenAI request failed:", { status, detail });

      if (status === 401) return jsonError("OpenAI API key was rejected.", 502, detail);
      if (status === 429) return jsonError("OpenAI API quota or billing limit reached.", 502, detail);
      return jsonError("OpenAI could not generate the application right now.", 502, detail);
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("[ApplyFast] Unhandled tailoring error:", detail);
    return jsonError("Could not generate the tailored application.", 500, detail);
  }
}
