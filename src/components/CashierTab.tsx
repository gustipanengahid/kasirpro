import React, { useState, useEffect } from "react";
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Maximize2,
  Minimize2,
  Banknote,
  Check,
  X,
  QrCode,
  Receipt,
  Tag,
} from "lucide-react";
import {
  User,
  Product,
  StoreSettings,
  Transaction,
  TransactionItem,
} from "../types";

// SESUAIKAN IMPORT INI DENGAN FILE KLIEN SUPABASE ANDA
import { supabase } from "../lib/supabaseClient";

export interface CashierTabProps {
  products: Product[];
  categories?: string[];
  currentUser?: User | null;
  onCheckoutSuccess: (newTx: Transaction) => void;
  storeSettings: StoreSettings;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

interface CartItem {
  product: Product;
  qty: number;
}

interface PromoItem {
  id: string;
  code?: string;
  name: string;
  discount_type?: "percentage" | "fixed";
  type?: "percentage" | "fixed";
  discount_value?: number;
  discount?: number;
  value?: number;
  min_purchase?: number;
  min_amount?: number;
}

type PaymentMethodType = Transaction["paymentMethod"];

export default function CashierTab({
  products,
  categories: initialCategories = [],
  currentUser,
  onCheckoutSuccess,
  storeSettings,
  isFullscreen,
  onToggleFullscreen,
}: CashierTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Semua");

  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>("cash");
  const [payAmount, setPayAmount] = useState<string>("");
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State untuk menampung kategori dari Supabase
  const [supabaseCategories, setSupabaseCategories] = useState<string[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] =
    useState<boolean>(false);

  // State untuk Data Diskon / Promo & Pilihan Dropdown Diskon
  const [promos, setPromos] = useState<PromoItem[]>([]);
  const [selectedPromoId, setSelectedPromoId] = useState<string>("");

  // Fetch kategori & promo/diskon langsung dari tabel Supabase saat komponen dimuat
  useEffect(() => {
    const fetchDataFromSupabase = async () => {
      setIsLoadingCategories(true);
      try {
        // Ambil kategori
        const { data: catData, error: catError } = await supabase
          .from("categories")
          .select("name");

        if (!catError && catData) {
          const fetchedNames = catData
            .map((item: any) => item.name)
            .filter(Boolean);
          setSupabaseCategories(fetchedNames);
        }

        // Ambil data diskon/promo dari tabel "promos"
        const { data: promoData, error: promoError } = await supabase
          .from("promos")
          .select("*");

        if (!promoError && promoData) {
          setPromos(promoData);
        }
      } catch (err) {
        console.error("Terjadi kesalahan koneksi Supabase:", err);
      } finally {
        setIsLoadingCategories(false);
      }
    };

    fetchDataFromSupabase();
  }, []);

  // Menggabungkan kategori dari Supabase, props, dan produk aktif
  const dynamicCategories = Array.from(
    new Set([
      ...supabaseCategories,
      ...initialCategories,
      ...products.map((p) => p.category).filter(Boolean),
    ]),
  );

  const displayCategories = ["Semua", ...dynamicCategories];

  // Filter Produk berdasarkan Pencarian dan Kategori
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.sku &&
        product.sku.toLowerCase().includes(searchQuery.toLowerCase()));

    const productCat = (product.category || "").trim().toLowerCase();
    const selectedCat = selectedCategory.trim().toLowerCase();

    const matchesCategory =
      selectedCategory === "Semua" || productCat === selectedCat;

    return matchesSearch && matchesCategory;
  });

  // Cart operations
  const addToCart = (product: Product) => {
    if (product.stock <= 0) return;

    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) return prevCart;
        return prevCart.map((item) =>
          item.product.id === product.id
            ? { ...item, qty: item.qty + 1 }
            : item,
        );
      }
      return [...prevCart, { product, qty: 1 }];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prevCart) =>
      prevCart
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.qty + delta;
            if (newQty > item.product.stock) return item;
            return { ...item, qty: newQty };
          }
          return item;
        })
        .filter((item) => item.qty > 0),
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prevCart) =>
      prevCart.filter((item) => item.product.id !== productId),
    );
  };

  const clearCart = () => {
    setCart([]);
    setPayAmount("");
    setSelectedPromoId("");
  };

  // Calculations
  const subTotal = cart.reduce(
    (sum, item) => sum + item.product.price * item.qty,
    0,
  );

  // Hitung Diskon Berdasarkan Pilihan Dropdown (dengan fallback nama kolom fleksibel)
  const activePromo = promos.find((p) => p.id === selectedPromoId);
  let discountTotal = 0;
  if (activePromo) {
    const minPurchase = Number(
      activePromo.min_purchase ?? activePromo.min_amount ?? 0,
    );
    if (subTotal >= minPurchase) {
      const val = Number(
        activePromo.discount_value ??
          activePromo.discount ??
          activePromo.value ??
          0,
      );
      const type = activePromo.discount_type ?? activePromo.type ?? "fixed";

      if (type === "percentage") {
        discountTotal = (subTotal * val) / 100;
      } else {
        discountTotal = val;
      }
    }
  }

  const taxableAmount = Math.max(0, subTotal - discountTotal);
  const taxTotal = storeSettings.isTaxEnabled
    ? (taxableAmount * (storeSettings?.taxPercentage ?? 0)) / 100
    : 0;
  const grandTotal = taxableAmount + taxTotal;
  const numericPayAmount = Number(payAmount) || 0;
  const changeAmount = numericPayAmount - grandTotal;

  // Checkout Handler dengan Direct Insert ke Supabase
  const handleProcessCheckout = async () => {
    if (cart.length === 0 || isSubmitting) return;
    if (paymentMethod === "cash" && numericPayAmount < grandTotal) return;

    setIsSubmitting(true);

    const formattedItems: TransactionItem[] = cart.map((item) => ({
      productId: item.product.id,
      sku: item.product.sku || "",
      name: item.product.name,
      price: item.product.price,
      costPrice: item.product.costPrice || 0,
      qty: item.qty,
      discount: 0,
      total: item.product.price * item.qty,
    }));

    const detectedCashierName =
      currentUser?.name ||
      currentUser?.username ||
      (currentUser as any)?.fullname ||
      (currentUser as any)?.email ||
      localStorage.getItem("cashier_name") ||
      "Kasir Utama";

    const detectedCashierId =
      currentUser?.id || (currentUser as any)?.uuid || "KASIR-01";

    const txId = "TX-" + Date.now();
    const invoiceNum = `INV/${new Date().getFullYear()}/${Date.now().toString().slice(-6)}`;
    const txDate = new Date().toISOString();

    const newTx: Transaction = {
      id: txId,
      invoiceNumber: invoiceNum,
      date: txDate,
      items: formattedItems,
      subTotal,
      discountTotal,
      taxTotal,
      total: grandTotal,
      paymentMethod,
      cashAmount: paymentMethod === "cash" ? numericPayAmount : undefined,
      changeAmount:
        paymentMethod === "cash" ? Math.max(0, changeAmount) : undefined,
      cashierId: detectedCashierId,
      cashierName: detectedCashierName,
    };

    try {
      // Properti 'date' dihapus dari payload insert ke Supabase agar tidak error schema cache
      const { error: dbError } = await supabase.from("transactions").insert([
        {
          id: txId,
          invoice_number: invoiceNum,
          sub_total: subTotal,
          discount_total: discountTotal,
          tax_total: taxTotal,
          total: grandTotal,
          total_amount: grandTotal,
          payment_method: paymentMethod,
          cashier_id: detectedCashierId,
          cashier_name: detectedCashierName,
        },
      ]);

      if (dbError) {
        console.error("Gagal menyimpan ke Supabase:", dbError.message);
        alert("Gagal menyimpan transaksi ke database: " + dbError.message);
      } else {
        console.log("Transaksi berhasil disimpan ke Supabase!");
      }
    } catch (err) {
      console.error("Kesalahan jaringan/database:", err);
    } finally {
      setIsSubmitting(false);
      onCheckoutSuccess(newTx);
      setIsCheckoutOpen(false);
      clearCart();
    }
  };

  return (
    <div
      className={`flex flex-col lg:flex-row gap-4 h-full overflow-y-auto lg:overflow-hidden bg-slate-100 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${
        isFullscreen ? "fixed inset-0 z-50 p-4 bg-slate-100" : ""
      }`}
    >
      {/* KATALOG PRODUK */}
      <div className="flex-1 flex flex-col min-h-[500px] lg:min-h-0 bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden shrink-0 lg:shrink">
        {/* Search & Header Controls */}
        <div className="p-3.5 border-b border-slate-100 flex items-center justify-between gap-3 bg-white shrink-0">
          <div className="relative flex-1">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              size={16}
            />
            <input
              type="text"
              placeholder="Cari nama produk atau SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <button
            onClick={onToggleFullscreen}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer transition-colors shrink-0"
            title={isFullscreen ? "Keluar Layar Penuh" : "Layar Penuh"}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-2 p-3 overflow-x-auto border-b border-slate-100 bg-slate-50/50 shrink-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {isLoadingCategories && displayCategories.length <= 1 && (
            <span className="text-xs text-slate-400 italic px-2">
              Memuat kategori...
            </span>
          )}
          {displayCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap cursor-pointer transition-all ${
                selectedCategory === cat
                  ? "bg-orange-500 text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grid Produk */}
        <div className="flex-1 overflow-y-auto p-3.5 min-h-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {filteredProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
              <ShoppingCart size={40} className="mb-2 opacity-20" />
              <p className="text-xs font-bold">Produk tidak ditemukan</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredProducts.map((product) => {
                const isOutOfStock = product.stock <= 0;
                return (
                  <div
                    key={product.id}
                    onClick={() => !isOutOfStock && addToCart(product)}
                    className={`group flex flex-col justify-between p-3 bg-white border border-slate-200/80 rounded-2xl select-none relative overflow-hidden transition-all h-full ${
                      isOutOfStock
                        ? "opacity-50 cursor-not-allowed bg-slate-50"
                        : "hover:border-orange-500 hover:shadow-md cursor-pointer"
                    }`}
                  >
                    <div>
                      <div className="aspect-square w-full rounded-xl bg-slate-100 mb-2.5 overflow-hidden flex items-center justify-center shrink-0 relative">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        ) : (
                          <ShoppingCart className="text-slate-300" size={24} />
                        )}
                        {isOutOfStock && (
                          <span className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center text-white text-[10px] font-black uppercase">
                            Stok Habis
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-xs text-slate-800 line-clamp-2 leading-snug">
                        {product.name}
                      </h4>
                      <p className="text-[10px] font-semibold text-slate-400 mt-1">
                        Stok: {product.stock}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-1 shrink-0">
                      <span className="font-extrabold text-xs text-orange-600 truncate">
                        Rp {product.price.toLocaleString("id-ID")}
                      </span>
                      <div className="p-1.5 bg-orange-50 text-orange-600 rounded-lg group-hover:bg-orange-500 group-hover:text-white transition-colors shrink-0">
                        <Plus size={12} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* KERANJANG BELANJA */}
      <div className="w-full lg:w-[360px] min-h-[400px] lg:min-h-0 bg-white rounded-2xl shadow-xs border border-slate-200/80 flex flex-col lg:h-full overflow-hidden shrink-0">
        <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingCart size={16} className="text-orange-500" />
            <h3 className="font-extrabold text-xs text-slate-800">Keranjang</h3>
            <span className="text-[10px] bg-orange-50 text-orange-600 font-black px-2 py-0.5 rounded-full">
              {cart.reduce((a, c) => a + c.qty, 0)} Item
            </span>
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Trash2 size={13} />
              Bersihkan
            </button>
          )}
        </div>

        {/* List Items Keranjang */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 min-h-[180px] lg:min-h-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
              <ShoppingCart size={32} className="mb-2 opacity-30" />
              <p className="text-xs font-bold">Keranjang kosong</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.product.id}
                className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <h5 className="font-bold text-xs text-slate-800 truncate">
                    {item.product.name}
                  </h5>
                  <p className="text-[10px] font-semibold text-slate-500 mt-0.5">
                    Rp {item.product.price.toLocaleString("id-ID")}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg p-1">
                  <button
                    onClick={() => updateQty(item.product.id, -1)}
                    className="p-1 hover:bg-slate-100 text-slate-600 rounded cursor-pointer transition-colors"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="text-xs font-black px-1.5 min-w-[20px] text-center">
                    {item.qty}
                  </span>
                  <button
                    onClick={() => updateQty(item.product.id, 1)}
                    className="p-1 hover:bg-slate-100 text-slate-600 rounded cursor-pointer transition-colors"
                  >
                    <Plus size={12} />
                  </button>
                </div>

                <button
                  onClick={() => removeFromCart(item.product.id)}
                  className="text-slate-400 hover:text-red-500 p-1 cursor-pointer transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Summary & Tombol Bayar */}
        <div className="p-3.5 border-t border-slate-100 bg-slate-50/50 space-y-2 shrink-0">
          <div className="flex justify-between text-xs font-semibold text-slate-500">
            <span>Subtotal</span>
            <span>Rp {subTotal.toLocaleString("id-ID")}</span>
          </div>

          {storeSettings.isTaxEnabled && (
            <div className="flex justify-between text-xs font-semibold text-slate-500">
              <span>Pajak ({storeSettings.taxPercentage}%)</span>
              <span>Rp {taxTotal.toLocaleString("id-ID")}</span>
            </div>
          )}

          <div className="flex justify-between text-sm font-black text-slate-900 pt-1 border-t border-slate-200">
            <span>Total Transaksi</span>
            <span className="text-orange-600">
              Rp {grandTotal.toLocaleString("id-ID")}
            </span>
          </div>

          <button
            disabled={cart.length === 0}
            onClick={() => setIsCheckoutOpen(true)}
            className="w-full mt-2 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 text-white font-extrabold rounded-xl text-xs transition-all cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xs"
          >
            <Banknote size={16} />
            Bayar Sekarang
          </button>
        </div>
      </div>

      {/* MODAL PEMBAYARAN KASIR */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6 transition-all duration-300">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 relative overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-orange-50 text-orange-600 rounded-xl">
                  <Receipt size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base leading-tight">
                    Pembayaran Kasir
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Selesaikan transaksi pelanggan
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full cursor-pointer transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-5 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <div className="md:col-span-7 space-y-4">
                {/* PILIHAN DISKON / PROMO (DROPDOWN) */}
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                    <Tag size={13} className="text-orange-500" />
                    Pilih Diskon / Promo
                  </label>
                  <select
                    value={selectedPromoId}
                    onChange={(e) => setSelectedPromoId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all cursor-pointer"
                  >
                    <option value="">-- Tanpa Diskon / Promo --</option>
                    {promos.map((promo) => {
                      const promoVal = Number(
                        promo.discount_value ??
                          promo.discount ??
                          promo.value ??
                          0,
                      );
                      const promoType =
                        promo.discount_type ?? promo.type ?? "fixed";

                      return (
                        <option key={promo.id} value={promo.id}>
                          {promo.name} (
                          {promoType === "percentage"
                            ? `${promoVal}%`
                            : `Rp ${promoVal.toLocaleString("id-ID")}`}
                          )
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Pilih Metode Pembayaran
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("cash")}
                      className={`py-3 px-4 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        paymentMethod === "cash"
                          ? "bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/20 scale-[1.02]"
                          : "bg-slate-50 text-slate-600 border-slate-200/80 hover:bg-slate-100"
                      }`}
                    >
                      <Banknote size={18} />
                      Tunai (Cash)
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod("qris")}
                      className={`py-3 px-4 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        paymentMethod === "qris"
                          ? "bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/20 scale-[1.02]"
                          : "bg-slate-50 text-slate-600 border-slate-200/80 hover:bg-slate-100"
                      }`}
                    >
                      <QrCode size={18} />
                      QRIS
                    </button>
                  </div>
                </div>

                {paymentMethod === "cash" ? (
                  <div className="space-y-3 pt-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Nominal Uang Diterima (Rp)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-extrabold text-slate-400 text-sm">
                        Rp
                      </span>
                      <input
                        type="number"
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        placeholder="0"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-base font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {[grandTotal, 20000, 50000, 100000].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setPayAmount(val.toString())}
                          className="py-2 px-1 bg-slate-100 hover:bg-orange-50 hover:text-orange-600 text-slate-600 font-bold rounded-xl text-[11px] transition-colors cursor-pointer border border-transparent hover:border-orange-200"
                        >
                          {val === grandTotal
                            ? "Uang Pas"
                            : `Rp ${val.toLocaleString("id-ID")}`}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 flex flex-col items-center justify-center text-center">
                    <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs mb-2">
                      <img
                        src="/qris.png"
                        alt="Kode QRIS"
                        className="w-40 h-40 object-contain"
                      />
                    </div>
                    <span className="text-[11px] font-medium text-slate-500">
                      Minta pelanggan memindai kode QRIS di atas.
                    </span>
                  </div>
                )}
              </div>

              <div className="md:col-span-5 flex flex-col justify-between bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-100 space-y-4">
                <div className="space-y-3">
                  <div className="border-b border-slate-200/80 pb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Total Tagihan
                    </span>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                      Rp {grandTotal.toLocaleString("id-ID")}
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-slate-500 font-medium">
                      <span>Subtotal</span>
                      <span className="font-bold text-slate-700">
                        Rp {subTotal.toLocaleString("id-ID")}
                      </span>
                    </div>

                    {discountTotal > 0 && (
                      <div className="flex justify-between text-emerald-600 font-medium">
                        <span>Diskon / Promo</span>
                        <span className="font-bold">
                          - Rp {discountTotal.toLocaleString("id-ID")}
                        </span>
                      </div>
                    )}

                    {storeSettings.isTaxEnabled && (
                      <div className="flex justify-between text-slate-500 font-medium">
                        <span>Pajak ({storeSettings.taxPercentage}%)</span>
                        <span>Rp {taxTotal.toLocaleString("id-ID")}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-slate-500 font-medium">
                      <span>Jumlah Item</span>
                      <span className="font-bold text-slate-700">
                        {cart.reduce((a, c) => a + c.qty, 0)} Pcs
                      </span>
                    </div>

                    {paymentMethod === "cash" && (
                      <>
                        <div className="flex justify-between text-slate-500 font-medium">
                          <span>Diterima</span>
                          <span className="font-bold text-slate-700">
                            Rp {numericPayAmount.toLocaleString("id-ID")}
                          </span>
                        </div>
                        <div className="pt-2 border-t border-slate-200/80 flex justify-between items-center font-bold">
                          <span className="text-slate-600">Kembalian</span>
                          <span
                            className={`text-sm font-black ${
                              changeAmount < 0
                                ? "text-red-500"
                                : "text-orange-600"
                            }`}
                          >
                            Rp{" "}
                            {Math.max(0, changeAmount).toLocaleString("id-ID")}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={
                    isSubmitting ||
                    (paymentMethod === "cash" && numericPayAmount < grandTotal)
                  }
                  onClick={handleProcessCheckout}
                  className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 text-white font-extrabold rounded-2xl text-xs transition-all cursor-pointer disabled:cursor-not-allowed shadow-lg shadow-orange-500/20 disabled:shadow-none flex items-center justify-center gap-2 mt-auto"
                >
                  {isSubmitting ? (
                    <span className="animate-pulse">Menyimpan...</span>
                  ) : (
                    <>
                      <Check size={16} />
                      Selesaikan Transaksi
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
