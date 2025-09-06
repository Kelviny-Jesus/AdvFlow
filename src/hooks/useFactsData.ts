import { useQuery } from '@tanstack/react-query';
import { useFoldersReal } from './useFoldersReal';
import { useDocumentsByFolder } from './useDocumentsByFolder';
import { useCases } from './useCases';
import { useClients } from './useClients';

export const useFactsData = (selectedFolderId?: string) => {
  // Buscar pastas (clientes)
  const { data: folders = [], isLoading: foldersLoading } = useFoldersReal();
  
  // Buscar documentos da pasta selecionada
  const { data: documents = [], isLoading: documentsLoading } = useDocumentsByFolder(selectedFolderId);
  
  // Buscar casos
  const { data: cases = [], isLoading: casesLoading } = useCases();
  
  // Buscar clientes
  const { data: clients = [], isLoading: clientsLoading } = useClients();

  // Filtrar apenas pastas de clientes
  const clientFolders = folders.filter(f => f.kind === 'client');
  
  // Buscar subpastas da pasta selecionada
  const availableSubfolders = selectedFolderId 
    ? folders.filter(f => f.parentId === selectedFolderId)
    : [];
  
  // Buscar pasta selecionada
  const selectedFolder = folders.find(f => f.id === selectedFolderId);
  
  // Buscar casos do cliente selecionado
  const clientCases = selectedFolder 
    ? cases.filter(c => c.clientId === selectedFolder.clientId)
    : [];

  return {
    // Dados
    clientFolders,
    availableSubfolders,
    selectedFolder,
    documents,
    cases: clientCases,
    clients,
    
    // Estados de loading
    isLoading: foldersLoading || documentsLoading || casesLoading || clientsLoading,
    foldersLoading,
    documentsLoading,
    casesLoading,
    clientsLoading
  };
};
