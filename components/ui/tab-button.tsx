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


export const TabButton = memo(function TabButton({
  active,
  label,
  icon,
  badge,
  onPress,
}: TabButtonProps) {
  const iconColor = active ? "#ec4899" : "#71717a";

  return (
    <Pressable onPress={onPress} className="flex-1">
      <View className="relative items-center justify-center py-2.5">
        {active && <View className="absolute inset-0 rounded-[12px] bg-white shadow-sm dark:bg-dark-muted" />}

        <View className="relative z-10 flex-row items-center justify-center gap-2 px-3">
          <FontAwesome6 name={icon} size={14} color={iconColor} />
          {!!label && (
            <Text className={active ? "font-bold text-foreground dark:text-dark-foreground" : "font-semibold text-muted-foreground dark:text-dark-muted-foreground"}>
              {label}
            </Text>
          )}
          {badge !== undefined && active && (
            <View className="absolute -left-1 -top-2 rounded-full bg-muted px-1.5 py-0.5 dark:bg-dark-muted">
              <Text className="text-[10px] font-bold text-foreground dark:text-dark-foreground">{badge}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
});
