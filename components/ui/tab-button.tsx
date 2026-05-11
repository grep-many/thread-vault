import { FontAwesome6 } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

interface Props {
  active: boolean;
  label: string;
  icon: string;
  badge?: number;
  onPress: () => void;
}

export function TabButton({ active, label, icon, badge, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      className={`will-change-variable flex-1 flex-row items-center justify-center gap-2 rounded-xl py-3 ${active ? "bg-white shadow-sm dark:bg-zinc-800 px-2" : "bg-transparent"
        }`}
    >
      <FontAwesome6 name={icon} size={16} color={active ? "#ec4899" : "#71717a"} />
      <Text
        className={`font-bold transition-colors ${active ? "text-zinc-900 dark:text-white" : "text-zinc-500"
          }`}
      >
        {label}
      </Text>
      {(badge !== undefined && active) && (
        <View
          className={`absolute -top-2 -left-1 rounded-full px-1.5 py-0.5 ${active ? "bg-zinc-100 dark:bg-zinc-700" : "bg-zinc-200 dark:bg-zinc-800"}`}
        >
          <Text
            className={`text-[10px] font-bold ${active ? "text-zinc-900 dark:text-white" : "text-zinc-500"}`}
          >
            {badge}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
