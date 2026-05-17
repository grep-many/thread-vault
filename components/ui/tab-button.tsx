import { FontAwesome6 } from "@expo/vector-icons";
import { memo } from "react";
import { Pressable, Text, View } from "react-native";

interface TabButtonProps {
  active: boolean;
  label?: string;
  icon: string;
  badge?: number;
  onPress: () => void;
}

// ─── Stable class strings ─────────────────────────────────────────────────────

const CLS_ROOT = "flex-1";
const CLS_PRESSABLE = "relative items-center justify-center py-2.5";
const CLS_ACTIVE_BG =
  "absolute inset-0 rounded-[12px] bg-white shadow-sm dark:bg-[#2a3942]";
const CLS_CONTENT_ROW =
  "relative z-10 flex-row items-center justify-center gap-2 px-3";
const CLS_LABEL_ACTIVE = "font-bold text-foreground dark:text-dark-foreground";
const CLS_LABEL_IDLE =
  "font-semibold text-muted-foreground dark:text-dark-muted-foreground";
const CLS_BADGE =
  "absolute -left-1 -top-2 rounded-full bg-muted px-1.5 py-0.5 dark:bg-dark-muted";
const CLS_BADGE_TEXT =
  "text-[10px] font-bold text-foreground dark:text-dark-foreground";

export const TabButton = memo(function TabButton({
  active,
  label,
  icon,
  badge,
  onPress,
}: TabButtonProps) {
  const iconColor = active ? "#ec4899" : "#71717a";

  return (
    <Pressable onPress={onPress} className={CLS_ROOT}>
      <View className={CLS_PRESSABLE}>
        {active && <View className={CLS_ACTIVE_BG} />}

        <View className={CLS_CONTENT_ROW}>
          <FontAwesome6 name={icon} size={14} color={iconColor} />
          {!!label && (
            <Text className={active ? CLS_LABEL_ACTIVE : CLS_LABEL_IDLE}>
              {label}
            </Text>
          )}
          {badge !== undefined && active && (
            <View className={CLS_BADGE}>
              <Text className={CLS_BADGE_TEXT}>{badge}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
});
