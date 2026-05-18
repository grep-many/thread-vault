import { create } from "zustand";
import { IGUnsendItem } from "@/lib/instagram/ig-unsend";
import { useSession } from "@/hooks/auth/use-session";
import { database } from "@/model";
import Media from "@/model/media";
import { Q } from "@nozbe/watermelondb";

const UNSEND_BATCH_DELAY_MS = { min: 600, max: 1200 } as const;
const COOLDOWNS = [60_000, 180_000, 300_000, 600_000] as const;
const MAX_COOLDOWN = 600_000;

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const randomDelay = () =>
  delay(
    Math.random() * (UNSEND_BATCH_DELAY_MS.max - UNSEND_BATCH_DELAY_MS.min) +
      UNSEND_BATCH_DELAY_MS.min,
  );

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
  startUnsend: (inputs: UnsendJobInput[]) => void;
  cancel: () => void;
  reset: () => void;
}

const RESET_STATE: Omit<UnsendQueueState, "startUnsend" | "cancel" | "reset"> = {
  isRunning: false,
  isDone: false,
  jobs: [],
  currentItemId: null,
  successCount: 0,
  failureCount: 0,
  isCancelled: false,
  isCoolingDown: false,
  cooldownTimeLeft: 0,
};

export const useUnsendQueue = create<UnsendQueueState>((set, get) => ({
  ...RESET_STATE,

  reset: () => set(RESET_STATE),

  cancel: () => set({ isCancelled: true }),

  startUnsend: (inputs) => {
    if (get().isRunning) return;

    const jobs: UnsendJob[] = inputs.map((input) => ({ ...input, status: "pending" }));

    set({
      ...RESET_STATE,
      isRunning: true,
      jobs,
    });

    processQueue(get, set);
  },
}));

type SetFn = (
  partial: Partial<UnsendQueueState> | ((s: UnsendQueueState) => Partial<UnsendQueueState>),
) => void;

async function processQueue(get: () => UnsendQueueState, set: SetFn) {
  const { sessionId, csrfToken, appId } = useSession.getState();

  if (!sessionId) {
    set({ isRunning: false, isDone: true });
    return;
  }

  const csrfResolved = csrfToken ?? undefined;
  const appIdResolved = appId ?? undefined;

  const jobs = get().jobs;
  let cooldownIdx = 0;

  for (let i = 0; i < jobs.length; i++) {
    if (get().isCancelled) break;

    const job = jobs[i];
    let success = false;

    while (!success && !get().isCancelled) {
      set((state) => ({
        currentItemId: job.itemId,
        jobs: state.jobs.map((j) =>
          j.itemId === job.itemId ? { ...j, status: "processing" } : j,
        ),
      }));

      const result = await IGUnsendItem({
        sessionId,
        csrfToken: csrfResolved,
        appId: appIdResolved,
        threadId: job.threadId,
        itemId: job.itemId,
      });

      if (result.success) {
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
        } catch {
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
          await randomDelay();
        }
      } else {
        const waitMs = COOLDOWNS[cooldownIdx] ?? MAX_COOLDOWN;
        let timeLeft = Math.floor(waitMs / 1000);

        set({ isCoolingDown: true, cooldownTimeLeft: timeLeft });

        while (timeLeft > 0 && !get().isCancelled) {
          await delay(1_000);
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
