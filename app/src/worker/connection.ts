import IORedis from "ioredis";
import { env } from "../lib/env";

// Connexion dédiée aux Workers (BRPOPLPUSH bloquant) — distincte de celle des Queues.
export const workerConnection = new IORedis(env().VALKEY_URL, { maxRetriesPerRequest: null });

export const WORKER_CONCURRENCY = 5;
