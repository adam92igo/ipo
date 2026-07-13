import { afterEach, describe, expect, it, vi } from "vitest";
import { buildAssistantSystemPrompt } from "./assistant";
import { getAiProvider, getAiSetupMessage, isAiConfigured } from "./config";
import { parseGeminiProfileSuggestionText } from "./model";
import { mapPappersResult } from "./pappers";
import { buildProfileFillPrompt } from "./profile-fill";
import { UnsafeUrlError, assertPublicHttpUrl, htmlToText } from "./website";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("assertPublicHttpUrl (SSRF guard)", () => {
  it("accepts public http(s) hosts", () => {
    expect(assertPublicHttpUrl("https://acme.fr").hostname).toBe("acme.fr");
    expect(assertPublicHttpUrl("http://www.example.com/about").hostname).toBe(
      "www.example.com",
    );
  });

  it("rejects non-http protocols", () => {
    expect(() => assertPublicHttpUrl("ftp://acme.fr")).toThrow(UnsafeUrlError);
    expect(() => assertPublicHttpUrl("file:///etc/passwd")).toThrow(UnsafeUrlError);
  });

  it("rejects localhost, private ranges and bare IPs", () => {
    for (const url of [
      "http://localhost:3000",
      "http://127.0.0.1",
      "https://10.0.0.5",
      "https://192.168.1.1",
      "https://172.16.0.1",
      "https://169.254.169.254/latest/meta-data",
      "http://[::1]/",
      "https://db.internal",
      "https://printer.local",
      "https://intranet",
    ]) {
      expect(() => assertPublicHttpUrl(url), url).toThrow(UnsafeUrlError);
    }
  });
});

describe("htmlToText", () => {
  it("strips tags, scripts, styles and collapses whitespace", () => {
    const html = `<html><head><style>body{color:red}</style>
      <script>alert(1)</script></head>
      <body><h1>Acme &amp; Co</h1>\n\n<p>We   build <b>robots</b>.</p></body></html>`;
    expect(htmlToText(html)).toBe("Acme & Co We build robots.");
  });

  it("drops navigation noise but keeps content order", () => {
    expect(htmlToText("<nav>Menu</nav><main>Real content</main>")).toContain(
      "Real content",
    );
  });
});

describe("mapPappersResult", () => {
  it("maps the fields the profile fill needs", () => {
    const mapped = mapPappersResult({
      siren: "123456789",
      nom_entreprise: "ACME ROBOTICS",
      libelle_code_naf: "Fabrication de machines-outils",
      effectif: "20 à 49 salariés",
      forme_juridique: "SAS",
      siege: { ville: "Lyon" },
    });
    expect(mapped).toEqual({
      siren: "123456789",
      legalName: "ACME ROBOTICS",
      nafLabel: "Fabrication de machines-outils",
      headcountRange: "20 à 49 salariés",
      legalForm: "SAS",
      city: "Lyon",
    });
  });

  it("returns null on malformed payloads", () => {
    expect(mapPappersResult(null)).toBeNull();
    expect(mapPappersResult({ nom_entreprise: 42 })).toBeNull();
  });
});

describe("buildProfileFillPrompt", () => {
  it("includes the sources it was given and nothing else", () => {
    const prompt = buildProfileFillPrompt({
      name: "Acme Robotics",
      website: "https://acme-robotics.fr",
      pappers: {
        siren: "123456789",
        legalName: "ACME ROBOTICS",
        nafLabel: "Fabrication de machines-outils",
        headcountRange: "20 à 49 salariés",
        legalForm: "SAS",
        city: "Lyon",
      },
      websiteText: "Acme builds industrial robots for factories.",
    });
    expect(prompt).toContain("Acme Robotics");
    expect(prompt).toContain("123456789");
    expect(prompt).toContain("industrial robots");
    // The model must be told to only rely on the provided sources.
    expect(prompt.toLowerCase()).toContain("only");
  });

  it("marks missing sources explicitly", () => {
    const prompt = buildProfileFillPrompt({
      name: "Acme",
      website: null,
      pappers: null,
      websiteText: null,
    });
    expect(prompt).toContain("No registry data");
    expect(prompt).toContain("No website content");
  });
});

describe("buildAssistantSystemPrompt", () => {
  it("frames the assistant and includes the company context", () => {
    const prompt = buildAssistantSystemPrompt({
      name: "Acme SAS",
      sector: "Software",
      globalScore: 73,
      categoryScores: { governance: 82, finance: 74 },
      weaknesses: ["Compliance"],
      topActions: ["Appoint a statutory auditor"],
      valuationRange: { low: 22_000_000, high: 26_000_000 },
    });
    expect(prompt).toContain("Acme SAS");
    expect(prompt).toContain("73");
    expect(prompt).toContain("Compliance");
    expect(prompt).toContain("Appoint a statutory auditor");
    expect(prompt.toLowerCase()).toContain("not investment advice");
  });

  it("works without company context", () => {
    const prompt = buildAssistantSystemPrompt();
    expect(prompt).toContain("IPO");
    expect(prompt).not.toContain("undefined");
  });
});

describe("AI provider config", () => {
  it("keeps Anthropic as the auto provider when both providers are configured", () => {
    vi.stubEnv("AI_PROVIDER", "auto");
    vi.stubEnv("ANTHROPIC_API_KEY", "anthropic-key");
    vi.stubEnv("GEMINI_API_KEY", "gemini-key");

    expect(getAiProvider()).toBe("anthropic");
    expect(isAiConfigured()).toBe(true);
  });

  it("uses Gemini explicitly when AI_PROVIDER is gemini and Gemini is configured", () => {
    vi.stubEnv("AI_PROVIDER", "gemini");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("GEMINI_API_KEY", "gemini-key");

    expect(getAiProvider()).toBe("gemini");
    expect(isAiConfigured()).toBe(true);
  });

  it("returns a provider-neutral setup message when no provider is configured", () => {
    vi.stubEnv("AI_PROVIDER", "auto");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("GEMINI_API_KEY", "");

    expect(isAiConfigured()).toBe(false);
    expect(getAiSetupMessage()).toContain("ANTHROPIC_API_KEY");
    expect(getAiSetupMessage()).toContain("GEMINI_API_KEY");
  });
});

describe("parseGeminiProfileSuggestionText", () => {
  it("extracts and validates a Gemini JSON profile suggestion", () => {
    expect(
      parseGeminiProfileSuggestionText(`Here is the JSON:
      {
        "sector": "Industrial robotics",
        "headcount": 42,
        "siren": "123456789",
        "website": "https://acme.fr",
        "summary": "Acme builds industrial robots for factories.",
        "sources": ["registry", "website"]
      }`),
    ).toEqual({
      sector: "Industrial robotics",
      headcount: 42,
      siren: "123456789",
      website: "https://acme.fr",
      summary: "Acme builds industrial robots for factories.",
      sources: ["registry", "website"],
    });
  });

  it("rejects malformed Gemini profile suggestions", () => {
    expect(() =>
      parseGeminiProfileSuggestionText(`{"sector":"Robotics","sources":["website"]}`),
    ).toThrow("usable profile suggestion");
  });
});
