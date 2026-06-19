import { Worker, type Processor } from "bullmq";
import { workerConnection, WORKER_CONCURRENCY } from "./connection";
import { QUEUE_NAMES, type QueueName } from "../lib/queue";
import { transcribe } from "./handlers/transcribe";
import { generateMinutes } from "./handlers/generate-minutes";
import { proposeUpdates } from "./handlers/propose-updates";
import { embedSection } from "./handlers/embed-section";
import { renderPdf } from "./handlers/render-pdf";
import { publishChannel } from "./handlers/publish-channel";

// Un Worker par file. Chaque handler est un stub qui loggue et écrit l'état en base
// (sous withTenant). Les appels IA réels viendront remplacer ces stubs.
const HANDLERS: Record<QueueName, Processor> = {
  transcription: transcribe as Processor,
  minutes: generateMinutes as Processor,
  proposals: proposeUpdates as Processor,
  embeddings: embedSection as Processor,
  render: renderPdf as Processor,
  publish: publishChannel as Processor,
};

const workers = QUEUE_NAMES.map((name) => {
  const w = new Worker(name, HANDLERS[name], {
    connection: workerConnection,
    concurrency: WORKER_CONCURRENCY,
  });
  w.on("completed", (job) => console.log(`[${name}] completed job=${job.id}`));
  w.on("failed", (job, err) =>
    console.error(`[${name}] FAILED job=${job?.id} attempt=${job?.attemptsMade}`, err.message),
  );
  return w;
});

console.log(`worker up: ${QUEUE_NAMES.join(", ")}`);

async function shutdown() {
  console.log("worker draining...");
  await Promise.all(workers.map((w) => w.close()));
  await workerConnection.quit();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
