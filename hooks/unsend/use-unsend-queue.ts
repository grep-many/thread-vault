import { create } from "zustand";
import { IGUnsendItem } from "@/lib/instagram/ig-unsend";
import { useSession } from "@/hooks/auth/use-session";
import { database } from "@/model";
import Media from "@/model/media";
import { Q } from "@nozbe/watermelondb";

/** 300 ms gap between API calls to avoid rate limiting */
const UNSEND_BATCH_DELAY_MS = 300;
const COOLDOWNS = [60000, 180000, 300000, 600000];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface UnsendQueueState {
  isRunning: boolean;
  isDone: boolean;
  jobs: UnsendJob[];
  currentItemId: string | null;
  successCount: number;
  failureCount: number;
  isCancelled: boolean;
  isCoolingDown: boolean;
  cooldownTimeLeft: number;
  // Actions
  startUnsend: (inputs: UnsendJobInput[]) => void;
  cancel: () => void;
  reset: () => void;
}

export const useUnsendQueue = create<UnsendQueueState>((set, get) => ({
  isRunning: false,
  isDone: false,
  jobs: [],
  currentItemId: null,
  successCount: 0,
  failureCount: 0,
  isCancelled: false,
  isCoolingDown: false,
  cooldownTimeLeft: 0,

  reset: () =>
    set({
      isRunning: false,
      isDone: false,
      jobs: [],
      currentItemId: null,
      successCount: 0,
      failureCount: 0,
      isCancelled: false,
      isCoolingDown: false,
      cooldownTimeLeft: 0,
    }),

  cancel: () => {
    set({ isCancelled: true });
  },

  startUnsend: (inputs: UnsendJobInput[]) => {
    if (get().isRunning) return;

    // Initialize job list
    const jobs: UnsendJob[] = inputs.map((input) => ({
      ...input,
      status: "pending",
    }));

    set({
      isRunning: true,
      isDone: false,
      jobs,
      currentItemId: null,
      successCount: 0,
      failureCount: 0,
      isCancelled: false,
      isCoolingDown: false,
      cooldownTimeLeft: 0,
    });

    // Run the queue asynchronously — non-blocking
    processQueue(get, set);
  },
}));

async function processQueue(
  get: () => UnsendQueueState,
  set: (partial: Partial<UnsendQueueState> | ((s: UnsendQueueState) => Partial<UnsendQueueState>)) => void,
) {
  const { sessionId, csrfToken, appId } = useSession.getState();

  if (!sessionId) {
    set({ isRunning: false, isDone: true });
    return;
  }

  const jobs = get().jobs;
  let cooldownIdx = 0;

  for (let i = 0; i < jobs.length; i++) {
    // Check for user-initiated cancellation
    if (get().isCancelled) break;

    const job = jobs[i];
    let success = false;

    while (!success && !get().isCancelled) {
      // Mark current item as processing
      set((state) => ({
        currentItemId: job.itemId,
        jobs: state.jobs.map((j) =>
          j.itemId === job.itemId ? { ...j, status: "processing" } : j,
        ),
      }));

      const result = await IGUnsendItem({
        sessionId,
        csrfToken: csrfToken || undefined,
        appId: appId || undefined,
        threadId: job.threadId,
        itemId: job.itemId,
      });

      if (result.success) {
        // Remove the item from the local database on success
        try {
          await database.write(async () => {
            const items = await database
              .get<Media>("media")
              .query(Q.where("item_id", job.itemId))
              .fetch();
            if (items.length > 0) {
              await database.batch(...items.map((item) => item.prepareDestroyPermanently()));
            }
          });
        } catch (dbErr) {
          console.error("[UnsendQueue] DB cleanup error:", dbErr);
        }

        set((state) => ({
          successCount: state.successCount + 1,
          jobs: state.jobs.map((j) =>
            j.itemId === job.itemId ? { ...j, status: "success" } : j,
          ),
        }));

        cooldownIdx = 0;
        success = true;

        if (i < jobs.length - 1 && !get().isCancelled) {
          await delay(Math.random() * (1200 - 600) + 600);
        }
      } else {
        const waitMs = COOLDOWNS[cooldownIdx] || 600000;
        let timeLeft = Math.floor(waitMs / 1000);

        set({ isCoolingDown: true, cooldownTimeLeft: timeLeft });

        // Wait in 1-second increments to update UI
        while (timeLeft > 0 && !get().isCancelled) {
          await delay(1000);
          timeLeft -= 1;
          set({ cooldownTimeLeft: timeLeft });
        }

        set({ isCoolingDown: false, cooldownTimeLeft: 0 });

        if (!get().isCancelled) {
          cooldownIdx = Math.min(cooldownIdx + 1, COOLDOWNS.length - 1);
        }
      }
    }
  }

  set({ isRunning: false, isDone: true, currentItemId: null });
}
