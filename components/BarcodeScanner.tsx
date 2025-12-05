import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { X, Loader2, Camera } from 'lucide-react';

interface BarcodeScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScanSuccess, onClose }) => {
  const scannerRegionId = "html5qr-code-full-region";
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isScanningRef = useRef(false);

  useEffect(() => {
    // Initialize scanner
    const startScanner = async () => {
      try {
        const scanner = new Html5Qrcode(scannerRegionId);
        scannerRef.current = scanner;

        const config = { 
            fps: 10, 
            qrbox: { width: 250, height: 150 }, // Rectangular box for barcodes
            aspectRatio: 1.0
        };
        
        // EAN_13 is standard for ISBNs
        const formatsToSupport = [ 
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8
        ];

        await scanner.start(
          { facingMode: "environment" }, 
          config,
          (decodedText) => {
            if (!isScanningRef.current) {
                isScanningRef.current = true;
                // Stop scanning immediately on success to prevent multiple triggers
                scanner.stop().then(() => {
                    onScanSuccess(decodedText);
                }).catch(err => console.warn("Stop failed", err));
            }
          },
          (errorMessage) => {
            // parse error, ignore it.
          }
        );
      } catch (err) {
        console.error("Error starting scanner", err);
        setError("No se pudo iniciar la cámara. Asegúrate de dar permisos.");
      }
    };

    // Small timeout to ensure DOM is ready
    const timer = setTimeout(() => {
        startScanner();
    }, 100);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(err => console.warn("Cleanup stop failed", err));
      }
    };
  }, [onScanSuccess]);

  return (
    <div className="fixed inset-0 z-[70] bg-black flex flex-col items-center justify-center">
       <button 
         onClick={() => {
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().then(onClose).catch(onClose);
            } else {
                onClose();
            }
         }}
         className="absolute top-4 right-4 p-3 bg-white/20 rounded-full text-white hover:bg-white/30 z-50 backdrop-blur-md"
       >
         <X className="w-6 h-6" />
       </button>

       <div className="w-full max-w-md px-4 relative">
          <h3 className="text-white text-center font-bold text-xl mb-4 flex items-center justify-center gap-2">
            <Camera className="w-6 h-6" />
            Escaneando ISBN
          </h3>
          
          <div className="relative rounded-2xl overflow-hidden bg-black border border-slate-700 shadow-2xl">
             <div id={scannerRegionId} className="w-full h-auto min-h-[300px]"></div>
             
             {/* Visual Overlay guide */}
             {!error && (
                 <div className="absolute inset-0 pointer-events-none border-2 border-white/20">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[30%] border-2 border-red-500 rounded-lg shadow-[0_0_0_1000px_rgba(0,0,0,0.5)]"></div>
                    <p className="absolute bottom-10 left-0 right-0 text-center text-white/80 text-sm font-medium">
                        Centra el código de barras en el recuadro rojo
                    </p>
                 </div>
             )}
          </div>

          {error && (
             <div className="mt-4 p-4 bg-red-900/50 border border-red-500/50 rounded-xl text-red-200 text-center">
                {error}
             </div>
          )}
       </div>
    </div>
  );
};
