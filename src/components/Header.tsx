import { Search, Plus, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface HeaderProps {
  onNewUpload?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  showUploadButton?: boolean;
}

export function Header({ 
  onNewUpload, 
  searchQuery = "", 
  onSearchChange = () => {}, 
  showUploadButton = false 
}: HeaderProps) {
  const { theme, setTheme } = useTheme();

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao fazer logout",
        description: "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <motion.header 
      className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-sm"
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-4 flex-1 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar documentos, clientes, Fatos..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 bg-muted/30 border-0 focus:bg-background focus:ring-2 focus:ring-primary/20 transition-all rounded-2xl"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {showUploadButton && onNewUpload && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              <Button
                onClick={onNewUpload}
                className="bg-gradient-primary hover:shadow-lg transition-all duration-200 hover:scale-[1.02] rounded-2xl"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Upload
              </Button>
            </motion.div>
          )}

          <Button
            variant="outline"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="hover:bg-muted/50 transition-colors rounded-2xl"
          >
            <motion.div
              animate={{ rotate: theme === "dark" ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </motion.div>
          </Button>

          <Button
            variant="outline"
            onClick={handleSignOut}
            className="hover:bg-muted/50 transition-colors rounded-2xl"
          >
            Sair
          </Button>
        </div>
      </div>
    </motion.header>
  );
}