import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { normalizeAnswer, type AnswerValue, type Answers } from "@/engines/scoring";
import type { Questionnaire } from "@/engines/scoring/types";
import {
  AI_MODEL,
  GEMINI_MODEL,
  getAiProvider,
  getAnthropicClient,
  getGeminiClient,
} from "./config";
import { extractJsonObject } from "./model";
import { searchPappers, type PappersCompanyData } from "./pappers";
import { fetchWebsiteText } from "./website";

const sourceSchema = z.enum(["company_profile", "registry", "website"]);

export const assessmentPrefillSuggestionSchema = z.object({
  questionId: z.string().min(1).max(64),
  value: z.union([
    z.boolean(),
    z.number().int().min(0).max(4),
    z.string().min(1).max(100),
  ]),
  confidence: z.number().min(0).max(1),
  rationale: z.string().min(1).max(600),
  sources: z.array(sourceSchema).min(1),
});

export const assessmentPrefillResponseSchema = z.object({
  suggestions: z.array(assessmentPrefillSuggestionSchema),
});

export type AssessmentPrefillSuggestion = z.infer<
  typeof assessmentPrefillSuggestionSchema
>;

interface AssessmentPrefillCompany {
  name: string;
  sector: string;
  website: string | null;
  siren: string | null;
  headcount: number | null;
}

export function buildAssessmentPrefillPrompt({
  company,
  pappers,
  websiteText,
  questionnaire,
  answers,
}: {
  company: AssessmentPrefillCompany;
  pappers: PappersCompanyData | null;
  websiteText: string | null;
  questionnaire: Questionnaire;
  answers: Answers;
}): string {
  const unansweredQuestions = questionnaire.categories.flatMap((category) =>
    category.questions
      .filter((question) => !(question.id in answers))
      .map((question) => ({
        id: question.id,
        category: category.label,
        text: question.text,
        type: question.type,
        choices: question.choices?.map((choice) => ({
          id: choice.id,
          label: choice.label,
        })),
      })),
  );

  const registryBlock = pappers
    ? [
        `Legal name: ${pappers.legalName}`,
        `SIREN: ${pappers.siren}`,
        pappers.nafLabel && `Activity (NAF): ${pappers.nafLabel}`,
        pappers.headcountRange && `Headcount range: ${pappers.headcountRange}`,
        pappers.legalForm && `Legal form: ${pappers.legalForm}`,
        pappers.city && `Headquarters: ${pappers.city}`,
      ]
        .filter(Boolean)
        .join("\n")
    : "No registry data available.";

  return [
    `Suggest public-evidence answers for the IPO readiness questionnaire for "${company.name}".`,
    "",
    "Use ONLY the sources below. Do not infer internal practices, controls, committees, reporting cadence, forecast quality, legal reviews, or management processes unless the public evidence explicitly states them.",
    "Return suggestions only for questions where the evidence is strong enough. Omit every uncertain or internal-only question.",
    "Never include questions that already have an answer.",
    "",
    "=== SOURCE 1: saved company profile ===",
    `Name: ${company.name}`,
    `Sector: ${company.sector}`,
    company.website ? `Website: ${company.website}` : "Website: not provided",
    company.siren ? `SIREN: ${company.siren}` : "SIREN: not provided",
    company.headcount ? `Headcount: ${company.headcount}` : "Headcount: not provided",
    "",
    "=== SOURCE 2: French company registry (Pappers) ===",
    registryBlock,
    "",
    "=== SOURCE 3: official website content ===",
    websiteText ?? "No website content available.",
    "",
    "=== UNANSWERED QUESTIONS ===",
    JSON.stringify(unansweredQuestions),
  ].join("\n");
}

export function parseAssessmentPrefillText(text: string): AssessmentPrefillSuggestion[] {
  try {
    return assessmentPrefillResponseSchema.parse(extractJsonObject(text)).suggestions;
  } catch {
    throw new Error("The model did not return usable assessment suggestions");
  }
}

function questionMap(questionnaire: Questionnaire) {
  return new Map(
    questionnaire.categories.flatMap((category) =>
      category.questions.map((question) => [question.id, question] as const),
    ),
  );
}

export function validateAssessmentPrefillSuggestions({
  questionnaire,
  answers,
  suggestions,
  minConfidence = 0.7,
}: {
  questionnaire: Questionnaire;
  answers: Answers;
  suggestions: AssessmentPrefillSuggestion[];
  minConfidence?: number;
}): AssessmentPrefillSuggestion[] {
  const questions = questionMap(questionnaire);
  const seen = new Set<string>();
  const valid: AssessmentPrefillSuggestion[] = [];

  for (const suggestion of suggestions) {
    if (suggestion.confidence < minConfidence) continue;
    if (suggestion.questionId in answers) continue;
    if (seen.has(suggestion.questionId)) continue;
    const question = questions.get(suggestion.questionId);
    if (!question) continue;
    try {
      normalizeAnswer(question, suggestion.value);
    } catch {
      continue;
    }
    seen.add(suggestion.questionId);
    valid.push(suggestion);
  }

  return valid;
}

async function generateAssessmentSuggestions(prompt: string) {
  const provider = getAiProvider();
  if (!provider) {
    throw new Error("AI features are not configured — set ANTHROPIC_API_KEY or GEMINI_API_KEY in .env");
  }
  if (provider === "anthropic") {
    const response = await getAnthropicClient().messages.parse({
      model: AI_MODEL,
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
      output_config: {
        format: zodOutputFormat(assessmentPrefillResponseSchema),
      },
    });
    if (!response.parsed_output) {
      throw new Error("The model did not return usable assessment suggestions");
    }
    return response.parsed_output.suggestions;
  }

  const response = await getGeminiClient().models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      prompt,
      "",
      "Return only one valid JSON object with this exact shape:",
      '{"suggestions":[{"questionId":string,"value":boolean|number|string,"confidence":number,"rationale":string,"sources":["company_profile"|"registry"|"website"]}]}',
    ].join("\n"),
    config: {
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
    },
  });
  return parseAssessmentPrefillText(response.text ?? "");
}

export async function prefillAssessmentAnswers({
  company,
  questionnaire,
  answers,
}: {
  company: AssessmentPrefillCompany;
  questionnaire: Questionnaire;
  answers: Answers;
}): Promise<{
  suggestions: AssessmentPrefillSuggestion[];
  usedRegistry: boolean;
  usedWebsite: boolean;
}> {
  const [pappers, websiteText] = await Promise.all([
    searchPappers(company.name),
    company.website ? fetchWebsiteText(company.website) : Promise.resolve(null),
  ]);
  const prompt = buildAssessmentPrefillPrompt({
    company,
    pappers,
    websiteText,
    questionnaire,
    answers,
  });
  const rawSuggestions = await generateAssessmentSuggestions(prompt);
  return {
    suggestions: validateAssessmentPrefillSuggestions({
      questionnaire,
      answers,
      suggestions: rawSuggestions,
    }),
    usedRegistry: pappers !== null,
    usedWebsite: websiteText !== null,
  };
}

export function answerLabel(questionnaire: Questionnaire, questionId: string, value: AnswerValue) {
  const question = questionMap(questionnaire).get(questionId);
  if (!question) return String(value);
  if (question.type === "yes_no") return value === true ? "Yes" : "No";
  if (question.type === "scale_0_4") return questionnaire.scaleLabels[Number(value)] ?? String(value);
  return question.choices?.find((choice) => choice.id === value)?.label ?? String(value);
}
