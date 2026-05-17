import { memo } from "react";
import { FontAwesome6 } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

interface TabButtonProps {
  active: boolean;
  label: string;
  icon: string;
  badge?: number;
  onPress: () => void;
}

export const TabButton = memo(function TabButton({
  active,
  label,
  icon,
  badge,
  onPress,
}: TabButtonProps) {
  const iconColor = active ? "#ec4899" : "#71717a";

  return (
    <Pressable
      onPress={onPress}
      className={`relative flex-1 flex-row items-center justify-center gap-2 rounded-xl px-2 py-3 ${
        active ? "bg-white shadow-sm elevation-1 dark:bg-zinc-800" : "bg-transparent"
      }`}
    >
      <FontAwesome6 name={icon} size={16} color={iconColor} />
      {active && label ? (
        <Text className="font-bold text-zinc-900 dark:text-white">{label}</Text>
      ) : null}
      {badge !== undefined && active && (
        <View className="absolute -top-2 -left-1 rounded-full bg-zinc-100 px-1.5 py-0.5 dark:bg-zinc-700">
          <Text className="text-[10px] font-bold text-zinc-900 dark:text-white">{badge}</Text>
        </View>
      )}
    </Pressable>
  );
});
