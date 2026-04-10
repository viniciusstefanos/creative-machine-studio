/** Fill {{key}} placeholders in a template string */
export function fillTemplate(tpl: string, ctx: Record<string, any>): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, key) => ctx[key] || "");
}

/** Build brief files context string from array of brief_files records */
export function buildFilesContext(briefFiles: any[]): string {
  if (!briefFiles.length) return "";
  return briefFiles.map((f: any) => {
    const efStr = f.extracted_fields ? `\n**Dados estruturados:**\n${JSON.stringify(f.extracted_fields, null, 2)}` : "";
    return `[${f.category}] ${f.file_name}:${efStr}\n${(f.raw_text || "").slice(0, 15000)}`;
  }).join("\n\n---\n\n");
}

/** Build brand color/typography/visual style instructions for asset generation */
export function buildBrandInstructions(
  ctx: { brand_colors: string; typography: string; visual_style: string },
  renderCfg: Record<string, any>,
  briefFileColors: string[],
  briefFileFonts: string[],
): string {
  let instructions = "";

  const DEFAULT_COLORS = new Set(["#0a0a0a", "#00c9a7", "#f5f5f0", "#111111", "#ffffff"]);
  const isRealColor = (c: string) => c && /^#[0-9A-Fa-f]{6}$/i.test(c) && !DEFAULT_COLORS.has(c.toLowerCase());

  const hasExplicitBg = isRealColor(renderCfg.bg_color);
  const hasExplicitAccent = isRealColor(renderCfg.accent_color);
  const hasExplicitText = isRealColor(renderCfg.text_color);

  if (hasExplicitBg || hasExplicitAccent || hasExplicitText) {
    instructions += `\n\n## CORES DA MARCA (OBRIGATÓRIO — PRIORIDADE MÁXIMA)\nUse EXATAMENTE estas cores:`;
    if (hasExplicitBg) instructions += `\n- Cor de fundo: ${renderCfg.bg_color}`;
    if (hasExplicitAccent) instructions += `\n- Cor de acento/CTA: ${renderCfg.accent_color}`;
    if (hasExplicitText) instructions += `\n- Cor do texto: ${renderCfg.text_color}`;
    instructions += `\n- NÃO use cores genéricas. Use EXATAMENTE os hex acima.`;
  } else if (ctx.brand_colors) {
    instructions += `\n\n## CORES DA MARCA (OBRIGATÓRIO — PRIORIDADE MÁXIMA)\nA identidade visual do cliente define estas cores: ${ctx.brand_colors}\n- EXTRAIA os códigos hex desta descrição e aplique-os:\n  • Cor primária/dominante → fundo principal\n  • Cor secundária/suporte → textos, elementos de apoio\n  • Cor de acento/CTA → APENAS para botões e calls-to-action\n- NÃO use cores genéricas quando as cores da marca estiverem definidas\n- NÃO invente cores. Use EXATAMENTE os hex fornecidos pelo cliente`;
  } else if (briefFileColors.length > 0) {
    instructions += `\n\n## CORES DA MARCA (OBRIGATÓRIO — PRIORIDADE MÁXIMA)\nCores extraídas dos documentos do briefing: ${briefFileColors.join(", ")}`;
    instructions += `\n- Use a 1ª cor como primária/destaque, a 2ª como fundo ou suporte, a 3ª como texto/detalhe.`;
    instructions += `\n- NÃO use cores genéricas. Use EXATAMENTE os hex acima.`;
  }

  if (ctx.typography) {
    instructions += `\n\n## TIPOGRAFIA DA MARCA (OBRIGATÓRIO — PRIORIDADE MÁXIMA)\nSUBSTITUA as fontes padrão do template pelas fontes da marca: ${ctx.typography}\n- Importe via Google Fonts com <link>. Se a fonte não existir no Google Fonts, use a mais próxima visualmente.\n- NÃO use fontes genéricas quando as fontes da marca estiverem definidas.\n- Aplique a hierarquia: font de display para títulos/headlines, font de corpo para body/labels/CTA.`;
  } else if (briefFileFonts.length > 0) {
    instructions += `\n\n## TIPOGRAFIA DA MARCA (OBRIGATÓRIO — PRIORIDADE MÁXIMA)\nFontes extraídas dos documentos do briefing: ${briefFileFonts.join(", ")}\n- SUBSTITUA as fontes padrão do template pelas fontes acima.\n- Importe via Google Fonts com <link>. Use a 1ª como headline e a 2ª como corpo.`;
  }

  if (ctx.visual_style) {
    instructions += `\n\n## ESTILO VISUAL DA MARCA (OBRIGATÓRIO)\nSiga este estilo visual: ${ctx.visual_style}\n`;
  }

  return instructions;
}

/** Build social profile instruction for templates with avatar/handle */
export function buildSocialInstruction(social: any): string {
  if (!(social?.social_display_name || social?.social_handle)) return "";
  let instr = `\n\n## PERFIL SOCIAL (OBRIGATÓRIO nos templates que exibem perfil)\nNome: ${social.social_display_name || ""}\nHandle: ${social.social_handle || ""}\nFoto de perfil URL: ${social.social_avatar_url || ""}\nQuando o template incluir avatar, nome de perfil ou @handle, use EXATAMENTE estes dados.\nNÃO invente nomes de perfil ou handles fictícios.`;
  if (social.social_avatar_url) {
    instr += `\nPara avatar, use: <img src="${social.social_avatar_url}" style="width:40px;height:40px;border-radius:50%;object-fit:cover" />`;
  }
  return instr;
}

/** Resolve brand identity from brief data — extract colors and fonts from various sources */
export function resolveBrandIdentity(brief: any, briefFiles: any[], consolidated: any) {
  const resolvedBrandColors = brief?.brand_colors
    || consolidated?.visual_guidelines?.colors
    || consolidated?.brand_colors
    || "";
  const resolvedTypography = brief?.typography
    || consolidated?.visual_guidelines?.typography
    || consolidated?.typography
    || "";
  const resolvedVisualStyle = brief?.visual_style
    || consolidated?.visual_guidelines?.style
    || consolidated?.visual_style
    || "";

  const briefFileColors: string[] = [];
  const briefFileFonts: string[] = [];

  if (briefFiles.length > 0) {
    for (const f of briefFiles) {
      const ef = f.extracted_fields;
      if (ef?.visual_guidelines?.colors_hex && !resolvedBrandColors) {
        for (const c of ef.visual_guidelines.colors_hex) {
          const hex = (c as string).match(/#[0-9A-Fa-f]{6}/)?.[0];
          if (hex && !briefFileColors.includes(hex)) briefFileColors.push(hex);
        }
      }
      if (ef?.visual_guidelines?.fonts && !resolvedTypography) {
        for (const font of ef.visual_guidelines.fonts) {
          if (font && typeof font === "string" && !briefFileFonts.includes(font)) {
            briefFileFonts.push(font);
          }
        }
      }
    }
  }

  return {
    brandColors: resolvedBrandColors,
    typography: resolvedTypography,
    visualStyle: resolvedVisualStyle,
    briefFileColors,
    briefFileFonts,
  };
}
