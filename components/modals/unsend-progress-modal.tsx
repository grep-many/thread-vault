import { useEffect, useRef, useCallback, memo } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  Animated,
  ScrollView,
} from "react-native";
import { FontAwesome6 } from "@expo/vector-icons";
import { useUnsendQueue } from "@/hooks/unsend/use-unsend-queue";
import { UnsendJob } from "@/lib/instagram/ig-unsend"; // Adjust import as necessary, or skip if UnsendJob is globally typed. Assuming UnsendJob is defined.

interface UnsendProgressModalProps {
  isVisible: boolean;
  onDismiss: () => void;
  onComplete?: (successCount: number, failureCount: number) => void;
}

const AUTO_CLOSE_DELAY_MS = 1800;

// ─── Atomic selectors ─────────────────────────────────────────────────────────

const selectIsRunning = (s: ReturnType<typeof useUnsendQueue.getState>) => s.isRunning;
const selectIsDone = (s: ReturnType<typeof useUnsendQueue.getState>) => s.isDone;
const selectJobs = (s: ReturnType<typeof useUnsendQueue.getState>) => s.jobs;
const selectCurrentItemId = (s: ReturnType<typeof useUnsendQueue.getState>) => s.currentItemId;
const selectSuccessCount = (s: ReturnType<typeof useUnsendQueue.getState>) => s.successCount;
const selectFailureCount = (s: ReturnType<typeof useUnsendQueue.getState>) => s.failureCount;
const selectIsCancelled = (s: ReturnType<typeof useUnsendQueue.getState>) => s.isCancelled;
const selectIsCoolingDown = (s: ReturnType<typeof useUnsendQueue.getState>) => s.isCoolingDown;
const selectCooldownTimeLeft = (s: ReturnType<typeof useUnsendQueue.getState>) => s.cooldownTimeLeft;
const selectCancel = (s: ReturnType<typeof useUnsendQueue.getState>) => s.cancel;
const selectReset = (s: ReturnType<typeof useUnsendQueue.getState>) => s.reset;

// ─── Sub-components ───────────────────────────────────────────────────────────

interface JobRowProps {
  job: any; // Using any or UnsendJob
  currentItemId: string | null;
  isCoolingDown: boolean;
}

const JobRow = memo(function JobRow({ job, currentItemId, isCoolingDown }: JobRowProps) {
  const isProcessing = job.status === "processing";
  const isCurrent = job.itemId === currentItemId && isProcessing;

  return (
    <View className="flex-row items-center border-b border-zinc-800 py-1.5">
      <View className="w-6 items-center">
        {job.status === "success" ? (
          <FontAwesome6 name="circle-check" size={14} color="#22c55e" />
        ) : job.status === "failed" ? (
          <FontAwesome6 name="circle-xmark" size={14} color="#ef4444" />
        ) : isProcessing ? (
          <FontAwesome6
            name="rotate"
            size={14}
            color={isCoolingDown ? "#f59e0b" : "#ec4899"}
          />
        ) : (
          <View className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
        )}
      </View>
      <Text className="ml-2 flex-1 font-mono text-[11px] text-zinc-500" numberOfLines={1}>
        {job.itemId}
      </Text>
      {isCurrent && (
        <View
          className={`rounded px-1.5 py-0.5 ${
            isCoolingDown ? "bg-amber-500" : "bg-pink-500"
          }`}
        >
          <Text className="text-[9px] font-bold text-white">
            {isCoolingDown ? "Waiting" : "Now"}
          </Text>
        </View>
      )}
    </View>
  );
});

// ─── Main modal ───────────────────────────────────────────────────────────────

export const UnsendProgressModal = memo(function UnsendProgressModal({
  isVisible,
  onDismiss,
  onComplete,
}: UnsendProgressModalProps) {
  const isRunning = useUnsendQueue(selectIsRunning);
  const isDone = useUnsendQueue(selectIsDone);
  const jobs = useUnsendQueue(selectJobs);
  const currentItemId = useUnsendQueue(selectCurrentItemId);
  const successCount = useUnsendQueue(selectSuccessCount);
  const failureCount = useUnsendQueue(selectFailureCount);
  const isCancelled = useUnsendQueue(selectIsCancelled);
  const isCoolingDown = useUnsendQueue(selectIsCoolingDown);
  const cooldownTimeLeft = useUnsendQueue(selectCooldownTimeLeft);
  const cancel = useUnsendQueue(selectCancel);
  const reset = useUnsendQueue(selectReset);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(300)).current;
  const autoCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const total = jobs.length;
  const completed = successCount + failureCount;
  const progressRatio = total > 0 ? completed / total : 0;

  useEffect(() => {
    Animated.spring(progressAnim, {
      toValue: progressRatio,
      useNativeDriver: false,
      tension: 60,
      friction: 10,
    }).start();
  }, [progressRatio, progressAnim]);

  useEffect(() => {
    if (isVisible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }).start();
    } else {
      slideAnim.setValue(300);
    }
  }, [isVisible, slideAnim]);

  useEffect(() => {
    if (isDone && isVisible) {
      autoCloseTimer.current = setTimeout(() => {
        onComplete?.(successCount, failureCount);
        onDismiss();
        setTimeout(() => reset(), 400);
      }, AUTO_CLOSE_DELAY_MS);
    }
    return () => {
      if (autoCloseTimer.current) clearTimeout(autoCloseTimer.current);
    };
  }, [isDone, isVisible, successCount, failureCount, onComplete, onDismiss, reset]);

  const handleCancel = useCallback(() => {
    if (isRunning) {
      cancel();
    } else {
      onComplete?.(successCount, failureCount);
      onDismiss();
      setTimeout(() => reset(), 400);
    }
  }, [isRunning, cancel, onDismiss, onComplete, successCount, failureCount, reset]);

  const progressBarWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const progressFillColor =
    isDone && !isCancelled ? "#22c55e" : isCoolingDown ? "#f59e0b" : "#ec4899";

  const headerIcon =
    isDone && !isCancelled ? "circle-check" : isCoolingDown ? "hourglass-half" : "trash-can";

  const statusLabel = isDone
    ? isCancelled
      ? "Cancelled"
      : "Complete!"
    : isCoolingDown
    ? `Rate Limited. Cooling down (${cooldownTimeLeft}s)…`
    : isRunning
    ? `Unsending ${completed + 1} of ${total}…`
    : "Preparing…";

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleCancel}
    >
      <Pressable
        className="absolute inset-0 bg-black/50"
        onPress={isDone || isCancelled ? handleCancel : undefined}
      />

      <Animated.View
        className="absolute bottom-0 left-0 right-0 min-h-[320px] rounded-t-3xl bg-zinc-900 px-6 pb-9 pt-3"
        style={{ transform: [{ translateY: slideAnim }], maxHeight: "75%" }}
      >
        <View className="mb-5 h-1 w-10 self-center rounded-full bg-zinc-700" />

        <View className="mb-5 flex-row items-center">
          <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-zinc-800">
            <FontAwesome6
              name={headerIcon}
              size={20}
              color={progressFillColor}
            />
          </View>
          <View className="flex-1">
            <Text className="text-[17px] font-bold tracking-[-0.3px] text-zinc-50">
              {isDone && !isCancelled ? "Unsend Complete" : "Unsending Messages"}
            </Text>
            <Text className="mt-0.5 text-[13px] text-zinc-400">{statusLabel}</Text>
          </View>
        </View>

        <View className="mb-3 h-2 overflow-hidden rounded-full bg-zinc-800">
          <Animated.View
            className="h-full rounded-full"
            style={{ width: progressBarWidth, backgroundColor: progressFillColor }}
          />
        </View>

        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-[13px] font-semibold text-zinc-500">
            {completed} / {total}
          </Text>
          <View className="flex-row gap-2">
            <View className="flex-row items-center gap-1 rounded-full bg-green-100/10 px-2 py-0.5">
              <FontAwesome6 name="check" size={9} color="#16a34a" />
              <Text className="text-[11px] font-bold text-green-600">{successCount}</Text>
            </View>
            {failureCount > 0 && (
              <View className="flex-row items-center gap-1 rounded-full bg-red-100/10 px-2 py-0.5">
                <FontAwesome6 name="xmark" size={9} color="#dc2626" />
                <Text className="text-[11px] font-bold text-red-600">{failureCount}</Text>
              </View>
            )}
          </View>
        </View>

        <ScrollView
          className="mb-5 max-h-40"
          contentContainerStyle={{ paddingBottom: 4 }}
          showsVerticalScrollIndicator={false}
        >
          {jobs.map((job) => (
            <JobRow
              key={job.itemId}
              job={job}
              currentItemId={currentItemId}
              isCoolingDown={isCoolingDown}
            />
          ))}
        </ScrollView>

        {!isDone && (
          <Pressable
            onPress={handleCancel}
            className="items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-800 py-3.5 active:opacity-70"
          >
            <Text className="text-[15px] font-semibold text-zinc-400">Cancel</Text>
          </Pressable>
        )}

        {isDone && (
          <Pressable
            onPress={handleCancel}
            className="items-center justify-center rounded-2xl bg-green-500 py-3.5 active:opacity-80"
          >
            <Text className="text-[15px] font-bold text-white">Dismiss</Text>
          </Pressable>
        )}
      </Animated.View>
    </Modal>
  );
});
