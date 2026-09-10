import React, { useState } from "react";
import { TrendingUp, TrendingDown, Package, AlertCircle } from "lucide-react";
import { Product, Transaction } from "../types";

interface ProductAnalyticsProps {
  products: Product[];
  transactions: Transaction[];
}

export const ProductAnalytics: React.FC<ProductAnalyticsProps> = ({
  products,
  transactions,
}) => {
  const [filterPeriod, setFilterPeriod] = useState<"all" | "7days" | "30days">(
    "30days",
  );

  // 1. Hitung total kuantiti terjual per produk dari riwayat transaksi
  const salesMap: { [productId: string]: { qty: number; revenue: number } } =
    {};

  const now = new Date().getTime();
  const periodDays =
    filterPeriod === "7days" ? 7 : filterPeriod === "30days" ? 30 : 99999;
  const cutoffTime = now - periodDays * 24 * 60 * 60 * 1000;

  transactions.forEach((tx) => {
    const txTime = new Date(tx.date).getTime();
    if (filterPeriod === "all" || txTime >= cutoffTime) {
      if (Array.isArray(tx.items)) {
        tx.items.forEach((item: any) => {
          const pId = item.productId || item.id;
          if (!salesMap[pId]) {
            salesMap[pId] = { qty: 0, revenue: 0 };
          }
          salesMap[pId].qty += Number(item.qty || 0);
          salesMap[pId].revenue +=
            Number(item.price || 0) * Number(item.qty || 0);
        });
      }
    }
  });

  // 2. Gabungkan data produk dengan total penjualan mereka
  const analyzedProducts = products.map((product) => {
    const stats = salesMap[product.id] || { qty: 0, revenue: 0 };
    return {
      ...product,
      soldQty: stats.qty,
      revenue: stats.revenue,
    };
  });

  // 3. Urutkan berdasarkan produk terlaris (Fast Moving) dan kurang lari (Slow Moving)
  const sortedByFast = [...analyzedProducts].sort(
    (a, b) => b.soldQty - a.soldQty,
  );
  const fastMoving = sortedByFast.filter((p) => p.soldQty > 0).slice(0, 5);

  // Slow moving adalah produk dengan stok ada (> 0) tetapi penjualannya paling sedikit / 0
  const slowMoving = [...analyzedProducts]
    .filter((p) => p.stock > 0)
    .sort((a, b) => a.soldQty - b.soldQty)
    .slice(0, 5);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Header & Filter Periode */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h3 className="font-extrabold text-slate-800 text-sm">
            Analisis Performa Produk
          </h3>
          <p className="text-[11px] text-slate-400">
            Pantau barang cepat laku (Fast Moving) & lambat laku (Slow Moving)
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
          <button
            onClick={() => setFilterPeriod("7days")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filterPeriod === "7days"
                ? "bg-white text-orange-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            7 Hari
          </button>
          <button
            onClick={() => setFilterPeriod("30days")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filterPeriod === "30days"
                ? "bg-white text-orange-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            30 Hari
          </button>
          <button
            onClick={() => setFilterPeriod("all")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filterPeriod === "all"
                ? "bg-white text-orange-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Semua
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Produk Terlaris (Fast Moving) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 mb-3.5 pb-2 border-b border-slate-100">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <TrendingUp size={18} />
            </div>
            <div>
              <h4 className="font-extrabold text-slate-800 text-xs">
                Produk Terlaris (Fast Moving)
              </h4>
              <p className="text-[10px] text-slate-400">
                Barang dengan tingkat penjualan tertinggi
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            {fastMoving.length === 0 || fastMoving[0].soldQty === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                Belum ada data penjualan pada periode ini.
              </div>
            ) : (
              fastMoving.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-black text-[10px] flex items-center justify-center">
                      #{index + 1}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        {item.name}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Stok sisa: {item.stock} unit
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-extrabold text-emerald-600">
                      {item.soldQty} terjual
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {formatRupiah(item.revenue)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Produk Kurang Laris (Slow Moving) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 mb-3.5 pb-2 border-b border-slate-100">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <TrendingDown size={18} />
            </div>
            <div>
              <h4 className="font-extrabold text-slate-800 text-xs">
                Produk Kurang Laris (Slow Moving)
              </h4>
              <p className="text-[10px] text-slate-400">
                Stok menumpuk dengan sedikit atau tanpa penjualan
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            {slowMoving.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                Tidak ada data produk.
              </div>
            ) : (
              slowMoving.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 font-black text-[10px] flex items-center justify-center">
                      #{index + 1}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        {item.name}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Stok tertahan: {item.stock} unit
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-extrabold text-amber-600">
                      {item.soldQty} terjual
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Perlu strategi promo
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
