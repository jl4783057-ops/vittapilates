import fs from "fs";
import path from "path";
import type { PublicationStatus } from "../../types";

interface StatusOverrides {
  categories: Record<string, PublicationStatus>;
  subcategories: Record<string, PublicationStatus>;
}

const STORE_PATH = path.join(process.cwd(), ".data", "publication-status.json");

function readStore(): StatusOverrides {
  try {
    if (!fs.existsSync(STORE_PATH)) {
      return { categories: {}, subcategories: {} };
    }
    const raw = fs.readFileSync(STORE_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return {
      categories: parsed.categories && typeof parsed.categories === "object" ? parsed.categories : {},
      subcategories: parsed.subcategories && typeof parsed.subcategories === "object" ? parsed.subcategories : {},
    };
  } catch {
    return { categories: {}, subcategories: {} };
  }
}

function writeStore(data: StatusOverrides) {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.warn("Aviso ao salvar fallback de status:", err);
  }
}

export function getStatusOverride(type: "categories" | "subcategories", id: string): PublicationStatus | undefined {
  const store = readStore();
  return store[type]?.[id];
}

export function setStatusOverride(type: "categories" | "subcategories", id: string, status: PublicationStatus) {
  const store = readStore();
  if (!store[type]) store[type] = {};
  store[type][id] = status;
  writeStore(store);
}

export function deleteStatusOverride(type: "categories" | "subcategories", id: string) {
  const store = readStore();
  if (store[type] && store[type][id]) {
    delete store[type][id];
    writeStore(store);
  }
}
