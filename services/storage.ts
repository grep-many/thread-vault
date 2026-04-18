import { createMMKV } from "react-native-mmkv";
export const storage = createMMKV({
  id: "user-session-storage",
  encryptionKey: process.env.EXPO_PUBLIC_MMKV_KEY,
});
