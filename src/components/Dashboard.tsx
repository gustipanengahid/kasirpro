import React, { useState, useMemo, useEffect } from "react";
import {
  TrendingUp,
  AlertTriangle,
  Calendar,
  Filter,
  ArchiveRestore,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  X,
  RefreshCw,
  Sliders,
  Radio,
  Users,
  Trophy,
  Package,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { Transaction, Product, StoreSettings, User, Category } from "../types";
import { supabase } from "../lib/supabaseClient";

interface DashboardProps {
  transactions: Transaction[];
  products: Product[];
  categories: Category[];
  onNavigateToStock: () => void;
  storeSettings?: StoreSettings;
  onTriggerSync?: () => Promise<void>;
  isSyncing?: boolean;
  users: User[];
  onUpdateUsers: (updated: User[]) => void;
  onRealtimeTransactionReceived?: (newTx: Transaction) => void;
}

export default function Dashboard({
  transactions: initialTransactions,
  products,
  categories = [],
  onNavigateToStock,
  storeSettings,
  onTriggerSync,
  isSyncing = false,
  users = [],
  onUpdateUsers,
  onRealtimeTransactionReceived,
}: DashboardProps) {
  const [localTransactions, setLocalTransactions] =
    useState<Transaction[]>(initialTransactions);
  const [dateRange, setDateRange] = useState<
    "all" | "1month" | "7days" | "today"
  >("all");
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [isTipsOpen, setIsTipsOpen] = useState(false);
  const [isRealtimeActive, setIsRealtimeActive] = useState(false);

  useEffect(() => {
    setLocalTransactions(initialTransactions);
  }, [initialTransactions]);

  useEffect(() => {
    if (onTriggerSync) {
      onTriggerSync();
    }

    const fetchSupabaseUsers = async () => {
      if (!supabase) return;
      try {
        const { data, error } = await supabase.from("users").select("*");
        if (error) return;

        if (data) {
          const parsedUsers: User[] = data.map((u: any) => ({
            id: u.id,
            username: u.username || u.email || "User",
            name: u.name || u.full_name || u.username || "Staff",
            role: u.role || "cashier",
            active: u.active ?? true,
            ...(u.pin !== undefined && { pin: u.pin }),
          }));

          onUpdateUsers(parsedUsers);
        }
      } catch (err) {
        console.error("Error fetching users:", err);
      }
    };

    fetchSupabaseUsers();
  }, []);

  useEffect(() => {
    if (!supabase) return;

    const txChannel = supabase
      .channel("dashboard-realtime-transactions")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "transactions" },
        (payload) => {
          const newTx = payload.new as Transaction;
          const parsedTx: Transaction = {
            ...newTx,
            total: Number(newTx.total || 0),
            discountTotal: Number(newTx.discountTotal || 0),
            taxTotal: Number(newTx.taxTotal || 0),
            items: Array.isArray(newTx.items) ? newTx.items : [],
          };

          setLocalTransactions((prev) => {
            if (prev.some((t) => t.id === parsedTx.id)) return prev;
            return [parsedTx, ...prev];
          });

          if (onRealtimeTransactionReceived) {
            onRealtimeTransactionReceived(parsedTx);
          }

          setSyncFeedback("Transaksi baru masuk secara Real-time!");
          setTimeout(() => setSyncFeedback(null), 3500);
        },
      )
      .subscribe((status) => {
        setIsRealtimeActive(status === "SUBSCRIBED");
      });

    const userChannel = supabase
      .channel("dashboard-realtime-users")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "users" },
        (payload) => {
          const newUserRaw = payload.new as any;
          const newUser: User = {
            id: newUserRaw.id,
            username: newUserRaw.username || newUserRaw.email || "User Baru",
            name:
              newUserRaw.name ||
              newUserRaw.full_name ||
              newUserRaw.username ||
              "Staff Baru",
            role: newUserRaw.role || "cashier",
            active: newUserRaw.active ?? true,
          };

          onUpdateUsers([...users, newUser]);
          setSyncFeedback(`User baru terdeteksi: ${newUser.name}`);
          setTimeout(() => setSyncFeedback(null), 4000);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(txChannel);
      supabase.removeChannel(userChannel);
    };
  }, [onRealtimeTransactionReceived, users, onUpdateUsers]);

  const formatIDR = (num: number) => {
    return "Rp " + Math.round(num).toLocaleString("id-ID");
  };

  const PIE_COLORS = [
    "#f97316",
    "#3b82f6",
    "#64748b",
    "#ec4899",
    "#8b5cf6",
    "#0f172a",
  ];

  const handleManualSync = async () => {
    if (onTriggerSync) {
      try {
        await onTriggerSync();
        setSyncFeedback("Data berhasil diperbarui!");
        setTimeout(() => setSyncFeedback(null), 3000);
      } catch (err) {
        setSyncFeedback("Gagal memperbarui data.");
        setTimeout(() => setSyncFeedback(null), 3000);
      }
    }
  };

  const filteredTransactions = useMemo(() => {
    return localTransactions.filter((t) => {
      const txDate = new Date(t.date);
      const now = new Date();

      if (dateRange === "today") {
        return txDate.toDateString() === now.toDateString();
      } else if (dateRange === "7days") {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);
        return txDate >= sevenDaysAgo;
      } else if (dateRange === "1month") {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(now.getMonth() - 1);
        return txDate >= oneMonthAgo;
      }
      return true;
    });
  }, [localTransactions, dateRange]);

  const metrics = useMemo(() => {
    let salesTotal = 0;
    let costTotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;
    const ordersCount = filteredTransactions.length;

    filteredTransactions.forEach((t) => {
      salesTotal += Number(t.total || 0);
      discountTotal += Number(t.discountTotal || 0);
      taxTotal += Number(t.taxTotal || 0);

      if (Array.isArray(t.items)) {
        t.items.forEach((item) => {
          costTotal += Number(item.costPrice || 0) * Number(item.qty || 0);
        });
      }
    });

    if (costTotal === 0 && salesTotal > 0) {
      costTotal = Math.round(salesTotal * 0.45);
    }

    const netProfit = Math.max(0, salesTotal - costTotal - taxTotal);
    const profitMargin =
      salesTotal > 0 ? Math.round((netProfit / salesTotal) * 100) : 0;

    return {
      revenue: salesTotal,
      costOfGoods: costTotal,
      discounts: discountTotal,
      tax: taxTotal,
      profit: netProfit,
      margin: profitMargin,
      orders: ordersCount,
    };
  }, [filteredTransactions]);

  const userPerformanceData = useMemo(() => {
    const userMap: { [key: string]: any } = {};

    users.forEach((u) => {
      userMap[u.id] = {
        userId: u.id,
        userName: u.name || u.username,
        userRole: u.role || "cashier",
        totalOrders: 0,
        revenue: 0,
        costOfGoods: 0,
        discounts: 0,
        taxes: 0,
        profit: 0,
      };
    });

    filteredTransactions.forEach((t) => {
      const cashierId = t.cashierId || t.cashierName || "unknown";
      const cashierName = t.cashierName || "Kasir";

      if (!userMap[cashierId]) {
        userMap[cashierId] = {
          userId: cashierId,
          userName: cashierName,
          userRole: "cashier",
          totalOrders: 0,
          revenue: 0,
          costOfGoods: 0,
          discounts: 0,
          taxes: 0,
          profit: 0,
        };
      }

      let txHpp = 0;
      if (Array.isArray(t.items)) {
        t.items.forEach((item) => {
          txHpp += Number(item.costPrice || 0) * Number(item.qty || 0);
        });
      }
      if (txHpp === 0 && Number(t.total || 0) > 0) {
        txHpp = Math.round(Number(t.total || 0) * 0.45);
      }

      const rev = Number(t.total || 0);
      const tax = Number(t.taxTotal || 0);
      const disc = Number(t.discountTotal || 0);
      const profit = Math.max(0, rev - txHpp - tax);

      userMap[cashierId].totalOrders += 1;
      userMap[cashierId].revenue += rev;
      userMap[cashierId].costOfGoods += txHpp;
      userMap[cashierId].discounts += disc;
      userMap[cashierId].taxes += tax;
      userMap[cashierId].profit += profit;
    });

    return Object.values(userMap).sort((a, b) => b.revenue - a.revenue);
  }, [filteredTransactions, users]);

  // Analisis Performa Produk Terlaris
  const productPerformanceData = useMemo(() => {
    const productMap: {
      [key: string]: {
        name: string;
        category: string;
        qtySold: number;
        totalRevenue: number;
      };
    } = {};

    filteredTransactions.forEach((t) => {
      if (Array.isArray(t.items)) {
        t.items.forEach((item) => {
          const prodId = item.productId || item.name;
          const prodName = item.name || "Produk Tanpa Nama";
          const prodObj = products.find((p) => p.id === item.productId);
          const category = prodObj?.category || "Umum";

          if (!productMap[prodId]) {
            productMap[prodId] = {
              name: prodName,
              category: category,
              qtySold: 0,
              totalRevenue: 0,
            };
          }

          productMap[prodId].qtySold += Number(item.qty || 0);
          productMap[prodId].totalRevenue += Number(
            item.total || item.price * item.qty || 0,
          );
        });
      }
    });

    return Object.values(productMap).sort((a, b) => b.qtySold - a.qtySold);
  }, [filteredTransactions, products]);

  const lowStockItems = useMemo(() => {
    return products.filter((p) => p.stock <= p.minStock);
  }, [products]);

  const dailySalesData = useMemo(() => {
    const datesMap: { [key: string]: any } = {};
    const daysToSeed =
      dateRange === "7days" ? 7 : dateRange === "1month" ? 30 : 7;

    for (let i = daysToSeed - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateString = d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
      });
      datesMap[dateString] = {
        dateStr: dateString,
        Revenue: 0,
        Expenses: 0,
        Profit: 0,
      };
    }

    filteredTransactions.forEach((t) => {
      const dateString = new Date(t.date).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
      });

      let tCost = 0;
      if (Array.isArray(t.items)) {
        t.items.forEach((item) => {
          tCost += Number(item.costPrice || 0) * Number(item.qty || 0);
        });
      }
      if (tCost === 0) {
        tCost = Math.round(Number(t.total || 0) * 0.45);
      }

      const tProfit = Math.max(
        0,
        Number(t.total || 0) - tCost - Number(t.taxTotal || 0),
      );

      if (!datesMap[dateString]) {
        datesMap[dateString] = {
          dateStr: dateString,
          Revenue: 0,
          Expenses: 0,
          Profit: 0,
        };
      }
      datesMap[dateString].Revenue += Number(t.total || 0);
      datesMap[dateString].Expenses += tCost + Number(t.taxTotal || 0);
      datesMap[dateString].Profit += tProfit;
    });

    return Object.values(datesMap);
  }, [filteredTransactions, dateRange]);

  const popularCategoriesData = useMemo(() => {
    const categoriesMap: { [key: string]: number } = {};
    categories.forEach((cat) => {
      categoriesMap[cat.name] = 0;
    });

    filteredTransactions.forEach((t) => {
      if (Array.isArray(t.items)) {
        t.items.forEach((item) => {
          const prod = products.find((p) => p.id === item.productId);
          const catName = prod?.category || "Umum";
          if (categoriesMap[catName] === undefined) {
            categoriesMap[catName] = 0;
          }
          categoriesMap[catName] += Number(item.total || 0);
        });
      }
    });

    const sortedData = Object.entries(categoriesMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    if (sortedData.length === 0)
      return [{ name: "Umum", value: 1, actualValue: 0 }];

    const totalRevenue = sortedData.reduce((sum, item) => sum + item.value, 0);

    return sortedData
      .map((item) => ({
        name: item.name,
        value: totalRevenue > 0 ? item.value : 1,
        actualValue: item.value,
      }))
      .slice(0, 4);
  }, [filteredTransactions, products, categories]);

  return (
    <div className="space-y-5 max-w-7xl mx-auto p-3 sm:p-6 bg-slate-50/50 min-h-screen font-sans">
      {/* Header Minimalis */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/60 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-bold tracking-tight text-slate-900">
              Dashboard Overview
            </h1>
            <span
              className={`flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${
                isRealtimeActive
                  ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                  : "bg-slate-100 text-slate-500 border-slate-200"
              }`}
            >
              <Radio
                size={10}
                className={
                  isRealtimeActive ? "animate-pulse text-emerald-500" : ""
                }
              />
              {isRealtimeActive ? "Live Sync" : "Connecting"}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5 font-normal">
            Ringkasan performa finansial dan aktivitas kasir outlet Anda secara
            real-time.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {onTriggerSync && (
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200/80 text-slate-700 rounded-xl text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw
                size={13}
                className={isSyncing ? "animate-spin text-orange-500" : ""}
              />
              <span>{isSyncing ? "Memperbarui..." : "Sinkronkan"}</span>
            </button>
          )}

          <div className="relative w-full sm:w-44">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Calendar size={13} />
            </div>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="w-full pl-9 pr-8 py-2 bg-slate-100/70 border border-slate-200/60 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 cursor-pointer appearance-none transition-all"
            >
              <option value="all">Semua Waktu</option>
              <option value="1month">Bulan Ini</option>
              <option value="7days">7 Hari Terakhir</option>
              <option value="today">Hari Ini</option>
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
              <Filter size={11} />
            </div>
          </div>
        </div>
      </div>

      {syncFeedback && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="bg-slate-900 text-white text-xs font-semibold p-3.5 rounded-xl shadow-lg flex items-center gap-2.5"
        >
          <CheckCircle2 size={16} className="text-orange-400" />
          <span>{syncFeedback}</span>
        </motion.div>
      )}

      {/* Peringatan Stok Menipis */}
      {lowStockItems.length > 0 && (
        <div className="bg-amber-50/60 border border-amber-200/60 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl shrink-0 mt-0.5">
              <AlertTriangle size={18} />
            </div>
            <div>
              <p className="font-semibold text-amber-900 text-xs">
                Perhatian: Stok Produk Menipis
              </p>
              <p className="text-xs text-amber-700/80 mt-0.5">
                Terdapat{" "}
                <strong className="font-bold">
                  {lowStockItems.length} produk
                </strong>{" "}
                di bawah batas minimum stok. Segera lakukan restock.
              </p>
            </div>
          </div>
          <button
            onClick={onNavigateToStock}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shadow-xs"
          >
            Kelola Stok
          </button>
        </div>
      )}

      {/* Bento Grid Utama */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Grafik Penjualan Utama */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-2xs lg:col-span-8 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Total Pendapatan
                </span>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                  {formatIDR(metrics.revenue)}
                </h2>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-900"></span>
                  <span className="text-slate-500">Omset</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                  <span className="text-slate-500">Modal</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                  <span className="text-slate-500">Laba</span>
                </div>
              </div>
            </div>

            <div className="h-[220px] w-full">
              {dailySalesData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={dailySalesData}
                    margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="2 2"
                      stroke="#f1f5f9"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="dateStr"
                      stroke="#94a3b8"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      formatter={(v: any) => [formatIDR(Number(v)), ""]}
                      contentStyle={{
                        background: "#0f172a",
                        border: "none",
                        borderRadius: "12px",
                        padding: "8px 12px",
                        fontSize: "11px",
                        color: "#fff",
                        boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                      }}
                    />
                    <Bar
                      dataKey="Revenue"
                      fill="#0f172a"
                      radius={[4, 4, 0, 0]}
                      barSize={8}
                    />
                    <Bar
                      dataKey="Expenses"
                      fill="#cbd5e1"
                      radius={[4, 4, 0, 0]}
                      barSize={8}
                    />
                    <Bar
                      dataKey="Profit"
                      fill="#f97316"
                      radius={[4, 4, 0, 0]}
                      barSize={8}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                  Belum ada data transaksi grafik.
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 mt-3 flex justify-between items-center text-[10px] text-slate-400 font-medium">
            <span>Sinkronisasi database aktif</span>
            <span className="text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 size={12} /> Live Connected
            </span>
          </div>
        </div>

        {/* Panel Metrik Samping */}
        <div className="lg:col-span-4 flex flex-col justify-between gap-4">
          <div className="bg-white p-4.5 rounded-2xl border border-slate-200/60 shadow-2xs flex-1 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Total Transaksi Sukses
              </span>
              <div className="text-xl font-black text-slate-900 mt-1">
                {metrics.orders} Nota
              </div>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold mt-3">
              <TrendingUp size={13} />
              <span>Performa stabil</span>
            </div>
          </div>

          <div className="bg-white p-4.5 rounded-2xl border border-slate-200/60 shadow-2xs flex-1 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Estimasi HPP (Modal)
              </span>
              <div className="text-xl font-black text-slate-700 mt-1">
                {formatIDR(metrics.costOfGoods)}
              </div>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium mt-3">
              <ArchiveRestore size={13} className="text-slate-400" />
              <span>{metrics.margin}% dari total omset</span>
            </div>
          </div>

          <div className="bg-slate-900 text-white p-4.5 rounded-2xl shadow-md flex-1 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-semibold text-orange-400 uppercase tracking-wider block">
                Laba Bersih Otomatis
              </span>
              <div className="text-xl font-black text-white mt-1">
                {formatIDR(metrics.profit)}
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-300 font-medium mt-3">
              <Sparkles size={13} className="text-orange-400" />
              <span>Dihitung dari selisih HPP & Pajak</span>
            </div>
          </div>
        </div>
      </div>

      {/* ================= 6. AUTOMATIC FINANCIAL REPORT BREAKDOWN TABLE ================= */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs transition-colors duration-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 select-none">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Laporan Keuangan & Margin Laba Harian
            </h3>
            <p className="text-[10px] text-slate-500 mt-0.5 font-medium">
              Histori ringkasan penjualan POS per hari yang tersinkron.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
          <table className="w-full text-xs text-left text-slate-600 border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider text-[9px] border-b border-slate-200">
                <th className="p-3">Sesi Tanggal</th>
                <th className="p-3">Jumlah Transaksi</th>
                <th className="p-3 text-right">Penjualan Kotor (Omset)</th>
                <th className="p-3 text-right">Potongan Diskon</th>
                <th className="p-3 text-right">Pajak (PPN)</th>
                <th className="p-3 text-right">Biaya Modal (HPP)</th>
                <th className="p-3 text-right font-bold">
                  Margin Keuntungan Bersih
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dailySalesData.length > 0 ? (
                dailySalesData.map((d, index) => {
                  const dayTxs = filteredTransactions.filter((t) => {
                    const str = new Date(t.date).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                    });
                    return str === d.dateStr;
                  });

                  if (dayTxs.length === 0 && dateRange === "all") return null;

                  let dayHpp = 0;
                  let dayDiscounts = 0;
                  let dayTaxes = 0;
                  let dayRevenueWithTax = 0;

                  dayTxs.forEach((t) => {
                    dayDiscounts += Number(t.discountTotal || 0);
                    dayTaxes += Number(t.taxTotal || 0);
                    dayRevenueWithTax += Number(t.total || 0);
                    if (Array.isArray(t.items)) {
                      t.items.forEach((item) => {
                        dayHpp +=
                          Number(item.costPrice || 0) * Number(item.qty || 0);
                      });
                    }
                  });

                  if (dayHpp === 0 && dayRevenueWithTax > 0) {
                    dayHpp = Math.round(dayRevenueWithTax * 0.45);
                  }

                  const dayProfit = Math.max(
                    0,
                    dayRevenueWithTax - dayHpp - dayTaxes,
                  );

                  return (
                    <tr
                      key={index}
                      className="hover:bg-slate-50/60 border-b border-slate-100 transition-colors"
                    >
                      <td className="p-3 font-medium text-slate-800">
                        {d.dateStr}
                      </td>
                      <td className="p-3 font-semibold text-slate-700">
                        {dayTxs.length} Nota transaksi
                      </td>
                      <td className="p-3 text-right text-slate-800 font-bold">
                        {formatIDR(dayRevenueWithTax)}
                      </td>
                      <td className="p-3 text-right text-red-600 font-medium">
                        -{formatIDR(dayDiscounts)}
                      </td>
                      <td className="p-3 text-right text-slate-500">
                        {formatIDR(dayTaxes)}
                      </td>
                      <td className="p-3 text-right text-slate-500">
                        {formatIDR(dayHpp)}
                      </td>
                      <td className="p-3 text-right font-extrabold text-orange-600 bg-orange-50/30">
                        {formatIDR(dayProfit)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center p-8 text-slate-400 font-medium"
                  >
                    Tidak ada transaksi penjualan terdaftar dalam kurun filter
                    terpilih.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-slate-50 font-extrabold border-t border-slate-200">
              <tr>
                <td className="p-3 text-slate-800" colSpan={2}>
                  Grand Total Terhitung
                </td>
                <td className="p-3 text-right text-slate-900 text-sm font-black">
                  {formatIDR(metrics.revenue)}
                </td>
                <td className="p-3 text-right text-red-600">
                  {metrics.discounts > 0
                    ? `-${formatIDR(metrics.discounts)}`
                    : "Rp 0"}
                </td>
                <td className="p-3 text-right text-slate-800">
                  {formatIDR(metrics.tax)}
                </td>
                <td className="p-3 text-right text-slate-800">
                  {formatIDR(metrics.costOfGoods)}
                </td>
                <td className="p-3 text-right text-orange-600 text-sm font-black bg-orange-50/60">
                  {formatIDR(metrics.profit)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ================= ANALISIS PERFORMA PRODUK TERLARIS ================= */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-2xs">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Package className="text-orange-500" size={18} />
              <h3 className="font-bold text-slate-900 text-sm">
                Analisis Performa Produk Terlaris
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Peringkat produk berdasarkan jumlah kuantitas terjual dan
              kontribusi omset.
            </p>
          </div>
          <span className="text-xs font-semibold bg-slate-100 px-3 py-1 rounded-xl text-slate-600">
            Total Jenis Terjual: {productPerformanceData.length} Produk
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-600 border-collapse min-w-[650px]">
            <thead>
              <tr className="bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200/60">
                <th className="p-3.5">Peringkat & Nama Produk</th>
                <th className="p-3.5">Kategori</th>
                <th className="p-3.5 text-center">Total Terjual (Qty)</th>
                <th className="p-3.5 text-right font-bold">
                  Total Omset Produk
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {productPerformanceData.length > 0 ? (
                productPerformanceData.slice(0, 8).map((prod, idx) => {
                  const isTopProduct = idx === 0;
                  return (
                    <tr
                      key={idx}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="p-3.5 font-semibold text-slate-800 flex items-center gap-2.5">
                        <div className="relative">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${isTopProduct ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-700"}`}
                          >
                            {idx + 1}
                          </div>
                          {isTopProduct && (
                            <span className="absolute -top-1 -right-1 bg-amber-400 text-white p-0.5 rounded-full">
                              <Trophy size={7} className="fill-white" />
                            </span>
                          )}
                        </div>
                        <span>{prod.name}</span>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-slate-100 text-slate-600">
                          {prod.category}
                        </span>
                      </td>
                      <td className="p-3.5 text-center font-semibold text-slate-700">
                        {prod.qtySold} pcs
                      </td>
                      <td className="p-3.5 text-right font-black text-orange-600">
                        {formatIDR(prod.totalRevenue)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="text-center p-6 text-slate-400">
                    Belum ada data item produk yang terjual dalam rentang filter
                    ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Baris Bawah: Target, Tips, Pie Chart, Health */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-5 items-stretch">
        {/* Target Bulanan */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-2xs lg:col-span-3 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Target Bulanan
              </span>
              <Sliders size={13} className="text-slate-400" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Rp 10.000.000</h3>

            <div className="mt-4">
              <div className="flex justify-between text-[10px] font-semibold text-slate-500 mb-1.5">
                <span>Pencapaian</span>
                <span>{Math.round((metrics.revenue / 10000000) * 100)}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-orange-500 h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (metrics.revenue / 10000000) * 100)}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
          <span className="text-[10px] text-slate-400 font-medium mt-4 block">
            Target omset rutin bulanan outlet.
          </span>
        </div>

        {/* Tips */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-2xs lg:col-span-3 flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Tips Outlet
            </span>
            <h3 className="font-bold text-xs text-slate-900 mt-1">
              Optimalkan Margin & Stok Bahan Baku
            </h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Jaga HPP tetap di kisaran 30%-35% untuk memaksimalkan akumulasi
              laba bersih bulanan Anda.
            </p>
          </div>
          <button
            onClick={() => setIsTipsOpen(true)}
            className="text-xs font-bold text-slate-900 flex items-center gap-1 hover:text-orange-600 cursor-pointer mt-3"
          >
            Baca Selengkapnya <ChevronRight size={13} />
          </button>
        </div>

        {/* Kategori Terlaris */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-2xs lg:col-span-3 flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
              Kategori Terlaris
            </span>
            <div className="h-[100px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={popularCategoriesData}
                    cx="50%"
                    cy="50%"
                    innerRadius={25}
                    outerRadius={42}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {popularCategoriesData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: any) => formatIDR(Number(v))}
                    contentStyle={{
                      background: "#0f172a",
                      border: "none",
                      borderRadius: "10px",
                      fontSize: "11px",
                      color: "#fff",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 justify-center text-[10px] font-semibold text-slate-600 mt-1">
              {popularCategoriesData.map((entry, index) => (
                <div key={index} className="flex items-center gap-1">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: PIE_COLORS[index % PIE_COLORS.length],
                    }}
                  ></span>
                  <span>{entry.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Kesehatan Finansial */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-2xs lg:col-span-3 flex flex-col justify-between text-center">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Rasio Laba / Margin
            </span>
            <div className="my-auto py-3">
              <span className="text-3xl font-black text-slate-900">
                {metrics.margin}%
              </span>
              <span className="block text-[10px] font-bold text-emerald-600 mt-1 uppercase tracking-widest">
                {metrics.margin >= 40 ? "Sangat Sehat" : "Normal"}
              </span>
            </div>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">
            Perbandingan laba bersih terhadap omset.
          </span>
        </div>
      </div>

      {/* Tabel Monitoring Performa Kasir */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-2xs">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Users className="text-orange-500" size={18} />
              <h3 className="font-bold text-slate-900 text-sm">
                Monitoring Performa Kasir
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Rincian kontribusi penjualan, diskon, dan laba bersih per petugas
              kasir.
            </p>
          </div>
          <span className="text-xs font-semibold bg-slate-100 px-3 py-1 rounded-xl text-slate-600">
            Total Staff: {users.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-600 border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200/60">
                <th className="p-3.5">Nama Kasir</th>
                <th className="p-3.5">Role</th>
                <th className="p-3.5 text-center">Nota</th>
                <th className="p-3.5 text-right">Omset</th>
                <th className="p-3.5 text-right">Diskon</th>
                <th className="p-3.5 text-right">HPP</th>
                <th className="p-3.5 text-right font-bold">Laba Bersih</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {userPerformanceData.length > 0 ? (
                userPerformanceData.map((u, idx) => {
                  const isTop = idx === 0 && u.totalOrders > 0;
                  return (
                    <tr
                      key={u.userId || idx}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="p-3.5 font-semibold text-slate-800 flex items-center gap-2.5">
                        <div className="relative">
                          <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-xs">
                            {u.userName.charAt(0).toUpperCase()}
                          </div>
                          {isTop && (
                            <span className="absolute -top-1 -right-1 bg-orange-500 text-white p-0.5 rounded-full">
                              <Trophy size={8} className="fill-white" />
                            </span>
                          )}
                        </div>
                        <span>{u.userName}</span>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-slate-100 text-slate-600">
                          {u.userRole}
                        </span>
                      </td>
                      <td className="p-3.5 text-center font-semibold text-slate-700">
                        {u.totalOrders}
                      </td>
                      <td className="p-3.5 text-right font-bold text-slate-900">
                        {formatIDR(u.revenue)}
                      </td>
                      <td className="p-3.5 text-right text-red-500 font-medium">
                        {u.discounts > 0
                          ? `-${formatIDR(u.discounts)}`
                          : "Rp 0"}
                      </td>
                      <td className="p-3.5 text-right text-slate-500">
                        {formatIDR(u.costOfGoods)}
                      </td>
                      <td className="p-3.5 text-right font-black text-orange-600">
                        {formatIDR(u.profit)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="text-center p-6 text-slate-400">
                    Belum ada data user kasir tercatat.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tips */}
      <AnimatePresence>
        {isTipsOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200"
            >
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-orange-100 text-orange-600 rounded-xl">
                    <Sparkles size={16} />
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Tips Kelola Outlet
                  </h3>
                </div>
                <button
                  onClick={() => setIsTipsOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="py-4 space-y-3 text-xs text-slate-600 leading-relaxed font-normal">
                <p>
                  1. <strong>Jaga Margin HPP:</strong> Pastikan harga jual
                  produk Anda mencakup biaya bahan baku minimal 30%-35% untuk
                  profit maksimal.
                </p>
                <p>
                  2. <strong>Pantau Stok Rutin:</strong> Cek menu stok secara
                  berkala agar tidak kehabisan barang saat jam operasional
                  padat.
                </p>
                <p>
                  3. <strong>Analisis Kasir:</strong> Evaluasi performa kasir
                  harian untuk memastikan transaksi tercatat dengan akurat.
                </p>
              </div>
              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setIsTipsOpen(false)}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 cursor-pointer w-full sm:w-auto"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
