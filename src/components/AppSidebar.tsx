import { NavLink, useLocation } from "react-router-dom";
import {
  Upload,
  Settings,
  FolderOpen,
  Folder,
  ChevronLeft,
  ChevronRight,
  Home as HomeIcon,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const navigationItems = [
  { title: "Home", url: "/", icon: HomeIcon },
  { title: "Upload", url: "/upload", icon: Upload },
  { title: "Pastas", url: "/folders", icon: Folder },
  { title: "Configurações", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { open, setOpen } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path || currentPath.startsWith(path + "/");

  const getNavClasses = (path: string) => {
    const active = isActive(path);
    return active
      ? "bg-primary/10 text-primary border-r-2 border-primary font-semibold"
      : "text-muted-foreground hover:text-foreground hover:bg-accent/50";
  };

  return (
    <div className="relative">
      <Sidebar className="border-r border-border bg-card/30 backdrop-blur-sm" collapsible="icon">
        <SidebarHeader className="border-b border-border px-6 py-6">
          <motion.div 
            className="flex items-center gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="w-8 h-8 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-md">
              <FolderOpen className="w-4 h-4 text-white" />
            </div>
            {open && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                <h1 className="text-lg font-bold text-foreground">DocFlow</h1>
                <p className="text-xs text-muted-foreground">
                  Gestão Jurídica
                </p>
              </motion.div>
            )}
          </motion.div>
        </SidebarHeader>

        <SidebarContent className="px-3 py-4">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {navigationItems.map((item, index) => (
                  <SidebarMenuItem key={item.title}>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                      <SidebarMenuButton
                        asChild
                        size="lg"
                        className="transition-all duration-200 hover:scale-[1.02] rounded-2xl"
                      >
                        <NavLink
                          to={item.url}
                          className={`flex items-center gap-3 rounded-2xl transition-all duration-200 ${getNavClasses(
                            item.url
                          )}`}
                        >
                          <item.icon className="w-5 h-5 flex-shrink-0" />
                          <span className="font-medium group-data-[collapsible=icon]:hidden truncate">
                            {item.title}
                          </span>
                        </NavLink>
                      </SidebarMenuButton>
                    </motion.div>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

      </Sidebar>

      <Button
        variant="outline"
        size="icon"
        onClick={() => setOpen(!open)}
        className="absolute right-2 top-6 z-10 w-6 h-6 rounded-full border-2 bg-background shadow-lg hover:shadow-xl transition-all duration-200"
      >
        <motion.div
          animate={{ rotate: open ? 0 : 180 }}
          transition={{ duration: 0.2 }}
        >
          {open ? (
            <ChevronLeft className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
        </motion.div>
      </Button>
    </div>
  );
}