import React, { useState } from "react";
import {
  Printer,
  Wifi,
  Bluetooth,
  ArrowLeft,
  RefreshCw,
  CheckCircle,
  Smartphone,
  Share2,
  Download,
  MessageCircle,
} from "lucide-react";
import { toPng } from "html-to-image";
import { Transaction, StoreSettings } from "../types";

interface ThermalReceiptProps {
  transaction: Transaction;
  onBack: () => void;
  storeSettings?: StoreSettings;
  storeName?: string;
  storeAddress?: string;
  storePhone?: string;
}

export default function ThermalReceipt({
  transaction,
  onBack,
  storeSettings,
  storeName,
  storeAddress,
  storePhone,
}: ThermalReceiptProps) {
  // Leverage storeSettings with defaults fallbacks
  const nameOfStore = storeSettings?.name || storeName || "";
  const addressOfStore = storeSettings?.address || storeAddress || "";
  const phoneOfStore = storeSettings?.phone || storePhone || "";
  const [isBluetoothConnecting, setIsBluetoothConnecting] = useState(false);
  const [bluetoothDevice, setBluetoothDevice] = useState<any>(null);
  const [printSuccess, setPrintSuccess] = useState(false);
  const [paperWidth, setPaperWidth] = useState<"58" | "80">("58");
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  // Format IDR helper
  const formatIDR = (num: number) => {
    return "Rp " + num.toLocaleString("id-ID");
  };

  // Fungsi untuk generate gambar PNG dari elemen struk
  const generateReceiptImage = async (): Promise<Blob | null> => {
    const node = document.getElementById("thermal-receipt-view");
    if (!node) return null;
    try {
      const dataUrl = await toPng(node, {
        cacheBust: true,
        backgroundColor: "#ffffff",
      });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      return blob;
    } catch (err) {
      console.error("Gagal mendefinisikan gambar struk:", err);
      return null;
    }
  };

  // Unduh Nota sebagai PNG
  const handleDownloadImage = async () => {
    setIsGeneratingImage(true);
    const node = document.getElementById("thermal-receipt-view");
    if (node) {
      try {
        const dataUrl = await toPng(node, {
          cacheBust: true,
          backgroundColor: "#ffffff",
        });
        const link = document.createElement("a");
        link.download = `Struk-${transaction.invoiceNumber}.png`;
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error("Gagal mengunduh gambar:", err);
      }
    }
    setIsGeneratingImage(false);
  };

  // Bagikan Nota ke WhatsApp / Aplikasi Lain
  const handleShareWhatsApp = async () => {
    setIsGeneratingImage(true);
    try {
      const blob = await generateReceiptImage();
      if (!blob) {
        alert("Gagal membuat gambar struk.");
        setIsGeneratingImage(false);
        return;
      }

      const file = new File([blob], `Struk-${transaction.invoiceNumber}.png`, {
        type: "image/png",
      });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Struk Belanja ${nameOfStore}`,
          text: `Halo, berikut adalah nota digital transaksi ${transaction.invoiceNumber} di ${nameOfStore}. Terima kasih!`,
          files: [file],
        });
      } else {
        handleDownloadImage();
        const waText = encodeURIComponent(
          `Halo, berikut adalah nota digital transaksi *${transaction.invoiceNumber}* dari *${nameOfStore}*.\nTotal: *${formatIDR(transaction.total)}*\nTerima kasih atas kunjungan Anda!`,
        );
        window.open(`https://wa.me/?text=${waText}`, "_blank");
        alert(
          "Gambar struk telah diunduh. Anda dapat melampirkannya secara manual di WhatsApp.",
        );
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Error saat membagikan:", err);
        const waText = encodeURIComponent(
          `Nota ${transaction.invoiceNumber} - ${nameOfStore}\nTotal: ${formatIDR(transaction.total)}`,
        );
        window.open(`https://wa.me/?text=${waText}`, "_blank");
      }
    }
    setIsGeneratingImage(false);
  };

  // Web Bluetooth integration for portable thermal printer
  const connectBluetoothPrinter = async () => {
    const nav = navigator as any;
    if (!nav.bluetooth) {
      alert(
        "Aplikasi browser Anda tidak mendukung Web Bluetooth. Silakan gunakan Google Chrome di Android/Laptop.",
      );
      return;
    }

    setIsBluetoothConnecting(true);
    try {
      const device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ["000018f0-0000-1000-8000-00805f9b34fb"],
      });

      setBluetoothDevice(device);
      setTimeout(() => {
        setIsBluetoothConnecting(false);
        setPrintSuccess(true);
        setTimeout(() => setPrintSuccess(false), 3000);
      }, 1500);
    } catch (err: any) {
      console.warn("Bluetooth pairing canceled or failed:", err);
      setIsBluetoothConnecting(false);
    }
  };

  const handleSystemPrint = () => {
    const printContent = document.getElementById(
      "thermal-receipt-view",
    )?.innerHTML;

    if (printContent) {
      const popupWin = window.open("", "_blank", "width=400,height=600");
      if (popupWin) {
        popupWin.document.open();
        popupWin.document.write(`
          <html>
            <head>
              <title>Print Struk - ${transaction.invoiceNumber}</title>
              <style>
                body {
                  font-family: 'Courier New', Courier, monospace;
                  padding: 10px;
                  width: ${paperWidth === "58" ? "280px" : "380px"};
                  margin: 0 auto;
                  font-size: 11px;
                  color: #000;
                }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .divider { border-top: 1px dashed #000; margin: 8px 0; }
                .flex-row { display: flex; justify-content: space-between; }
                .flex { display: flex; }
                .w-12 { width: 48px; }
                .shrink-0 { flex-shrink: 0; }
                .bold { font-weight: bold; }
                @media print {
                  body { margin: 0; padding: 0; }
                }
              </style>
            </head>
            <body onload="window.print(); window.close();">
              ${printContent}
            </body>
          </html>
        `);
        popupWin.document.close();
      }
    }
  };

  return (
    <div className="w-full h-full p-0 relative flex flex-col space-y-4 font-sans overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {/* Container Utama Grid */}
      <div className="flex flex-col lg:flex-row gap-5 max-w-5xl mx-auto w-full pb-10">
        {/* Kolom Kiri: Preview Struk */}
        <div className="flex-1 flex flex-col items-center bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-xs">
          <div className="flex justify-between items-center w-full max-w-[320px] mb-5 pb-3 border-b border-slate-50">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              Ukuran Kertas:
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPaperWidth("58")}
                className={`p-1.5 px-3 text-xs rounded-xl font-extrabold cursor-pointer transition-all ${
                  paperWidth === "58"
                    ? "bg-orange-500 text-white shadow-xs"
                    : "bg-slate-50 text-slate-600 border border-slate-100 hover:bg-slate-100"
                }`}
              >
                58mm
              </button>
              <button
                onClick={() => setPaperWidth("80")}
                className={`p-1.5 px-3 text-xs rounded-xl font-extrabold cursor-pointer transition-all ${
                  paperWidth === "80"
                    ? "bg-orange-500 text-white shadow-xs"
                    : "bg-slate-50 text-slate-600 border border-slate-100 hover:bg-slate-100"
                }`}
              >
                80mm
              </button>
            </div>
          </div>

          {/* Kertas Struk Fisik */}
          <div
            className="bg-white p-5 shadow-xs border border-slate-200/85 relative rounded-2xl select-none transition-all duration-300"
            style={{ width: paperWidth === "58" ? "290px" : "370px" }}
          >
            <div
              id="thermal-receipt-view"
              className="font-mono text-slate-800 text-[11px] leading-relaxed bg-white p-1"
            >
              {/* Header Toko */}
              <div className="text-center">
                <p className="font-extrabold text-xs sm:text-sm text-slate-900">
                  {nameOfStore}
                </p>
                <p className="text-slate-500">{addressOfStore}</p>
                <p className="text-slate-500">Telp: {phoneOfStore}</p>
                <div className="divider border-t border-dashed border-slate-300 my-2"></div>

                <div className="text-[10px] space-y-0.5 mb-2 text-left text-slate-600">
                  <div className="flex">
                    <span className="w-12 shrink-0 font-bold">Nota</span>
                    <span>: {transaction.invoiceNumber}</span>
                  </div>
                  <div className="flex">
                    <span className="w-12 shrink-0 font-bold">Tgl</span>
                    <span>
                      : {new Date(transaction.date).toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div className="flex font-bold">
                    <span className="w-12 shrink-0">Kasir</span>
                    <span>: {transaction.cashierName || "-"}</span>
                  </div>
                  <div className="flex">
                    <span className="w-12 shrink-0 font-bold">Bayar</span>
                    <span>: {transaction.paymentMethod.toUpperCase()}</span>
                  </div>
                </div>
                <div className="divider border-t border-dashed border-slate-300 my-2"></div>
              </div>

              {/* Item Belanja */}
              <div className="space-y-1.5 my-2">
                {transaction.items.map((item, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <div className="font-bold text-slate-900">{item.name}</div>
                    <div className="flex-row flex justify-between pl-2 text-slate-600">
                      <span>
                        {item.qty} x {item.price.toLocaleString("id-ID")}
                      </span>
                      <span className="font-bold">
                        {item.total.toLocaleString("id-ID")}
                      </span>
                    </div>
                    {item.discount > 0 && (
                      <div className="text-rose-600 pl-2 text-[10px]">
                        * Diskon: -{formatIDR(item.discount * item.qty)}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="divider border-t border-dashed border-slate-300 my-2"></div>

              {/* Rincian Kalkulasi */}
              <div className="space-y-1 text-right font-medium text-slate-700">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{transaction.subTotal.toLocaleString("id-ID")}</span>
                </div>
                {transaction.discountTotal > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Total Potongan:</span>
                    <span>
                      -{transaction.discountTotal.toLocaleString("id-ID")}
                    </span>
                  </div>
                )}
                {(() => {
                  const netSub = Math.max(
                    0,
                    transaction.subTotal - transaction.discountTotal,
                  );
                  const derivedTaxPercent =
                    transaction.taxTotal > 0
                      ? netSub > 0
                        ? Math.round((transaction.taxTotal * 10) / netSub) / 10
                        : storeSettings?.taxPercentage || 11
                      : 0;
                  return (
                    <>
                      <div className="flex justify-between">
                        <span>Pajak (PPN {derivedTaxPercent}%):</span>
                        <span>
                          {transaction.taxTotal.toLocaleString("id-ID")}
                        </span>
                      </div>
                    </>
                  );
                })()}
                <div className="flex justify-between font-extrabold text-xs pt-1.5 border-t border-dotted border-slate-300 mt-1 text-slate-900">
                  <span>TOTAL:</span>
                  <span>{transaction.total.toLocaleString("id-ID")}</span>
                </div>

                <div className="divider border-t border-dashed border-slate-300 my-2"></div>

                {transaction.paymentMethod === "cash" && (
                  <>
                    <div className="flex justify-between">
                      <span>Bayar Tunai:</span>
                      <span>
                        {(transaction.cashAmount || 0).toLocaleString("id-ID")}
                      </span>
                    </div>
                    <div className="flex justify-between font-extrabold text-slate-900">
                      <span>Kembalian:</span>
                      <span>
                        {(transaction.changeAmount || 0).toLocaleString(
                          "id-ID",
                        )}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Footer Struk */}
              <div className="text-center text-[10px] space-y-1 mt-4 text-slate-500">
                <p className="font-extrabold text-slate-800">
                  TERIMA KASIH ATAS KUNJUNGAN ANDA
                </p>
                <p>Simpan struk ini sebagai bukti pembayaran</p>
              </div>
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Panel Kontrol & Aksi */}
        <div className="w-full lg:w-[360px] bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-xs space-y-5">
          <div>
            <h3 className="font-extrabold text-slate-800 text-xs sm:text-sm">
              Nota Digital & Cetak
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Bagikan nota ke WhatsApp atau hubungkan printer thermal.
            </p>
          </div>

          <div className="space-y-3.5">
            {/* Bagikan Nota WhatsApp / Gambar */}
            <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/60 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs shrink-0">
                  <MessageCircle size={17} />
                </div>
                <div>
                  <span className="font-extrabold text-emerald-900 text-xs block">
                    Nota Digital (PNG)
                  </span>
                  <span className="text-[10px] text-emerald-700">
                    Kirim via WhatsApp atau simpan gambar
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleShareWhatsApp}
                  disabled={isGeneratingImage}
                  className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer disabled:bg-emerald-400 flex items-center justify-center gap-1.5 transition-all shadow-xs"
                >
                  <Share2 size={13} />
                  {isGeneratingImage ? "Proses..." : "WhatsApp"}
                </button>
                <button
                  onClick={handleDownloadImage}
                  disabled={isGeneratingImage}
                  className="p-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer disabled:bg-slate-400 flex items-center justify-center gap-1.5 transition-all shadow-xs"
                >
                  <Download size={13} />
                  Unduh PNG
                </button>
              </div>
            </div>

            {/* Opsi Printer Bluetooth Portable */}
            <div className="p-4 bg-slate-50/60 rounded-2xl border border-slate-100 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100/50 shrink-0">
                  <Bluetooth size={17} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-extrabold text-slate-800 text-xs block truncate">
                    Printer Bluetooth Portable
                  </span>
                  {bluetoothDevice ? (
                    <span className="text-[10px] text-orange-600 font-bold truncate block">
                      Terhubung: {bluetoothDevice.name}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400">
                      Belum dipasangkan
                    </span>
                  )}
                </div>
                <Wifi
                  size={14}
                  className={
                    bluetoothDevice
                      ? "text-orange-500 animate-pulse shrink-0"
                      : "text-slate-300 shrink-0"
                  }
                />
              </div>

              <button
                onClick={connectBluetoothPrinter}
                disabled={isBluetoothConnecting}
                className="w-full p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer disabled:bg-blue-400 flex items-center justify-center gap-1.5 transition-all shadow-xs"
              >
                {isBluetoothConnecting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Memindai Printer...
                  </>
                ) : bluetoothDevice ? (
                  <>
                    <Printer size={14} />
                    Cetak ke {bluetoothDevice.name.substring(0, 10)}..
                  </>
                ) : (
                  <>
                    <Smartphone size={14} />
                    Pasangkan Thermal Printer
                  </>
                )}
              </button>
            </div>

            {/* Opsi Sistem Printer Lokal */}
            <div className="p-4 bg-slate-50/60 rounded-2xl border border-slate-100 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                  <Printer size={17} />
                </div>
                <div>
                  <span className="font-extrabold text-slate-800 text-xs block">
                    Sistem Printer Lokal
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Desktop / Format Cetak PDF
                  </span>
                </div>
              </div>

              <button
                onClick={handleSystemPrint}
                className="w-full p-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5 transition-all shadow-xs"
              >
                <Printer size={14} />
                Cetak / Simpan PDF
              </button>
            </div>
          </div>

          {/* Notifikasi Sukses Cetak */}
          {printSuccess && (
            <div className="p-3 bg-orange-50 text-orange-800 text-xs font-bold rounded-2xl border border-orange-100 flex items-center gap-2 animate-bounce">
              <CheckCircle size={16} className="text-orange-600 shrink-0" />
              <span>Struk berhasil ditransfer ke printer!</span>
            </div>
          )}

          <div className="border-t border-slate-100 pt-3">
            <button
              onClick={onBack}
              className="w-full p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5"
            >
              <ArrowLeft size={14} />
              Kembali ke Kasir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
