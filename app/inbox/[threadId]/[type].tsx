import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

export default function MediaViewer() {
  const { threadId, type } = useLocalSearchParams();
  
  return (
    <View>
      <Text className="text-white">Thread:{threadId}</Text>
      <Text className="text-white">Type:{type}</Text>
    </View>
  );
}
