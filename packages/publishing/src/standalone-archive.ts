import type { StandaloneBundleFile, StandaloneBundleManifest } from "./index.js";

const ZIP_VERSION = 20;
const ZIP_METHOD_STORE = 0;
const DOS_EPOCH_DATE = (1 << 5) | 1;
const DOS_EPOCH_TIME = 0;
const LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50;
const CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;
const END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50;

interface EncodedZipFile {
  path: string;
  pathBytes: Uint8Array;
  contents: Uint8Array;
  crc32: number;
}

interface CentralDirectoryRecord {
  file: EncodedZipFile;
  localHeaderOffset: number;
}

export function createStandaloneBundleArchive(bundle: StandaloneBundleManifest): Uint8Array {
  const files = encodeBundleFiles(bundle.files);
  return createArchiveFromEncodedFiles(files);
}

export interface ArchiveTextFile {
  path: string;
  contents: string;
}

export function createTextFileArchive(files: ArchiveTextFile[]): Uint8Array {
  return createArchiveFromEncodedFiles(encodeBundleFiles(files));
}

function createArchiveFromEncodedFiles(files: EncodedZipFile[]): Uint8Array {
  const localSections: Uint8Array[] = [];
  const centralRecords: CentralDirectoryRecord[] = [];
  let localOffset = 0;

  for (const file of files) {
    const localHeader = createLocalFileHeader(file);
    localSections.push(localHeader, file.contents);
    centralRecords.push({ file, localHeaderOffset: localOffset });
    localOffset += localHeader.length + file.contents.length;
  }

  const centralSections = centralRecords.map(createCentralDirectoryRecord);
  const centralDirectorySize = sumSectionLengths(centralSections);
  const endRecord = createEndOfCentralDirectoryRecord(files.length, centralDirectorySize, localOffset);
  return concatenateSections([...localSections, ...centralSections, endRecord]);
}

function encodeBundleFiles(files: Array<{ path: string; contents: string }>): EncodedZipFile[] {
  const seenPaths = new Set<string>();
  return files.map((file) => encodeBundleFile(file, seenPaths));
}

function encodeBundleFile(file: { path: string; contents: string }, seenPaths: Set<string>): EncodedZipFile {
  const path = normalizeZipPath(file.path);
  if (!path) {
    throw new Error("Standalone bundle contains a file with an empty path.");
  }
  if (seenPaths.has(path)) {
    throw new Error(`Standalone bundle contains duplicate path '${path}'.`);
  }

  seenPaths.add(path);
  const pathBytes = encodeUtf8(path);
  const contents = encodeUtf8(file.contents);
  return {
    path,
    pathBytes,
    contents,
    crc32: calculateCrc32(contents)
  };
}

function normalizeZipPath(path: string): string {
  return path.replaceAll("\\", "/").replace(/^\/+/, "");
}

function createLocalFileHeader(file: EncodedZipFile): Uint8Array {
  const bytes = new Uint8Array(30 + file.pathBytes.length);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, LOCAL_FILE_HEADER_SIGNATURE, true);
  view.setUint16(4, ZIP_VERSION, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, ZIP_METHOD_STORE, true);
  view.setUint16(10, DOS_EPOCH_TIME, true);
  view.setUint16(12, DOS_EPOCH_DATE, true);
  view.setUint32(14, file.crc32, true);
  view.setUint32(18, file.contents.length, true);
  view.setUint32(22, file.contents.length, true);
  view.setUint16(26, file.pathBytes.length, true);
  view.setUint16(28, 0, true);
  bytes.set(file.pathBytes, 30);
  return bytes;
}

function createCentralDirectoryRecord(record: CentralDirectoryRecord): Uint8Array {
  const { file, localHeaderOffset } = record;
  const bytes = new Uint8Array(46 + file.pathBytes.length);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, CENTRAL_DIRECTORY_SIGNATURE, true);
  view.setUint16(4, ZIP_VERSION, true);
  view.setUint16(6, ZIP_VERSION, true);
  view.setUint16(8, 0, true);
  view.setUint16(10, ZIP_METHOD_STORE, true);
  view.setUint16(12, DOS_EPOCH_TIME, true);
  view.setUint16(14, DOS_EPOCH_DATE, true);
  view.setUint32(16, file.crc32, true);
  view.setUint32(20, file.contents.length, true);
  view.setUint32(24, file.contents.length, true);
  view.setUint16(28, file.pathBytes.length, true);
  view.setUint16(30, 0, true);
  view.setUint16(32, 0, true);
  view.setUint16(34, 0, true);
  view.setUint16(36, 0, true);
  view.setUint32(38, 0, true);
  view.setUint32(42, localHeaderOffset, true);
  bytes.set(file.pathBytes, 46);
  return bytes;
}

function createEndOfCentralDirectoryRecord(
  fileCount: number,
  centralDirectorySize: number,
  centralDirectoryOffset: number
): Uint8Array {
  const bytes = new Uint8Array(22);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, END_OF_CENTRAL_DIRECTORY_SIGNATURE, true);
  view.setUint16(4, 0, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, fileCount, true);
  view.setUint16(10, fileCount, true);
  view.setUint32(12, centralDirectorySize, true);
  view.setUint32(16, centralDirectoryOffset, true);
  view.setUint16(20, 0, true);
  return bytes;
}

function sumSectionLengths(sections: Uint8Array[]): number {
  return sections.reduce((total, section) => total + section.length, 0);
}

function concatenateSections(sections: Uint8Array[]): Uint8Array {
  const output = new Uint8Array(sumSectionLengths(sections));
  let offset = 0;

  for (const section of sections) {
    output.set(section, offset);
    offset += section.length;
  }

  return output;
}

function calculateCrc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc = updateCrc32(crc, byte);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function updateCrc32(crc: number, byte: number): number {
  let next = crc ^ byte;

  for (let bit = 0; bit < 8; bit += 1) {
    next = (next & 1) !== 0 ? (next >>> 1) ^ 0xedb88320 : (next >>> 1);
  }

  return next >>> 0;
}

function encodeUtf8(value: string): Uint8Array {
  const escaped = unescape(encodeURIComponent(value));
  const bytes = new Uint8Array(escaped.length);

  for (let index = 0; index < escaped.length; index += 1) {
    bytes[index] = escaped.charCodeAt(index);
  }

  return bytes;
}
