import { Queue, type QueueOptions } from "bullmq";
import IORedis from "ioredis";
import { env } from "./env";

// Files BullMQ adossées à Valkey. VALKEY_URL = redis://:pass@valkey:6379
// (ioredis parse le requirepass depuis l'URL). maxRetriesPerRequest:null est REQUIS par BullMQ.
let _conn: IORedis | null = null;

export function connection(): IORedis {
  if (!_conn) {
    _conn = new IORedis(env().VALKEY_URL, { maxRetriesPerRequest: null });
  }
  return _conn;
}

export const QUEUE_NAMES = [
  "transcription",
  "minutes",
  "proposals",
  "embeddings",
  "render",
  "publish",
] as const;

export type QueueName = (typeof QUEUE_NAMES)[number];

const defaultJobOptions: QueueOptions["defaultJobOptions"] = {
  attempts: 5,
  backoff: { type: "exponential", delay: 2000 },
  removeOnComplete: 1000,
  // removeOnFail:false -> rétention des jobs échoués après épuisement des tentatives
  // (dead-letter de facto, rejouables). BullMQ n'a pas de DLQ native.
  removeOnFail: false,
};

const queues = new Map<QueueName, Queue>();

export function getQueue(name: QueueName): Queue {
  let q = queues.get(name);
  if (!q) {
    q = new Queue(name, { connection: connection(), defaultJobOptions });
    queues.set(name, q);
  }
  return q;
}
