// aiQueue.ts
// Manages a simple queue for AI requests per room.

type QueueTask = () => Promise<void>;

interface RoomQueue {
  isProcessing: boolean;
  tasks: { task: QueueTask; notify: () => void }[];
}

const queues = new Map<string, RoomQueue>();

export function enqueueAiRequest(roomId: string, task: QueueTask, notifyQueued: () => void) {
  let queue = queues.get(roomId);
  if (!queue) {
    queue = { isProcessing: false, tasks: [] };
    queues.set(roomId, queue);
  }

  if (queue.isProcessing) {
    // Notify the user that it's queued
    notifyQueued();
    queue.tasks.push({ task, notify: notifyQueued });
  } else {
    // Start immediately
    queue.isProcessing = true;
    executeNext(roomId, task);
  }
}

async function executeNext(roomId: string, task: QueueTask) {
  try {
    await task();
  } catch (error) {
    console.error(`[${roomId}] Error executing AI task:`, error);
  } finally {
    const queue = queues.get(roomId);
    if (queue) {
      if (queue.tasks.length > 0) {
        // Pop the next task and execute
        const next = queue.tasks.shift()!;
        executeNext(roomId, next.task);
      } else {
        queue.isProcessing = false;
      }
    }
  }
}
