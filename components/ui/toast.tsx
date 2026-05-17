import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Animated, Text, View } from "react-native";
import { FontAwesome6 } from "@expo/vector-icons";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastType = "success" | "error" | "info";

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

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

// ─── Toast Item ───────────────────────────────────────────────────────────────

interface ToastItemProps {
  toast: ToastMessage;
  onHide: (id: string) => void;
}

const ToastItem = memo(function ToastItem({ toast, onHide }: ToastItemProps) {
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const colors = COLORS[toast.type];

  useEffect(() => {
    const duration = toast.duration ?? 3000;

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
  }, [toast.id, toast.duration, onHide, translateY, opacity]);

  return (
    <Animated.View
      className="flex-row items-center gap-2.5 rounded-2xl border px-4 py-3 shadow-lg"
      style={{
        backgroundColor: colors.bg,
        borderColor: colors.border,
        transform: [{ translateY }],
        opacity,
      }}
    >
      <FontAwesome6 name={ICON[toast.type]} size={16} color={colors.icon} />
      <Text
        className="flex-1 text-[13px] font-semibold tracking-tight"
        style={{ color: colors.text }}
        numberOfLines={2}
      >
        {toast.message}
      </Text>
    </Animated.View>
  );
});

// ─── Provider ─────────────────────────────────────────────────────────────────


export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const idRef = useRef(0);

  const showToast = useCallback(
    (message: string, type: ToastType = "info", duration = 3000) => {
      const id = String(++idRef.current);
      setToasts((prev) => [...prev, { id, message, type, duration }]);
    },
    [],
  );

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Memoize the context value to prevent all consumers from re-rendering
  // when unrelated state in the provider changes.
  const contextValue = useRef<ToastContextValue>({ showToast });
  contextValue.current.showToast = showToast;

  return (
    <ToastContext.Provider value={contextValue.current}>
      {children}
      <View className="absolute top-14 left-4 right-4 z-[9999] gap-2" pointerEvents="none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onHide={hideToast} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
