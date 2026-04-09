/**
 * Reads a prompt from the prompt_templates table with fallback to hardcoded value.
 */
export async function getPrompt(
  supabase: any,
  slug: string,
  fallback: string,
): Promise<string> {
  try {
    const { data } = await supabase
      .from("prompt_templates")
      .select("content")
      .eq("slug", slug)
      .single();
    return data?.content || fallback;
  } catch {
    return fallback;
  }
}
