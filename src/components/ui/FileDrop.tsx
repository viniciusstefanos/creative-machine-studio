import { useCallback, useState } from "react";
import { Upload, FileText, X, Loader2 } from "lucide-react";

interface FileDropProps {
  accept?: string;
  onFile: (file: File) => void;
  uploading?: boolean;
  fileName?: string;
  onClear?: () => void;
}

export const FileDrop = ({ accept = ".pdf,.docx", onFile, uploading, fileName, onClear }: FileDropProps) => {
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }, [onFile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
  };

  if (fileName) {
    return (
      <div
        className="flex items-center gap-3 p-4 rounded-lg"
        style={{ background: "hsl(var(--bg-surface2))", border: "1px solid hsl(var(--border-default))", borderRadius: 8 }}
      >
        <FileText size={18} style={{ color: "hsl(var(--accent))" }} />
        <span className="flex-1 text-sm truncate" style={{ color: "hsl(var(--text-primary))", fontFamily: "'DM Sans'" }}>
          {fileName}
        </span>
        {uploading ? (
          <Loader2 size={16} className="animate-spin" style={{ color: "hsl(var(--text-muted))" }} />
        ) : onClear ? (
          <button onClick={onClear} className="p-1 rounded transition-all duration-150" style={{ color: "hsl(var(--text-muted))" }}>
            <X size={14} />
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className="flex flex-col items-center justify-center gap-2 p-6 rounded-lg cursor-pointer transition-all duration-150"
      style={{
        background: dragOver ? "hsl(var(--bg-surface3))" : "hsl(var(--bg-surface1))",
        border: `1px dashed ${dragOver ? "hsl(var(--accent))" : "hsl(var(--border-strong))"}`,
        borderRadius: 8,
      }}
    >
      <Upload size={24} style={{ color: dragOver ? "hsl(var(--accent))" : "hsl(var(--text-muted))" }} />
      <p className="text-xs text-center" style={{ color: "hsl(var(--text-muted))", fontFamily: "'DM Sans'" }}>
        Arraste um arquivo PDF ou DOCX aqui, ou clique para selecionar
      </p>
      <input type="file" accept={accept} onChange={handleChange} className="hidden" />
    </label>
  );
};
