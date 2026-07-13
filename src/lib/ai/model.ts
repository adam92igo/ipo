import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import {
  AI_MODEL,
  GEMINI_MODEL,
  AiNotConfiguredError,
  getAiProvider,
  getAnthropicClient,
  getGeminiClient,
  type AiProvider,
} from "./config";
import {
  companyProfileSuggestionSchema,
  type CompanyProfileSuggestion,
} from "./profile-schema";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function requireProvider(): AiProvider {
  const provider = getAiProvider();
  if (!provider) {
    throw new AiNotConfiguredError();
  }
  return provider;
}

export function extractJsonObject(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] ?? text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  return JSON.parse(candidate);
}

export async function generateStructuredJson({
  prompt,
  jsonShape,
  maxTokens,
}: {
  prompt: string;
  jsonShape: string;
  maxTokens: number;
}): Promise<unknown> {
  const provider = requireProvider();
  if (provider === "anthropic") {
    const response = await getAnthropicClient().messages.create({
      model: AI_MODEL,
      max_tokens: maxTokens,
      messages: [
        {
          role: "user",
          content: `${prompt}\n\nReturn only valid JSON matching this shape:\n${jsonShape}`,
        },
      ],
    });
    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");
    return extractJsonObject(text);
  }

  const response = await getGeminiClient().models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      prompt,
      "",
      "Return only valid JSON matching this shape:",
      jsonShape,
    ].join("\n"),
    config: {
      maxOutputTokens: maxTokens,
      responseMimeType: "application/json",
    },
  });
  return extractJsonObject(response.text ?? "");
}

export function parseGeminiProfileSuggestionText(text: string): CompanyProfileSuggestion {
  try {
    return companyProfileSuggestionSchema.parse(extractJsonObject(text));
  } catch {
    throw new Error("The model did not return a usable profile suggestion");
  }
}

export async function generateCompanyProfileSuggestion(
  prompt: string,
): Promise<CompanyProfileSuggestion> {
  const provider = requireProvider();
  if (provider === "anthropic") {
    const response = await getAnthropicClient().messages.parse({
      model: AI_MODEL,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
      output_config: {
        format: zodOutputFormat(companyProfileSuggestionSchema),
      },
    });
    if (!response.parsed_output) {
      throw new Error("The model did not return a usable profile suggestion");
    }
    return response.parsed_output;
  }

  const response = await getGeminiClient().models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      prompt,
      "",
      "Return only one valid JSON object matching this exact shape:",
      '{"sector": string, "headcount": number|null, "siren": string|null, "website": string|null, "summary": string, "sources": ("registry"|"website")[]}',
    ].join("\n"),
    config: {
      maxOutputTokens: 1024,
      responseMimeType: "application/json",
    },
  });
  return parseGeminiProfileSuggestionText(response.text ?? "");
}

function buildGeminiAssistantPrompt(system: string, messages: ChatMessage[]): string {
  const transcript = messages
    .map((message) => `${message.role === "assistant" ? "Assistant" : "User"}: ${message.content}`)
    .join("\n\n");
  return [system, "", "Conversation:", transcript, "", "Assistant:"].join("\n");
}

export function streamAssistantText({
  system,
  messages,
  maxTokens,
}: {
  system: string;
  messages: ChatMessage[];
  maxTokens: number;
}): ReadableStream<Uint8Array> {
  const provider = requireProvider();
  const encoder = new TextEncoder();

  if (provider === "anthropic") {
    const stream = getAnthropicClient().messages.stream({
      model: AI_MODEL,
      max_tokens: maxTokens,
      system,
      messages,
    });
    return new ReadableStream<Uint8Array>({
      start(controller) {
        stream.on("text", (delta) => controller.enqueue(encoder.encode(delta)));
        stream.on("error", (error) => controller.error(error));
        stream.on("end", () => controller.close());
      },
      cancel() {
        stream.abort();
      },
    });
  }

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const stream = await getGeminiClient().models.generateContentStream({
          model: GEMINI_MODEL,
          contents: buildGeminiAssistantPrompt(system, messages),
          config: { maxOutputTokens: maxTokens },
        });
        for await (const chunk of stream) {
          if (chunk.text) controller.enqueue(encoder.encode(chunk.text));
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}
