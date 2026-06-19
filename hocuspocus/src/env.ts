// Configuration du serveur de co-édition. AUTH_SECRET est partagé avec l'app (mêmes JWT).
export interface HocuspocusEnv {
  PORT: number;
  AUTH_SECRET: string;
  DATABASE_URL: string | undefined;
}

let cached: HocuspocusEnv | null = null;

export function env(): HocuspocusEnv {
  if (!cached) {
    const AUTH_SECRET = process.env.AUTH_SECRET;
    if (!AUTH_SECRET || AUTH_SECRET.length < 16) {
      throw new Error("AUTH_SECRET manquant ou trop court (>= 16 caractères)");
    }
    cached = {
      PORT: Number(process.env.PORT ?? 1234),
      AUTH_SECRET,
      DATABASE_URL: process.env.DATABASE_URL,
    };
  }
  return cached;
}
