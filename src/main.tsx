import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import App from "./App.tsx";
import "./index.css";

// Importar configurações melhoradas
import { queryClient } from "./lib/queryClient";
import { validateConfig, getEnvConfig } from "./lib/config";
import { logger } from "./lib/logger";

// Validar configurações na inicialização
const configValidation = validateConfig();
if (!configValidation.valid) {
  console.error("❌ Configuração inválida:", configValidation.errors);
}

// Log da configuração atual
const envConfig = getEnvConfig();
logger.info("🚀 Aplicação iniciando", envConfig, "Main");

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
    {import.meta.env.VITE_SHOW_RQ_DEVTOOLS === 'true' && (
      <ReactQueryDevtools initialIsOpen={false} />
    )}
  </QueryClientProvider>
);
