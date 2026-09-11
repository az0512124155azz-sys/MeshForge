import { readRuntimeConfig } from "./api";
import type { ProjectAsset, RequirementAnswer } from "./types";

export type RequirementQuestion = {
  key: string;
  question: string;
  reason: string;
  required: boolean;
  type: "text" | "number" | "choice" | "boolean";
  options?: string[];
  unit?: string;
};

const fallbackQuestions: RequirementQuestion[] = [
  { key: "use", question: "What is the object used for?", reason: "Determines functional geometry and strength priorities.", required: true, type: "text" },
  { key: "dimensions", question: "What are the most important real-world dimensions?", reason: "Single-view reconstruction has no reliable physical scale.", required: true, type: "text", unit: "mm" },
  { key: "print_process", question: "Is this intended for FDM, resin, or visual-only use?", reason: "Changes minimum features, clearances and surface decisions.", required: true, type: "choice", options: ["FDM", "Resin", "Visual only", "Not sure"] },
  { key: "motion", question: "Does it contain moving, sliding, hinged or mating parts?", reason: "Moving interfaces require explicit clearances.", required: true, type: "text" },
  { key: "detail", question: "Which details must be preserved exactly?", reason: "Prioritizes fine geometry during Blender refinement.", required: false, type: "text" }
];

function cleanJson(text: string) {
  return text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
}

export async function generateRequirementQuestions(input: { prompt: string; assets: ProjectAsset[] }): Promise<RequirementQuestion[]> {
  const config = readRuntimeConfig();
  if (!config.nvidiaApiKey || !config.nvidiaModel) return fallbackQuestions;

  const response = await fetch(`${config.nvidiaBaseUrl}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${config.nvidiaApiKey}` },
    body: JSON.stringify({
      model: config.nvidiaModel,
      temperature: 0.1,
      max_tokens: 2400,
      messages: [
        {
          role: "system",
          content: "You are MeshForge's requirements engineer. Before any 3D generation, ask only questions whose answers materially reduce ambiguity. Focus on real dimensions, hidden geometry, intended use, print process, moving interfaces, load, fit, symmetry and must-preserve details. Do not ask generic conversational questions. Return a JSON array only. Each item: key, question, reason, required, type(text|number|choice|boolean), optional options, optional unit. Ask 3 to 8 questions."
        },
        { role: "user", content: JSON.stringify(input) }
      ]
    })
  });

  if (!response.ok) return fallbackQuestions;
  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) return fallbackQuestions;
  try {
    const parsed = JSON.parse(cleanJson(String(text)));
    if (!Array.isArray(parsed) || parsed.length < 1) return fallbackQuestions;
    return parsed.slice(0, 8) as RequirementQuestion[];
  } catch {
    return fallbackQuestions;
  }
}

export function questionsToAnswers(questions: RequirementQuestion[]): RequirementAnswer[] {
  return questions.map(q => ({ key: q.key, question: q.question, answer: "", required: q.required }));
}
