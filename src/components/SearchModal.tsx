import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Folder, FileText, Sparkles, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { SearchService } from "@/services/searchService";
import { useNavigate } from "react-router-dom";

interface SearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialQuery?: string;
}

export const SearchModal = ({ open, onOpenChange, initialQuery = "" }: SearchModalProps) => {
  const [query, setQuery] = useState(initialQuery);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) setQuery(initialQuery);
  }, [open, initialQuery]);

  const enabled = query.trim().length >= 2;

  const { data, isFetching } = useQuery({
    queryKey: ["global-search", query],
    queryFn: () => SearchService.searchAll(query.trim()),
    enabled,
  });

  const hasAny = !!data && (data.folders.length + data.documents.length + data.petitions.length + data.facts.length) > 0;

  const handleGoFolder = (id: string) => {
    onOpenChange(false);
    navigate(`/folders?folder=${id}`);
  };
  const handleGoDocument = (doc: { appProperties?: Record<string, string>; id: string }) => {
    const folderId = doc.appProperties?.folderId;
    onOpenChange(false);
    if (folderId) navigate(`/folders?folder=${folderId}`);
    else navigate(`/documents?doc=${doc.id}`);
  };
  const handleGoPetition = (id?: string) => {
    onOpenChange(false);
    navigate(`/petitions${id ? `?id=${id}` : ""}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>Buscar</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Busque por pasta, documento, Fato, título..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <ScrollArea className="max-h-96 pr-2">
            {!enabled && <p className="text-sm text-muted-foreground">Digite ao menos 2 caracteres…</p>}
            {enabled && isFetching && <p className="text-sm text-muted-foreground">Buscando…</p>}
            {enabled && !isFetching && !hasAny && (
              <p className="text-sm text-muted-foreground">Nenhum resultado.</p>
            )}

            {hasAny && (
              <div className="space-y-6">
                {data!.folders.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold mb-2 text-muted-foreground">Pastas</h3>
                    <div className="space-y-2">
                      {data!.folders.map((f) => (
                        <button key={f.id} onClick={() => handleGoFolder(f.id)} className="w-full text-left p-2 rounded hover:bg-muted/50 flex items-center gap-2">
                          <Folder className="w-4 h-4 shrink-0" />
                          <span className="flex-1 min-w-0 truncate">{f.name}</span>
                          <Badge variant="secondary" className="shrink-0 ml-2 text-xs truncate max-w-[50%]">{f.path}</Badge>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {data!.documents.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold mb-2 text-muted-foreground">Documentos</h3>
                    <div className="space-y-2">
                      {data!.documents.map((d) => {
                        const displayName = d.name
                          .replace(/^DOC\s*n\.?\s*\d+\s*\+\s*/i, "")
                          .replace(/_/g, " ")
                          .trim();
                        return (
                          <button key={d.id} onClick={() => handleGoDocument(d)} className="w-full text-left p-2 rounded hover:bg-muted/50 flex items-center gap-2">
                            <FileText className="w-4 h-4 shrink-0" />
                            <span className="flex-1 min-w-0 truncate">{displayName || d.name}</span>
                            <div className="ml-2 shrink-0 flex items-center gap-2">
                              {d.docNumber && <Badge variant="secondary" className="text-xs">{d.docNumber}</Badge>}
                              <Badge variant="outline" className="text-xs uppercase">{d.type}</Badge>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {data!.petitions.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold mb-2 text-muted-foreground">Fatos (títulos)</h3>
                    <div className="space-y-2">
                      {data!.petitions.map((p) => (
                        <button key={p.id} onClick={() => handleGoPetition(p.id)} className="w-full text-left p-2 rounded hover:bg-muted/50 flex items-center gap-2">
                          <Sparkles className="w-4 h-4 shrink-0" />
                          <span className="flex-1 min-w-0 truncate">{p.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {data!.facts.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold mb-2 text-muted-foreground">Fatos (trechos)</h3>
                    <div className="space-y-2">
                      {data!.facts.map((f) => (
                        <button key={f.id} onClick={() => handleGoPetition(f.petitionId)} className="w-full text-left p-2 rounded hover:bg-muted/50">
                          <span className="line-clamp-2 text-sm">{f.text}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};


