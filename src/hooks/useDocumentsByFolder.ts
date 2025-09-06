/**
 * Hook para buscar documentos por pasta
 */

import { useQuery } from "@tanstack/react-query";
import { DocumentFolderService } from "@/services/documentFolderService";
import { logger } from "@/lib/logger";

// Query keys
export const documentFolderKeys = {
  all: ["documents-by-folder"] as const,
  byFolder: (folderId: string) => [...documentFolderKeys.all, "folder", folderId] as const,
};

/**
 * Hook para buscar documentos de uma pasta específica
 */
export function useDocumentsByFolder(folderId: string | undefined) {
  return useQuery({
    queryKey: documentFolderKeys.byFolder(folderId || ''),
    queryFn: () => {
      if (!folderId) {
        return [];
      }
      return DocumentFolderService.getDocumentsByFolder(folderId);
    },
    enabled: !!folderId,
    staleTime: 30 * 1000, // 30 segundos
    onError: (error) => {
      logger.error('Failed to fetch documents by folder', error as Error, { folderId }, 'useDocumentsByFolder');
    },
  });
}
