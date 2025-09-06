// Exportar todos os services
export { ClientService } from "./clientService";
export { CaseService } from "./caseService";
export { FolderService } from "./folderService";
export { DocumentService } from "./documentService";
export { PetitionService } from "./petitionService";
export { SettingsService } from "./settingsService";

// Importar para usar na classe
import { ClientService } from "./clientService";
import { CaseService } from "./caseService";
import { FolderService } from "./folderService";
import { DocumentService } from "./documentService";
import { PetitionService } from "./petitionService";
import { SettingsService } from "./settingsService";

// Service principal que combina todas as funcionalidades
export class ApiService {
  // Re-exportar métodos dos services individuais para manter compatibilidade
  static clients = ClientService;
  static cases = CaseService;
  static folders = FolderService;
  static documents = DocumentService;
  static petitions = PetitionService;
  static settings = SettingsService;
}

// Export default para compatibilidade
export default ApiService;