/**
 * Agentbase Theme Engine
 *
 * Generates CSS custom properties from theme definitions.
 * Themes control the look of the embeddable chat widget.
 */

export interface ThemeDefinition {
  name: string;
  slug: string;
  version: string;
  colors: {
    primary: string;
    primaryHover: string;
    background: string;
    surface: string;
    text: string;
    textMuted: string;
    border: string;
    userBubble: string;
    userBubbleText: string;
    assistantBubble: string;
    assistantBubbleText: string;
    inputBg: string;
    inputBorder: string;
    inputFocus: string;
  };
  typography: {
    fontFamily: string;
    fontSize: string;
    lineHeight: string;
    headerSize: string;
  };
  layout: {
    borderRadius: string;
    bubbleRadius: string;
    widgetWidth: string;
    widgetHeight: string;
    padding: string;
  };
  custom?: Record<string, string>;
}

/**
 * Generate CSS custom properties string from a theme definition.
 */
export function generateThemeCSS(theme: ThemeDefinition): string {
  const vars: string[] = [];

  // Colors
  for (const [key, value] of Object.entries(theme.colors)) {
    const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
    vars.push(`  --ab-color-${cssKey}: ${value};`);
  }

  // Typography
  vars.push(`  --ab-font-family: ${theme.typography.fontFamily};`);
  vars.push(`  --ab-font-size: ${theme.typography.fontSize};`);
  vars.push(`  --ab-line-height: ${theme.typography.lineHeight};`);
  vars.push(`  --ab-header-size: ${theme.typography.headerSize};`);

  // Layout
  vars.push(`  --ab-border-radius: ${theme.layout.borderRadius};`);
  vars.push(`  --ab-bubble-radius: ${theme.layout.bubbleRadius};`);
  vars.push(`  --ab-widget-width: ${theme.layout.widgetWidth};`);
  vars.push(`  --ab-widget-height: ${theme.layout.widgetHeight};`);
  vars.push(`  --ab-padding: ${theme.layout.padding};`);

  // Custom
  if (theme.custom) {
    for (const [key, value] of Object.entries(theme.custom)) {
      vars.push(`  --ab-custom-${key}: ${value};`);
    }
  }

  return `:root {\n${vars.join('\n')}\n}`;
}

/**
 * Merge a partial theme override with a base theme.
 */
export function mergeTheme(
  base: ThemeDefinition,
  overrides: Partial<ThemeDefinition>,
): ThemeDefinition {
  return {
    ...base,
    ...overrides,
    colors: { ...base.colors, ...overrides.colors },
    typography: { ...base.typography, ...overrides.typography },
    layout: { ...base.layout, ...overrides.layout },
    custom: { ...base.custom, ...overrides.custom },
  };
}

/**
 * Validate a theme definition has all required fields.
 */
export function validateTheme(theme: Partial<ThemeDefinition>): string[] {
  const errors: string[] = [];
  if (!theme.name) errors.push('name is required');
  if (!theme.colors?.primary) errors.push('colors.primary is required');
  if (!theme.colors?.background) errors.push('colors.background is required');
  if (!theme.typography?.fontFamily) errors.push('typography.fontFamily is required');
  return errors;
}
