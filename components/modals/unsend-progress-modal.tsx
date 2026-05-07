import React, { useEffect, useRef, useCallback } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  Animated,
  StyleSheet,
  ScrollView,
} from "react-native";
import { FontAwesome6 } from "@expo/vector-icons";
import { useUnsendQueue } from "@/hooks/unsend/use-unsend-queue";

interface UnsendProgressModalProps {
  /** Controls modal visibility. Caller opens it; modal auto-closes on completion. */
  isVisible: boolean;
  /** Called when the modal should be dismissed (auto-close or user cancel). */
  onDismiss: () => void;
  /** Summary toast callback: fired after close with final counts. */
  onComplete?: (successCount: number, failureCount: number) => void;
}

/** Delay before auto-closing after all jobs finish (ms) */
const AUTO_CLOSE_DELAY_MS = 1800;

export function UnsendProgressModal({
  isVisible,
  onDismiss,
  onComplete,
}: UnsendProgressModalProps) {
  const { isRunning, isDone, jobs, currentItemId, successCount, failureCount, isCancelled, cancel, reset } =
    useUnsendQueue();

  const progressAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(300)).current;
  const autoCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const total = jobs.length;
  const completed = successCount + failureCount;
  const progressRatio = total > 0 ? completed / total : 0;

  // Animate progress bar
  useEffect(() => {
    Animated.spring(progressAnim, {
      toValue: progressRatio,
      useNativeDriver: false,
      tension: 60,
      friction: 10,
    }).start();
  }, [progressRatio, progressAnim]);

  // Slide-up animation when modal opens
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

  // Auto-close after completion
  useEffect(() => {
    if (isDone && isVisible) {
      autoCloseTimer.current = setTimeout(() => {
        onComplete?.(successCount, failureCount);
        onDismiss();
        // Defer reset to avoid resetting while modal is closing
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

  const statusLabel = isDone
    ? isCancelled
      ? "Cancelled"
      : "Complete!"
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
      {/* Backdrop */}
      <Pressable
        style={styles.backdrop}
        onPress={isDone || isCancelled ? handleCancel : undefined}
      />

      {/* Bottom Sheet */}
      <Animated.View
        style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
      >
        {/* Handle bar */}
        <View style={styles.handleBar} />

        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.iconWrapper}>
            <FontAwesome6
              name={isDone && !isCancelled ? "circle-check" : "trash-can"}
              size={20}
              color={isDone && !isCancelled ? "#22c55e" : "#ec4899"}
            />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>
              {isDone && !isCancelled ? "Unsend Complete" : "Unsending Messages"}
            </Text>
            <Text style={styles.subtitle}>{statusLabel}</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: progressBarWidth,
                backgroundColor: isDone && !isCancelled ? "#22c55e" : "#ec4899",
              },
            ]}
          />
        </View>

        {/* Count Row */}
        <View style={styles.countRow}>
          <Text style={styles.countTotal}>{completed} / {total}</Text>
          <View style={styles.countBadges}>
            <View style={[styles.badge, styles.badgeSuccess]}>
              <FontAwesome6 name="check" size={9} color="#16a34a" />
              <Text style={styles.badgeSuccessText}>{successCount}</Text>
            </View>
            {failureCount > 0 && (
              <View style={[styles.badge, styles.badgeFail]}>
                <FontAwesome6 name="xmark" size={9} color="#dc2626" />
                <Text style={styles.badgeFailText}>{failureCount}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Job List (scrollable for large batches) */}
        <ScrollView
          style={styles.jobList}
          contentContainerStyle={styles.jobListContent}
          showsVerticalScrollIndicator={false}
        >
          {jobs.map((job) => (
            <View key={job.itemId} style={styles.jobRow}>
              <View style={styles.jobStatus}>
                {job.status === "success" ? (
                  <FontAwesome6 name="circle-check" size={14} color="#22c55e" />
                ) : job.status === "failed" ? (
                  <FontAwesome6 name="circle-xmark" size={14} color="#ef4444" />
                ) : job.status === "processing" ? (
                  <FontAwesome6 name="rotate" size={14} color="#ec4899" />
                ) : (
                  <View style={styles.jobPending} />
                )}
              </View>
              <Text style={styles.jobId} numberOfLines={1}>
                {job.itemId}
              </Text>
              {job.itemId === currentItemId && job.status === "processing" && (
                <View style={styles.processingBadge}>
                  <Text style={styles.processingText}>Now</Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>

        {/* Action Button */}
        {!isDone && (
          <Pressable
            onPress={handleCancel}
            style={({ pressed }) => [styles.cancelBtn, pressed && styles.cancelBtnPressed]}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        )}

        {isDone && (
          <Pressable
            onPress={handleCancel}
            style={({ pressed }) => [styles.doneBtn, pressed && styles.doneBtnPressed]}
          >
            <Text style={styles.doneText}>Dismiss</Text>
          </Pressable>
        )}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#18181b", // zinc-900
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 36,
    minHeight: 320,
    maxHeight: "75%",
  },
  handleBar: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#3f3f46", // zinc-700
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#27272a", // zinc-800
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerText: { flex: 1 },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fafafa", // zinc-50
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: "#a1a1aa", // zinc-400
    marginTop: 2,
  },
  progressTrack: {
    height: 8,
    backgroundColor: "#27272a",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 12,
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  countRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  countTotal: {
    fontSize: 13,
    color: "#71717a", // zinc-500
    fontWeight: "600",
  },
  countBadges: { flexDirection: "row", gap: 8 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgeSuccess: { backgroundColor: "#dcfce7" }, // green-100
  badgeSuccessText: { fontSize: 11, fontWeight: "700", color: "#16a34a" },
  badgeFail: { backgroundColor: "#fee2e2" }, // red-100
  badgeFailText: { fontSize: 11, fontWeight: "700", color: "#dc2626" },
  jobList: { maxHeight: 160, marginBottom: 20 },
  jobListContent: { paddingBottom: 4 },
  jobRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#27272a",
  },
  jobStatus: { width: 22, alignItems: "center" },
  jobPending: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#3f3f46",
  },
  jobId: {
    flex: 1,
    fontSize: 11,
    color: "#71717a",
    marginLeft: 8,
    fontFamily: "monospace",
  },
  processingBadge: {
    backgroundColor: "#ec4899",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  processingText: { fontSize: 9, fontWeight: "700", color: "white" },
  cancelBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#3f3f46",
    backgroundColor: "#27272a",
  },
  cancelBtnPressed: { opacity: 0.7 },
  cancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#a1a1aa",
  },
  doneBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "#22c55e",
  },
  doneBtnPressed: { opacity: 0.8 },
  doneText: {
    fontSize: 15,
    fontWeight: "700",
    color: "white",
  },
});
