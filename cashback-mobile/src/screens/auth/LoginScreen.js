import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { loginUser } from "../../api/authApi";
import { sendOtp } from "../../api/otpApi";
import AppButton from "../../ui/AppButton";
import { isValidMobile, normalizeMobile } from "../../utils/validation";

const roles = [
  { label: "Customer", value: "customer", icon: "cart" },
  { label: "Shopkeeper", value: "shopkeeper", icon: "shop" },
];

export default function LoginScreen({ navigation }) {
  const [profile, setProfile] = useState("customer");
  const [mobile, setMobile] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!isValidMobile(mobile)) {
      setError("Enter valid 10-digit mobile number");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const loginResponse = await loginUser({ emailOrMobile: mobile });
      const loginData = loginResponse.data;

      if (!loginData.success) {
        setError(loginData.message || "Login failed");
        return;
      }

      if (loginData.user?.profile !== profile) {
        setError(`This mobile is registered as ${loginData.user?.profile || "another role"}.`);
        return;
      }

      try {
        await sendOtp(mobile);
      } catch (otpError) {
        console.log("[OTP] Send failed, test bypass remains available:", otpError.friendlyMessage || otpError.message);
      }

      navigation.navigate("OtpVerification", {
        mobile,
        mode: "login",
        user: loginData.user,
      });
    } catch (apiError) {
      setError(apiError.friendlyMessage || "Login failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateMobile = value => {
    setMobile(normalizeMobile(value));
    setError("");
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.page}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <AuthHeader title="Welcome back" subtitle="Sign in to access your cashback" />
        <AuthTabs active="login" onRegister={() => navigation.navigate("Register")} />

        <Text style={styles.sectionLabel}>I AM A</Text>
        <RoleCards value={profile} onChange={setProfile} />

        <Text style={styles.sectionLabel}>PHONE NUMBER</Text>
        <PhoneInput value={mobile} onChangeText={updateMobile} />

        {error ? <Text style={styles.formError}>{error}</Text> : null}

        <AppButton
          disabled={!isValidMobile(mobile)}
          loading={isSubmitting}
          onPress={handleLogin}
          title="Login"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function AuthHeader({ title, subtitle }) {
  return (
    <View style={styles.hero}>
      <View style={styles.brandRow}>
        <View style={styles.logoBox}>
          <Text style={styles.logoMark}>◇</Text>
        </View>
        <Text style={styles.brand}>CashBack</Text>
      </View>
      <Text style={styles.heroTitle}>{title}</Text>
      <Text style={styles.heroSubtitle}>{subtitle}</Text>
    </View>
  );
}

function AuthTabs({ active, onRegister }) {
  return (
    <View style={styles.tabs}>
      <View style={[styles.tab, active === "login" ? styles.activeTab : null]}>
        <Text style={[styles.tabText, active === "login" ? styles.activeTabText : null]}>Sign In</Text>
      </View>
      <Pressable onPress={onRegister} style={[styles.tab, active === "register" ? styles.activeTab : null]}>
        <Text style={[styles.tabText, active === "register" ? styles.activeTabText : null]}>Register</Text>
      </Pressable>
    </View>
  );
}

function RoleCards({ value, onChange }) {
  return (
    <View style={styles.roleGrid}>
      {roles.map(role => {
        const selected = value === role.value;

        return (
          <Pressable
            key={role.value}
            onPress={() => onChange(role.value)}
            style={[styles.roleCard, selected ? styles.roleCardSelected : null]}
          >
            <Text style={styles.roleIcon}>{role.icon === "cart" ? "🛒" : "🏪"}</Text>
            <Text style={[styles.roleText, selected ? styles.roleTextSelected : null]}>{role.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function PhoneInput({ value, onChangeText }) {
  return (
    <View style={styles.phoneBox}>
      <Text style={styles.countryCode}>+91</Text>
      <TextInput
        keyboardType="number-pad"
        maxLength={10}
        onChangeText={onChangeText}
        placeholder="98765 43210"
        placeholderTextColor="#94a3b8"
        style={styles.phoneInput}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#edf3ee",
  },
  content: {
    flexGrow: 1,
    padding: 22,
    paddingBottom: 34,
  },
  hero: {
    backgroundColor: "#18733b",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 48,
    marginHorizontal: -22,
    marginTop: -22,
    marginBottom: 30,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 28,
  },
  logoBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    marginRight: 12,
  },
  logoMark: {
    color: "#0f172a",
    fontSize: 26,
    fontWeight: "900",
  },
  brand: {
    color: "#ffffff",
    fontSize: 21,
    fontWeight: "900",
  },
  heroTitle: {
    color: "#ffffff",
    fontSize: 31,
    fontWeight: "900",
    marginBottom: 8,
  },
  heroSubtitle: {
    color: "#d9f4e3",
    fontSize: 15,
  },
  tabs: {
    minHeight: 62,
    borderRadius: 13,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cfe0d5",
    flexDirection: "row",
    padding: 5,
    marginBottom: 28,
  },
  tab: {
    flex: 1,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  activeTab: {
    backgroundColor: "#18733b",
  },
  tabText: {
    color: "#647367",
    fontWeight: "800",
  },
  activeTabText: {
    color: "#ffffff",
  },
  sectionLabel: {
    color: "#66766a",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 10,
  },
  roleGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 26,
  },
  roleCard: {
    flex: 1,
    minHeight: 110,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#cfe0d5",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  roleCardSelected: {
    borderColor: "#18733b",
    backgroundColor: "#e8f4ed",
  },
  roleIcon: {
    fontSize: 36,
    marginBottom: 10,
  },
  roleText: {
    color: "#607267",
    fontWeight: "800",
  },
  roleTextSelected: {
    color: "#087033",
  },
  phoneBox: {
    minHeight: 66,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#cfe0d5",
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    marginBottom: 26,
  },
  countryCode: {
    color: "#647367",
    fontSize: 17,
    fontWeight: "800",
    marginRight: 14,
  },
  phoneInput: {
    flex: 1,
    color: "#111827",
    fontSize: 17,
  },
  formError: {
    color: "#dc2626",
    fontSize: 14,
    marginBottom: 12,
  },
});
