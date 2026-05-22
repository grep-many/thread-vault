import { useUnsendQueue } from "@/hooks/unsend/use-unsend-queue";
import { FontAwesome6 } from "@expo/vector-icons";
import { useShallow } from "zustand/react/shallow";
import { memo, useCallback, useEffect, useRef } from "react";
import { Animated, Modal, Pressable, ScrollView, Text, View } from "react-native";

interface UnsendProgressModalProps {
  isVisible: boolean;
  onDismiss: () => void;
  onComplete?: (successCount: number, failureCount: number) => void;
}

const AUTO_CLOSE_DELAY_MS = 1800;
const SCROLL_CONTENT_STYLE = { paddingBottom: 4 } as const;

// ─── Sub-component types ──────────────────────────────────────────────────────

interface JobRowProps {
  job: UnsendJob;
  currentItemId: string | null;
  isCoolingDown: boolean;
}

// ─── Stable class strings ─────────────────────────────────────────────────────

// Job row class strings

// ─── JobRow ───────────────────────────────────────────────────────────────────

const JobRow = memo(function JobRow({ job, currentItemId, isCoolingDown }: JobRowProps) {
  const isProcessing = job.status === "processing";
  const isCurrent = job.itemId === currentItemId && isProcessing;
  const badgeClass = isCoolingDown
    ? "rounded px-1.5 py-0.5 bg-amber-500"
    : "rounded px-1.5 py-0.5 bg-primary";

  return (
    <View className="border-border dark:border-dark-border flex-row items-center border-b py-1.5">
      <View className="w-[22px] items-center">
        {job.status === "success" ? (
          <FontAwesome6 name="circle-check" size={14} color="#22c55e" />
        ) : job.status === "failed" ? (
          <FontAwesome6 name="circle-xmark" size={14} color="#ef4444" />
        ) : isProcessing ? (
          <FontAwesome6 name="rotate" size={14} color={isCoolingDown ? "#f59e0b" : "#ec4899"} />
        ) : (
          <View className="bg-muted dark:bg-dark-muted h-2.5 w-2.5 rounded-full" />
        )}
      </View>
      <Text
        className="text-muted-foreground dark:text-dark-muted-foreground ml-2 flex-1 font-mono text-[11px]"
        numberOfLines={1}
      >
        {job.itemId}
      </Text>
      {isCurrent && (
        <View className={badgeClass}>
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
  const {
    isRunning,
    isDone,
    jobs,
    currentItemId,
    successCount,
    failureCount,
    isCancelled,
    isCoolingDown,
    cooldownTimeLeft,
    cancel,
    reset,
  } = useUnsendQueue(
    useShallow((s) => ({
      isRunning: s.isRunning,
      isDone: s.isDone,
      jobs: s.jobs,
      currentItemId: s.currentItemId,
      successCount: s.successCount,
      failureCount: s.failureCount,
      isCancelled: s.isCancelled,
      isCoolingDown: s.isCoolingDown,
      cooldownTimeLeft: s.cooldownTimeLeft,
      cancel: s.cancel,
      reset: s.reset,
    })),
  );

  const progressAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(300)).current;
  const autoCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const completionDataRef = useRef({ successCount, failureCount });
  completionDataRef.current = { successCount, failureCount };

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
        const { successCount: sc, failureCount: fc } = completionDataRef.current;
        onComplete?.(sc, fc);
        onDismiss();
        setTimeout(() => reset(), 400);
      }, AUTO_CLOSE_DELAY_MS);
    }
    return () => {
      if (autoCloseTimer.current) clearTimeout(autoCloseTimer.current);
    };
  }, [isDone, isVisible, onComplete, onDismiss, reset]);

  const handleCancel = useCallback(() => {
    if (isRunning) {
      cancel();
    } else {
      const { successCount: sc, failureCount: fc } = completionDataRef.current;
      onComplete?.(sc, fc);
      onDismiss();
      setTimeout(() => reset(), 400);
    }
  }, [isRunning, cancel, onDismiss, onComplete, reset]);

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

  const onBackdropPress = isDone || isCancelled ? handleCancel : undefined;

  const progressFillStyle = { width: progressBarWidth, backgroundColor: progressFillColor };
  const slideStyle = { transform: [{ translateY: slideAnim }] };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleCancel}
    >
      <Pressable className="absolute inset-0 bg-black/50" onPress={onBackdropPress} />

      <Animated.View
        className="bg-card border-border dark:bg-dark-card dark:border-dark-border absolute right-0 bottom-0 left-0 max-h-[75%] min-h-[320px] rounded-t-[28px] border-t px-6 pt-3 pb-9"
        style={slideStyle}
      >
        <View className="bg-muted dark:bg-dark-muted mb-5 h-1 w-10 self-center rounded-full" />

        <View className="mb-5 flex-row items-center">
          <View className="bg-muted dark:bg-dark-muted mr-3 h-10 w-10 items-center justify-center rounded-full">
            <FontAwesome6 name={headerIcon} size={20} color={progressFillColor} />
          </View>
          <View className="flex-1">
            <Text className="text-foreground dark:text-dark-foreground text-[17px] font-bold tracking-tight">
              {isDone && !isCancelled ? "Unsend Complete" : "Unsending Messages"}
            </Text>
            <Text className="text-muted-foreground dark:text-dark-muted-foreground mt-0.5 text-[13px]">
              {statusLabel}
            </Text>
          </View>
        </View>

        <View className="bg-muted dark:bg-dark-muted mb-3 h-2 overflow-hidden rounded-full">
          <Animated.View className="h-full rounded-full" style={progressFillStyle} />
        </View>

        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-muted-foreground dark:text-dark-muted-foreground text-[13px] font-semibold">
            {completed} / {total}
          </Text>
          <View className="flex-row gap-2">
            <View className="flex-row items-center gap-1 rounded-full bg-green-100 px-2 py-1 dark:bg-green-900/20">
              <FontAwesome6 name="check" size={9} color="#16a34a" />
              <Text className="text-[11px] font-bold text-green-600">{successCount}</Text>
            </View>
            {failureCount > 0 && (
              <View className="flex-row items-center gap-1 rounded-full bg-red-100 px-2 py-1 dark:bg-red-900/20">
                <FontAwesome6 name="xmark" size={9} color="#dc2626" />
                <Text className="text-[11px] font-bold text-red-600">{failureCount}</Text>
              </View>
            )}
          </View>
        </View>

        <ScrollView
          className="mb-5 max-h-40"
          contentContainerStyle={SCROLL_CONTENT_STYLE}
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
            className="border-border bg-muted dark:border-dark-border dark:bg-dark-muted items-center justify-center rounded-2xl border py-3.5 active:opacity-70"
          >
            <Text className="text-muted-foreground dark:text-dark-muted-foreground text-[15px] font-semibold">
              Cancel
            </Text>
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
