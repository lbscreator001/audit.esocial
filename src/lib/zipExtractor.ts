import JSZip from 'jszip';

export interface ExtractedFile {
  fileName: string;
  filePath: string;
  content: string;
}

export interface ZipExtractionResult {
  xmlFiles: ExtractedFile[];
  totalFilesInZip: number;
  extractionTimeMs: number;
}

const MAX_ZIP_SIZE_MB = 500;
const MAX_ZIP_SIZE_BYTES = MAX_ZIP_SIZE_MB * 1024 * 1024;

export function isZipFile(file: File): boolean {
  const zipExtensions = ['.zip'];
  const fileName = file.name.toLowerCase();
  return zipExtensions.some(ext => fileName.endsWith(ext));
}

export function isXmlFile(fileName: string): boolean {
  return fileName.toLowerCase().endsWith('.xml');
}

export function validateZipSize(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_ZIP_SIZE_BYTES) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `Arquivo ZIP muito grande (${sizeMB}MB). Limite maximo: ${MAX_ZIP_SIZE_MB}MB`
    };
  }
  return { valid: true };
}

export async function extractXmlsFromZip(
  file: File,
  onProgress?: (extracted: number, total: number) => void
): Promise<ZipExtractionResult> {
  const startTime = performance.now();

  const sizeValidation = validateZipSize(file);
  if (!sizeValidation.valid) {
    throw new Error(sizeValidation.error);
  }

  const arrayBuffer = await file.arrayBuffer();

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(arrayBuffer);
  } catch {
    throw new Error('Arquivo ZIP corrompido ou invalido');
  }

  const allFiles = Object.keys(zip.files);
  const xmlPaths = allFiles.filter(path => {
    const zipEntry = zip.files[path];
    return !zipEntry.dir && isXmlFile(path);
  });

  if (xmlPaths.length === 0) {
    throw new Error('Nenhum arquivo XML encontrado no ZIP');
  }

  const xmlFiles: ExtractedFile[] = [];
  let processed = 0;

  for (const path of xmlPaths) {
    const zipEntry = zip.files[path];
    const content = await zipEntry.async('string');

    const pathParts = path.split('/');
    const fileName = pathParts[pathParts.length - 1];

    xmlFiles.push({
      fileName,
      filePath: path,
      content
    });

    processed++;
    onProgress?.(processed, xmlPaths.length);
  }

  const endTime = performance.now();

  return {
    xmlFiles,
    totalFilesInZip: allFiles.length,
    extractionTimeMs: endTime - startTime
  };
}

export function getFileNameFromPath(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 1];
}
