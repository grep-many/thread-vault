import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { FontAwesome6 } from "@expo/vector-icons";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastType = "success" | "error" | "info";

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  /** Display duration in ms. Defaults to 3000. */
  duration?: number;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

// ─── Toast Item ───────────────────────────────────────────────────────────────

const ICON: Record<ToastType, string> = {
  success: "circle-check",
  error: "circle-xmark",
  info: "circle-info",
};

const COLORS: Record<ToastType, { bg: string; border: string; icon: string; text: string }> = {
  success: { bg: "#052e16", border: "#16a34a", icon: "#22c55e", text: "#bbf7d0" },
  error: { bg: "#2d0d0d", border: "#dc2626", icon: "#ef4444", text: "#fecaca" },
  info: { bg: "#0c1a2e", border: "#3b82f6", icon: "#60a5fa", text: "#bfdbfe" },
};

interface ToastItemProps {
  toast: ToastMessage;
  onHide: (id: string) => void;
}

function ToastItem({ toast, onHide }: ToastItemProps) {
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const duration = toast.duration ?? 3000;
    const colors = COLORS[toast.type];

    // Slide in
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-dismiss
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -80,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => onHide(toast.id));
    }, duration);

    return () => clearTimeout(timer);
  }, [toast, onHide, translateY, opacity]);

  const colors = COLORS[toast.type];

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <FontAwesome6 name={ICON[toast.type]} size={16} color={colors.icon} />
      <Text style={[styles.toastText, { color: colors.text }]} numberOfLines={2}>
        {toast.message}
      </Text>
    </Animated.View>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const idRef = useRef(0);

  const showToast = useCallback((message: string, type: ToastType = "info", duration = 3000) => {
    const id = String(++idRef.current);
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container — rendered on top of all content */}
      <View style={styles.container} pointerEvents="none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onHide={hideToast} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * useToast — returns a `showToast(message, type?, duration?)` function.
 *
 * Must be used inside a <ToastProvider> ancestor.
 *
 * @example
 * const { showToast } = useToast();
 * showToast("✓ 5 messages unsent", "success");
 * showToast("✗ 2 failed to unsend", "error");
 */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 56,
    left: 16,
    right: 16,
    zIndex: 9999,
    gap: 8,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  toastText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: -0.1,
  },
});
