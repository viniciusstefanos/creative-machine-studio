import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Upload, FileText, X, Loader2, Tag } from "lucide-react";

const FILE_CATEGORIES = [
  { value: "identidade_visual", label: "Identidade Visual" },
  { value: "produto", label: "Produto" },
  { value: "tom_de_voz", label: "Tom de Voz" },
  { value: "publico_alvo", label: "Público-alvo" },
  { value: "contexto", label: "Contexto / Mercado" },
  { value: "referencias", label: "Referências" },
  { value: "briefing", label: "Briefing Geral" },
  { value: "geral", label: "Outro" },
];

interface BriefFile {
  id: string;
  file_name: string;
  file_path: string;
  category: string;
  raw_text?: string | null;
  extracted_fields?: any;
  created_at: string;
}

interface BriefFilesSectionProps {
  activationId: string;
  files: BriefFile[];
  onFilesChange: (files: BriefFile[]) => void;
  onExtracted?: (extracted: any) => void;
}

export const BriefFilesSection = ({
  activationId,
  files,
  onFilesChange,
  onExtracted,
}: BriefFilesSectionProps) => {
  const [uploading, setUploading] = useState(false);
  const [extractingId, setExtractingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    const filePath = `${activationId}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("briefs").upload(filePath, file);
    if (error) {
      toast({ title: "Erro no upload", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    // Insert into brief_files
    const { data: newFile, error: insertError } = await supabase
      .from("brief_files" as any)
      .insert([{
        activation_id: activationId,
        file_path: filePath,
        file_name: file.name,
        category: "geral",
      }])
      .select()
      .single();

    if (insertError) {
      toast({ title: "Erro ao salvar arquivo", variant: "destructive" });
      setUploading(false);
      return;
    }

    const updatedFiles = [...files, newFile as unknown as BriefFile];
    onFilesChange(updatedFiles);
    setUploading(false);

    // Extract with AI
    setExtractingId((newFile as any).id);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("extract-brief", {
        body: { file_path: filePath },
      });
      if (fnError) throw fnError;

      // Update brief_files with raw_text, extracted_fields, and detected category
      const detectedCategory = data?.extracted?.detected_category;
      const updatePayload: any = {
        raw_text: data?.raw_text || null,
        extracted_fields: data?.extracted || null,
      };
      if (detectedCategory) {
        updatePayload.category = detectedCategory;
      }

      await supabase
        .from("brief_files" as any)
        .update(updatePayload)
        .eq("id", (newFile as any).id);

      // Update local state
      const finalFiles = updatedFiles.map((f) =>
        f.id === (newFile as any).id
          ? { ...f, raw_text: data?.raw_text, extracted_fields: data?.extracted, ...(detectedCategory ? { category: detectedCategory } : {}) }
          : f
      );
      onFilesChange(finalFiles);

      // Propagate extracted fields to brief form
      if (data?.extracted && onExtracted) {
        onExtracted(data.extracted);
      }

      toast({ title: "Arquivo processado", description: `${file.name} — texto extraído e campos analisados.` });
    } catch (err) {
      console.error("Extract error:", err);
      toast({ title: "Erro na extração", description: "Upload salvo, mas não foi possível extrair texto.", variant: "destructive" });
    }
    setExtractingId(null);
  };

  const handleRemoveFile = async (fileId: string) => {
    await supabase.from("brief_files" as any).delete().eq("id", fileId);
    onFilesChange(files.filter((f) => f.id !== fileId));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) handleFileUpload(droppedFiles[0]);
  };

  const getCategoryLabel = (value: string) =>
    FILE_CATEGORIES.find((c) => c.value === value)?.label || value;

  const getCategoryColor = (value: string) => {
    const map: Record<string, string> = {
      identidade_visual: "hsl(var(--accent))",
      produto: "hsl(270 60% 60%)",
      tom_de_voz: "hsl(200 70% 55%)",
      publico_alvo: "hsl(330 60% 55%)",
      contexto: "hsl(40 70% 55%)",
      referencias: "hsl(160 50% 50%)",
      briefing: "hsl(var(--accent))",
      geral: "hsl(var(--text-muted))",
    };
    return map[value] || "hsl(var(--text-muted))";
  };

  return (
    <div className="space-y-4">
      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-3 p-3 rounded-lg group"
              style={{
                background: "hsl(var(--bg-surface2))",
                border: "1px solid hsl(var(--border-default))",
                borderRadius: 8,
              }}
            >
              <FileText size={16} style={{ color: getCategoryColor(f.category), flexShrink: 0 }} />
              <div className="flex-1 min-w-0">
                <p
                  className="text-xs truncate"
                  style={{ color: "hsl(var(--text-primary))", fontFamily: "'DM Sans'" }}
                >
                  {f.file_name}
                </p>
                <span
                  className="inline-flex items-center gap-1 text-[10px] mt-0.5 px-1.5 py-0.5 rounded"
                  style={{
                    background: `${getCategoryColor(f.category)}15`,
                    color: getCategoryColor(f.category),
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  <Tag size={8} />
                  {getCategoryLabel(f.category)}
                </span>
              </div>
              {extractingId === f.id ? (
                <Loader2 size={14} className="animate-spin" style={{ color: "hsl(var(--accent))" }} />
              ) : (
                <span
                  className="text-[10px]"
                  style={{
                    color: f.raw_text ? "hsl(var(--status-approved))" : "hsl(var(--text-muted))",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {f.raw_text ? "✓ extraído" : "sem texto"}
                </span>
              )}
              <button
                onClick={() => handleRemoveFile(f.id)}
                className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: "hsl(var(--text-muted))" }}
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Category selector + drop zone */}
      <div className="flex items-center gap-2 mb-1">
        <label className="text-[10px]" style={{ color: "hsl(var(--text-muted))", fontFamily: "'DM Sans'" }}>
          Categoria do próximo arquivo:
        </label>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="text-xs px-2 py-1 rounded"
          style={{
            background: "hsl(var(--bg-surface2))",
            color: "hsl(var(--text-primary))",
            border: "1px solid hsl(var(--border-default))",
            fontFamily: "'DM Sans'",
            borderRadius: 6,
          }}
        >
          {FILE_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <label
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className="flex flex-col items-center justify-center gap-2 p-5 rounded-lg cursor-pointer transition-all duration-150"
        style={{
          background: dragOver ? "hsl(var(--bg-surface3))" : "hsl(var(--bg-surface1))",
          border: `1px dashed ${dragOver ? "hsl(var(--accent))" : "hsl(var(--border-strong))"}`,
          borderRadius: 8,
        }}
      >
        {uploading ? (
          <Loader2 size={20} className="animate-spin" style={{ color: "hsl(var(--accent))" }} />
        ) : (
          <Upload size={20} style={{ color: dragOver ? "hsl(var(--accent))" : "hsl(var(--text-muted))" }} />
        )}
        <p className="text-xs text-center" style={{ color: "hsl(var(--text-muted))", fontFamily: "'DM Sans'" }}>
          {uploading ? "Enviando..." : "Arraste PDF, DOCX ou TXT — ou clique para selecionar"}
        </p>
        <input
          type="file"
          accept=".pdf,.docx,.txt,.md"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file);
            e.target.value = "";
          }}
          className="hidden"
        />
      </label>

      <p
        className="text-[10px]"
        style={{ color: "hsl(var(--text-muted))", fontFamily: "'JetBrains Mono', monospace" }}
      >
        Suba quantos arquivos quiser: guia de marca, manual de produto, pesquisa de público, moodboard, etc.
        Cada arquivo será lido integralmente pela IA na geração de copies e peças.
      </p>
    </div>
  );
};
