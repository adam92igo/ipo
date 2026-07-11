import { expect, test, type Page } from "@playwright/test";

/**
 * Full-journey smoke test: sign-up -> org -> company -> complete assessment
 * -> results -> financials -> valuation -> roadmap -> assistant (degraded,
 * no AI key configured -> no network call). Runs against the test database
 * (see playwright.config.ts) so it never touches dev data.
 */

async function answerAllVisibleQuestions(page: Page, total: number): Promise<void> {
  const options = page.locator("button[aria-pressed]");
  const count = await options.count();
  for (let i = 0; i < count; i += 1) {
    await options.nth(i).click();
  }
  await expect(
    page.getByText(`${total} / ${total} answered in this section`),
  ).toBeVisible();
}

test("IPO readiness journey end to end", async ({ page }) => {
  const stamp = Date.now();
  const email = `e2e-${stamp}@example.com`;
  const apiRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/assistant")) apiRequests.push(request.url());
  });

  // Sign up
  await page.goto("/sign-up");
  await page.getByLabel("Full name").fill("E2E Tester");
  await page.getByLabel("Work email").fill(email);
  await page.getByLabel("Password").fill("SmokeTest1234!");
  await page.getByRole("button", { name: "Create account" }).click();

  // Onboarding: create the organization
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByLabel("Organization name").fill(`E2E Org ${stamp}`);
  await page.getByRole("button", { name: "Create organization" }).click();

  // Dashboard -> Companies -> create a company
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto("/companies");
  await page.getByRole("button", { name: "Add company" }).first().click();
  await page.getByLabel("Company name *").fill("Smoke Test SAS");
  await page.getByLabel("Sector *").fill("Software");
  await page.getByRole("button", { name: "Add company", exact: true }).click();
  await expect(page.getByRole("main").getByText("Smoke Test SAS")).toBeVisible();

  await page.goto("/dashboard");
  await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
  for (const label of ["Overview", "Diagnostic", "Valuation", "Roadmap", "Assistant"]) {
    await expect(page.getByRole("link", { name: label, exact: true })).toBeVisible();
  }
  await expect(page.getByRole("link", { name: "Companies", exact: true })).toHaveCount(0);

  // Complete the full readiness assessment
  await page.getByRole("link", { name: "Diagnostic", exact: true }).click();
  await expect(page).toHaveURL(/\/assessment$/);
  await expect(
    page.getByRole("progressbar", { name: "Assessment completion" }),
  ).toHaveAttribute("aria-valuenow", "0");
  await expect(
    page.getByRole("navigation", { name: "Assessment sections" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Governance section" }),
  ).toHaveAttribute("aria-current", "step");

  const categoryTotals: Array<[string, number]> = [
    ["Governance", 22],
    ["Finance", 20],
    ["Growth", 20],
    ["Compliance", 20],
    ["Reporting", 20],
  ];
  const grandTotal = categoryTotals.reduce((sum, [, total]) => sum + total, 0);
  for (const [, total] of categoryTotals) {
    await answerAllVisibleQuestions(page, total);
    const nextButton = page.getByRole("button", { name: "Next", exact: true });
    if (await nextButton.isVisible()) {
      await nextButton.click();
    }
  }
  // Answers save via fire-and-forget fetches; let them settle before completing
  // so the server-side score computation never sees a still-missing answer.
  await expect(page.getByText(`${grandTotal} / ${grandTotal} answered`)).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Complete & view results" }).click();

  // Results page: frozen score + radar + category gauges rendered
  await expect(page).toHaveURL(/\/results$/);
  await expect(page.getByText("IPO readiness score")).toBeVisible();
  await expect(page.getByLabel(/IPO readiness: \d+%/)).toBeVisible();
  await expect(page.getByText("Readiness signals")).toBeVisible();
  await expect(page.getByRole("img", { name: /Readiness radar/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Category scores" })).toBeVisible();

  // Valuation: add a fiscal year, then run the valuation
  await page.getByRole("link", { name: "Build the roadmap" }).click();
  const companyId = new URL(page.url()).pathname.match(/companies\/([^/]+)/)![1];
  await page.goto(`/companies/${companyId}/valuation`);
  await page.getByRole("button", { name: "Add fiscal year" }).click();
  await page.getByLabel("Fiscal year *").fill("2025");
  await page.getByLabel("Revenue (EUR)").fill("5000000");
  await page.getByLabel("EBITDA (EUR)").fill("1000000");
  await page.getByRole("button", { name: "Save year" }).click();
  await expect(page.getByText("2025").first()).toBeVisible();
  await page.getByRole("button", { name: "Run valuation" }).click();
  await expect(page.getByText("Estimated equity value")).toBeVisible();
  await expect(page.getByText(/Midpoint €/)).toBeVisible();

  // Roadmap: generate from the completed assessment
  await page.goto(`/companies/${companyId}/roadmap`);
  await page.getByRole("button", { name: "Generate roadmap" }).click();
  await expect(page.getByText(/of \d+ steps done/)).toBeVisible();

  // Overview cockpit: persisted readiness, valuation and route are visible
  await page.goto("/dashboard");
  await expect(page.getByText("Readiness index")).toBeVisible();
  await expect(page.getByText("Route to market")).toBeVisible();
  await expect(page.getByText("Indicative equity value")).toBeVisible();
  await expect(page.getByRole("list", { name: "Route to market" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Smoke Test SAS", level: 1 }),
  ).toBeVisible();

  // Assistant: degraded mode without an AI key — banner shown, no chat, no API call
  await page.goto("/assistant");
  await expect(page.getByText("AI is not configured yet")).toBeVisible();
  await expect(
    page.getByPlaceholder("Ask about prospectus requirements, markets, governance…"),
  ).toHaveCount(0);
  expect(apiRequests).toHaveLength(0);
});
