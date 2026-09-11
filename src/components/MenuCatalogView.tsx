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
      {/* KARTU UTAMA MINIMALIS */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-[0_2px_20px_rgb(0,0,0,0.02)] flex-1 flex flex-col">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-2.5 text-slate-900 font-bold text-sm sm:text-base tracking-tight">
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
              <ImageIcon size={16} />
            </div>
            <span>Katalog Daftar Menu</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFullscreenOpen(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 px-3.5 py-2 rounded-xl transition-all duration-200 cursor-pointer border border-slate-100"
            >
              <Maximize2 size={13} className="text-slate-400" />
              <span className="hidden sm:inline">Perbesar</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-orange-500 px-4 py-2 rounded-xl transition-all duration-200 cursor-pointer shadow-xs"
            >
              <Download size={13} />
              <span>Unduh</span>
            </button>
          </div>
        </div>

        {/* AREA PRATINJAU GAMBAR BERSIH */}
        <div
          onClick={() => setIsFullscreenOpen(true)}
          className="relative w-full flex-1 rounded-2xl overflow-hidden bg-slate-50/50 border border-slate-100/80 flex items-center justify-center cursor-zoom-in min-h-[550px] lg:min-h-[650px] p-3 group transition-all duration-300 hover:border-orange-200"
        >
          <img
            src={menuImageUrl}
            alt="Katalog Menu"
            className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-[1.01]"
            onError={(e) => {
              const target = e.target as HTMLElement;
              target.style.display = "none";
            }}
          />

          {/* Subtle Hover Hint Overlay */}
          <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/[0.02] transition-colors duration-300 flex items-center justify-center pointer-events-none">
            <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/90 backdrop-blur-md text-slate-800 text-[11px] font-bold px-3 py-1.5 rounded-full shadow-sm border border-slate-200/60">
              Klik untuk memperbesar
            </span>
          </div>
        </div>
      </div>

      {/* MODAL LIGHTBOX FULLSCREEN ELEGAN */}
      <AnimatePresence>
        {isFullscreenOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6"
          >
            {/* Tombol Aksi di Modal */}
            <div className="absolute top-5 right-5 flex items-center gap-2 z-10">
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-3.5 py-2 rounded-xl text-xs font-semibold border border-white/10 transition-all cursor-pointer"
              >
                <Download size={14} />
                <span className="hidden sm:inline">Unduh</span>
              </button>
              <button
                onClick={() => setIsFullscreenOpen(false)}
                className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white p-2 rounded-xl border border-white/10 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Gambar dalam Modal */}
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full h-full max-w-6xl max-h-[90vh] flex items-center justify-center p-2"
            >
              <img
                src={menuImageUrl}
                alt="Katalog Menu Fullscreen"
                className="w-full h-full object-contain rounded-2xl"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
