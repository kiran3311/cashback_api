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
import { registerUser } from "../../api/authApi";
import { useAuth } from "../../context/AuthContext";
import AppButton from "../../ui/AppButton";
import { isValidEmail, isValidMobile, normalizeMobile } from "../../utils/validation";

const roles = [
  { label: "Customer", value: "customer", icon: "cart" },
  { label: "Shopkeeper", value: "shopkeeper", icon: "shop" },
];

export default function RegisterScreen({ navigation }) {
  const { signIn } = useAuth();
  const [profile, setProfile] = useState("customer");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    if (!name.trim()) {
      setError("Enter your full name");
      return false;
    }

    if (!isValidEmail(email)) {
      setError("Enter a valid email");
      return false;
    }

    if (!isValidMobile(mobile)) {
      setError("Enter valid 10-digit mobile number");
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setError("");
    setIsSubmitting(true);

    try {
      const payload = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        mobile,
        profile,
      };

      const registerResponse = await registerUser(payload);
      const registerData = registerResponse.data;

      if (!registerData.success) {
        setError(registerData.message || "Registration failed");
        return;
      }

      await signIn({
        userId: registerData.userId,
        ...payload,
      });
    } catch (apiError) {
      setError(apiError.friendlyMessage || "Registration failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.page}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <AuthHeader title="Create your account" subtitle="Start earning rewards today" />
        <AuthTabs active="register" onLogin={() => navigation.goBack()} />

        <Text style={styles.sectionLabel}>I AM A</Text>
        <RoleCards value={profile} onChange={setProfile} />

        <Text style={styles.sectionLabel}>FULL NAME</Text>
        <TextInput
          autoCapitalize="words"
          onChangeText={text => {
            setName(text);
            setError("");
          }}
          placeholder="Enter your name"
          placeholderTextColor="#94a3b8"
          style={styles.inputBox}
          value={name}
        />

        <Text style={styles.sectionLabel}>EMAIL</Text>
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={text => {
            setEmail(text);
            setError("");
          }}
          placeholder="you@example.com"
          placeholderTextColor="#94a3b8"
          style={styles.inputBox}
          value={email}
        />

        <Text style={styles.sectionLabel}>PHONE NUMBER</Text>
        <PhoneInput
          value={mobile}
          onChangeText={value => {
            setMobile(normalizeMobile(value));
            setError("");
          }}
        />

        {error ? <Text style={styles.formError}>{error}</Text> : null}

        <AppButton
          disabled={!name.trim() || !isValidEmail(email) || !isValidMobile(mobile)}
          loading={isSubmitting}
          onPress={handleRegister}
          title="Register"
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

function AuthTabs({ active, onLogin }) {
  return (
    <View style={styles.tabs}>
      <Pressable onPress={onLogin} style={[styles.tab, active === "login" ? styles.activeTab : null]}>
        <Text style={[styles.tabText, active === "login" ? styles.activeTabText : null]}>Sign In</Text>
      </Pressable>
      <View style={[styles.tab, active === "register" ? styles.activeTab : null]}>
        <Text style={[styles.tabText, active === "register" ? styles.activeTabText : null]}>Register</Text>
      </View>
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
    fontSize: 29,
    fontWeight: "900",
    marginBottom: 8,
  },
  heroSubtitle: {
    color: "#d9f4e3",
    fontSize: 15,
  },
  tabs: {
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cfe0d5",
    flexDirection: "row",
    padding: 5,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    borderRadius: 8,
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
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },
  roleGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  roleCard: {
    flex: 1,
    minHeight: 88,
    borderRadius: 12,
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
    fontSize: 34,
    marginBottom: 8,
  },
  roleText: {
    color: "#607267",
    fontWeight: "800",
    fontSize: 13,
  },
  roleTextSelected: {
    color: "#087033",
  },
  inputBox: {
    minHeight: 54,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#cfe0d5",
    backgroundColor: "#ffffff",
    color: "#111827",
    fontSize: 16,
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  phoneBox: {
    minHeight: 54,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#cfe0d5",
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  countryCode: {
    color: "#647367",
    fontSize: 16,
    fontWeight: "800",
    marginRight: 14,
  },
  phoneInput: {
    flex: 1,
    color: "#111827",
    fontSize: 16,
  },
  formError: {
    color: "#dc2626",
    fontSize: 14,
    marginBottom: 12,
  },
});
