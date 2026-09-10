import React, { useState, useEffect } from "react";
import { Tag, Plus, Trash2, AlertCircle } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

export function PromoManager() {
  const [promos, setPromos] = useState<any[]>([]);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("percentage");
  const [value, setValue] = useState("");
  const [minPurchase, setMinPurchase] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const fetchPromos = async () => {
    const { data, error } = await supabase
      .from("promos")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) {
      setPromos(data);
    }
  };

  useEffect(() => {
    fetchPromos();
  }, []);

  const handleAddPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !name || !value) return;

    setIsLoading(true);
    const { error } = await supabase.from("promos").insert([
      {
        code: code.toUpperCase(),
        name,
        type,
        value: Number(value),
        min_purchase: Number(minPurchase) || 0,
        is_active: true,
      },
    ]);

    setIsLoading(false);
    if (!error) {
      setCode("");
      setName("");
      setValue("");
      setMinPurchase("");
      fetchPromos();
    } else {
      alert("Gagal menambah promo: " + error.message);
    }
  };

  const handleDeletePromo = async (id: string) => {
    if (confirm("Yakin ingin menghapus promo ini?")) {
      await supabase.from("promos").delete().eq("id", id);
      fetchPromos();
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5 p-3 sm:p-6 pb-10">
      {/* Card Form Input Minimalis & Responsif */}
      <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-50">
          <div className="p-2 bg-orange-50 text-orange-500 rounded-xl">
            <Tag size={16} />
          </div>
          <h3 className="font-extrabold text-slate-800 text-xs sm:text-sm">
            Form Tambah Promo
          </h3>
        </div>

        <form onSubmit={handleAddPromo} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div>
              <label className="block text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Kode Promo
              </label>
              <input
                type="text"
                placeholder="DISKON50"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/85 rounded-2xl text-xs font-bold uppercase text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Nama Promo
              </label>
              <input
                type="text"
                placeholder="Promo Grenopening"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/85 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Tipe Diskon
              </label>
              <select
                value={type}
                onChange={(e) => {
                  setType(e.target.value);
                  setValue("");
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/85 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all cursor-pointer"
              >
                <option value="percentage">Persentase</option>
                <option value="fixed">Nominal</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Nilai Diskon
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-extrabold text-slate-400">
                  {type === "percentage" ? "%" : "Rp"}
                </span>
                <input
                  type="number"
                  placeholder={type === "percentage" ? "0" : "0"}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200/85 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
            <div className="sm:col-span-2">
              <label className="block text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Minimal Belanja (Opsional)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-extrabold text-slate-400">
                  Rp
                </span>
                <input
                  type="number"
                  placeholder="0"
                  value={minPurchase}
                  onChange={(e) => setMinPurchase(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200/85 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                />
              </div>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 text-white font-extrabold rounded-2xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-orange-500/20"
              >
                <Plus size={15} />
                {isLoading ? "Menyimpan..." : "Simpan Promo"}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Tabel Daftar Promo Responsif */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-extrabold text-slate-800 text-xs sm:text-sm">
            Daftar Promo Aktif
          </h3>
          <span className="text-[10px] font-black bg-orange-50 text-orange-600 px-2.5 py-1 rounded-full">
            {promos.length} Promo Tersedia
          </span>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs whitespace-nowrap sm:whitespace-normal">
            <thead className="bg-slate-50/60 text-slate-400 font-extrabold uppercase tracking-wider border-b border-slate-100 text-[10px]">
              <tr>
                <th className="p-3.5 sm:p-4">Kode Promo</th>
                <th className="p-3.5 sm:p-4">Nama Promo</th>
                <th className="p-3.5 sm:p-4">Diskon</th>
                <th className="p-3.5 sm:p-4">Min. Belanja</th>
                <th className="p-3.5 sm:p-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {promos.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="p-10 text-center text-slate-400 font-medium"
                  >
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <AlertCircle size={26} className="text-slate-300" />
                      <p className="text-xs font-bold text-slate-500">
                        Belum ada promo yang ditambahkan.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                promos.map((promo) => (
                  <tr
                    key={promo.id}
                    className="hover:bg-slate-50/40 transition-colors"
                  >
                    <td className="p-3.5 sm:p-4">
                      <span className="px-2.5 py-1 bg-orange-50 text-orange-600 font-black rounded-xl border border-orange-100/50 text-[11px]">
                        {promo.code}
                      </span>
                    </td>
                    <td className="p-3.5 sm:p-4 font-bold text-slate-800">
                      {promo.name}
                    </td>
                    <td className="p-3.5 sm:p-4 font-extrabold text-slate-600">
                      {promo.type === "percentage"
                        ? `${promo.value}%`
                        : `Rp ${Number(promo.value).toLocaleString("id-ID")}`}
                    </td>
                    <td className="p-3.5 sm:p-4 font-medium text-slate-500">
                      {promo.min_purchase > 0
                        ? `Rp ${Number(promo.min_purchase).toLocaleString("id-ID")}`
                        : "Tanpa minimum"}
                    </td>
                    <td className="p-3.5 sm:p-4 text-center">
                      <button
                        onClick={() => handleDeletePromo(promo.id)}
                        className="p-2 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-all cursor-pointer inline-flex items-center justify-center"
                        title="Hapus Promo"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
