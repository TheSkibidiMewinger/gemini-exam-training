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

        Rules:
        - Multiple choice (A–D)
        - Only ONE correct answer
        - Difficulty: ${diff}
        ${explain ? "- Provide a clear explanation for the correct answer" : ""}
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

        const parsed = JSON.parse(response.text);
        res.status(200).json({ questions: parsed.slice(0, total) });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
}
