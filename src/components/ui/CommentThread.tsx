import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { MessageSquare, CheckCircle, Circle } from "lucide-react";

interface CommentThreadProps {
  entityType: "copy" | "asset";
  entityId: string;
}

interface Comment {
  id: string;
  body: string;
  user_id: string;
  parent_id: string | null;
  resolved: boolean;
  created_at: string;
  profiles?: { full_name: string; avatar_url: string } | null;
}

export const CommentThread = ({ entityType, entityId }: CommentThreadProps) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchComments = async () => {
    const { data } = await supabase
      .from("comments")
      .select("*")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("created_at", { ascending: true });
    setComments((data as Comment[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchComments(); }, [entityId]);

  const handleSubmit = async () => {
    if (!newComment.trim() || !user) return;
    setSubmitting(true);
    await supabase.from("comments").insert([{
      entity_type: entityType,
      entity_id: entityId,
      user_id: user.id,
      body: newComment,
      parent_id: replyTo,
    }]);
    setNewComment("");
    setReplyTo(null);
    await fetchComments();
    setSubmitting(false);
  };

  const toggleResolve = async (id: string, resolved: boolean) => {
    await supabase.from("comments").update({ resolved: !resolved }).eq("id", id);
    fetchComments();
  };

  const rootComments = comments.filter((c) => !c.parent_id);
  const getReplies = (parentId: string) => comments.filter((c) => c.parent_id === parentId);

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div>
      <SectionLabel>Comentários</SectionLabel>

      <div className="mt-4 space-y-3">
        {loading ? (
          <p className="text-xs" style={{ color: "hsl(var(--text-muted))" }}>Carregando...</p>
        ) : rootComments.length === 0 ? (
          <div className="p-4 rounded-lg text-center" style={{ background: "hsl(var(--bg-surface1))", border: "1px solid var(--border-default)", borderRadius: 8 }}>
            <MessageSquare size={20} className="mx-auto mb-2" style={{ color: "hsl(var(--text-muted))" }} />
            <p className="text-xs" style={{ color: "hsl(var(--text-muted))", fontFamily: "'DM Sans'" }}>Nenhum comentário</p>
          </div>
        ) : (
          rootComments.map((comment) => (
            <div key={comment.id}>
              <div
                className="p-3 rounded-lg"
                style={{
                  background: comment.resolved ? "hsl(var(--bg-base))" : "hsl(var(--bg-surface1))",
                  border: "1px solid var(--border-default)",
                  borderRadius: 8,
                  opacity: comment.resolved ? 0.6 : 1,
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs flex-1" style={{ color: "hsl(var(--text-primary))", fontFamily: "'DM Sans'" }}>
                    {comment.body}
                  </p>
                  <button
                    onClick={() => toggleResolve(comment.id, comment.resolved)}
                    title={comment.resolved ? "Reabrir" : "Resolver"}
                  >
                    {comment.resolved ? (
                      <CheckCircle size={14} style={{ color: "hsl(var(--status-approved))" }} />
                    ) : (
                      <Circle size={14} style={{ color: "hsl(var(--text-muted))" }} />
                    )}
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[9px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: "hsl(var(--text-muted))" }}>
                    {formatTime(comment.created_at)}
                  </span>
                  <button
                    onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                    className="text-[10px]"
                    style={{ fontFamily: "'DM Sans'", color: "hsl(var(--accent))" }}
                  >
                    Responder
                  </button>
                </div>
              </div>

              {/* Replies */}
              {getReplies(comment.id).map((reply) => (
                <div
                  key={reply.id}
                  className="ml-6 mt-2 p-3 rounded-lg"
                  style={{ background: "hsl(var(--bg-surface2))", border: "1px solid var(--border-subtle)", borderRadius: 8 }}
                >
                  <p className="text-xs" style={{ color: "hsl(var(--text-primary))", fontFamily: "'DM Sans'" }}>{reply.body}</p>
                  <span className="text-[9px] mt-1 block" style={{ fontFamily: "'JetBrains Mono', monospace", color: "hsl(var(--text-muted))" }}>
                    {formatTime(reply.created_at)}
                  </span>
                </div>
              ))}

              {/* Reply input */}
              {replyTo === comment.id && (
                <div className="ml-6 mt-2 flex gap-2">
                  <input
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    className="flex-1 px-3 py-2 text-xs outline-none"
                    style={{ background: "hsl(var(--bg-base))", border: "1px solid var(--border-strong)", color: "hsl(var(--text-primary))", fontFamily: "'DM Sans'", borderRadius: 6 }}
                    placeholder="Responder..."
                  />
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="px-3 py-2 text-xs font-medium rounded-md"
                    style={{ background: "hsl(var(--accent))", color: "hsl(var(--text-inverse))", borderRadius: 6 }}
                  >
                    Enviar
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* New comment (root) */}
      {!replyTo && (
        <div className="flex gap-2 mt-4">
          <input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            className="flex-1 px-3 py-2 text-xs outline-none"
            style={{ background: "hsl(var(--bg-base))", border: "1px solid var(--border-strong)", color: "hsl(var(--text-primary))", fontFamily: "'DM Sans'", borderRadius: 6 }}
            placeholder="Adicionar comentário..."
          />
          <button
            onClick={handleSubmit}
            disabled={submitting || !newComment.trim()}
            className="px-3 py-2 text-xs font-medium rounded-md disabled:opacity-50"
            style={{ background: "hsl(var(--accent))", color: "hsl(var(--text-inverse))", borderRadius: 6 }}
          >
            Enviar
          </button>
        </div>
      )}
    </div>
  );
};
