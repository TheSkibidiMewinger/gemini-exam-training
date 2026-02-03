import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const {
            subject = "math",
            total = 20,
            diff = "olimpiad level",
            explain = false,
            model = "gemini-2.5-flash",
            key
        } = req.body;

        if (!key) {
            return res.status(400).json({ error: "API key required" });
        }

        const ai = new GoogleGenAI({ apiKey: key });

        const prompt = `
        Generate EXACTLY ${total} ${subject} questions.

        Return ONLY a JSON array.
        Each item MUST contain EXACTLY these keys:
        - question
        - A
        - B
        - C
        - D
        - CorrectAnswer
        - Explanation

        Rules:
        - Multiple choice (A–D)
        - Only ONE correct answer
        - DO NOT nest options
        - DO NOT rename fields
        - Use plain text only (no LaTeX, no backslashes)
        - Difficulty: ${diff}

        ${explain ? "Include a short explanation." : "Explanation can be empty."}
        `
        `;

        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseJsonSchema: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            question: { type: "string" },
                            A: { type: "string" },
                            B: { type: "string" },
                            C: { type: "string" },
                            D: { type: "string" },
                            CorrectAnswer: {
                                type: "string",
                                enum: ["A", "B", "C", "D"]
                            },
                            Explanation: { type: "string" }
                        },
                        required: [
                            "question",
                            "A",
                            "B",
                            "C",
                            "D",
                            "CorrectAnswer",
                            "Explanation"
                        ]
                    }
                }
            }
        });

        const parsed =
        response.candidates?.[0]?.content?.parts?.[0]?.json;

        if (!parsed || !Array.isArray(parsed)) {
            throw new Error("Invalid JSON returned from Gemini");
        }

        const normalized = parsed.map((q, i) => ({
            question: q.question,

            A: q.A ?? q.options?.A,
            B: q.B ?? q.options?.B,
            C: q.C ?? q.options?.C,
            D: q.D ?? q.options?.D,

            CorrectAnswer: q.CorrectAnswer ?? q.answer,
            Explanation: q.Explanation ?? q.explanation ?? ""
        }));

        res.json({ questions: normalized.slice(0, total) });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
}
