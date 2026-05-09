import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";

export default function AppButton({ title, onPress, disabled, loading, variant = "primary" }) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === "secondary" ? styles.secondary : null,
        pressed && !isDisabled ? styles.pressed : null,
        isDisabled ? styles.disabled : null,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "secondary" ? "#0f766e" : "#ffffff"} />
      ) : (
        <Text style={[
          styles.text,
          variant === "secondary" ? styles.secondaryText : null,
          isDisabled ? styles.disabledText : null,
        ]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0f766e",
    paddingHorizontal: 18,
  },
  pressed: {
    opacity: 0.84,
  },
  disabled: {
    backgroundColor: "#d5e8dc",
  },
  secondary: {
    backgroundColor: "#e0f2f1",
  },
  text: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryText: {
    color: "#0f766e",
  },
  disabledText: {
    color: "#647367",
  },
});
