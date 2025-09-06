import { useState } from "react";
import { Search, Plus, Bell, Moon, Sun, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";

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
  const [notifications] = useState(2);

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
              placeholder="Buscar documentos, clientes, petições..."
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
            size="icon"
            className="hover:bg-muted/50 transition-colors relative rounded-2xl"
          >
            <Bell className="w-4 h-4" />
            {notifications > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                <Badge className="absolute -top-2 -right-2 w-5 h-5 p-0 text-xs bg-destructive hover:bg-destructive rounded-full">
                  {notifications}
                </Badge>
              </motion.div>
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="hover:bg-muted/50 transition-colors rounded-2xl"
              >
                <User className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-popover/95 backdrop-blur-sm rounded-2xl">
              <DropdownMenuItem className="cursor-pointer rounded-xl">
                <User className="w-4 h-4 mr-2" />
                Perfil
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer rounded-xl">
                <Bell className="w-4 h-4 mr-2" />
                Notificações
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive rounded-xl">
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.header>
  );
}