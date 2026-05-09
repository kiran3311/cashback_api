import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { clearAuthUser, getAuthUser, saveAuthUser } from "../storage/authStorage";
import { registerForPushNotifications } from "../services/pushNotificationService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let timeoutId;

    const restoreSession = async () => {
      const startedAt = Date.now();

      try {
        const storedUser = await getAuthUser();
        if (isMounted) {
          setUser(storedUser);
        }
      } finally {
        const remainingTime = Math.max(900 - (Date.now() - startedAt), 0);
        timeoutId = setTimeout(() => {
          if (isMounted) {
            setIsLoading(false);
          }
        }, remainingTime);
      }
    };

    restoreSession();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, []);

  const value = useMemo(() => ({
    user,
    isLoading,
    isAuthenticated: Boolean(user),
    signIn: async nextUser => {
      await saveAuthUser(nextUser);
      setUser(nextUser);
      registerForPushNotifications(nextUser?.userId).catch(error => {
        console.log("[Notifications] Token registration failed:", error.message);
      });
    },
    signOut: async () => {
      await clearAuthUser();
      setUser(null);
    },
  }), [user, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
