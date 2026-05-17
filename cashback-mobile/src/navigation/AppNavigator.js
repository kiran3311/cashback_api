import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoadingScreen from "../screens/LoadingScreen";
import LoginScreen from "../screens/auth/LoginScreen";
import OtpVerificationScreen from "../screens/auth/OtpVerificationScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import CustomerHomeScreen from "../screens/customer/CustomerHomeScreen";
import ShopkeeperHomeScreen from "../screens/shopkeeper/ShopkeeperHomeScreen";
import { useAuth } from "../context/AuthContext";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  const initialRouteName = user?.profile === "shopkeeper" ? "ShopkeeperHome" : "CustomerHome";

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
          </>
        ) : (
          <Stack.Screen
            name={initialRouteName}
            component={user.profile === "shopkeeper" ? ShopkeeperHomeScreen : CustomerHomeScreen}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
