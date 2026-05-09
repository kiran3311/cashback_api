import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
          <TouchableOpacity style={styles.bellButton}>
            <Text style={styles.bellIcon}>🔔</Text>
            <View style={styles.notificationDot} />
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
        <Text style={styles.simpleHeroSub}>Show your mobile number or customer ID at the store.</Text>
      </View>
      <View style={styles.scanCard}>
        <Text style={styles.scanIcon}>▣</Text>
        <Text style={styles.scanTitle}>Customer QR Coming Soon</Text>
        <Text style={styles.scanText}>For now, share your registered mobile number with the shopkeeper to receive cashback.</Text>
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
        redeemAmount: txn.cashback,
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
      <Text style={styles.offersTitle}>Offers for You</Text>
      {offers.map(offer => <OfferCard key={offer.id} offer={offer} />)}
    </PullRefreshScrollView>
  );
}

function ProfileScreen({ user, metrics, signOut, refresh, isLoading, topInset, bottomInset }) {
  const menu = [
    { icon: "👤", label: "Edit Profile" },
    { icon: "🔔", label: "Notifications" },
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
          <TouchableOpacity key={item.label} style={styles.settingsRow}>
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
        <Text style={styles.offerIcon}>{offer.icon}</Text>
      </View>
      <View style={styles.offerInfo}>
        <Text style={styles.offerShop}>{offer.shop}</Text>
        <Text style={styles.categoryPill}>{offer.category}</Text>
        <Text style={styles.offerMeta}>Min {offer.min} · Expires {offer.expiry}</Text>
      </View>
      <View style={styles.offerCashback}>
        <Text style={styles.offerPercent}>{offer.cashback}</Text>
        <Text style={styles.cashbackText}>cashback</Text>
      </View>
    </View>
  );
}

function ActivityRow({ txn, onRespond, updating }) {
  const redeemed = txn.status === "APPROVED" || txn.redeemcashback;
  const canRespond = onRespond && txn.status === "PENDING" && !txn.redeemcashback && txn.cashback > 0;

  return (
    <View style={styles.activityCard}>
      <View style={styles.activityRow}>
        <View style={[styles.activityIcon, redeemed ? styles.activityRedeemIcon : null]}>
          <Text style={styles.activityArrow}>{redeemed ? "↓" : "↑"}</Text>
        </View>
        <View style={styles.activityMiddle}>
          <Text style={styles.activityShop}>{txn.shopName}</Text>
          <Text style={styles.activityMeta}>{txn.timeLabel}</Text>
        </View>
        <View style={styles.activityRight}>
          <Text style={[styles.activityCashback, redeemed ? styles.redeemedText : null]}>
            {redeemed ? "-" : "+"}{formatCurrency(txn.cashback)}
          </Text>
          <Text style={styles.activityBill}>{formatCurrency(txn.billAmount)} spent</Text>
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
    (shop.cashbackHistory || []).map((history, index) => ({
      id: history.cashbackId || history.cashbackid || `${shop.shopkeeperId}-${index}`,
      shopName: history.shopName || shop.shopName || "CashBack Partner",
      cashback: Number(history.cashback) || 0,
      billAmount: Number(history.billAmount) || 0,
      status: history.redeemStatus || (history.redeemcashback ? "APPROVED" : "PENDING"),
      redeemcashback: Boolean(history.redeemcashback),
      rawDate: history.date,
      timeLabel: formatActivityDate(history.date),
    }))
  );

  const sortedTransactions = transactions.sort((a, b) => parseMaybeDate(b.rawDate) - parseMaybeDate(a.rawDate));
  const totalEarned = sortedTransactions.reduce((sum, txn) => sum + txn.cashback, 0);
  const redeemed = sortedTransactions
    .filter(txn => txn.status === "APPROVED" || txn.redeemcashback)
    .reduce((sum, txn) => sum + txn.cashback, 0);

  return {
    transactions: sortedTransactions,
    totalEarned,
    redeemed,
    availableBalance: Math.max(totalEarned - redeemed, 0),
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
  scanCard: {
    margin: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#cfe0d5",
    backgroundColor: "#ffffff",
    padding: 24,
    alignItems: "center",
  },
  scanIcon: {
    fontSize: 60,
    color: "#18733b",
    marginBottom: 14,
  },
  scanTitle: {
    color: "#122018",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 8,
  },
  scanText: {
    color: "#66766a",
    textAlign: "center",
    lineHeight: 22,
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
    paddingTop: 18,
  },
  offersTitle: {
    marginHorizontal: 16,
    marginBottom: 16,
    color: "#122018",
    fontSize: 20,
    fontWeight: "900",
  },
  offerCard: {
    marginHorizontal: 14,
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
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: "#e6f3ed",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  offerIcon: {
    fontSize: 30,
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
  offerCashback: {
    alignItems: "flex-end",
  },
  offerPercent: {
    color: "#18733b",
    fontSize: 22,
    fontWeight: "900",
  },
  cashbackText: {
    color: "#66766a",
    fontSize: 11,
    marginTop: 4,
  },
  profileHero: {
    backgroundColor: "#18733b",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    alignItems: "center",
    padding: 20,
    paddingBottom: 34,
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
