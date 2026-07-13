import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("brand shell styling contract", () => {
  it("uses a light structural desktop command bar with gold only on active navigation", () => {
    const header = readSource("src/components/layout/app-header.tsx");

    expect(header).toContain(
      '<header className="sticky top-0 z-40 border-b border-border bg-card text-primary shadow-sm">',
    );
    expect(header).toContain('active && "border-accent text-primary"');
    expect(header).toContain('active ? "text-accent" : "text-muted-foreground"');
    expect(header).not.toContain("border-b-4 border-accent bg-primary");
    expect(header).not.toContain("focus-visible:outline-accent");
  });

  it("keeps the original desktop auth mark readable without adding a white tile", () => {
    const authLayout = readSource("src/app/(auth)/layout.tsx");

    expect(authLayout).toContain('className="relative -mx-12 -mt-12 flex items-center gap-4 border-b border-border bg-card px-12 py-6 text-primary"');
    expect(authLayout).not.toContain("rounded-full bg-white");
  });

  it("carries the light command-bar palette into the user menu trigger", () => {
    const userMenu = readSource("src/components/user-menu.tsx");

    expect(userMenu).toContain(
      'className="h-11 gap-2 px-2 text-primary hover:bg-muted hover:text-primary focus-visible:border-primary"',
    );
    expect(userMenu).toContain(
      '<Avatar className="size-8 rounded-full border border-border bg-muted">',
    );
    expect(userMenu).not.toContain("text-primary-foreground");
  });
});
