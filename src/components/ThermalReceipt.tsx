import React, { useState } from "react";
import {
  Printer,
  Wifi,
  Bluetooth,
  ArrowLeft,
  RefreshCw,
  CheckCircle,
  Smartphone,
  HelpCircle,
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

      // Cek apakah browser mendukung Web Share API level 2 (bisa share file)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Struk Belanja ${nameOfStore}`,
          text: `Halo, berikut adalah nota digital transaksi ${transaction.invoiceNumber} di ${nameOfStore}. Terima kasih!`,
          files: [file],
        });
      } else {
        // Fallback jika browser tidak support share file langsung: Unduh file & arahkan ke WhatsApp Web dengan teks
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
        // Fallback teks WhatsApp jika terjadi kendala
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
        "Aplikasi browser Anda tidak mendukung Web Bluetooth. Silakan gunakan Google Chrome di laptop/Android.",
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
    <div className="flex flex-col lg:flex-row gap-6 max-w-4xl mx-auto p-4 animate-fade-in w-full">
      {/* Receipt Preview Card */}
      <div className="flex-1 flex flex-col items-center bg-slate-100 p-6 rounded-2xl border border-slate-200 shadow-inner">
        <div className="flex justify-between items-center w-full max-w-[320px] mb-4">
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
            Format Kertas:
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPaperWidth("58")}
              className={`p-1 px-3 text-xs rounded-lg font-medium cursor-pointer transition-colors ${paperWidth === "58" ? "bg-slate-800 text-white" : "bg-white text-slate-700 border border-slate-200"}`}
            >
              58mm (Portable)
            </button>
            <button
              onClick={() => setPaperWidth("80")}
              className={`p-1 px-3 text-xs rounded-lg font-medium cursor-pointer transition-colors ${paperWidth === "80" ? "bg-slate-800 text-white" : "bg-white text-slate-700 border border-slate-200"}`}
            >
              80mm (Desktop)
            </button>
          </div>
        </div>

        {/* Outer White Paper Card */}
        <div
          className="bg-white p-6 shadow-md border border-slate-300 relative rounded-md select-none transition-all duration-300"
          style={{ width: paperWidth === "58" ? "300px" : "380px" }}
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-200 to-transparent"></div>

          <div
            id="thermal-receipt-view"
            className="font-mono text-slate-800 text-[11px] leading-relaxed bg-white p-2"
          >
            {/* Header Toko */}
            <div className="text-center">
              <p className="font-bold text-xs md:text-sm">{nameOfStore}</p>
              <p>{addressOfStore}</p>
              <p>Telp: {phoneOfStore}</p>
              <div className="divider border-t border-dashed border-slate-800 my-2"></div>

              <div className="text-[10px] space-y-0.5 mb-2 text-left">
                <div className="flex">
                  <span className="w-12 shrink-0">Nota</span>
                  <span>: {transaction.invoiceNumber}</span>
                </div>
                <div className="flex">
                  <span className="w-12 shrink-0">Tgl</span>
                  <span>
                    : {new Date(transaction.date).toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="flex font-medium">
                  <span className="w-12 shrink-0">Kasir</span>
                  <span>: {transaction.cashierName || "-"}</span>
                </div>
                <div className="flex">
                  <span className="w-12 shrink-0">Bayar</span>
                  <span>: {transaction.paymentMethod.toUpperCase()}</span>
                </div>
              </div>
              <div className="divider border-t border-dashed border-slate-800 my-2"></div>
            </div>

            {/* Receipt Items */}
            <div className="space-y-1 my-2">
              {transaction.items.map((item, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="font-semibold">{item.name}</div>
                  <div className="flex-row flex justify-between pl-2">
                    <span>
                      {item.qty} x {item.price.toLocaleString("id-ID")}
                    </span>
                    <span>{item.total.toLocaleString("id-ID")}</span>
                  </div>
                  {item.discount > 0 && (
                    <div className="text-red-600 pl-2 text-[10px]">
                      * Diskon: -{formatIDR(item.discount * item.qty)}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="divider border-t border-dashed border-slate-800 my-2"></div>

            {/* Calculations summaries */}
            <div className="space-y-0.5 text-right font-medium">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{transaction.subTotal.toLocaleString("id-ID")}</span>
              </div>
              {transaction.discountTotal > 0 && (
                <div className="flex justify-between text-red-600">
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
                    {transaction.taxTotal > 0 && (
                      <div className="text-[9px] text-slate-500 italic flex justify-between leading-none pb-0.5">
                        <span>Dasar PPN:</span>
                        <span>{netSub.toLocaleString("id-ID")}</span>
                      </div>
                    )}
                  </>
                );
              })()}
              <div className="flex justify-between font-bold text-xs pt-1 border-t border-dotted border-slate-400 mt-1">
                <span>TOTAL:</span>
                <span>{transaction.total.toLocaleString("id-ID")}</span>
              </div>

              <div className="divider border-t border-dashed border-slate-800 my-2"></div>

              {transaction.paymentMethod === "cash" && (
                <>
                  <div className="flex justify-between">
                    <span>Bayar Tunai:</span>
                    <span>
                      {(transaction.cashAmount || 0).toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Kembalian:</span>
                    <span>
                      {(transaction.changeAmount || 0).toLocaleString("id-ID")}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Footer feedback */}
            <div className="text-center text-[10px] space-y-1 mt-3">
              <p className="font-bold">TERIMA KASIH ATAS KUNJUNGAN ANDA</p>
              <p>Struk Resmi Digenerate Secara Digital</p>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-1 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-slate-200 to-transparent"></div>
        </div>
      </div>

      {/* Control Panel Panel */}
      <div className="w-full lg:w-[320px] bg-white p-6 rounded-2xl border border-slate-200 space-y-6">
        <div>
          <h3 className="font-bold text-slate-800 text-lg">
            Nota Digital & Cetak
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Bagikan nota dalam format gambar PNG ke WhatsApp atau gunakan
            printer thermal.
          </p>
        </div>

        {/* Digital Share Section */}
        <div className="space-y-3">
          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500 text-white rounded-lg shadow-xs">
                <MessageCircle size={18} />
              </div>
              <div>
                <span className="font-semibold text-emerald-900 text-xs block">
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
                className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold cursor-pointer disabled:bg-emerald-400 flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              >
                <Share2 size={13} />
                {isGeneratingImage ? "Memproses..." : "WhatsApp"}
              </button>
              <button
                onClick={handleDownloadImage}
                disabled={isGeneratingImage}
                className="p-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold cursor-pointer disabled:bg-slate-400 flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              >
                <Download size={13} />
                Unduh PNG
              </button>
            </div>
          </div>

          {/* Bluetooth Option */}
          <div className="p-4 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                <Bluetooth size={18} />
              </div>
              <div className="flex-1">
                <span className="font-semibold text-slate-700 text-xs block">
                  Printer Bluetooth Portable
                </span>
                {bluetoothDevice ? (
                  <span className="text-[10px] text-orange-600 font-medium">
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
                    ? "text-orange-500 animate-pulse"
                    : "text-slate-300"
                }
              />
            </div>

            <button
              onClick={connectBluetoothPrinter}
              disabled={isBluetoothConnecting}
              className="w-full p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer disabled:bg-blue-400 flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            >
              {isBluetoothConnecting ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  Memindai Printer...
                </>
              ) : bluetoothDevice ? (
                <>
                  <Printer size={14} />
                  Kirim ke {bluetoothDevice.name.substring(0, 10)}..
                </>
              ) : (
                <>
                  <Smartphone size={14} />
                  Pasangkan Thermal Printer
                </>
              )}
            </button>
          </div>

          {/* Desktop Print option */}
          <div className="p-4 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-200 text-slate-700 rounded-lg">
                <Printer size={18} />
              </div>
              <div>
                <span className="font-semibold text-slate-700 text-xs block">
                  Sistem Printer Lokal
                </span>
                <span className="text-[10px] text-slate-500">
                  Desktop / PDF print format
                </span>
              </div>
            </div>

            <button
              onClick={handleSystemPrint}
              className="w-full p-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            >
              <Printer size={14} />
              Cetak / Simpan PDF
            </button>
          </div>
        </div>

        {/* Print Success Alert Banner */}
        {printSuccess && (
          <div className="p-3 bg-orange-50 text-orange-800 text-xs font-medium rounded-xl border border-orange-100 flex items-center gap-2 animate-bounce">
            <CheckCircle size={16} className="text-orange-600 shrink-0" />
            <span>Struk thermal berhasil ditransfer ke printer!</span>
          </div>
        )}

        <div className="border-t border-slate-100 pt-4">
          <button
            onClick={onBack}
            className="w-full p-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium cursor-pointer transition-colors flex items-center justify-center gap-1.5"
          >
            <ArrowLeft size={14} />
            Kembali ke Kasir
          </button>
        </div>
      </div>
    </div>
  );
}
