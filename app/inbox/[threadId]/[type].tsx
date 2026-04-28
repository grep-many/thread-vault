import { useLocalSearchParams } from "expo-router";
import { Text } from "react-native";

export default function MediaViewer() {
  const { threadId, type } = useLocalSearchParams();
  
  return <Text></Text>;
}
