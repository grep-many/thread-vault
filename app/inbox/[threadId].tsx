import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

export default function Thread() {
  const { threadId } = useLocalSearchParams();

  return (
    <View className="flex flex-1 items-center justify-center dark:text-white">
      <Text className="text-2xl dark:text-white">Thread-[{threadId}]</Text>
    </View>
  );
}
