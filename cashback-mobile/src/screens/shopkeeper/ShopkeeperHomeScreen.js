import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getCustomerByMobileNo } from "../../api/customerApi";
import {
  addCashbackToExistingCustomer,
  addUserToShop,
  getCustomerListByShopkeeperId,
  getShopsByUserId,
} from "../../api/shopkeeperApi";
import { useAuth } from "../../context/AuthContext";
import AppButton from "../../ui/AppButton";
import { isValidMobile, normalizeMobile } from "../../utils/validation";

const tabs = [
  { key: "dashboard", label: "Dashboard", icon: "▦" },
  { key: "scan", label: "Scan", icon: "▣" },
  { key: "txns", label: "Txns", icon: "↕" },
  { key: "analytics", label: "Analytics", icon: "▲" },
  { key: "settings", label: "Settings", icon: "◎" },
];

const statusColors = {
  PENDING: { bg: "#e6f2dc", text: "#206b1c", label: "Cashback Issued" },
  APPROVED: { bg: "#e7f6ed", text: "#18733b", label: "Redeemed" },
  REJECTED: { bg: "#fff2d7", text: "#8a5a00", label: "Rejected" },
};

export default function ShopkeeperHomeScreen() {
  const { signOut, user } = useAuth();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [shops, setShops] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const shopkeeperId = user?.userId;
  const primaryShop = shops[0];

  const loadData = useCallback(async () => {
    if (!shopkeeperId) return;

    setIsLoading(true);
    setError("");

    try {
      const [shopsResult, customersResult] = await Promise.allSettled([
        getShopsByUserId(shopkeeperId),
        getCustomerListByShopkeeperId(shopkeeperId),
      ]);

      if (shopsResult.status === "fulfilled") {
        setShops(shopsResult.value.data?.shops || []);
      } else {
        setShops([]);
      }

      if (customersResult.status === "fulfilled") {
        setCustomers(customersResult.value.data?.customers || []);
      } else {
        setCustomers([]);
      }
    } catch (apiError) {
      setError(apiError.friendlyMessage || "Unable to load dashboard");
    } finally {
      setIsLoading(false);
    }
  }, [shopkeeperId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const metrics = useMemo(() => buildMetrics(customers), [customers]);

  const screenProps = {
    user,
    shops,
    primaryShop,
    customers,
    metrics,
    isLoading,
    error,
    refresh: loadData,
    setActiveTab,
    shopkeeperId,
    signOut,
    topInset: insets.top,
    bottomInset: insets.bottom,
  };

  return (
    <View style={styles.appShell}>
      <View style={styles.screen}>
        {activeTab === "dashboard" ? <DashboardScreen {...screenProps} /> : null}
        {activeTab === "scan" ? <IssueCashbackScreen {...screenProps} /> : null}
        {activeTab === "txns" ? <TransactionsScreen {...screenProps} /> : null}
        {activeTab === "analytics" ? <AnalyticsScreen {...screenProps} /> : null}
        {activeTab === "settings" ? <SettingsScreen {...screenProps} /> : null}
      </View>
      <BottomTabs activeTab={activeTab} bottomInset={insets.bottom} onChange={setActiveTab} />
    </View>
  );
}

function DashboardScreen({ user, primaryShop, metrics, isLoading, refresh, setActiveTab, topInset, bottomInset }) {
  return (
    <ScrollView
      contentContainerStyle={[styles.scrollWithTabs, { paddingBottom: 92 + bottomInset }]}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refresh} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.dashboardHero, { paddingTop: 18 + topInset }]}>
        <View style={styles.heroTopRow}>
          <View>
            <Text style={styles.heroKicker}>Welcome back,</Text>
            <Text style={styles.heroName}>{user?.name || "Shopkeeper"} 🏪</Text>
            <Text style={styles.heroSub}>{primaryShop?.shopName || "Your Store"}</Text>
          </View>
          <TouchableOpacity style={styles.bellButton}>
            <Text style={styles.bellIcon}>🔔</Text>
            <View style={styles.notificationDot} />
          </TouchableOpacity>
        </View>

        <View style={styles.metricGrid}>
          <MetricCard label="Today's Revenue" value={formatCurrency(metrics.todayRevenue)} />
          <MetricCard label="Txns Today" value={String(metrics.todayTxns)} />
          <MetricCard label="Cashback Issued" value={formatCurrency(metrics.totalCashback)} />
          <MetricCard label="Avg. Bill" value={formatCurrency(metrics.avgBill)} />
        </View>
      </View>

      <View style={styles.quickPanel}>
        <Text style={styles.panelTitle}>Quick Actions</Text>
        <View style={styles.quickGrid}>
          <QuickAction icon="▣" label="Scan Customer" onPress={() => setActiveTab("scan")} tone="green" />
          <QuickAction icon="▦" label="Analytics" onPress={() => setActiveTab("analytics")} tone="gold" />
          <QuickAction icon="↕" label="View Txns" onPress={() => setActiveTab("txns")} tone="mint" />
        </View>
      </View>

      <SectionHeader title="Recent Transactions" />
      {metrics.transactions.slice(0, 4).map(txn => (
        <TransactionRow key={txn.id} txn={txn} />
      ))}
      {!metrics.transactions.length ? (
        <EmptyState title="No transactions yet" subtitle="Issued cashback will appear here." />
      ) : null}
    </ScrollView>
  );
}

function IssueCashbackScreen({ shopkeeperId, refresh, topInset, bottomInset }) {
  const [mobile, setMobile] = useState("");
  const [customer, setCustomer] = useState(null);
  const [billAmount, setBillAmount] = useState("");
  const [cashback, setCashback] = useState("");
  const [message, setMessage] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isIssuing, setIsIssuing] = useState(false);

  const findCustomer = async () => {
    if (!isValidMobile(mobile)) {
      setMessage("Enter valid 10-digit mobile number");
      return;
    }

    setMessage("");
    setCustomer(null);
    setIsSearching(true);

    try {
      const response = await getCustomerByMobileNo(mobile);
      setCustomer(response.data?.customer || null);
    } catch (apiError) {
      setMessage(apiError.friendlyMessage || "Customer not found");
    } finally {
      setIsSearching(false);
    }
  };

  const issueCashback = async () => {
    const bill = Number(billAmount);
    const cb = Number(cashback);

    if (!customer) {
      setMessage("Find a customer first");
      return;
    }

    if (!bill || bill <= 0 || !cb || cb <= 0) {
      setMessage("Enter valid bill amount and cashback");
      return;
    }

    setMessage("");
    setIsIssuing(true);

    try {
      const payload = {
        shopkeeperId,
        mobile,
        billAmount: bill,
        cashback: cb,
        issueCashback: true,
      };

      try {
        await addCashbackToExistingCustomer(payload);
      } catch (firstError) {
        await addUserToShop({
          ...payload,
          name: customer.name,
          customerEmail: customer.email,
        });
      }

      Alert.alert("Cashback issued", `Cashback of ${formatCurrency(cb)} issued to ${customer.name}.`);
      setBillAmount("");
      setCashback("");
      setCustomer(null);
      setMobile("");
      refresh();
    } catch (apiError) {
      setMessage(apiError.friendlyMessage || "Unable to issue cashback");
    } finally {
      setIsIssuing(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={[styles.scrollWithTabs, { paddingBottom: 92 + bottomInset }]} showsVerticalScrollIndicator={false}>
      <View style={[styles.simpleHero, { paddingTop: 20 + topInset }]}>
        <Text style={styles.simpleHeroTitle}>Issue Cashback</Text>
        <Text style={styles.simpleHeroSub}>Search customer by mobile number</Text>
      </View>

      <Text style={styles.stepLabel}>STEP 1 — FIND CUSTOMER</Text>
      <View style={styles.phoneSearchBox}>
        <Text style={styles.countryCode}>+91</Text>
        <TextInput
          keyboardType="number-pad"
          maxLength={10}
          onChangeText={text => {
            setMobile(normalizeMobile(text));
            setMessage("");
            setCustomer(null);
          }}
          onSubmitEditing={findCustomer}
          placeholder="Enter mobile number"
          placeholderTextColor="#94a3b8"
          style={styles.phoneSearchInput}
          value={mobile}
        />
      </View>

      <AppButton
        disabled={!isValidMobile(mobile)}
        loading={isSearching}
        onPress={findCustomer}
        title="Find Customer"
      />

      {message ? <Text style={styles.inlineError}>{message}</Text> : null}

      {customer ? (
        <View style={styles.issuePanel}>
          <View style={styles.customerFoundRow}>
            <Avatar name={customer.name} />
            <View>
              <Text style={styles.customerName}>{customer.name}</Text>
              <Text style={styles.customerMeta}>+91 {customer.mobile}</Text>
            </View>
          </View>

          <Text style={styles.sectionLabel}>BILL AMOUNT</Text>
          <TextInput
            keyboardType="decimal-pad"
            onChangeText={setBillAmount}
            placeholder="Enter bill amount"
            placeholderTextColor="#94a3b8"
            style={styles.inputBox}
            value={billAmount}
          />

          <Text style={styles.sectionLabel}>CASHBACK</Text>
          <TextInput
            keyboardType="decimal-pad"
            onChangeText={setCashback}
            placeholder="Enter cashback amount"
            placeholderTextColor="#94a3b8"
            style={styles.inputBox}
            value={cashback}
          />

          <AppButton loading={isIssuing} onPress={issueCashback} title="Issue Cashback" />
        </View>
      ) : (
        <View style={styles.searchHint}>
          <Text style={styles.searchIcon}>▦</Text>
          <Text style={styles.searchTitle}>Find Customer</Text>
          <Text style={styles.searchText}>Type a 10-digit customer mobile number to issue cashback.</Text>
          <View style={styles.tryBox}>
            <Text style={styles.tryTitle}>TRY SEARCHING FOR</Text>
            <View style={styles.chipsRow}>
              {["987...", "981...", "977..."].map(item => (
                <Text key={item} style={styles.chip}>{item}</Text>
              ))}
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function TransactionsScreen({ metrics, customers, isLoading, refresh, topInset, bottomInset }) {
  const [mode, setMode] = useState("history");
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  const filteredTxns = metrics.transactions.filter(txn => {
    const statusMatch = filter === "All"
      || (filter === "Issued" && txn.status !== "APPROVED")
      || (filter === "Redeemed" && txn.status === "APPROVED");
    return statusMatch;
  });

  const filteredCustomers = customers.filter(customer => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return customer.name?.toLowerCase().includes(query) || customer.mobile?.includes(query);
  });

  return (
    <ScrollView
      contentContainerStyle={[styles.scrollWithTabs, { paddingBottom: 92 + bottomInset }]}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refresh} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.txnHero, { paddingTop: 20 + topInset }]}>
        <Text style={styles.simpleHeroTitle}>Transactions</Text>
        <Text style={styles.simpleHeroSub}>Cashback history & registered customers</Text>
        <View style={styles.txnStatRow}>
          <SmallStat label="Total Issued" value={formatCurrency(metrics.totalCashback)} />
          <SmallStat label="Today" value={formatCurrency(metrics.todayCashback)} />
          <SmallStat label="Redeemed" value={formatCurrency(metrics.redeemedCashback)} />
        </View>
      </View>

      <View style={styles.segment}>
        <SegmentButton active={mode === "history"} label="↕ Cashback History" onPress={() => setMode("history")} />
        <SegmentButton active={mode === "customers"} label="👥 Customers" onPress={() => setMode("customers")} />
      </View>

      {mode === "history" ? (
        <>
          <View style={styles.filterRow}>
            {["All", "Issued", "Redeemed"].map(item => (
              <TouchableOpacity
                key={item}
                onPress={() => setFilter(item)}
                style={[styles.filterChip, filter === item ? styles.filterChipActive : null]}
              >
                <Text style={[styles.filterText, filter === item ? styles.filterTextActive : null]}>{item}</Text>
              </TouchableOpacity>
            ))}
            <Text style={styles.recordCount}>{filteredTxns.length} records</Text>
          </View>

          {filteredTxns.map(txn => <HistoryCard key={txn.id} txn={txn} />)}
          {!filteredTxns.length ? <EmptyState title="No cashback records" subtitle="Try another filter." /> : null}
        </>
      ) : (
        <>
          <View style={styles.searchBox}>
            <Text style={styles.searchMagnifier}>🔍</Text>
            <TextInput
              onChangeText={setSearch}
              placeholder="Search by name or phone..."
              placeholderTextColor="#94a3b8"
              style={styles.searchInput}
              value={search}
            />
          </View>
          <Text style={styles.stepLabel}>{filteredCustomers.length} REGISTERED CUSTOMERS</Text>
          {filteredCustomers.map(customer => <CustomerCard key={customer.userId} customer={customer} />)}
          {!filteredCustomers.length ? <EmptyState title="No customers found" subtitle="Customers linked to this shopkeeper appear here." /> : null}
        </>
      )}
    </ScrollView>
  );
}

function AnalyticsScreen({ metrics, topInset, bottomInset }) {
  const max = Math.max(...metrics.weeklyRevenue, 1);

  return (
    <ScrollView contentContainerStyle={[styles.scrollWithTabs, { paddingBottom: 92 + bottomInset }]} showsVerticalScrollIndicator={false}>
      <Text style={[styles.pageTitle, { marginTop: 18 + topInset }]}>Analytics</Text>

      <View style={styles.analyticsHero}>
        <Text style={styles.analyticsLabel}>THIS MONTH</Text>
        <Text style={styles.analyticsAmount}>{formatCurrency(metrics.totalRevenue)}</Text>
        <View style={styles.analyticsCards}>
          <MetricCard label="Cashback Issued" value={formatCurrency(metrics.totalCashback)} compact />
          <MetricCard label="CB Rate" value={`${metrics.cashbackRate.toFixed(1)}%`} compact />
        </View>
      </View>

      <View style={styles.whitePanel}>
        <Text style={styles.panelTitle}>Weekly Revenue</Text>
        <View style={styles.chartRow}>
          {metrics.weeklyRevenue.map((value, index) => (
            <View key={index} style={styles.chartItem}>
              <View style={[styles.chartBar, { height: 30 + (value / max) * 70 }]} />
              <Text style={styles.chartLabel}>{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][index]}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.whitePanel}>
        <Text style={styles.panelTitle}>Top Customers</Text>
        {metrics.topCustomers.map(customer => (
          <ProgressRow
            key={customer.userId}
            label={customer.name}
            value={formatCurrency(customer.totalSpent)}
            percent={Math.min(customer.totalSpent / Math.max(metrics.topCustomerSpend, 1), 1)}
          />
        ))}
        {!metrics.topCustomers.length ? <Text style={styles.mutedText}>No customer analytics yet.</Text> : null}
      </View>
    </ScrollView>
  );
}

function SettingsScreen({ user, primaryShop, signOut, topInset, bottomInset }) {
  const menu = [
    { icon: "👤", label: "Edit Profile" },
    { icon: "🔔", label: "Notifications" },
    { icon: "🔒", label: "Privacy & Security" },
    { icon: "☎", label: "Help & Support" },
    { icon: "⭐", label: "Rate the App" },
    { icon: "ℹ", label: "About CashBack" },
  ];

  return (
    <ScrollView contentContainerStyle={[styles.scrollWithTabs, { paddingBottom: 92 + bottomInset }]} showsVerticalScrollIndicator={false}>
      <View style={[styles.settingsHero, { paddingTop: 18 + topInset }]}>
        <View style={styles.shopAvatar}>
          <Text style={styles.shopAvatarIcon}>🏪</Text>
        </View>
        <Text style={styles.settingsName}>{user?.name || "Shopkeeper"}</Text>
        <Text style={styles.settingsPhone}>+91 {user?.mobile || ""}</Text>
        <Text style={styles.shopPill}>{primaryShop?.shopName || "Your Store"}</Text>
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
    </ScrollView>
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

function MetricCard({ label, value, compact }) {
  return (
    <View style={[styles.metricCard, compact ? styles.metricCompact : null]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function QuickAction({ icon, label, onPress, tone }) {
  const isGreen = tone === "green";

  return (
    <TouchableOpacity onPress={onPress} style={[styles.quickAction, styles[`quick_${tone}`]]}>
      <Text style={[styles.quickIcon, isGreen ? styles.quickIconLight : styles.quickIconDark]}>{icon}</Text>
      <Text style={[styles.quickLabel, isGreen ? styles.quickLabelLight : styles.quickLabelDark]}>{label}</Text>
    </TouchableOpacity>
  );
}

function SectionHeader({ title }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function TransactionRow({ txn }) {
  const status = statusColors[txn.status] || statusColors.PENDING;
  return (
    <View style={styles.txnRow}>
      <Avatar name={txn.customerName} />
      <View style={styles.txnMiddle}>
        <Text style={styles.customerName}>{txn.customerName}</Text>
        <Text style={styles.customerMeta}>{txn.timeLabel}</Text>
      </View>
      <View style={styles.txnRight}>
        <Text style={styles.txnAmount}>{formatCurrency(txn.billAmount)}</Text>
        <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
          <Text style={[styles.statusText, { color: status.text }]}>+{formatCurrency(txn.cashback)}</Text>
        </View>
      </View>
    </View>
  );
}

function HistoryCard({ txn }) {
  const status = statusColors[txn.status] || statusColors.PENDING;
  return (
    <View style={styles.historyCard}>
      <Avatar name={txn.customerName} large />
      <View style={styles.historyMiddle}>
        <Text style={styles.customerName}>{txn.customerName}</Text>
        <Text style={styles.customerMeta}>{txn.timeLabel}</Text>
        <View style={[styles.historyStatus, { backgroundColor: status.bg }]}>
          <Text style={[styles.historyStatusText, { color: status.text }]}>{status.label}</Text>
        </View>
      </View>
      <View style={styles.txnRight}>
        <Text style={styles.historyCashback}>{formatCurrency(txn.cashback)}</Text>
        <Text style={styles.customerMeta}>Bill {formatCurrency(txn.billAmount)}</Text>
      </View>
    </View>
  );
}

function CustomerCard({ customer }) {
  const spent = sumCustomer(customer, "billAmount");
  const earned = sumCustomer(customer, "cashback");
  const visits = customer.cashbackHistory?.length || 0;

  return (
    <View style={styles.customerCard}>
      <View style={styles.customerCardTop}>
        <Avatar name={customer.name} large />
        <View style={styles.customerCardInfo}>
          <Text style={styles.customerName}>{customer.name}</Text>
          <Text style={styles.customerMeta}>+91 {customer.mobile}</Text>
        </View>
      </View>
      <View style={styles.customerStats}>
        <CustomerStat value={String(visits)} label="Visits" />
        <CustomerStat value={formatCurrency(spent)} label="Total Spent" />
        <CustomerStat value={formatCurrency(earned)} label="CB Earned" />
      </View>
    </View>
  );
}

function CustomerStat({ value, label }) {
  return (
    <View style={styles.customerStat}>
      <Text style={styles.customerStatValue}>{value}</Text>
      <Text style={styles.customerStatLabel}>{label}</Text>
    </View>
  );
}

function Avatar({ name, large }) {
  const initials = String(name || "Customer")
    .split(" ")
    .map(part => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <View style={[styles.avatar, large ? styles.avatarLarge : null]}>
      <Text style={styles.avatarText}>{initials}</Text>
    </View>
  );
}

function SmallStat({ label, value }) {
  return (
    <View style={styles.smallStat}>
      <Text style={styles.smallStatLabel}>{label}</Text>
      <Text style={styles.smallStatValue}>{value}</Text>
    </View>
  );
}

function SegmentButton({ active, label, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.segmentButton, active ? styles.segmentActive : null]}>
      <Text style={[styles.segmentText, active ? styles.segmentTextActive : null]}>{label}</Text>
    </TouchableOpacity>
  );
}

function ProgressRow({ label, value, percent }) {
  return (
    <View style={styles.progressRow}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressLabel}>{label}</Text>
        <Text style={styles.progressValue}>{value}</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.max(percent * 100, 8)}%` }]} />
      </View>
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

function buildMetrics(customers) {
  const transactions = customers.flatMap(customer =>
    (customer.cashbackHistory || []).map((history, index) => ({
      id: history.cashbackId || history.cashbackid || `${customer.userId}-${index}`,
      customerName: customer.name || "Customer",
      mobile: customer.mobile,
      billAmount: Number(history.billAmount) || 0,
      cashback: Number(history.cashback) || 0,
      status: history.redeemStatus || (history.redeemcashback ? "APPROVED" : "PENDING"),
      rawDate: history.date,
      timeLabel: formatTimeLabel(history.date),
    }))
  );

  const sortedTransactions = transactions.sort((a, b) => parseMaybeDate(b.rawDate) - parseMaybeDate(a.rawDate));
  const totalRevenue = sortedTransactions.reduce((sum, item) => sum + item.billAmount, 0);
  const totalCashback = sortedTransactions.reduce((sum, item) => sum + item.cashback, 0);
  const redeemedCashback = sortedTransactions
    .filter(item => item.status === "APPROVED")
    .reduce((sum, item) => sum + item.cashback, 0);
  const todayTransactions = sortedTransactions.filter(item => isToday(item.rawDate));
  const todayRevenue = todayTransactions.reduce((sum, item) => sum + item.billAmount, 0);
  const todayCashback = todayTransactions.reduce((sum, item) => sum + item.cashback, 0);
  const avgBill = sortedTransactions.length ? totalRevenue / sortedTransactions.length : 0;
  const weeklyRevenue = buildWeeklyRevenue(sortedTransactions);
  const topCustomers = customers
    .map(customer => ({ ...customer, totalSpent: sumCustomer(customer, "billAmount") }))
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 4);

  return {
    transactions: sortedTransactions,
    totalRevenue,
    totalCashback,
    redeemedCashback,
    todayRevenue,
    todayCashback,
    todayTxns: todayTransactions.length,
    avgBill,
    cashbackRate: totalRevenue ? (totalCashback / totalRevenue) * 100 : 0,
    weeklyRevenue,
    topCustomers,
    topCustomerSpend: topCustomers[0]?.totalSpent || 0,
  };
}

function buildWeeklyRevenue(transactions) {
  const buckets = Array.from({ length: 7 }, () => 0);

  transactions.forEach(transaction => {
    const date = parseMaybeDate(transaction.rawDate);
    if (!date) return;
    const day = date.getDay();
    const mondayIndex = day === 0 ? 6 : day - 1;
    buckets[mondayIndex] += transaction.billAmount;
  });

  return buckets;
}

function sumCustomer(customer, key) {
  return (customer.cashbackHistory || []).reduce((sum, item) => sum + (Number(item[key]) || 0), 0);
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

function isToday(value) {
  const date = parseMaybeDate(value);
  if (!date) return false;
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

function formatTimeLabel(value) {
  const date = parseMaybeDate(value);
  if (!date) return "Recently";
  return date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
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
  dashboardHero: {
    backgroundColor: "#18733b",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    padding: 22,
    paddingTop: 18,
    paddingBottom: 34,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  heroKicker: {
    color: "#cfead8",
    fontSize: 13,
  },
  heroName: {
    color: "#ffffff",
    fontSize: 19,
    fontWeight: "900",
    marginTop: 3,
  },
  heroSub: {
    color: "#cfead8",
    fontSize: 13,
    marginTop: 5,
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
    right: 6,
    top: 4,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#f3c331",
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metricCard: {
    width: "48%",
    minHeight: 72,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.16)",
    padding: 14,
    justifyContent: "space-between",
  },
  metricCompact: {
    width: "48%",
    minHeight: 58,
  },
  metricLabel: {
    color: "#d4eadb",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  metricValue: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "900",
  },
  quickPanel: {
    marginHorizontal: 16,
    marginTop: -22,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#cfe0d5",
    padding: 16,
  },
  panelTitle: {
    color: "#122018",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 14,
  },
  quickGrid: {
    flexDirection: "row",
    gap: 10,
  },
  quickAction: {
    flex: 1,
    minHeight: 68,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  quick_green: {
    backgroundColor: "#18733b",
  },
  quick_gold: {
    backgroundColor: "#fff4dc",
  },
  quick_mint: {
    backgroundColor: "#e7f4ed",
  },
  quickIcon: {
    fontSize: 26,
    marginBottom: 8,
  },
  quickLabel: {
    fontSize: 12,
    fontWeight: "800",
  },
  quickIconLight: {
    color: "#ffffff",
  },
  quickIconDark: {
    color: "#18733b",
  },
  quickLabelLight: {
    color: "#ffffff",
  },
  quickLabelDark: {
    color: "#0f2819",
  },
  sectionTitle: {
    marginHorizontal: 18,
    marginTop: 18,
    marginBottom: 10,
    color: "#122018",
    fontSize: 17,
    fontWeight: "900",
  },
  txnRow: {
    marginHorizontal: 16,
    marginBottom: 10,
    minHeight: 72,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#cfe0d5",
    backgroundColor: "#ffffff",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#dff0e6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarLarge: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  avatarText: {
    color: "#176e39",
    fontWeight: "900",
  },
  txnMiddle: {
    flex: 1,
  },
  customerName: {
    color: "#122018",
    fontSize: 15,
    fontWeight: "900",
  },
  customerMeta: {
    color: "#66766a",
    fontSize: 12,
    marginTop: 3,
  },
  txnRight: {
    alignItems: "flex-end",
  },
  txnAmount: {
    color: "#122018",
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 7,
  },
  statusPill: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "900",
  },
  simpleHero: {
    backgroundColor: "#18733b",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    padding: 22,
    paddingTop: 30,
    paddingBottom: 32,
    marginBottom: 22,
  },
  simpleHeroTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "900",
  },
  simpleHeroSub: {
    color: "#cfead8",
    marginTop: 8,
  },
  stepLabel: {
    color: "#66766a",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0,
    marginHorizontal: 18,
    marginBottom: 10,
  },
  phoneSearchBox: {
    marginHorizontal: 18,
    minHeight: 56,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#cfe0d5",
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  countryCode: {
    color: "#66766a",
    fontWeight: "900",
    marginRight: 12,
  },
  phoneSearchInput: {
    flex: 1,
    color: "#122018",
    fontSize: 16,
  },
  inlineError: {
    color: "#dc2626",
    textAlign: "center",
    marginTop: 12,
  },
  searchHint: {
    alignItems: "center",
    paddingHorizontal: 30,
    paddingTop: 48,
  },
  searchIcon: {
    fontSize: 58,
    marginBottom: 20,
  },
  searchTitle: {
    color: "#122018",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 10,
  },
  searchText: {
    color: "#66766a",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  tryBox: {
    borderWidth: 1,
    borderColor: "#cfe0d5",
    borderRadius: 14,
    padding: 16,
    minWidth: 260,
    alignItems: "center",
  },
  tryTitle: {
    color: "#66766a",
    fontWeight: "800",
    fontSize: 12,
    marginBottom: 12,
  },
  chipsRow: {
    flexDirection: "row",
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: "#cfe0d5",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    color: "#122018",
    fontWeight: "800",
    fontSize: 12,
  },
  issuePanel: {
    margin: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#cfe0d5",
    backgroundColor: "#ffffff",
    padding: 16,
  },
  customerFoundRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  sectionLabel: {
    color: "#66766a",
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 8,
  },
  inputBox: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#cfe0d5",
    backgroundColor: "#ffffff",
    color: "#111827",
    fontSize: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  txnHero: {
    backgroundColor: "#18733b",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    padding: 22,
    paddingTop: 30,
    paddingBottom: 24,
    marginBottom: 16,
  },
  txnStatRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 18,
  },
  smallStat: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.16)",
    paddingVertical: 12,
    alignItems: "center",
  },
  smallStatLabel: {
    color: "#d4eadb",
    fontSize: 11,
    fontWeight: "800",
  },
  smallStatValue: {
    color: "#ffffff",
    fontWeight: "900",
    marginTop: 5,
  },
  segment: {
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#cfe0d5",
    backgroundColor: "#ffffff",
    flexDirection: "row",
    padding: 4,
    marginBottom: 12,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 9,
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentActive: {
    backgroundColor: "#18733b",
  },
  segmentText: {
    color: "#66766a",
    fontWeight: "900",
    fontSize: 12,
  },
  segmentTextActive: {
    color: "#ffffff",
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  filterChip: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#cfe0d5",
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: "#ffffff",
  },
  filterChipActive: {
    borderColor: "#18733b",
    backgroundColor: "#e8f4ed",
  },
  filterText: {
    color: "#66766a",
    fontWeight: "800",
    fontSize: 12,
  },
  filterTextActive: {
    color: "#18733b",
  },
  recordCount: {
    marginLeft: "auto",
    color: "#66766a",
    fontSize: 12,
  },
  historyCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#cfe0d5",
    backgroundColor: "#ffffff",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  historyMiddle: {
    flex: 1,
  },
  historyStatus: {
    alignSelf: "flex-start",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 8,
  },
  historyStatusText: {
    fontSize: 11,
    fontWeight: "900",
  },
  historyCashback: {
    color: "#18733b",
    fontSize: 17,
    fontWeight: "900",
  },
  searchBox: {
    marginHorizontal: 16,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#cfe0d5",
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  searchMagnifier: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: "#122018",
  },
  customerCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#cfe0d5",
    backgroundColor: "#ffffff",
    padding: 14,
  },
  customerCardTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  customerCardInfo: {
    flex: 1,
  },
  customerStats: {
    flexDirection: "row",
    borderRadius: 10,
    backgroundColor: "#f7faf8",
    overflow: "hidden",
  },
  customerStat: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRightWidth: 1,
    borderRightColor: "#d9e5de",
  },
  customerStatValue: {
    color: "#18733b",
    fontWeight: "900",
  },
  customerStatLabel: {
    color: "#66766a",
    fontSize: 11,
    marginTop: 3,
  },
  pageTitle: {
    color: "#122018",
    fontSize: 20,
    fontWeight: "900",
    margin: 18,
  },
  analyticsHero: {
    marginHorizontal: 16,
    borderRadius: 14,
    backgroundColor: "#18733b",
    padding: 18,
    marginBottom: 14,
  },
  analyticsLabel: {
    color: "#d4eadb",
    fontWeight: "800",
    fontSize: 12,
  },
  analyticsAmount: {
    color: "#ffffff",
    fontSize: 30,
    fontWeight: "900",
    marginVertical: 16,
  },
  analyticsCards: {
    flexDirection: "row",
    gap: 10,
  },
  whitePanel: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#cfe0d5",
    backgroundColor: "#ffffff",
    padding: 16,
  },
  chartRow: {
    height: 134,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  chartItem: {
    flex: 1,
    alignItems: "center",
  },
  chartBar: {
    width: "100%",
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    backgroundColor: "#18733b",
  },
  chartLabel: {
    color: "#66766a",
    fontSize: 11,
    marginTop: 8,
  },
  progressRow: {
    marginBottom: 14,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 7,
  },
  progressLabel: {
    color: "#122018",
  },
  progressValue: {
    color: "#66766a",
  },
  progressTrack: {
    height: 5,
    borderRadius: 4,
    backgroundColor: "#dce8e0",
  },
  progressFill: {
    height: 5,
    borderRadius: 4,
    backgroundColor: "#18733b",
  },
  settingsHero: {
    backgroundColor: "#18733b",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    alignItems: "center",
    paddingTop: 18,
    paddingBottom: 32,
    marginBottom: 16,
  },
  shopAvatar: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  shopAvatarIcon: {
    fontSize: 42,
  },
  settingsName: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "900",
  },
  settingsPhone: {
    color: "#d4eadb",
    marginTop: 6,
  },
  shopPill: {
    color: "#ffffff",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 12,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 12,
    fontSize: 12,
    fontWeight: "900",
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
  mutedText: {
    color: "#66766a",
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
