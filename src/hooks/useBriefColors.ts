import { useMemo } from "react";

interface BriefColors {
  primary?: string;
  secondary?: string;
  accent?: string;
  background?: string;
  text?: string;
}

/** Extract hex colors from brief data, consolidated_context, and brief_files */
export function useBriefColors(brief: any, briefFiles?: any[]): BriefColors {
  return useMemo(() => {
    const colors: string[] = [];
    // 1. Direct brief.brand_colors text
    const hexMatches = (brief?.brand_colors || "").match(/#[0-9A-Fa-f]{6}/g) || [];
    colors.push(...hexMatches);
    // 2. Consolidated context
    const consolidated = (brief?.consolidated_context as any)?.visual_guidelines?.colors_hex || [];
    colors.push(...consolidated.filter((c: string) => !colors.includes(c)));
    // 3. Fallback: brief_files extracted_fields
    if (colors.length === 0 && briefFiles?.length) {
      for (const f of briefFiles) {
        const ef = f.extracted_fields;
        if (ef?.visual_guidelines?.colors_hex) {
          for (const c of ef.visual_guidelines.colors_hex as string[]) {
            const hex = c.match(/#[0-9A-Fa-f]{6}/)?.[0];
            if (hex && !colors.includes(hex)) colors.push(hex);
          }
        }
      }
    }
    return {
      primary: colors[0],
      secondary: colors[1],
      accent: colors[1] || colors[0],
      background: colors[0],
      text: colors[2] || "#f5f5f0",
    };
  }, [brief, briefFiles]);
}
