import type { AdventurePackage } from "@acs/domain";
import type { RuntimeSnapshot } from "@acs/runtime-core";

export const CURRENT_RUNTIME_SAVE_SCHEMA_VERSION = "1.0.0";
const DATABASE_NAME = "acs-local";
const DATABASE_VERSION = 1;
const SAVE_STORE = "runtimeSaves";
const DRAFT_STORE = "drafts";

export interface RuntimeSaveRecord {
  id: string;
  label: string;
  adventureId: AdventurePackage["metadata"]["id"];
  adventureTitle: string;
  saveSchemaVersion: string;
  savedAt: string;
  snapshot: RuntimeSnapshot;
}

export interface DraftRecord<TValue = unknown> {
  key: string;
  updatedAt: string;
  value: TValue;
}

export interface SaveSessionInput {
  id: string;
  label: string;
  adventureId: AdventurePackage["metadata"]["id"];
  adventureTitle: string;
  snapshot: RuntimeSnapshot;
}

export interface LocalPersistence {
  saveSession(input: SaveSessionInput): Promise<RuntimeSaveRecord>;
  loadSession(id: string): Promise<RuntimeSaveRecord | undefined>;
  listSessions(adventureId?: AdventurePackage["metadata"]["id"]): Promise<RuntimeSaveRecord[]>;
  deleteSession(id: string): Promise<void>;
  putDraft<TValue>(key: string, value: TValue): Promise<DraftRecord<TValue>>;
  getDraft<TValue>(key: string): Promise<DraftRecord<TValue> | undefined>;
  deleteDraft(key: string): Promise<void>;
}

export function createIndexedDbPersistence(databaseName = DATABASE_NAME): LocalPersistence {
  return {
    async saveSession(input: SaveSessionInput): Promise<RuntimeSaveRecord> {
      const record: RuntimeSaveRecord = {
        id: input.id,
        label: input.label,
        adventureId: input.adventureId,
        adventureTitle: input.adventureTitle,
        saveSchemaVersion: CURRENT_RUNTIME_SAVE_SCHEMA_VERSION,
        savedAt: new Date().toISOString(),
        snapshot: structuredClone(input.snapshot)
      };

      await withStore(databaseName, SAVE_STORE, "readwrite", (store) => store.put(record));
      return record;
    },

    async loadSession(id: string): Promise<RuntimeSaveRecord | undefined> {
      const raw = await withStore(databaseName, SAVE_STORE, "readonly", (store) => store.get(id));
      return raw ? migrateRuntimeSaveRecord(raw) : undefined;
    },

    async listSessions(adventureId?: AdventurePackage["metadata"]["id"]): Promise<RuntimeSaveRecord[]> {
      const raw = await withStore(databaseName, SAVE_STORE, "readonly", (store) => store.getAll());
      const saves = raw.map((value) => migrateRuntimeSaveRecord(value));
      const filtered = adventureId ? saves.filter((save) => save.adventureId === adventureId) : saves;
      return filtered.sort((left, right) => right.savedAt.localeCompare(left.savedAt));
    },

    async deleteSession(id: string): Promise<void> {
      await withStore(databaseName, SAVE_STORE, "readwrite", (store) => store.delete(id));
    },

    async putDraft<TValue>(key: string, value: TValue): Promise<DraftRecord<TValue>> {
      const record: DraftRecord<TValue> = {
        key,
        updatedAt: new Date().toISOString(),
        value: structuredClone(value)
      };

      await withStore(databaseName, DRAFT_STORE, "readwrite", (store) => store.put(record));
      return record;
    },

    async getDraft<TValue>(key: string): Promise<DraftRecord<TValue> | undefined> {
      const raw = await withStore(databaseName, DRAFT_STORE, "readonly", (store) => store.get(key));
      return raw ? migrateDraftRecord<TValue>(raw) : undefined;
    },

    async deleteDraft(key: string): Promise<void> {
      await withStore(databaseName, DRAFT_STORE, "readwrite", (store) => store.delete(key));
    }
  };
}

export function migrateRuntimeSaveRecord(input: unknown): RuntimeSaveRecord {
  if (!isRecord(input)) {
    throw new Error("Runtime save record must be an object.");
  }

  const candidate = input as Partial<RuntimeSaveRecord>;
  if (candidate.saveSchemaVersion !== CURRENT_RUNTIME_SAVE_SCHEMA_VERSION) {
    throw new Error(`Unsupported runtime save schema version '${candidate.saveSchemaVersion ?? "unknown"}'.`);
  }

  if (!candidate.id || !candidate.savedAt || !candidate.snapshot || !candidate.adventureId || !candidate.adventureTitle) {
    throw new Error("Runtime save record is missing required fields.");
  }

  return candidate as RuntimeSaveRecord;
}

export function migrateDraftRecord<TValue>(input: unknown): DraftRecord<TValue> {
  if (!isRecord(input)) {
    throw new Error("Draft record must be an object.");
  }

  const candidate = input as Partial<DraftRecord<TValue>>;
  if (!candidate.key || !candidate.updatedAt || !("value" in candidate)) {
    throw new Error("Draft record is missing required fields.");
  }

  return candidate as DraftRecord<TValue>;
}

async function withStore<TResult>(
  databaseName: string,
  storeName: string,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<TResult> | void
): Promise<TResult> {
  const database = await openDatabase(databaseName);

  return new Promise<TResult>((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const request = action(store);

    if (request) {
      request.onsuccess = () => {
        resolve(request.result);
      };
      request.onerror = () => {
        reject(request.error ?? new Error(`IndexedDB request failed in store '${storeName}'.`));
      };
      return;
    }

    transaction.oncomplete = () => resolve(undefined as TResult);
    transaction.onerror = () => reject(transaction.error ?? new Error(`IndexedDB transaction failed in store '${storeName}'.`));
  });
}

function openDatabase(databaseName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(SAVE_STORE)) {
        database.createObjectStore(SAVE_STORE, { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains(DRAFT_STORE)) {
        database.createObjectStore(DRAFT_STORE, { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error(`Failed to open IndexedDB database '${databaseName}'.`));
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
