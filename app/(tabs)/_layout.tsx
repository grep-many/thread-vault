import { View, Text, useWindowDimensions } from "react-native";
import React from "react";
import { Stack } from "expo-router";

const TabLayout = () => {
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 870;

  isLargeScreen ? (
    <View>Large Screen</View>
  ) : (
    <View>
      <Stack screenOptions={{ headerShown: false }} />
    </View>
  );
};

export default TabLayout;
