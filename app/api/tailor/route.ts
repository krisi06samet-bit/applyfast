import OpenAI from "openai";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.error("[ApplyFast] Missing OPENAI_API_KEY");

      return Response.json(
        { error: "We couldn't process your CV right now. Please try again." },
        { status: 500 }
      );
    }

    const formData = await request.formData();

    const file = formData.get("cv");
    const jobDescription = String(
      formData.get("jobDescription") || ""
    ).trim();

    if (!(file instanceof File)) {
      return Response.json(
        { error: "Please upload your CV." },
        { status: 400 }
      );
    }

    if (!jobDescription) {
      return Response.json(
        { error: "Please paste the job description." },
        { status: 400 }
      );
    }

    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      return Response.json(
        { error: "Please upload your CV as a PDF." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");

    const pdfDataUrl = `data:application/pdf;base64,${base64}`;

    console.log("[ApplyFast] PDF ready");
    console.log("[ApplyFast] OpenAI request starting");

    const response = await openai.responses.create({
      model: "gpt-5.6-luna",

      input: [
        {
          role: "user",
          content: [
            {
              type: "input_file",
              filename: file.name || "resume.pdf",
              file_data: pdfDataUrl,
              detail: "low",
            },
            {
              type: "input_text",
              text: `
You are ApplyFast, a resume tailoring assistant.

Compare the uploaded CV with this job description:

JOB DESCRIPTION:
${jobDescription}

Rules:
- Never invent work experience.
- Never invent education.
- Never invent skills.
- Never invent certifications.
- Never invent achievements or dates.
- Only improve wording, relevance, structure, and emphasis using facts already present in the CV.

Return:
1. A realistic match score from 0 to 100.
2. Important missing or weak keywords.
3. A tailored CV in clean plain text.
4. A short tailored cover letter.
              `.trim(),
            },
          ],
        },
      ],

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

    console.log("[ApplyFast] OpenAI response received");

    if (!response.output_text) {
      console.error("[ApplyFast] Empty model response");

      return Response.json(
        { error: "We couldn't process your CV right now. Please try again." },
        { status: 502 }
      );
    }

    let result;

    try {
      result = JSON.parse(response.output_text);
    } catch (error) {
      console.error("[ApplyFast] JSON parse failed", error);

      return Response.json(
        { error: "We couldn't process your CV right now. Please try again." },
        { status: 502 }
      );
    }

    return Response.json({
      matchScore: result.matchScore,
      missingKeywords: result.missingKeywords,
      tailoredResume: result.tailoredResume,
      coverLetter: result.coverLetter,
    });
  } catch (error: any) {
    console.error("[ApplyFast] Server error", {
      status: error?.status,
      message: error?.message,
      code: error?.code,
    });

    return Response.json(
      {
        error: "We couldn't process your CV right now. Please try again.",
      },
      { status: 500 }
    );
  }
}
