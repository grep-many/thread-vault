import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { View, Text } from "react-native";

interface HelpDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const STEPS = [
  "Log into Instagram on a desktop browser",
  "Right-click and select 'Inspect' (F12)",
  "Navigate to Application > Cookies",
  "Find and copy the 'sessionid' value",
] as const;

// ─── Stable class strings ─────────────────────────────────────────────────────

const CLS_ROOT = "gap-4";
const CLS_STEP_ROW = "flex-row items-start gap-3";
const CLS_STEP_BADGE =
  "h-6 w-6 items-center justify-center rounded-full bg-primary/10";
const CLS_STEP_NUM = "text-xs font-bold text-primary";
const CLS_STEP_TEXT = "flex-1 text-foreground dark:text-dark-foreground";
const CLS_CLOSE_BTN = "mt-4";

export const HelpDialog = memo(function HelpDialog({ isOpen, onClose }: HelpDialogProps) {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Manual Setup Guide">
      <View className={CLS_ROOT}>
        {STEPS.map((step, i) => (
          <View key={i} className={CLS_STEP_ROW}>
            <View className={CLS_STEP_BADGE}>
              <Text className={CLS_STEP_NUM}>{i + 1}</Text>
            </View>
            <Text className={CLS_STEP_TEXT}>{step}</Text>
          </View>
        ))}
        <Button variant="secondary" className={CLS_CLOSE_BTN} onPress={onClose}>
          <Text className="font-bold text-foreground dark:text-dark-foreground">
            Got it, thanks!
          </Text>
        </Button>
      </View>
    </Dialog>
  );
});
