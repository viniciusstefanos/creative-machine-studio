/**
 * HTML Validator + Auto-fix for generated creative assets.
 * Catches common AI generation errors and fixes them automatically.
 */

export interface ValidateOptions {
  width: number;
  height: number;
  generationType: string; // "html_only" | "html_and_image" | "image_only"
}

export interface ValidateResult {
  html: string;
  warnings: string[];
  fixes: string[];
}

/** Check if HTML has background-image but no gradient overlay */
function fixMissingOverlay(html: string, opts: ValidateOptions): { html: string; fix: string | null } {
  if (opts.generationType !== "html_and_image") return { html, fix: null };
  
  const hasBgImage = /background-image\s*:/i.test(html);
  if (!hasBgImage) return { html, fix: null };
  
  const hasGradientOverlay = /linear-gradient\s*\([\s\S]*?rgba?\s*\(/i.test(html);
  if (hasGradientOverlay) return { html, fix: null };
  
  // Inject overlay div after the root container opening tag
  const rootDivMatch = html.match(
    /(<div\s+style="[^"]*background-image\s*:[^"]*"[^>]*>)/i
  );
  if (rootDivMatch) {
    const overlayDiv = `<div style="position:absolute;inset:0;background:linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 50%, transparent 100%);pointer-events:none"></div>`;
    const updated = html.replace(
      rootDivMatch[1],
      rootDivMatch[1] + overlayDiv
    );
    // Ensure root has position:relative
    if (!/position\s*:\s*relative/i.test(rootDivMatch[1])) {
      return {
        html: updated.replace(rootDivMatch[1], rootDivMatch[1].replace(/style="/, 'style="position:relative;')),
        fix: "overlay_injected"
      };
    }
    return { html: updated, fix: "overlay_injected" };
  }
  
  return { html, fix: null };
}

/** Ensure text-shadow on text elements when bg-image is present */
function fixMissingTextShadow(html: string, opts: ValidateOptions): { html: string; fix: string | null } {
  if (opts.generationType !== "html_and_image") return { html, fix: null };
  
  const hasBgImage = /background-image\s*:/i.test(html);
  if (!hasBgImage) return { html, fix: null };
  
  const textShadowValue = "0 2px 8px rgba(0,0,0,0.8)";
  let fixed = false;
  
  // Find text elements (h1-h6, p, span with style) that lack text-shadow
  const textTagRegex = /<(h[1-6]|p|span)\s+style="([^"]*)"/gi;
  const result = html.replace(textTagRegex, (match, tag, styles) => {
    if (/text-shadow/i.test(styles)) return match;
    fixed = true;
    return `<${tag} style="${styles};text-shadow:${textShadowValue}"`;
  });
  
  return { html: result, fix: fixed ? "text_shadow_added" : null };
}

/** Fix CTA buttons: ensure solid bg, centered text */
function fixCtaButton(html: string): { html: string; fix: string | null } {
  // Match button or a tags, or divs that look like CTAs
  const buttonRegex = /<(button|a)\s+([^>]*style="([^"]*)")([^>]*)>/gi;
  let fixed = false;
  
  const result = html.replace(buttonRegex, (match, tag, styleAttr, styles, rest) => {
    let newStyles = styles;
    let changed = false;
    
    // Ensure display:flex + centering
    if (!/display\s*:\s*flex/i.test(newStyles)) {
      newStyles += ";display:flex;align-items:center;justify-content:center";
      changed = true;
    } else {
      if (!/align-items/i.test(newStyles)) {
        newStyles += ";align-items:center";
        changed = true;
      }
      if (!/justify-content/i.test(newStyles)) {
        newStyles += ";justify-content:center";
        changed = true;
      }
    }
    
    // Ensure text-align:center
    if (!/text-align\s*:\s*center/i.test(newStyles)) {
      newStyles += ";text-align:center";
      changed = true;
    }
    
    if (changed) {
      fixed = true;
      return `<${tag} ${styleAttr.replace(styles, newStyles)}${rest}>`;
    }
    return match;
  });
  
  return { html: result, fix: fixed ? "cta_centered" : null };
}

/** Ensure root container has exact pixel dimensions */
function fixRootDimensions(html: string, opts: ValidateOptions): { html: string; fix: string | null } {
  // Find the first div with a style attribute (root container)
  const rootMatch = html.match(/^(?:\s*<link[^>]*>\s*)*(<div\s+style="([^"]*)")/i);
  if (!rootMatch) return { html, fix: null };
  
  const styles = rootMatch[2];
  let newStyles = styles;
  let changed = false;
  
  // Check width
  const widthMatch = styles.match(/width\s*:\s*([^;]+)/i);
  if (widthMatch) {
    const val = widthMatch[1].trim();
    if (/%|vw|vh|auto/i.test(val)) {
      newStyles = newStyles.replace(widthMatch[0], `width:${opts.width}px`);
      changed = true;
    }
  } else {
    newStyles = `width:${opts.width}px;` + newStyles;
    changed = true;
  }
  
  // Check height
  const heightMatch = styles.match(/height\s*:\s*([^;]+)/i);
  if (heightMatch) {
    const val = heightMatch[1].trim();
    if (/%|vw|vh|auto/i.test(val)) {
      newStyles = newStyles.replace(heightMatch[0], `height:${opts.height}px`);
      changed = true;
    }
  } else {
    newStyles = `height:${opts.height}px;` + newStyles;
    changed = true;
  }
  
  if (!changed) return { html, fix: null };
  
  return {
    html: html.replace(rootMatch[2], newStyles),
    fix: "dimensions_fixed"
  };
}

/** Check for Google Fonts link (warning only) */
function checkGoogleFonts(html: string): string | null {
  if (/fonts\.googleapis\.com/i.test(html)) return null;
  if (/<link[^>]*font/i.test(html)) return null;
  return "no_google_fonts";
}

/** Main validation + auto-fix entry point */
export function validateAndFixHtml(html: string, opts: ValidateOptions): ValidateResult {
  const warnings: string[] = [];
  const fixes: string[] = [];
  let result = html;
  
  // 1. Fix root dimensions
  const dimResult = fixRootDimensions(result, opts);
  result = dimResult.html;
  if (dimResult.fix) fixes.push(dimResult.fix);
  
  // 2. Fix missing overlay (html_and_image only)
  const overlayResult = fixMissingOverlay(result, opts);
  result = overlayResult.html;
  if (overlayResult.fix) fixes.push(overlayResult.fix);
  
  // 3. Fix text-shadow
  const shadowResult = fixMissingTextShadow(result, opts);
  result = shadowResult.html;
  if (shadowResult.fix) fixes.push(shadowResult.fix);
  
  // 4. Fix CTA buttons
  const ctaResult = fixCtaButton(result);
  result = ctaResult.html;
  if (ctaResult.fix) fixes.push(ctaResult.fix);
  
  // 5. Warnings only
  const fontWarning = checkGoogleFonts(result);
  if (fontWarning) warnings.push(fontWarning);
  
  // Log for debugging
  if (fixes.length > 0) {
    console.log(`[validate-html] Auto-fixed: ${fixes.join(", ")}`);
  }
  if (warnings.length > 0) {
    console.log(`[validate-html] Warnings: ${warnings.join(", ")}`);
  }
  
  return { html: result, warnings: [...warnings, ...fixes.map(f => `fix:${f}`)] };
}
