import { Pressable, StyleSheet, Text, View } from "react-native";

const roles = [
  { label: "Customer", value: "customer" },
  { label: "Shopkeeper", value: "shopkeeper" },
];

export default function RoleSelector({ value, onChange }) {
  return (
    <View style={styles.container}>
      {roles.map(role => {
        const selected = value === role.value;

        return (
          <Pressable
            accessibilityRole="button"
            key={role.value}
            onPress={() => onChange(role.value)}
            style={[styles.option, selected ? styles.selected : null]}
          >
            <Text style={[styles.label, selected ? styles.selectedLabel : null]}>{role.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },
  option: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  selected: {
    backgroundColor: "#0f766e",
    borderColor: "#0f766e",
  },
  label: {
    color: "#374151",
    fontWeight: "700",
  },
  selectedLabel: {
    color: "#ffffff",
  },
});
