import { StyleSheet, Text, View } from "react-native";

export default function LoadingScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.logoBox}>
        <Text style={styles.logoMark}>◇</Text>
      </View>
      <Text style={styles.title}>CashBack</Text>
      <Text style={styles.subtitle}>Earn. Redeem. Repeat.</Text>
      <View style={styles.loaderTrack}>
        <View style={styles.loaderFill} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#18733b",
  },
  logoBox: {
    width: 82,
    height: 82,
    borderRadius: 22,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },
  logoMark: {
    color: "#111827",
    fontSize: 42,
    fontWeight: "900",
  },
  title: {
    color: "#ffffff",
    fontSize: 30,
    fontWeight: "900",
    marginBottom: 22,
  },
  subtitle: {
    color: "#d4eadb",
    fontSize: 14,
    marginBottom: 56,
  },
  loaderTrack: {
    width: 40,
    height: 4,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.25)",
    overflow: "hidden",
  },
  loaderFill: {
    width: 24,
    height: 4,
    borderRadius: 3,
    backgroundColor: "#ffffff",
  },
});
