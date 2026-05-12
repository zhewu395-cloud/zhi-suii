import { openDB, type IDBPDatabase } from "idb";

export type Activity = {
  id: string;
  name: string;
  color?: string;
  createdAt: number;
};

export type TimeEntry = {
  id: string;
  activityId: string;
  activityName: string;
  startAt: number;
  endAt: number;
  duration: number; // ms
  note?: string;
};

export type Todo = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  done: boolean;
  createdAt: number;
};

export type Review = {
  id: string;
  type: "day" | "week" | "month";
  date: string; // anchor date YYYY-MM-DD
  content: string;
  createdAt: number;
};

const DB_NAME = "shiji-db";
const DB_VERSION = 1;

let _db: Promise<IDBPDatabase> | null = null;

export function getDB() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("IndexedDB only available in browser"));
  }
  if (!_db) {
    _db = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("activities")) {
          db.createObjectStore("activities", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("entries")) {
          const s = db.createObjectStore("entries", { keyPath: "id" });
          s.createIndex("startAt", "startAt");
        }
        if (!db.objectStoreNames.contains("todos")) {
          const s = db.createObjectStore("todos", { keyPath: "id" });
          s.createIndex("date", "date");
        }
        if (!db.objectStoreNames.contains("reviews")) {
          const s = db.createObjectStore("reviews", { keyPath: "id" });
          s.createIndex("date", "date");
        }
      },
    });
  }
  return _db;
}

export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export async function getAll<T>(store: string): Promise<T[]> {
  const db = await getDB();
  return db.getAll(store) as Promise<T[]>;
}

export async function put<T>(store: string, value: T) {
  const db = await getDB();
  await db.put(store, value);
}

export async function del(store: string, key: string) {
  const db = await getDB();
  await db.delete(store, key);
}

export async function exportAll() {
  const db = await getDB();
  const data: Record<string, unknown[]> = {};
  for (const name of Array.from(db.objectStoreNames)) {
    data[name] = await db.getAll(name);
  }
  return {
    app: "时迹",
    version: DB_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };
}

export async function importAll(json: any) {
  const db = await getDB();
  if (!json?.data) throw new Error("无效的备份文件");
  for (const name of Array.from(db.objectStoreNames)) {
    const tx = db.transaction(name, "readwrite");
    await tx.store.clear();
    const rows = (json.data[name] as any[]) || [];
    for (const r of rows) await tx.store.put(r);
    await tx.done;
  }
}
