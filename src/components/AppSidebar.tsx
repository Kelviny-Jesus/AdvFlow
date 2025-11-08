import { NavLink, useLocation } from "react-router-dom";
import {
  Upload,
  Settings,
  FolderOpen,
  Folder,
  BadgeCheck,
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
  // no collapse controls
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";

const navigationItems = [
  { title: "Upload", url: "/upload", icon: Upload },
  { title: "Pastas", url: "/folders", icon: Folder },
  { title: "Assinatura Eletrônica", url: "/signature", icon: BadgeCheck },
  { title: "Configurações", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { resolvedTheme, theme } = useTheme();
  const isDark = (resolvedTheme || theme) === 'dark';
  const logoSrc = isDark ? '/logo-dark.png' : '/logo.png';
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path || currentPath.startsWith(path + "/");

  const getNavClasses = (path: string) => {
    const active = isActive(path);
    return active
      ? "bg-primary/10 text-primary font-semibold"
      : "text-muted-foreground hover:text-foreground hover:bg-accent/50";
  };

  return (
    <div className="relative">
      <Sidebar className="border-r border-border bg-card/30 backdrop-blur-sm" collapsible="none">
        <SidebarHeader className="border-b border-border px-4 py-6">
          <motion.div 
            className="flex items-center justify-center w-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <NavLink to="/" aria-label="Início" className="rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/50">
              <div className="rounded-2xl overflow-hidden cursor-pointer bg-transparent w-32 h-22 flex items-center justify-center">
                <img src={logoSrc} alt="AdvFlow" className="w-full h-full object-contain" draggable={false} />
              </div>
            </NavLink>
          </motion.div>
        </SidebarHeader>

        <SidebarContent className="px-0 py-0">
          <SidebarGroup className="p-0">
            <SidebarGroupContent>
              <SidebarMenu className="gap-0 w-full">
                {navigationItems.map((item, index) => (
                  <SidebarMenuItem key={item.title} className="w-full">
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                      <SidebarMenuButton
                        asChild
                        size="lg"
                        className="rounded-none h-16 w-full"
                      >
                        <NavLink
                          to={item.url}
                          className={`flex items-center gap-3 px-6 w-full transition-all duration-200 ${getNavClasses(
                            item.url
                          )}`}
                        >
                          <item.icon className="w-6 h-6 flex-shrink-0" />
                          <span className="font-medium text-[15px] truncate">
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

      
    </div>
  );
}