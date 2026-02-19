import {
  generateThemeCSS,
  mergeTheme,
  validateTheme,
  ThemeDefinition,
} from "./theme-engine";

const baseTheme: ThemeDefinition = {
  name: "Test Theme",
  slug: "test-theme",
  version: "1.0.0",
  colors: {
    primary: "#3b82f6",
    primaryHover: "#2563eb",
    background: "#ffffff",
    surface: "#f8fafc",
    text: "#1e293b",
    textMuted: "#64748b",
    border: "#e2e8f0",
    userBubble: "#3b82f6",
    userBubbleText: "#ffffff",
    assistantBubble: "#f1f5f9",
    assistantBubbleText: "#1e293b",
    inputBg: "#ffffff",
    inputBorder: "#e2e8f0",
    inputFocus: "#3b82f6",
  },
  typography: {
    fontFamily: "Inter, sans-serif",
    fontSize: "14px",
    lineHeight: "1.5",
    headerSize: "18px",
  },
  layout: {
    borderRadius: "12px",
    bubbleRadius: "16px",
    widgetWidth: "400px",
    widgetHeight: "600px",
    padding: "16px",
  },
};

describe("Theme Engine", () => {
  // ─── generateThemeCSS ────────────────────────────────────
  describe("generateThemeCSS", () => {
    it("should generate valid CSS with :root selector", () => {
      const css = generateThemeCSS(baseTheme);
      expect(css).toContain(":root {");
      expect(css).toContain("}");
    });

    it("should convert camelCase color keys to kebab-case CSS vars", () => {
      const css = generateThemeCSS(baseTheme);
      expect(css).toContain("--ab-color-primary: #3b82f6");
      expect(css).toContain("--ab-color-primary-hover: #2563eb");
      expect(css).toContain("--ab-color-user-bubble: #3b82f6");
      expect(css).toContain("--ab-color-assistant-bubble-text: #1e293b");
    });

    it("should include typography vars", () => {
      const css = generateThemeCSS(baseTheme);
      expect(css).toContain("--ab-font-family: Inter, sans-serif");
      expect(css).toContain("--ab-font-size: 14px");
      expect(css).toContain("--ab-line-height: 1.5");
      expect(css).toContain("--ab-header-size: 18px");
    });

    it("should include layout vars", () => {
      const css = generateThemeCSS(baseTheme);
      expect(css).toContain("--ab-border-radius: 12px");
      expect(css).toContain("--ab-widget-width: 400px");
      expect(css).toContain("--ab-padding: 16px");
    });

    it("should include custom vars when present", () => {
      const theme = { ...baseTheme, custom: { accentGlow: "0 0 10px blue" } };
      const css = generateThemeCSS(theme);
      expect(css).toContain("--ab-custom-accentGlow: 0 0 10px blue");
    });

    it("should handle empty custom vars", () => {
      const css = generateThemeCSS(baseTheme);
      expect(css).not.toContain("--ab-custom-");
    });
  });

  // ─── mergeTheme ──────────────────────────────────────────
  describe("mergeTheme", () => {
    it("should override top-level fields", () => {
      const result = mergeTheme(baseTheme, {
        name: "Custom",
        version: "2.0.0",
      });
      expect(result.name).toBe("Custom");
      expect(result.version).toBe("2.0.0");
      // Unchanged fields preserved
      expect(result.slug).toBe("test-theme");
    });

    it("should deep-merge colors", () => {
      const result = mergeTheme(baseTheme, {
        colors: { primary: "#ff0000" } as any,
      });
      expect(result.colors.primary).toBe("#ff0000");
      expect(result.colors.background).toBe("#ffffff"); // preserved
    });

    it("should deep-merge typography", () => {
      const result = mergeTheme(baseTheme, {
        typography: { fontSize: "16px" } as any,
      });
      expect(result.typography.fontSize).toBe("16px");
      expect(result.typography.fontFamily).toBe("Inter, sans-serif"); // preserved
    });

    it("should deep-merge layout", () => {
      const result = mergeTheme(baseTheme, {
        layout: { padding: "24px" } as any,
      });
      expect(result.layout.padding).toBe("24px");
      expect(result.layout.widgetWidth).toBe("400px"); // preserved
    });

    it("should merge custom vars", () => {
      const base = { ...baseTheme, custom: { a: "1" } };
      const result = mergeTheme(base, { custom: { b: "2" } });
      expect(result.custom).toEqual({ a: "1", b: "2" });
    });
  });

  // ─── validateTheme ───────────────────────────────────────
  describe("validateTheme", () => {
    it("should return no errors for a valid theme", () => {
      const errors = validateTheme(baseTheme);
      expect(errors).toHaveLength(0);
    });

    it("should require name", () => {
      const errors = validateTheme({
        colors: baseTheme.colors,
        typography: baseTheme.typography,
      });
      expect(errors).toContain("name is required");
    });

    it("should require colors.primary", () => {
      const errors = validateTheme({
        name: "Test",
        colors: { background: "#fff" } as any,
        typography: baseTheme.typography,
      });
      expect(errors).toContain("colors.primary is required");
    });

    it("should require colors.background", () => {
      const errors = validateTheme({
        name: "Test",
        colors: { primary: "#000" } as any,
        typography: baseTheme.typography,
      });
      expect(errors).toContain("colors.background is required");
    });

    it("should require typography.fontFamily", () => {
      const errors = validateTheme({ name: "Test", colors: baseTheme.colors });
      expect(errors).toContain("typography.fontFamily is required");
    });

    it("should return multiple errors at once", () => {
      const errors = validateTheme({});
      expect(errors.length).toBeGreaterThanOrEqual(2);
    });
  });
});
