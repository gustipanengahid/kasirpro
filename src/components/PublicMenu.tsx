import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Store,
  Coffee,
  MapPin,
  Phone,
  XCircle,
  ChevronDown,
  Layers,
  Check,
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

  // State untuk custom dropdown interaktif
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Tutup dropdown saat klik di luar area
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchPublicData = async () => {
      setLoading(true);
      try {
        const { data: settingsData, error: settingsError } = await supabase
          .from("settings")
          .select("*")
          .single();
        if (!settingsError && settingsData) {
          setStoreSettings(settingsData);
        }

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
    <div className="min-h-screen bg-slate-100/70 flex flex-col font-sans text-slate-800 selection:bg-[#78c953] selection:text-white">
      {/* Header Toko Modern */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#78c953] text-white flex items-center justify-center shadow-md shadow-[#78c953]/25 shrink-0">
              <Store size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight">
                  {storeSettings?.name || "Katalog Toko"}
                </h1>
                <span className="bg-[#78c953]/10 text-[#78c953] text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Menu Publik
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs text-slate-500 mt-0.5 font-medium">
                {storeSettings?.address && (
                  <span className="flex items-center gap-1">
                    <MapPin size={13} className="text-slate-400" />
                    {storeSettings.address}
                  </span>
                )}
                {storeSettings?.phone && (
                  <span className="flex items-center gap-1">
                    <Phone size={13} className="text-slate-400" />
                    {storeSettings.phone}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Konten Utama */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 flex-1 flex flex-col gap-5">
        {/* Panel Pencarian & Filter Kategori Super Keren */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200/60 shadow-xs flex flex-col lg:flex-row gap-3.5 items-stretch lg:items-center justify-between">
          {/* Kolom Search */}
          <div className="relative flex-1">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Cari nama menu atau produk favorit Anda..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50/70 border border-slate-200/80 rounded-2xl pl-11 pr-4 py-3 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#78c953] focus:ring-4 focus:ring-[#78c953]/10 transition-all shadow-2xs font-medium"
            />
          </div>

          {/* CUSTOM DROPDOWN KATEGORI YANG KEREN */}
          <div className="relative min-w-[220px]" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-slate-50/70 hover:bg-slate-100/80 border border-slate-200/80 rounded-2xl text-xs font-bold text-slate-700 transition-all cursor-pointer shadow-2xs"
            >
              <div className="flex items-center gap-2.5 truncate">
                <div className="w-6 h-6 rounded-xl bg-[#78c953]/10 text-[#78c953] flex items-center justify-center shrink-0">
                  <Layers size={14} />
                </div>
                <span className="truncate">
                  {selectedCategory === "Semua"
                    ? "Semua Kategori"
                    : selectedCategory}
                </span>
              </div>
              <ChevronDown
                size={16}
                className={`text-slate-400 transition-transform duration-300 shrink-0 ${
                  isDropdownOpen ? "rotate-180 text-[#78c953]" : ""
                }`}
              />
            </button>

            {/* Menu Dropdown Container */}
            {isDropdownOpen && (
              <div className="absolute right-0 left-0 lg:left-auto lg:right-0 mt-2 w-full lg:w-64 bg-white border border-slate-200/80 rounded-2xl shadow-xl z-50 overflow-hidden py-1.5 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  Pilih Kategori Menu
                </div>
                <div className="max-h-60 overflow-y-auto py-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">
                  {categories.map((cat) => {
                    const isSelected = selectedCategory === cat;
                    return (
                      <button
                        key={cat}
                        onClick={() => {
                          setSelectedCategory(cat);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold text-left transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-[#78c953]/10 text-[#78c953]"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <span className="truncate">
                          {cat === "Semua" ? "🌟 Semua Kategori" : cat}
                        </span>
                        {isSelected && (
                          <Check
                            size={14}
                            className="text-[#78c953] shrink-0"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Daftar Produk / Grid Menu */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center py-32 bg-white rounded-3xl border border-slate-200/60 shadow-xs">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-3 border-[#78c953] border-t-transparent rounded-full animate-spin shadow-sm" />
              <p className="text-xs font-bold text-slate-500 tracking-wide">
                Memuat daftar menu terbaik...
              </p>
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-32 text-center bg-white rounded-3xl border border-slate-200/60 shadow-xs px-4">
            <div className="w-16 h-16 rounded-3xl bg-rose-50 flex items-center justify-center text-rose-500 mb-3 shadow-inner">
              <XCircle size={32} />
            </div>
            <p className="text-sm font-extrabold text-slate-800">
              Menu tidak ditemukan
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              Coba gunakan kata kunci lain atau pilih kategori yang berbeda.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredProducts.map((product) => {
              const isOutOfStock = product.stock <= 0;
              return (
                <div
                  key={product.id}
                  className={`group bg-white border border-slate-200/80 rounded-3xl p-3.5 flex flex-col justify-between shadow-xs hover:shadow-xl hover:border-[#78c953]/50 transition-all duration-300 relative overflow-hidden ${
                    isOutOfStock ? "opacity-60 bg-slate-50" : ""
                  }`}
                >
                  <div>
                    {/* Container Gambar Produk */}
                    <div className="aspect-square w-full bg-slate-50 rounded-2xl mb-3 overflow-hidden flex items-center justify-center relative p-3 border border-slate-100/80 group-hover:bg-slate-100/60 transition-colors">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-contain rounded-xl drop-shadow-xs group-hover:scale-108 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-300">
                          <Coffee size={24} />
                        </div>
                      )}
                      {isOutOfStock && (
                        <span className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center text-white text-[10px] font-black uppercase tracking-wider">
                          Habis
                        </span>
                      )}
                      <span className="absolute top-2.5 right-2.5 bg-white/90 backdrop-blur-xs text-[9px] font-extrabold px-2.5 py-1 rounded-full text-slate-600 border border-slate-200/50 shadow-2xs">
                        {product.category}
                      </span>
                    </div>

                    <h3 className="font-bold text-xs sm:text-sm text-slate-800 line-clamp-2 leading-relaxed min-h-[36px] group-hover:text-[#78c953] transition-colors">
                      {product.name}
                    </h3>
                  </div>

                  <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between gap-1">
                    <span className="font-black text-xs sm:text-sm text-slate-900 truncate">
                      Rp {product.price.toLocaleString("id-ID")}
                    </span>
                    <span
                      className={`text-[9px] font-extrabold px-2.5 py-1 rounded-xl shrink-0 ${
                        !isOutOfStock
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                          : "bg-rose-50 text-rose-600 border border-rose-100"
                      }`}
                    >
                      {!isOutOfStock ? `Stok: ${product.stock}` : "Habis"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer Minimalis */}
      <footer className="py-6 text-center text-xs text-slate-400 border-t border-slate-200/60 bg-white mt-auto font-medium">
        &copy; {new Date().getFullYear()}{" "}
        <span className="font-bold text-slate-700">
          {storeSettings?.name || "Kasir Pintar"}
        </span>
        . All rights reserved.
      </footer>
    </div>
  );
}
