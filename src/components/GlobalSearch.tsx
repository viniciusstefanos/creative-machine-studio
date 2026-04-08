import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Users, Zap, FileText, Image } from "lucide-react";

interface SearchResult {
  id: string;
  label: string;
  sublabel?: string;
  type: "client" | "activation" | "copy" | "asset";
  href: string;
}

export const GlobalSearch = () => {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  // Cmd+K shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    const term = `%${q}%`;

    const [clients, activations, copies, assets] = await Promise.all([
      supabase.from("clients").select("id, name").ilike("name", term).limit(5),
      supabase.from("activations").select("id, name, clients(name)").ilike("name", term).limit(5),
      supabase.from("copies").select("id, activation_id, hook, channel").ilike("hook", term).limit(5),
      supabase.from("assets").select("id, activation_id, name, category").or(`name.ilike.${term},category.ilike.${term}`).limit(5),
    ]);

    const items: SearchResult[] = [
      ...(clients.data || []).map((c: any) => ({
        id: c.id, label: c.name, type: "client" as const, href: `/clients/${c.id}`,
      })),
      ...(activations.data || []).map((a: any) => ({
        id: a.id, label: a.name, sublabel: a.clients?.name, type: "activation" as const, href: `/activations/${a.id}`,
      })),
      ...(copies.data || []).map((c: any) => ({
        id: c.id, label: c.hook || "Copy", sublabel: c.channel, type: "copy" as const,
        href: `/activations/${c.activation_id}/copies/${c.id}`,
      })),
      ...(assets.data || []).map((a: any) => ({
        id: a.id, label: a.name || a.category || "Peça", type: "asset" as const,
        href: `/activations/${a.activation_id}/assets/${a.id}`,
      })),
    ];
    setResults(items);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => search(query), 250);
    return () => clearTimeout(timeout);
  }, [query, search]);

  const iconMap = {
    client: Users,
    activation: Zap,
    copy: FileText,
    asset: Image,
  };

  const groupLabels: Record<string, string> = {
    client: "Clientes",
    activation: "Ativações",
    copy: "Copies",
    asset: "Peças",
  };

  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-hidden p-0 shadow-lg">
        <Command shouldFilter={false} className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          <CommandInput
            placeholder="Buscar clientes, ativações, copies, peças..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {query.length < 2 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Digite pelo menos 2 caracteres...
              </div>
            ) : results.length === 0 ? (
              <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
            ) : (
              Object.entries(grouped).map(([type, items]) => {
                const Icon = iconMap[type as keyof typeof iconMap];
                return (
                  <CommandGroup key={type} heading={groupLabels[type] || type}>
                    {items.map((item) => (
                      <CommandItem
                        key={`${item.type}-${item.id}`}
                        onSelect={() => {
                          navigate(item.href);
                          setOpen(false);
                          setQuery("");
                        }}
                        className="cursor-pointer"
                      >
                        <Icon size={14} className="mr-2 shrink-0" style={{ color: "hsl(var(--text-muted))" }} />
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.sublabel && (
                          <span className="text-[10px] ml-2" style={{ color: "hsl(var(--text-muted))", fontFamily: "'JetBrains Mono', monospace" }}>
                            {item.sublabel}
                          </span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                );
              })
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
};
