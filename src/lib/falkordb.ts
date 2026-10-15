import { FalkorDB } from "falkordb";

const globalForFalkor = globalThis as typeof globalThis & {
  falkorPromise?: Promise<FalkorDB>;
};

export function getFalkorDB(): Promise<FalkorDB> {
  if (!globalForFalkor.falkorPromise) {
    const host = process.env.FALKORDB_HOST;
    const password = process.env.FALKORDB_PASSWORD;

    if (!host || !password) {
      return Promise.reject(
        new Error("Database configuration missing")
      );
    }

    globalForFalkor.falkorPromise = FalkorDB.connect({
      socket: {
        host,
        port: Number(process.env.FALKORDB_PORT || 6379),
        tls: process.env.FALKORDB_TLS === "true",
        connectTimeout: 10000,
      },
      username: process.env.FALKORDB_USERNAME,
      password,
    }).catch((error) => {
      globalForFalkor.falkorPromise = undefined;
      throw error;
    });
  }

  return globalForFalkor.falkorPromise;
}
