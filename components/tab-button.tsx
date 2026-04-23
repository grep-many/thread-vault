import { FontAwesome6 } from "@expo/vector-icons";
import { Pressable, Text } from "react-native";

interface Props {
  active: boolean;
  label: string;
  icon: string;
  onPress: () => void;
}

export function TabButton({ active, label, icon, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      className={`will-change-variable flex-1 flex-row items-center justify-center gap-2 rounded-xl py-3 ${
        active ? "bg-white shadow-sm dark:bg-zinc-800" : "bg-transparent"
      }`}
    >
      <FontAwesome6 name={icon} size={16} color={active ? "#ec4899" : "#71717a"} />
      <Text
        className={`font-bold transition-colors ${
          active ? "text-zinc-900 dark:text-white" : "text-zinc-500"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
