import { useUnsendQueue } from "@/hooks/unsend/use-unsend-queue";
import { FontAwesome6 } from "@expo/vector-icons";
import { useShallow } from "zustand/react/shallow";
import { memo, useCallback, useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

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

const CLS_BACKDROP = "absolute inset-0 bg-black/50";
const CLS_SHEET =
  "absolute bottom-0 left-0 right-0 max-h-[75%] min-h-[320px] rounded-t-[28px] bg-card border-t border-border px-6 pb-9 pt-3 dark:bg-dark-card dark:border-dark-border";
const CLS_DRAG_HANDLE = "mb-5 h-1 w-10 self-center rounded-full bg-muted dark:bg-dark-muted";
const CLS_HEADER_ROW = "mb-5 flex-row items-center";
const CLS_HEADER_ICON_WRAP =
  "mr-3 h-10 w-10 items-center justify-center rounded-full bg-muted dark:bg-dark-muted";
const CLS_HEADER_TEXT_WRAP = "flex-1";
const CLS_HEADER_TITLE =
  "text-[17px] font-bold tracking-tight text-foreground dark:text-dark-foreground";
const CLS_HEADER_STATUS =
  "mt-0.5 text-[13px] text-muted-foreground dark:text-dark-muted-foreground";
const CLS_PROGRESS_TRACK =
  "mb-3 h-2 overflow-hidden rounded-full bg-muted dark:bg-dark-muted";
const CLS_PROGRESS_FILL = "h-full rounded-full";
const CLS_COUNTS_ROW = "mb-4 flex-row items-center justify-between";
const CLS_COUNTS_LABEL =
  "text-[13px] font-semibold text-muted-foreground dark:text-dark-muted-foreground";
const CLS_BADGE_ROW = "flex-row gap-2";
const CLS_SUCCESS_BADGE =
  "flex-row items-center gap-1 rounded-full bg-green-100 px-2 py-1 dark:bg-green-900/20";
const CLS_SUCCESS_TEXT = "text-[11px] font-bold text-green-600";
const CLS_FAIL_BADGE =
  "flex-row items-center gap-1 rounded-full bg-red-100 px-2 py-1 dark:bg-red-900/20";
const CLS_FAIL_TEXT = "text-[11px] font-bold text-red-600";
const CLS_SCROLL = "mb-5 max-h-40";
const CLS_CANCEL_BTN =
  "items-center justify-center rounded-2xl border border-border bg-muted py-3.5 active:opacity-70 dark:border-dark-border dark:bg-dark-muted";
const CLS_CANCEL_TEXT =
  "text-[15px] font-semibold text-muted-foreground dark:text-dark-muted-foreground";
const CLS_DISMISS_BTN =
  "items-center justify-center rounded-2xl bg-green-500 py-3.5 active:opacity-80";
const CLS_DISMISS_TEXT = "text-[15px] font-bold text-white";

// Job row class strings
const CLS_JOB_ROW =
  "flex-row items-center border-b border-border py-1.5 dark:border-dark-border";
const CLS_JOB_ICON_WRAP = "w-[22px] items-center";
const CLS_JOB_IDLE_DOT = "h-2.5 w-2.5 rounded-full bg-muted dark:bg-dark-muted";
const CLS_JOB_ID =
  "ml-2 flex-1 font-mono text-[11px] text-muted-foreground dark:text-dark-muted-foreground";
const CLS_BADGE_NOW = "rounded px-1.5 py-0.5 bg-primary";
const CLS_BADGE_WAIT = "rounded px-1.5 py-0.5 bg-amber-500";
const CLS_BADGE_TEXT = "text-[9px] font-bold text-white";

// ─── JobRow ───────────────────────────────────────────────────────────────────

const JobRow = memo(function JobRow({ job, currentItemId, isCoolingDown }: JobRowProps) {
  const isProcessing = job.status === "processing";
  const isCurrent = job.itemId === currentItemId && isProcessing;
  const badgeClass = isCoolingDown ? CLS_BADGE_WAIT : CLS_BADGE_NOW;

  return (
    <View className={CLS_JOB_ROW}>
      <View className={CLS_JOB_ICON_WRAP}>
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
          <View className={CLS_JOB_IDLE_DOT} />
        )}
      </View>
      <Text className={CLS_JOB_ID} numberOfLines={1}>
        {job.itemId}
      </Text>
      {isCurrent && (
        <View className={badgeClass}>
          <Text className={CLS_BADGE_TEXT}>
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
    }))
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
      <Pressable className={CLS_BACKDROP} onPress={onBackdropPress} />

      <Animated.View className={CLS_SHEET} style={slideStyle}>
        <View className={CLS_DRAG_HANDLE} />

        <View className={CLS_HEADER_ROW}>
          <View className={CLS_HEADER_ICON_WRAP}>
            <FontAwesome6
              name={headerIcon}
              size={20}
              color={progressFillColor}
            />
          </View>
          <View className={CLS_HEADER_TEXT_WRAP}>
            <Text className={CLS_HEADER_TITLE}>
              {isDone && !isCancelled ? "Unsend Complete" : "Unsending Messages"}
            </Text>
            <Text className={CLS_HEADER_STATUS}>{statusLabel}</Text>
          </View>
        </View>

        <View className={CLS_PROGRESS_TRACK}>
          <Animated.View className={CLS_PROGRESS_FILL} style={progressFillStyle} />
        </View>

        <View className={CLS_COUNTS_ROW}>
          <Text className={CLS_COUNTS_LABEL}>
            {completed} / {total}
          </Text>
          <View className={CLS_BADGE_ROW}>
            <View className={CLS_SUCCESS_BADGE}>
              <FontAwesome6 name="check" size={9} color="#16a34a" />
              <Text className={CLS_SUCCESS_TEXT}>{successCount}</Text>
            </View>
            {failureCount > 0 && (
              <View className={CLS_FAIL_BADGE}>
                <FontAwesome6 name="xmark" size={9} color="#dc2626" />
                <Text className={CLS_FAIL_TEXT}>{failureCount}</Text>
              </View>
            )}
          </View>
        </View>

        <ScrollView
          className={CLS_SCROLL}
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
          <Pressable onPress={handleCancel} className={CLS_CANCEL_BTN}>
            <Text className={CLS_CANCEL_TEXT}>Cancel</Text>
          </Pressable>
        )}

        {isDone && (
          <Pressable onPress={handleCancel} className={CLS_DISMISS_BTN}>
            <Text className={CLS_DISMISS_TEXT}>Dismiss</Text>
          </Pressable>
        )}
      </Animated.View>
    </Modal>
  );
});
