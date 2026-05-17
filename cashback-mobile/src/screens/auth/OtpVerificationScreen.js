import { useEffect, useMemo, useState } from "react";
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
import { loginUser, registerUser } from "../../api/authApi";
import { sendOtp, verifyOtp } from "../../api/otpApi";
import { useAuth } from "../../context/AuthContext";
import AppButton from "../../ui/AppButton";

const TEST_OTP = "123456";
const OTP_SECONDS = 5 * 60;

export default function OtpVerificationScreen({ navigation, route }) {
  const { signIn } = useAuth();
  const { mobile, mode, payload, user } = route.params || {};
  const [otp, setOtp] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(OTP_SECONDS);
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (secondsLeft <= 0) return undefined;

    const timerId = setInterval(() => {
      setSecondsLeft(value => Math.max(value - 1, 0));
    }, 1000);

    return () => clearInterval(timerId);
  }, [secondsLeft]);

  const timerLabel = useMemo(() => {
    const minutes = Math.floor(secondsLeft / 60);
    const seconds = String(secondsLeft % 60).padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [secondsLeft]);

  const completeAuth = async () => {
    if (mode === "register") {
      const registerResponse = await registerUser(payload);
      const registerData = registerResponse.data;

      if (!registerData.success) {
        throw new Error(registerData.message || "Registration failed");
      }

      await signIn({
        userId: registerData.userId,
        ...payload,
      });
      return;
    }

    if (user) {
      await signIn(user);
      return;
    }

    const loginResponse = await loginUser({ emailOrMobile: mobile });
    const loginData = loginResponse.data;

    if (!loginData.success) {
      throw new Error(loginData.message || "Login failed");
    }

    await signIn(loginData.user);
  };

  const handleVerify = async () => {
    if (otp.length !== 6) {
      setError("Enter the 6-digit OTP");
      return;
    }

    setError("");
    setIsVerifying(true);

    try {
      if (otp !== TEST_OTP) {
        const response = await verifyOtp({ mobile, otp });

        if (!response.data?.success) {
          throw new Error(response.data?.error || "Invalid OTP");
        }
      }

      await completeAuth();
    } catch (apiError) {
      setError(apiError.friendlyMessage || apiError.message || "OTP verification failed");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (secondsLeft > 0) return;

    setError("");
    setIsResending(true);

    try {
      await sendOtp(mobile);
      setSecondsLeft(OTP_SECONDS);
    } catch (apiError) {
      setError(apiError.friendlyMessage || "Unable to resend OTP. Use 123456 for testing.");
      setSecondsLeft(OTP_SECONDS);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.page}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Text style={styles.brand}>CashBack</Text>
          <Text style={styles.heroTitle}>Verify OTP</Text>
          <Text style={styles.heroSubtitle}>Enter the code sent to +91 {mobile}</Text>
        </View>

        <Text style={styles.sectionLabel}>OTP CODE</Text>
        <TextInput
          keyboardType="number-pad"
          maxLength={6}
          onChangeText={value => {
            setOtp(value.replace(/\D/g, ""));
            setError("");
          }}
          placeholder="123456"
          placeholderTextColor="#94a3b8"
          style={styles.otpInput}
          textAlign="center"
          value={otp}
        />

        <Text style={styles.helperText}>Testing bypass OTP: 123456</Text>

        {error ? <Text style={styles.formError}>{error}</Text> : null}

        <AppButton
          disabled={otp.length !== 6}
          loading={isVerifying}
          onPress={handleVerify}
          title={mode === "register" ? "Verify & Register" : "Verify & Login"}
        />

        <View style={styles.footerRow}>
          <Text style={styles.timerText}>{secondsLeft > 0 ? `Resend in ${timerLabel}` : "Did not receive OTP?"}</Text>
          <Pressable disabled={secondsLeft > 0 || isResending} onPress={handleResend}>
            <Text style={[styles.resendText, secondsLeft > 0 ? styles.resendDisabled : null]}>
              {isResending ? "Sending..." : "Resend"}
            </Text>
          </Pressable>
        </View>

        <Pressable onPress={() => navigation.goBack()} style={styles.backLink}>
          <Text style={styles.backText}>Change mobile number</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
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
  brand: {
    color: "#ffffff",
    fontSize: 21,
    fontWeight: "900",
    marginBottom: 28,
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
  sectionLabel: {
    color: "#66766a",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },
  otpInput: {
    minHeight: 64,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#cfe0d5",
    backgroundColor: "#ffffff",
    color: "#111827",
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: 8,
    marginBottom: 10,
  },
  helperText: {
    color: "#66766a",
    fontSize: 12,
    marginBottom: 18,
  },
  formError: {
    color: "#dc2626",
    fontSize: 14,
    marginBottom: 12,
  },
  footerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginTop: 18,
  },
  timerText: {
    color: "#66766a",
    fontSize: 13,
  },
  resendText: {
    color: "#18733b",
    fontWeight: "900",
  },
  resendDisabled: {
    color: "#94a3b8",
  },
  backLink: {
    alignItems: "center",
    marginTop: 28,
  },
  backText: {
    color: "#18733b",
    fontWeight: "900",
  },
});
