import React, { useState } from "react";
import { Download, Maximize2, X, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function MenuCatalogView() {
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const menuImageUrl = "/src/image/pricelist.png";

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = menuImageUrl;
    link.download = "Katalog-Menu.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full h-full min-h-[calc(100vh-2rem)] flex flex-col space-y-4 pb-6">
      {/* KARTU UTAMA FULL RESPONSIF */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-100 shadow-sm flex-1 flex flex-col">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm sm:text-base">
            <ImageIcon size={18} className="text-orange-500" />
            <span>Katalog Daftar Menu</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFullscreenOpen(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl transition-colors cursor-pointer"
            >
              <Maximize2 size={14} />
              <span className="hidden sm:inline">Perbesar</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 px-3.5 py-2 rounded-xl transition-colors cursor-pointer shadow-sm"
            >
              <Download size={14} />
              <span>Unduh</span>
            </button>
          </div>
        </div>

        {/* AREA PRATINJAU GAMBAR DENGAN LATAR BELAKANG PUTIH BERSIH */}
        <div
          onClick={() => setIsFullscreenOpen(true)}
          className="relative w-full flex-1 rounded-xl overflow-hidden bg-white border border-slate-100 flex items-center justify-center cursor-zoom-in min-h-[600px] lg:min-h-[700px] p-2"
        >
          <img
            src={menuImageUrl}
            alt="Katalog Menu"
            className="w-full h-full object-contain"
            onError={(e) => {
              const target = e.target as HTMLElement;
              target.style.display = "none";
            }}
          />
        </div>
      </div>

      {/* MODAL LIGHTBOX FULLSCREEN */}
      <AnimatePresence>
        {isFullscreenOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          >
            {/* Tombol Aksi di Modal */}
            <div className="absolute top-5 right-5 flex items-center gap-2 z-10">
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl text-xs font-medium shadow-lg transition-all cursor-pointer"
              >
                <Download size={15} />
                <span>Unduh</span>
              </button>
              <button
                onClick={() => setIsFullscreenOpen(false)}
                className="bg-white/10 hover:bg-white/20 text-white p-2.5 rounded-xl transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Gambar dalam Modal (Full Layar dengan Background Bersih) */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full h-full max-w-7xl max-h-[92vh] flex items-center justify-center bg-white/5 rounded-2xl p-2"
            >
              <img
                src={menuImageUrl}
                alt="Katalog Menu Fullscreen"
                className="w-full h-full object-contain rounded-xl shadow-2xl"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
