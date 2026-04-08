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
      {/* Drop zone */}
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
