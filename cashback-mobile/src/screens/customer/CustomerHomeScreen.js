import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  BackHandler,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { io } from "socket.io-client";
import { getCustomerCashbackList, updateRedeemStatus } from "../../api/customerApi";
import { useAuth } from "../../context/AuthContext";
import PullRefreshScrollView from "../../ui/PullRefreshScrollView";
import TabTransition from "../../ui/TabTransition";

const tabs = [
  { key: "home", label: "Home", icon: "⌂" },
  { key: "scan", label: "Scan", icon: "▣" },
  { key: "wallet", label: "Wallet", icon: "◇" },
  { key: "offers", label: "Offers", icon: "◎" },
  { key: "profile", label: "Profile", icon: "◎" },
];

const offers = [
  { id: "freshmart", shop: "FreshMart Groceries", category: "Grocery", min: "₹200", expiry: "Dec 15", cashback: "5%", icon: "🛒" },
  { id: "cafe", shop: "Cafe Aroma", category: "F&B", min: "₹100", expiry: "Dec 10", cashback: "10%", icon: "☕" },
  { id: "mobile", shop: "MobileZone", category: "Electronics", min: "₹500", expiry: "Dec 20", cashback: "3%", icon: "▦" },
  { id: "meds", shop: "QuickMeds Pharmacy", category: "Health", min: "₹150", expiry: "Dec 25", cashback: "8%", icon: "💊" },
  { id: "shoes", shop: "StepUp Shoes", category: "Fashion", min: "₹800", expiry: "Dec 31", cashback: "7%", icon: "👟" },
];

export default function CustomerHomeScreen() {
  const { signOut, user } = useAuth();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState("home");
  const [shops, setShops] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (activeTab !== "home") {
        setActiveTab("home");
        return true;
      }

      return false;
    });

    return () => subscription.remove();
  }, [activeTab]);

  const loadData = useCallback(async () => {
    if (!user?.mobile && !user?.userId) return;

    setIsLoading(true);
    setError("");

    try {
      const response = await getCustomerCashbackList({
        userId: user?.userId,
        mobile: user?.mobile,
      });
      setShops(response.data?.shops || []);
    } catch (apiError) {
      setError(apiError.friendlyMessage || "Unable to load cashback details");
      setShops([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.mobile, user?.userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const metrics = useMemo(() => buildCustomerMetrics(shops), [shops]);

  const respondToRedeemRequest = useCallback(async ({ cashbackId, redeemAmount, action }) => {
    if (!cashbackId) return;

    try {
      await updateRedeemStatus({
        cashbackId,
        action,
        redeemAmount,
      });
      Alert.alert(
        action === "APPROVED" ? "Cashback approved" : "Cashback rejected",
        action === "APPROVED" ? "Redeem request approved." : "Redeem request rejected."
      );
      loadData();
    } catch (apiError) {
      Alert.alert("Unable to update", apiError.friendlyMessage || "Please try again.");
    }
  }, [loadData]);

  const [shownRedeemRequests, setShownRedeemRequests] = useState([]);

  const showRedeemRequestPopup = useCallback(data => {
    if (!data) return;

    const type = data.type || "REDEEM_REQUEST";
    const cashbackId = data.cashbackId || data.notificationId;
    const redeemAmount = Number(data.redeemAmount) || 0;

    if (type === "REDEEM_REQUEST") {
      if (!cashbackId || shownRedeemRequests.includes(cashbackId)) return;
      setShownRedeemRequests(prev => [...prev, cashbackId]);

      Alert.alert(
        "Redeem cashback request",
        `Approve redeem request of ${formatCurrency(redeemAmount)}?`,
        [
          {
            text: "Reject",
            style: "destructive",
            onPress: () => respondToRedeemRequest({
              cashbackId,
              redeemAmount,
              action: "REJECTED",
            }),
          },
          {
            text: "Approve",
            onPress: () => respondToRedeemRequest({
              cashbackId,
              redeemAmount,
              action: "APPROVED",
            }),
          },
        ]
      );
    } else if (type === "REDEEM_STATUS") {
      const approved = data.action === "APPROVED";
      Alert.alert(
        approved ? "Redeem request approved" : "Redeem request rejected",
        approved
          ? `Your cashback redeem request of ${formatCurrency(redeemAmount)} has been approved.`
          : "Your cashback redeem request was rejected."
      );
    }
  }, [respondToRedeemRequest, shownRedeemRequests]);

  useEffect(() => {
    if (!user?.userId) return;

    const socket = io("http://72.62.195.21:8000", {
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      socket.emit("register", user.userId);
    });

    socket.on("notification", payload => {
      showRedeemRequestPopup({
        type: payload.type || "REDEEM_REQUEST",
        cashbackId: payload.notificationId,
        redeemAmount: payload.redeemAmount,
        billAmount: payload.billAmount,
        message: payload.message,
      });
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
    });

    return () => {
      socket.disconnect();
    };
  }, [user?.userId, showRedeemRequestPopup]);

  const [seenPendingIds, setSeenPendingIds] = useState([]);

  useEffect(() => {
    const pendingRequests = metrics.transactions.filter(
      txn => txn.status === "PENDING" && txn.pendingRedeemAmount > 0
    );

    const newRequest = pendingRequests.find(txn => !seenPendingIds.includes(txn.id));
    if (newRequest) {
      setSeenPendingIds(prev => [...prev, newRequest.id]);
      showRedeemRequestPopup({
        type: "REDEEM_REQUEST",
        cashbackId: newRequest.id,
        redeemAmount: newRequest.pendingRedeemAmount || newRequest.cashback,
        billAmount: newRequest.billAmount,
      });
    }
  }, [metrics.transactions, showRedeemRequestPopup]);

  const screenProps = {
    user,
    shops,
    metrics,
    isLoading,
    error,
    refresh: loadData,
    signOut,
    setActiveTab,
    topInset: insets.top,
    bottomInset: insets.bottom,
  };

  return (
    <View style={styles.appShell}>
      <View style={styles.screen}>
        <TabTransition activeKey={activeTab}>
          {activeTab === "home" ? <HomeScreen {...screenProps} /> : null}
          {activeTab === "scan" ? <ScanScreen {...screenProps} /> : null}
          {activeTab === "wallet" ? <WalletScreen {...screenProps} /> : null}
          {activeTab === "offers" ? <OffersScreen {...screenProps} /> : null}
          {activeTab === "profile" ? <ProfileScreen {...screenProps} /> : null}
          {activeTab === "notifications" ? <NotificationsScreen {...screenProps} /> : null}
        </TabTransition>
      </View>
      <BottomTabs activeTab={activeTab} bottomInset={insets.bottom} onChange={setActiveTab} />
    </View>
  );
}

function HomeScreen({ user, metrics, isLoading, error, refresh, setActiveTab, topInset, bottomInset }) {
  return (
    <PullRefreshScrollView
      contentContainerStyle={[styles.scrollWithTabs, { paddingBottom: 92 + bottomInset }]}
      onRefresh={refresh}
      refreshing={isLoading}
    >
      <View style={[styles.homeHero, { paddingTop: 18 + topInset }]}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroKicker}>{getGreeting()},</Text>
            <Text style={styles.heroName}>{user?.name || "Customer"} 👋</Text>
          </View>
          <TouchableOpacity onPress={() => setActiveTab("notifications")} style={styles.bellButton}>
            <Text style={styles.bellIcon}>🔔</Text>
            {metrics.notifications.length ? <View style={styles.notificationDot} /> : null}
          </TouchableOpacity>
        </View>

        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>CASHBACK BALANCE</Text>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceAmount}>{formatCurrency(metrics.availableBalance)}</Text>
            <Text style={styles.memberPill}>Gold Member</Text>
          </View>
          <View style={styles.heroActions}>
            <TouchableOpacity style={styles.primaryHeroButton} onPress={() => setActiveTab("scan")}>
              <Text style={styles.primaryHeroButtonText}>▣ Scan & Earn</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryHeroButton} onPress={() => setActiveTab("wallet")}>
              <Text style={styles.secondaryHeroButtonText}>◇ Redeem</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.summaryPanel}>
        <SummaryItem label="Total Earned" value={formatCurrency(metrics.totalEarned)} />
        <SummaryDivider />
        <SummaryItem label="Redeemed" value={formatCurrency(metrics.redeemed)} />
        <SummaryDivider />
        <SummaryItem label="Transactions" value={String(metrics.transactions.length)} accent />
      </View>

      {error ? <Text style={styles.inlineError}>{error}</Text> : null}

      <SectionHeader title="Hot Offers" action="See all →" onPress={() => setActiveTab("offers")} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.offerRail}>
        {offers.slice(0, 4).map(offer => <OfferMiniCard key={offer.id} offer={offer} />)}
      </ScrollView>

      <SectionHeader title="Recent Activity" action="See all →" onPress={() => setActiveTab("wallet")} />
      {metrics.transactions.slice(0, 5).map(txn => <ActivityRow key={txn.id} txn={txn} />)}
      {!metrics.transactions.length ? <EmptyState title="No activity yet" subtitle="Your cashback activity will appear here." /> : null}
    </PullRefreshScrollView>
  );
}

function ScanScreen({ refresh, isLoading, topInset, bottomInset }) {
  return (
    <PullRefreshScrollView
      contentContainerStyle={[styles.scrollWithTabs, { paddingBottom: 92 + bottomInset }]}
      onRefresh={refresh}
      refreshing={isLoading}
    >
      <View style={[styles.simpleHero, { paddingTop: 24 + topInset }]}>
        <Text style={styles.simpleHeroTitle}>Scan & Earn</Text>
        <Text style={styles.simpleHeroSub}>Point at shop QR code to collect cashback</Text>
      </View>
      <View style={styles.qrFrame}>
        <Text style={styles.qrIcon}>▣</Text>
      </View>
      <Text style={styles.scanTitle}>Scan Shop QR Code</Text>
      <Text style={styles.scanText}>Position the QR inside the frame</Text>
      <View style={styles.shopCodeCard}>
        <Text style={styles.shopCodeLabel}>OR ENTER SHOP CODE</Text>
        <View style={styles.shopCodeInput}>
          <Text style={styles.shopCodeText}>A B C 1 2 3</Text>
        </View>
        <TouchableOpacity style={styles.enterCodeButton}>
          <Text style={styles.enterCodeText}>Enter Shop Code</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.rateCard}>
        <Text style={styles.rateLabel}>Current Rate</Text>
        <Text style={styles.rateValue}>5% Cashback</Text>
      </View>
    </PullRefreshScrollView>
  );
}

function WalletScreen({ metrics, isLoading, refresh, topInset, bottomInset }) {
  const [updatingId, setUpdatingId] = useState(null);

  const respondToRedeem = async (txn, action) => {
    setUpdatingId(txn.id);

    try {
      await updateRedeemStatus({
        cashbackId: txn.id,
        action,
        redeemAmount: txn.pendingRedeemAmount || txn.cashback,
      });
      Alert.alert("Redeem updated", `Redeem request ${action.toLowerCase()}.`);
      refresh();
    } catch (apiError) {
      Alert.alert("Unable to update", apiError.friendlyMessage || "Please try again.");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <PullRefreshScrollView
      contentContainerStyle={[styles.scrollWithTabs, { paddingBottom: 92 + bottomInset }]}
      onRefresh={refresh}
      refreshing={isLoading}
    >
      <View style={[styles.walletHero, { paddingTop: 22 + topInset }]}>
        <Text style={styles.simpleHeroTitle}>My Wallet</Text>
        <View style={styles.walletBalanceCard}>
          <Text style={styles.balanceLabel}>AVAILABLE BALANCE</Text>
          <Text style={styles.balanceAmount}>{formatCurrency(metrics.availableBalance)}</Text>
          <View style={styles.walletStats}>
            <WalletStat label="Earned" value={formatCurrency(metrics.totalEarned)} />
            <WalletStat label="Redeemed" value={formatCurrency(metrics.redeemed)} />
          </View>
        </View>
      </View>

      <Text style={styles.pageSectionTitle}>Transaction History</Text>
      {metrics.transactions.map(txn => (
        <WalletTxnRow
          key={txn.id}
          onRespond={respondToRedeem}
          txn={txn}
          updating={updatingId === txn.id}
        />
      ))}
      {!metrics.transactions.length ? <EmptyState title="No wallet transactions" subtitle="Cashback earned and redeemed will appear here." /> : null}
    </PullRefreshScrollView>
  );
}

function OffersScreen({ refresh, isLoading, bottomInset }) {
  return (
    <PullRefreshScrollView
      contentContainerStyle={[styles.scrollWithTabs, styles.offersScreen, { paddingBottom: 92 + bottomInset }]}
      onRefresh={refresh}
      refreshing={isLoading}
    >
      <View style={styles.offersHero}>
        <Text style={styles.simpleHeroTitle}>My Offers</Text>
        <Text style={styles.simpleHeroSub}>Exclusive deals from your favourite shops</Text>
      </View>
      {offers.slice(0, 3).map(offer => <OfferCard key={offer.id} offer={offer} />)}
    </PullRefreshScrollView>
  );
}

function NotificationsScreen({ metrics, refresh, isLoading, topInset, bottomInset }) {
  return (
    <PullRefreshScrollView
      contentContainerStyle={[styles.scrollWithTabs, { paddingBottom: 92 + bottomInset }]}
      onRefresh={refresh}
      refreshing={isLoading}
    >
      <View style={[styles.simpleHero, { paddingTop: 24 + topInset }]}>
        <Text style={styles.simpleHeroTitle}>Notifications</Text>
        <Text style={styles.simpleHeroSub}>Redeem approvals and cashback updates</Text>
      </View>
      {metrics.notifications.map(item => <NotificationRow item={item} key={item.id} />)}
      {!metrics.notifications.length ? <EmptyState title="No notifications" subtitle="Redeem requests and status updates will appear here." /> : null}
    </PullRefreshScrollView>
  );
}

function ProfileScreen({ user, metrics, signOut, refresh, isLoading, setActiveTab, topInset, bottomInset }) {
  const [mode, setMode] = useState("profile");

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (mode === "edit") {
        setMode("profile");
        return true;
      }

      return false;
    });

    return () => subscription.remove();
  }, [mode]);

  if (mode === "edit") {
    return (
      <EditProfileScreen
        bottomInset={bottomInset}
        metrics={metrics}
        onBack={() => setMode("profile")}
        topInset={topInset}
        user={user}
      />
    );
  }

  const menu = [
    { icon: "👤", label: "Edit Profile", onPress: () => setMode("edit") },
    { icon: "🔔", label: "Notifications", onPress: () => setActiveTab("notifications") },
    { icon: "🔒", label: "Privacy & Security" },
    { icon: "☎", label: "Help & Support" },
    { icon: "⭐", label: "Rate the App" },
    { icon: "ℹ", label: "About CashBack" },
  ];

  return (
    <PullRefreshScrollView
      contentContainerStyle={[styles.scrollWithTabs, { paddingBottom: 92 + bottomInset }]}
      onRefresh={refresh}
      refreshing={isLoading}
    >
      <View style={[styles.profileHero, { paddingTop: 22 + topInset }]}>
        <View style={styles.profileAvatar}>
          <Text style={styles.profileAvatarText}>👤</Text>
        </View>
        <Text style={styles.profileName}>{user?.name || "Customer"}</Text>
        <Text style={styles.profilePhone}>+91 {user?.mobile || ""}</Text>
        <Text style={styles.memberPill}>Gold Member</Text>
      </View>

      <View style={styles.profileSummary}>
        <SummaryItem label="Balance" value={formatCurrency(metrics.availableBalance)} />
        <SummaryDivider />
        <SummaryItem label="Earned" value={formatCurrency(metrics.totalEarned)} />
        <SummaryDivider />
        <SummaryItem label="Txns" value={String(metrics.transactions.length)} />
      </View>

      <View style={styles.settingsList}>
        {menu.map(item => (
          <TouchableOpacity key={item.label} onPress={item.onPress} style={styles.settingsRow}>
            <Text style={styles.settingsIcon}>{item.icon}</Text>
            <Text style={styles.settingsLabel}>{item.label}</Text>
            <Text style={styles.settingsArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity onPress={signOut} style={styles.signOutButton}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </PullRefreshScrollView>
  );
}

function EditProfileScreen({ bottomInset, metrics, onBack, topInset, user }) {
  const [cashbackAlerts, setCashbackAlerts] = useState(true);
  const [offerNotifications, setOfferNotifications] = useState(true);
  const [promotionalMessages, setPromotionalMessages] = useState(false);

  return (
    <PullRefreshScrollView
      contentContainerStyle={[styles.editProfileScroll, { paddingBottom: 32 + bottomInset }]}
      onRefresh={() => {}}
      refreshing={false}
    >
      <View style={[styles.editHero, { paddingTop: 14 + topInset }]}>
        <View style={styles.editTopBar}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.editTitle}>Edit Profile</Text>
          <View style={styles.editTopSpacer} />
        </View>
        <View style={styles.editAvatarWrap}>
          <Text style={styles.editAvatarIcon}>👤</Text>
          <View style={styles.cameraDot} />
        </View>
        <Text style={styles.editName}>{user?.name || "Customer"}</Text>
        <Text style={styles.editMemberPill}>Gold Member</Text>
      </View>

      <EditSection title="PERSONAL INFO">
        <InfoRow label="FULL NAME" value={user?.name || "Customer"} />
        <InfoRow label="DATE OF BIRTH" value="14 March 1995" />
        <View style={styles.infoRow}>
          <View style={styles.infoIcon} />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>GENDER</Text>
            <View style={styles.genderRow}>
              {["Female", "Male", "Other"].map((item, index) => (
                <TouchableOpacity
                  key={item}
                  style={[styles.genderPill, index === 0 ? styles.genderPillActive : null]}
                >
                  <Text style={[styles.genderText, index === 0 ? styles.genderTextActive : null]}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </EditSection>

      <EditSection title="CONTACT DETAILS">
        <InfoRow label="PHONE NUMBER" value={`+91    ${user?.mobile || "98765 43210"}`} />
        <InfoRow label="EMAIL ADDRESS" value={user?.email || "priya.sharma@gmail.com"} />
        <InfoRow label="CITY" value="Mumbai" />
      </EditSection>

      <EditSection title="MEMBERSHIP">
        <View style={styles.membershipRow}>
          <View style={styles.memberIcon} />
          <View style={styles.memberInfo}>
            <Text style={styles.infoLabel}>CURRENT TIER</Text>
            <Text style={styles.memberChip}>Gold Member</Text>
          </View>
          <Text style={styles.memberEarned}>{formatCurrency(metrics.totalEarned)} earned</Text>
        </View>
      </EditSection>

      <EditSection title="NOTIFICATIONS">
        <ToggleRow
          enabled={cashbackAlerts}
          label="Cashback alerts"
          onChange={setCashbackAlerts}
          subtitle="Get notified when cashback is credited"
        />
        <ToggleRow
          enabled={offerNotifications}
          label="Offer notifications"
          onChange={setOfferNotifications}
          subtitle="New deals from your favourite shops"
        />
        <ToggleRow
          enabled={promotionalMessages}
          label="Promotional messages"
          onChange={setPromotionalMessages}
          subtitle="Special campaigns and seasonal deals"
        />
      </EditSection>

      <TouchableOpacity style={styles.saveChangesButton}>
        <Text style={styles.saveChangesText}>Save changes</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.deleteAccountButton}>
        <Text style={styles.deleteAccountText}>Delete account</Text>
      </TouchableOpacity>
    </PullRefreshScrollView>
  );
}

function EditSection({ children, title }) {
  return (
    <View style={styles.editSection}>
      <Text style={styles.editSectionTitle}>{title}</Text>
      <View style={styles.editCard}>{children}</View>
    </View>
  );
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon} />
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function ToggleRow({ enabled, label, onChange, subtitle }) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.infoIcon} />
      <View style={styles.toggleTextWrap}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleSubtitle}>{subtitle}</Text>
      </View>
      <Switch
        onValueChange={onChange}
        thumbColor="#ffffff"
        trackColor={{ false: "#d7e7de", true: "#18733b" }}
        value={enabled}
      />
    </View>
  );
}

function BottomTabs({ activeTab, bottomInset, onChange }) {
  return (
    <View style={[styles.bottomTabs, { minHeight: 64 + bottomInset, paddingBottom: Math.max(bottomInset, 8) }]}>
      {tabs.map(tab => {
        const active = activeTab === tab.key;
        return (
          <TouchableOpacity key={tab.key} onPress={() => onChange(tab.key)} style={styles.bottomTab}>
            <Text style={[styles.bottomIcon, active ? styles.bottomActive : null]}>{tab.icon}</Text>
            <Text style={[styles.bottomLabel, active ? styles.bottomActive : null]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function SummaryItem({ label, value, accent }) {
  return (
    <View style={styles.summaryItem}>
      <Text style={[styles.summaryValue, accent ? styles.summaryAccent : null]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function SummaryDivider() {
  return <View style={styles.summaryDivider} />;
}

function SectionHeader({ title, action, onPress }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? (
        <TouchableOpacity onPress={onPress}>
          <Text style={styles.sectionAction}>{action}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function OfferMiniCard({ offer }) {
  return (
    <View style={styles.offerMiniCard}>
      <Text style={styles.offerMiniPercent}>{offer.cashback}</Text>
      <Text style={styles.offerMiniShop}>{offer.shop}</Text>
      <Text style={styles.offerMiniMeta}>Min {offer.min} · Exp {offer.expiry}</Text>
    </View>
  );
}

function OfferCard({ offer }) {
  return (
    <View style={styles.offerCard}>
      <View style={styles.offerIconBox}>
        <Text style={styles.offerPercent}>{offer.cashback}</Text>
      </View>
      <View style={styles.offerInfo}>
        <Text style={styles.offerShop}>{offer.shop}</Text>
        <Text style={styles.offerMeta}>Min spend {offer.min} · Expires {offer.expiry}</Text>
      </View>
      <TouchableOpacity style={styles.useOfferButton}>
        <Text style={styles.useOfferText}>Use</Text>
      </TouchableOpacity>
    </View>
  );
}

function NotificationRow({ item }) {
  const isApproved = item.status === "APPROVED";
  const isRejected = item.status === "REJECTED";

  return (
    <View style={styles.activityCard}>
      <View style={styles.activityRow}>
        <View style={[
          styles.activityIcon,
          isApproved ? styles.activityApprovedIcon : null,
          isRejected ? styles.activityRejectedIcon : null,
        ]}>
          <Text style={styles.activityArrow}>{isRejected ? "×" : "✓"}</Text>
        </View>
        <View style={styles.activityMiddle}>
          <Text style={styles.activityShop}>{item.title}</Text>
          <Text style={styles.activityMeta}>{item.timeLabel}</Text>
          <Text style={styles.activityBill}>Bill {formatCurrency(item.billAmount)}</Text>
        </View>
        <Text style={[
          styles.activityCashback,
          isApproved ? styles.approvedText : null,
          isRejected ? styles.rejectedText : null,
        ]}>
          {formatCurrency(item.amount)}
        </Text>
      </View>
    </View>
  );
}

function ActivityRow({ txn, onRespond, updating }) {
  const isApproved = txn.status === "APPROVED" || txn.redeemcashback;
  const isRejected = txn.status === "REJECTED";
  const displayCashback = isApproved ? (txn.redeemedAmount || txn.issuedCashback || txn.pendingRedeemAmount || txn.cashback) : (txn.pendingRedeemAmount || txn.cashback);
  const canRespond = onRespond && txn.status === "PENDING" && !txn.redeemcashback && txn.pendingRedeemAmount > 0;

  return (
    <View style={styles.activityCard}>
      <View style={styles.activityRow}>
        <View style={[
          styles.activityIcon,
          isApproved ? styles.activityApprovedIcon : null,
          isRejected ? styles.activityRejectedIcon : null,
        ]}>
          <Text style={styles.activityArrow}>{isRejected ? "×" : isApproved ? "✓" : "↑"}</Text>
        </View>
        <View style={styles.activityMiddle}>
          <Text style={styles.activityShop}>{txn.shopName}</Text>
          <Text style={styles.activityMeta}>{txn.timeLabel}</Text>
        </View>
        <View style={styles.activityRight}>
          <Text style={[
            styles.activityCashback,
            isApproved ? styles.approvedText : null,
            isRejected ? styles.rejectedText : null,
          ]}>
            {formatCurrency(displayCashback)}
          </Text>
          <Text style={styles.activityBill}>{formatCurrency(txn.billAmount)} spent</Text>
          {txn.issuedAt ? <Text style={styles.activityMeta}>Issued at {txn.issuedAt}</Text> : null}
          {txn.redeemedAt ? <Text style={styles.activityMeta}>Redeemed at {txn.redeemedAt}</Text> : null}
        </View>
      </View>
      {canRespond ? (
        <View style={styles.redeemActions}>
          <TouchableOpacity
            disabled={updating}
            onPress={() => onRespond(txn, "APPROVED")}
            style={[styles.redeemButton, styles.approveButton]}
          >
            <Text style={styles.approveText}>{updating ? "Updating..." : "Approve Redeem"}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            disabled={updating}
            onPress={() => onRespond(txn, "REJECTED")}
            style={[styles.redeemButton, styles.rejectButton]}
          >
            <Text style={styles.rejectText}>Reject</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

function WalletTxnRow({ txn, onRespond, updating }) {
  return <ActivityRow onRespond={onRespond} txn={txn} updating={updating} />;
}

function WalletStat({ label, value }) {
  return (
    <View style={styles.walletStat}>
      <Text style={styles.walletStatLabel}>{label}</Text>
      <Text style={styles.walletStatValue}>{value}</Text>
    </View>
  );
}

function EmptyState({ title, subtitle }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{subtitle}</Text>
    </View>
  );
}

function buildCustomerMetrics(shops) {
  const transactions = shops.flatMap(shop =>
    (shop.cashbackHistory || []).map((history, index) => {
      const status = history.redeemStatus || (history.redeemcashback ? "APPROVED" : "PENDING");
      const activityDate = status === "APPROVED" ? (history.redeemedAt || history.date) : history.date;
      const redeemedAmount = Number(history.redeemedAmount)
        || (status === "APPROVED" ? Number(history.issuedCashback) || Number(history.pendingRedeemAmount) || Number(history.cashback) || 0 : 0);

      return {
        id: history.cashbackId || history.cashbackid || `${shop.shopkeeperId}-${index}`,
        shopName: history.shopName || shop.shopName || "CashBack Partner",
        cashback: Number(history.cashback) || 0,
        issuedCashback: Number(history.issuedCashback) || Number(history.cashback) || redeemedAmount,
        redeemedAmount,
        pendingRedeemAmount: Number(history.pendingRedeemAmount) || 0,
        billAmount: Number(history.billAmount) || 0,
        status,
        redeemcashback: Boolean(history.redeemcashback),
        rawDate: activityDate,
        issuedAt: history.date,
        redeemedAt: history.redeemedAt,
        timeLabel: formatActivityDate(activityDate),
      };
    })
  );

  const sortedTransactions = transactions.sort((a, b) => parseMaybeDate(b.rawDate) - parseMaybeDate(a.rawDate));
  const totalEarned = sortedTransactions.reduce((sum, txn) => sum + txn.issuedCashback, 0);
  const redeemed = sortedTransactions
    .filter(txn => txn.status === "APPROVED" || txn.redeemcashback)
    .reduce((sum, txn) => sum + txn.redeemedAmount, 0);
  const notifications = sortedTransactions
    .filter(txn => txn.pendingRedeemAmount > 0 || txn.status === "APPROVED" || txn.status === "REJECTED")
    .map(txn => ({
      id: `notification-${txn.id}`,
      title: txn.status === "APPROVED"
        ? "Cashback redeem approved"
        : txn.status === "REJECTED"
          ? "Cashback redeem rejected"
          : "Redeem cashback request",
      status: txn.status,
      amount: txn.status === "APPROVED" ? txn.redeemedAmount : (txn.pendingRedeemAmount || txn.cashback),
      billAmount: txn.billAmount,
      timeLabel: txn.timeLabel,
    }));

  return {
    transactions: sortedTransactions,
    notifications,
    totalEarned,
    redeemed,
    availableBalance: sortedTransactions.reduce((sum, txn) => sum + txn.cashback, 0),
  };
}

function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 1 })}`;
}

function parseMaybeDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatActivityDate(value) {
  const date = parseMaybeDate(value);
  if (!date) return "Recently";
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const time = date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

  if (date.toDateString() === today.toDateString()) return `Today, ${time}`;
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday, ${time}`;
  return `${date.toLocaleDateString("en-IN", { month: "short", day: "numeric" })}, ${time}`;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const styles = StyleSheet.create({
  appShell: {
    flex: 1,
    backgroundColor: "#f4f8f5",
  },
  screen: {
    flex: 1,
    backgroundColor: "#f4f8f5",
  },
  scrollWithTabs: {
    paddingBottom: 92,
  },
  homeHero: {
    backgroundColor: "#18733b",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    padding: 18,
    paddingBottom: 34,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 22,
  },
  heroKicker: {
    color: "#d4eadb",
    fontSize: 14,
  },
  heroName: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "900",
    marginTop: 6,
  },
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  bellIcon: {
    fontSize: 28,
  },
  notificationDot: {
    position: "absolute",
    right: 7,
    top: 5,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#f3c331",
  },
  balanceCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    backgroundColor: "rgba(255,255,255,0.15)",
    padding: 20,
  },
  balanceLabel: {
    color: "#d4eadb",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    marginBottom: 20,
  },
  balanceAmount: {
    color: "#ffffff",
    fontSize: 34,
    fontWeight: "900",
    marginRight: 12,
  },
  memberPill: {
    alignSelf: "center",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "rgba(245,178,27,0.45)",
    color: "#ffb11a",
    fontSize: 12,
    fontWeight: "900",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  heroActions: {
    flexDirection: "row",
    gap: 12,
  },
  primaryHeroButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryHeroButtonText: {
    color: "#18733b",
    fontWeight: "900",
  },
  secondaryHeroButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryHeroButtonText: {
    color: "#ffffff",
    fontWeight: "900",
  },
  summaryPanel: {
    marginHorizontal: 16,
    marginTop: -18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#cfe0d5",
    backgroundColor: "#ffffff",
    flexDirection: "row",
    paddingVertical: 16,
    marginBottom: 14,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryValue: {
    color: "#18733b",
    fontSize: 16,
    fontWeight: "900",
  },
  summaryAccent: {
    color: "#f59e0b",
  },
  summaryLabel: {
    color: "#66766a",
    fontSize: 11,
    marginTop: 6,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: "#d8e5de",
  },
  inlineError: {
    color: "#dc2626",
    marginHorizontal: 18,
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 18,
    marginTop: 4,
    marginBottom: 12,
  },
  sectionTitle: {
    color: "#122018",
    fontSize: 17,
    fontWeight: "900",
  },
  sectionAction: {
    color: "#18733b",
    fontSize: 12,
    fontWeight: "900",
  },
  offerRail: {
    paddingLeft: 16,
    paddingRight: 8,
    gap: 12,
    marginBottom: 18,
  },
  offerMiniCard: {
    width: 142,
    minHeight: 100,
    borderRadius: 14,
    backgroundColor: "#18733b",
    padding: 14,
    justifyContent: "space-between",
  },
  offerMiniPercent: {
    color: "#ffb11a",
    fontSize: 22,
    fontWeight: "900",
  },
  offerMiniShop: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "900",
  },
  offerMiniMeta: {
    color: "#d4eadb",
    fontSize: 10,
  },
  activityCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#cfe0d5",
    backgroundColor: "#ffffff",
  },
  activityRow: {
    minHeight: 66,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  activityIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#e9f4de",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  activityRedeemIcon: {
    backgroundColor: "#fdeceb",
  },
  activityApprovedIcon: {
    backgroundColor: "#dcfce7",
  },
  activityRejectedIcon: {
    backgroundColor: "#fee2e2",
  },
  activityArrow: {
    color: "#122018",
    fontSize: 20,
    fontWeight: "900",
  },
  activityMiddle: {
    flex: 1,
  },
  activityShop: {
    color: "#122018",
    fontWeight: "900",
  },
  activityMeta: {
    color: "#66766a",
    fontSize: 12,
    marginTop: 4,
  },
  activityRight: {
    alignItems: "flex-end",
  },
  activityCashback: {
    color: "#18733b",
    fontWeight: "900",
    marginBottom: 5,
  },
  redeemedText: {
    color: "#dc2626",
  },
  approvedText: {
    color: "#18733b",
  },
  rejectedText: {
    color: "#dc2626",
  },
  activityBill: {
    color: "#66766a",
    fontSize: 12,
  },
  redeemActions: {
    borderTopWidth: 1,
    borderTopColor: "#d9e5de",
    flexDirection: "row",
    gap: 10,
    padding: 12,
  },
  redeemButton: {
    alignItems: "center",
    borderRadius: 10,
    flex: 1,
    minHeight: 42,
    justifyContent: "center",
  },
  approveButton: {
    backgroundColor: "#18733b",
  },
  rejectButton: {
    backgroundColor: "#fff1f1",
    borderColor: "#ef4444",
    borderWidth: 1,
  },
  approveText: {
    color: "#ffffff",
    fontWeight: "900",
  },
  rejectText: {
    color: "#ef4444",
    fontWeight: "900",
  },
  simpleHero: {
    backgroundColor: "#18733b",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    padding: 20,
    paddingBottom: 34,
    marginBottom: 18,
  },
  simpleHeroTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "900",
  },
  simpleHeroSub: {
    color: "#d4eadb",
    marginTop: 8,
  },
  qrFrame: {
    alignItems: "center",
    alignSelf: "center",
    borderColor: "#18733b",
    borderRadius: 10,
    borderWidth: 3,
    height: 164,
    justifyContent: "center",
    marginTop: 22,
    width: 164,
  },
  qrIcon: {
    color: "#f8fbf9",
    fontSize: 58,
  },
  shopCodeCard: {
    marginHorizontal: 30,
    marginTop: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#cfe0d5",
    backgroundColor: "#ffffff",
    padding: 14,
    alignItems: "center",
  },
  scanTitle: {
    color: "#122018",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 18,
    textAlign: "center",
  },
  scanText: {
    color: "#66766a",
    textAlign: "center",
    lineHeight: 22,
  },
  shopCodeLabel: {
    color: "#66766a",
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 8,
  },
  shopCodeInput: {
    alignItems: "center",
    borderColor: "#cfe0d5",
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 52,
    width: "100%",
  },
  shopCodeText: {
    color: "#66766a",
    fontSize: 18,
    fontWeight: "900",
  },
  enterCodeButton: {
    alignItems: "center",
    backgroundColor: "#18733b",
    borderRadius: 12,
    justifyContent: "center",
    minHeight: 48,
    marginTop: 12,
    width: "100%",
  },
  enterCodeText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
  },
  rateCard: {
    alignItems: "center",
    backgroundColor: "#e8f4ed",
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 40,
    marginTop: 18,
    minHeight: 48,
    paddingHorizontal: 18,
  },
  rateLabel: {
    color: "#18733b",
    fontWeight: "800",
  },
  rateValue: {
    color: "#18733b",
    fontSize: 18,
    fontWeight: "900",
  },
  walletHero: {
    backgroundColor: "#18733b",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    padding: 20,
    paddingBottom: 32,
    marginBottom: 24,
  },
  walletBalanceCard: {
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.15)",
    padding: 18,
    marginTop: 16,
  },
  walletStats: {
    flexDirection: "row",
    gap: 10,
  },
  walletStat: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.13)",
    padding: 12,
  },
  walletStatLabel: {
    color: "#d4eadb",
    fontSize: 11,
    fontWeight: "800",
  },
  walletStatValue: {
    color: "#ffffff",
    fontWeight: "900",
    marginTop: 6,
  },
  pageSectionTitle: {
    marginHorizontal: 18,
    marginBottom: 12,
    color: "#122018",
    fontSize: 17,
    fontWeight: "900",
  },
  offersScreen: {
    paddingTop: 0,
  },
  offersHero: {
    backgroundColor: "#18733b",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 28,
    marginBottom: 18,
  },
  offerCard: {
    marginHorizontal: 22,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#cfe0d5",
    backgroundColor: "#ffffff",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  offerIconBox: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: "#e6f3ed",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  offerInfo: {
    flex: 1,
  },
  offerShop: {
    color: "#122018",
    fontWeight: "900",
    marginBottom: 6,
  },
  categoryPill: {
    alignSelf: "flex-start",
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#fff2cf",
    color: "#8a5a00",
    fontSize: 11,
    fontWeight: "900",
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  offerMeta: {
    color: "#66766a",
    fontSize: 12,
  },
  offerPercent: {
    color: "#18733b",
    fontSize: 16,
    fontWeight: "900",
  },
  useOfferButton: {
    alignItems: "center",
    backgroundColor: "#18733b",
    borderRadius: 9,
    minHeight: 28,
    justifyContent: "center",
    paddingHorizontal: 15,
  },
  useOfferText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "900",
  },
  profileHero: {
    backgroundColor: "#18733b",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    alignItems: "center",
    padding: 22,
    paddingBottom: 40,
    marginBottom: 18,
  },
  profileAvatar: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  profileAvatarText: {
    fontSize: 42,
  },
  profileName: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "900",
  },
  profilePhone: {
    color: "#d4eadb",
    marginTop: 6,
    marginBottom: 12,
  },
  profileSummary: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#cfe0d5",
    backgroundColor: "#ffffff",
    flexDirection: "row",
    paddingVertical: 14,
    marginBottom: 14,
  },
  settingsList: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#cfe0d5",
    backgroundColor: "#ffffff",
    overflow: "hidden",
  },
  settingsRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#d9e5de",
    paddingHorizontal: 16,
  },
  settingsIcon: {
    fontSize: 25,
    width: 44,
  },
  settingsLabel: {
    flex: 1,
    color: "#122018",
    fontSize: 15,
  },
  settingsArrow: {
    color: "#66766a",
    fontSize: 18,
  },
  signOutButton: {
    margin: 16,
    minHeight: 54,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ef4444",
    backgroundColor: "#fff1f1",
    alignItems: "center",
    justifyContent: "center",
  },
  signOutText: {
    color: "#ef4444",
    fontWeight: "900",
  },
  editProfileScroll: {
    backgroundColor: "#fbfdfb",
  },
  editHero: {
    alignItems: "center",
    backgroundColor: "#18733b",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingHorizontal: 16,
    paddingBottom: 24,
    marginBottom: 12,
  },
  editTopBar: {
    alignItems: "center",
    alignSelf: "stretch",
    flexDirection: "row",
    marginBottom: 18,
  },
  backButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 9,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  backButtonText: {
    color: "#ffffff",
    fontSize: 28,
    lineHeight: 30,
  },
  editTitle: {
    color: "#ffffff",
    flex: 1,
    fontSize: 17,
    fontWeight: "900",
    marginLeft: 12,
  },
  editTopSpacer: {
    width: 34,
  },
  editAvatarWrap: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.22)",
    borderColor: "rgba(255,255,255,0.45)",
    borderRadius: 18,
    borderWidth: 1,
    height: 76,
    justifyContent: "center",
    marginBottom: 10,
    width: 76,
  },
  editAvatarIcon: {
    fontSize: 39,
  },
  cameraDot: {
    backgroundColor: "#ffb11a",
    borderRadius: 10,
    bottom: 5,
    height: 20,
    position: "absolute",
    right: -6,
    width: 20,
  },
  editName: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
  },
  editMemberPill: {
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 10,
    color: "#d4eadb",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 6,
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  editSection: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  editSectionTitle: {
    color: "#38513f",
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 7,
  },
  editCard: {
    backgroundColor: "#ffffff",
    borderColor: "#cfe0d5",
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  infoRow: {
    alignItems: "center",
    borderBottomColor: "#d9e5de",
    borderBottomWidth: 1,
    flexDirection: "row",
    minHeight: 56,
    paddingHorizontal: 12,
  },
  infoIcon: {
    backgroundColor: "#e8f4ed",
    borderRadius: 8,
    height: 32,
    marginRight: 12,
    width: 32,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    color: "#38513f",
    fontSize: 11,
    fontWeight: "900",
  },
  infoValue: {
    color: "#111827",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 2,
  },
  genderRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  genderPill: {
    alignItems: "center",
    borderColor: "#cfe0d5",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 30,
    justifyContent: "center",
  },
  genderPillActive: {
    borderColor: "#18733b",
    backgroundColor: "#e8f4ed",
  },
  genderText: {
    color: "#38513f",
    fontSize: 12,
    fontWeight: "800",
  },
  genderTextActive: {
    color: "#18733b",
  },
  membershipRow: {
    alignItems: "center",
    flexDirection: "row",
    minHeight: 58,
    paddingHorizontal: 12,
  },
  memberIcon: {
    backgroundColor: "#fff2cf",
    borderRadius: 8,
    height: 32,
    marginRight: 12,
    width: 32,
  },
  memberInfo: {
    flex: 1,
  },
  memberChip: {
    alignSelf: "flex-start",
    backgroundColor: "#fff2cf",
    borderRadius: 8,
    color: "#c78300",
    fontSize: 11,
    fontWeight: "900",
    marginTop: 3,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  memberEarned: {
    color: "#66766a",
    fontSize: 11,
  },
  toggleRow: {
    alignItems: "center",
    borderBottomColor: "#d9e5de",
    borderBottomWidth: 1,
    flexDirection: "row",
    minHeight: 62,
    paddingHorizontal: 12,
  },
  toggleTextWrap: {
    flex: 1,
  },
  toggleLabel: {
    color: "#111827",
    fontSize: 13,
    fontWeight: "900",
  },
  toggleSubtitle: {
    color: "#66766a",
    fontSize: 10,
    marginTop: 2,
  },
  saveChangesButton: {
    alignItems: "center",
    backgroundColor: "#18733b",
    borderRadius: 10,
    justifyContent: "center",
    marginHorizontal: 16,
    minHeight: 50,
    marginTop: 4,
  },
  saveChangesText: {
    color: "#ffffff",
    fontWeight: "900",
  },
  deleteAccountButton: {
    alignItems: "center",
    backgroundColor: "#fff1f1",
    borderColor: "#ef4444",
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
    marginHorizontal: 16,
    minHeight: 48,
    marginTop: 10,
  },
  deleteAccountText: {
    color: "#ef4444",
    fontWeight: "900",
  },
  emptyState: {
    margin: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#cfe0d5",
    backgroundColor: "#ffffff",
    padding: 20,
    alignItems: "center",
  },
  emptyTitle: {
    color: "#122018",
    fontWeight: "900",
    marginBottom: 6,
  },
  emptyText: {
    color: "#66766a",
    textAlign: "center",
  },
  bottomTabs: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 64,
    borderTopWidth: 1,
    borderTopColor: "#d9e5de",
    backgroundColor: "#ffffff",
    flexDirection: "row",
    paddingTop: 8,
    paddingBottom: 8,
  },
  bottomTab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomIcon: {
    color: "#66766a",
    fontSize: 23,
    fontWeight: "900",
  },
  bottomLabel: {
    color: "#66766a",
    fontSize: 11,
    marginTop: 3,
  },
  bottomActive: {
    color: "#18733b",
    fontWeight: "900",
  },
});
