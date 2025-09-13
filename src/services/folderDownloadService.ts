import { FolderService } from "@/services/folderService";
import { DocumentFolderService } from "@/services/documentFolderService";
import { DocumentService } from "@/services/documentService";
import type { FolderItem, FileItem } from "@/types";
import { logger } from "@/lib/logger";

// Dynamic ESM import to avoid adding a build dependency
const loadFflate = async () => import("https://esm.sh/fflate@0.8.1");

const sanitizePath = (name: string) => name.replace(/[^a-zA-Z0-9-_\.]/g, "_");

export class FolderDownloadService {
  static async downloadFolderAsZip(folder: FolderItem): Promise<void> {
    try {
      const basePath = folder.path;
      const { files, folders } = await this.collectTree(folder);

      // Fetch all documents as ArrayBuffer with their relative paths
      const entries: Array<{ path: string; data: Uint8Array }> = [];
      for (const file of files) {
        const relativeFolder = this.resolveRelativeFolderPath(basePath, file);
        const fileName = sanitizePath(file.name);
        const signed = await DocumentService.getDownloadUrl(file.id, 60 * 10, fileName);
        const res = await fetch(signed);
        const buf = new Uint8Array(await res.arrayBuffer());
        const fullPath = relativeFolder ? `${relativeFolder}/${fileName}` : fileName;
        entries.push({ path: fullPath, data: buf });
      }

      // Build zip
      const fflate = await loadFflate();
      const filesObj: Record<string, Uint8Array> = {};
      for (const e of entries) filesObj[e.path] = e.data;
      const zipped = fflate.zipSync(filesObj, { level: 6 });

      const blob = new Blob([zipped], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${sanitizePath(folder.name)}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      logger.error("Failed to download folder as zip", error as Error, { folderId: folder.id }, "FolderDownloadService");
      throw error;
    }
  }

  private static resolveRelativeFolderPath(basePath: string, file: FileItem): string {
    // file is inside a folder; derive relative path from folder.path when available
    // We fetch the folder path via folderId later if needed; for now, try from appProperties
    // As we call with collected folders, we can match by folderId
    return this.currentTreePaths.get(file.folderId || "")?.replace(`${basePath}/`, "") || "";
  }

  private static currentTreePaths = new Map<string, string>();

  private static async collectTree(root: FolderItem): Promise<{ files: FileItem[]; folders: FolderItem[] }> {
    const files: FileItem[] = await DocumentFolderService.getDocumentsByFolder(root.id);
    const folders: FolderItem[] = [];
    this.currentTreePaths.set(root.id, root.path);

    const children = await FolderService.getFolders(root.id);
    for (const child of children) {
      folders.push(child);
      this.currentTreePaths.set(child.id, child.path);
      const sub = await this.collectTree(child);
      files.push(...sub.files);
      folders.push(...sub.folders);
    }
    return { files, folders };
  }
}


