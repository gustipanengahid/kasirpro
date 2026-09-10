import React, { useState, useEffect } from "react";
// 1. Tambahkan XCircle pada impor lucide-react di bagian atas file:
import {
  Search,
  Store,
  Coffee,
  ChevronDown,
  MapPin,
  Phone,
  XCircle, // <-- Tambahkan ini
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

interface Product {
  id: string | number;
  sku: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  imageUrl?: string;
}

interface StoreSettings {
  name: string;
  address?: string;
  phone?: string;
}

export default function PublicMenu() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>(["Semua"]);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(
    null,
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("Semua");
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    const fetchPublicData = async () => {
      setLoading(true);
      try {
        // 1. Ambil pengaturan toko dari Supabase (tabel settings)
        const { data: settingsData, error: settingsError } = await supabase
          .from("settings")
          .select("*")
          .single();
        if (!settingsError && settingsData) {
          setStoreSettings(settingsData);
        }

        // 2. Ambil data produk (items) dari Supabase
        const { data: itemsData, error: itemsError } = await supabase
          .from("items")
          .select("*");
        if (itemsError) {
          console.error("Gagal mengambil menu:", itemsError.message);
        } else if (itemsData) {
          const formatted: Product[] = itemsData.map((item: any) => ({
            id: item.id,
            sku: item.code || item.sku || "",
            name: item.name,
            category: item.category || "Umum",
            price: Number(item.price || 0),
            stock: Number(item.stock || 0),
            imageUrl: item.image_url,
          }));
          setProducts(formatted);

          const uniqueCategories = Array.from(
            new Set(formatted.map((p) => p.category)),
          ).filter(Boolean);
          setCategories(["Semua", ...uniqueCategories]);
        }

        // 3. Ambil data kategori dari tabel khusus kategori (jika ada)
        const { data: catData, error: catError } = await supabase
          .from("categories")
          .select("*");
        if (!catError && catData && catData.length > 0) {
          const dbCategories = catData.map((c: any) => c.name).filter(Boolean);
          if (dbCategories.length > 0) {
            setCategories(["Semua", ...Array.from(new Set(dbCategories))]);
          }
        }
      } catch (err) {
        console.error("Kesalahan koneksi:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPublicData();
  }, []);

  const filteredProducts = products.filter((p) => {
    const matchesCategory =
      selectedCategory === "Semua" || p.category === selectedCategory;
    const matchesSearch = p.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      {/* Header Toko */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-4xl mx-auto px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#78c953] text-white flex items-center justify-center shadow-xs shrink-0">
              <Store size={20} />
            </div>
            <div>
              <h1 className="font-extrabold text-base text-slate-900 leading-tight">
                {storeSettings?.name || "Katalog Toko"}
              </h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500 mt-0.5">
                {storeSettings?.address && (
                  <span className="flex items-center gap-1">
                    <MapPin size={12} className="text-slate-400" />
                    {storeSettings.address}
                  </span>
                )}
                {storeSettings?.phone && (
                  <span className="flex items-center gap-1">
                    <Phone size={12} className="text-slate-400" />
                    {storeSettings.phone}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Konten Utama */}
      <main className="max-w-4xl w-full mx-auto px-4 py-4 flex-1 flex flex-col gap-4">
        {/* Panel Pencarian & Filter Kategori */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              size={16}
            />
            <input
              type="text"
              placeholder="Cari nama menu atau produk..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#78c953]/50 transition-all shadow-2xs"
            />
          </div>

          <div className="relative sm:w-48">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#78c953]/50 appearance-none cursor-pointer shadow-2xs"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === "Semua" ? "Semua Kategori" : cat}
                </option>
              ))}
            </select>
            <ChevronDown
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              size={16}
            />
          </div>
        </div>

        {/* Daftar Produk / Grid Menu */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-[#78c953] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-medium text-slate-400">
                Memuat daftar menu...
              </p>
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-24 text-center">
            {/* Ubah ikon di sini menjadi XCircle */}
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 mb-2">
              <XCircle size={24} />
            </div>
            <p className="text-xs font-bold text-slate-700">
              Menu tidak ditemukan
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Coba gunakan kata kunci atau kategori lain.
            </p>
          </div>
        ) : (
          // ... grid produk ...
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white border border-slate-200/80 rounded-2xl p-3 flex flex-col justify-between shadow-xs hover:shadow-lg hover:border-[#78c953]/50 transition-all duration-300 group"
              >
                <div>
                  {/* Container Gambar: Menggunakan object-contain agar gambar utuh tidak terpotong */}
                  <div className="w-full h-36 bg-slate-100/70 rounded-xl mb-2.5 overflow-hidden flex items-center justify-center relative p-2 border border-slate-100 group-hover:bg-slate-100 transition-colors">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-contain rounded-lg drop-shadow-sm group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <Coffee size={26} className="text-slate-300" />
                    )}
                    <span className="absolute top-2 right-2 bg-white/95 backdrop-blur-xs text-[9px] font-bold px-2 py-0.5 rounded-full text-slate-600 border border-slate-100 shadow-2xs">
                      {product.category}
                    </span>
                  </div>
                  <h3 className="font-bold text-xs text-slate-800 line-clamp-2 leading-snug min-h-[32px]">
                    {product.name}
                  </h3>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                  <span className="font-black text-xs text-[#78c953]">
                    Rp {product.price.toLocaleString("id-ID")}
                  </span>
                  <span
                    className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md ${
                      product.stock > 0
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {product.stock > 0 ? `Stok: ${product.stock}` : "Habis"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer Minimalis */}
      <footer className="py-4 text-center text-[10px] text-slate-400 border-t border-slate-100 mt-auto">
        &copy; {new Date().getFullYear()}{" "}
        {storeSettings?.name || "Kasir Pintar"}. All rights reserved.
      </footer>
    </div>
  );
}
