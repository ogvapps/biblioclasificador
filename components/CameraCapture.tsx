import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, X, Check, Loader2 } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (imageSrc: string) => void;
  onClose: () => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'environment', // Prefer back camera on mobile
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: false
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Wait for metadata to load to prevent size issues
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            setIsStreaming(true);
          };
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setError("No se pudo acceder a la cámara. Verifica los permisos o intenta usar otro navegador.");
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleSnap = () => {
    if (videoRef.current && canvasRef.current) {
      // Haptic feedback if available
      if (navigator.vibrate) navigator.vibrate(50);

      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas dimensions to match actual video resolution
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageSrc = canvas.toDataURL('image/jpeg', 0.85); // Compress slightly for performance
        setCapturedImage(imageSrc);
      }
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setProcessing(false);
  };

  const handleConfirm = () => {
    if (capturedImage && !processing) {
      setProcessing(true);
      onCapture(capturedImage);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-4 bg-black/50 text-white absolute top-0 w-full z-10">
        <h3 className="font-semibold text-lg drop-shadow-md">
          {capturedImage ? '¿Confirmar Foto?' : 'Escanear Libros'}
        </h3>
        <button onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Main View Area */}
      <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
        {error ? (
          <div className="text-white text-center p-6">
            <p className="text-red-400 mb-2 font-bold text-xl">Error de Cámara</p>
            <p className="text-slate-300">{error}</p>
          </div>
        ) : (
          <>
            <video 
              ref={videoRef} 
              className={`w-full h-full object-cover transition-opacity duration-300 ${capturedImage ? 'opacity-0 absolute' : 'opacity-100'}`} 
              playsInline 
              muted 
            />
            {capturedImage && (
              <img 
                src={capturedImage} 
                alt="Captured" 
                className="w-full h-full object-contain bg-black z-10 animate-in fade-in duration-200"
              />
            )}
            <canvas ref={canvasRef} className="hidden" />
          </>
        )}
      </div>

      {/* Footer Controls */}
      <div className="p-6 bg-black/80 backdrop-blur-md pb-10 sm:pb-6">
        {capturedImage ? (
          /* Confirmation Controls */
          <div className="flex justify-between items-center max-w-sm mx-auto gap-6">
            <button 
              onClick={handleRetake}
              disabled={processing}
              className="flex-1 flex flex-col items-center gap-2 text-white hover:text-red-400 transition-colors group disabled:opacity-50"
            >
              <div className="w-14 h-14 rounded-full border-2 border-white/30 flex items-center justify-center group-hover:border-red-400/50 group-hover:bg-white/5">
                <RefreshCw className="w-6 h-6" />
              </div>
              <span className="text-sm font-medium">Repetir</span>
            </button>

            <button 
              onClick={handleConfirm}
              disabled={processing}
              className="flex-1 flex flex-col items-center gap-2 text-white hover:text-emerald-400 transition-colors group disabled:opacity-80"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-900/50 group-hover:bg-emerald-500 transform group-active:scale-95 transition-all">
                {processing ? (
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                ) : (
                  <Check className="w-8 h-8 text-white" />
                )}
              </div>
              <span className="text-sm font-bold text-emerald-400">
                {processing ? 'Procesando...' : 'Analizar'}
              </span>
            </button>
          </div>
        ) : (
          /* Camera Controls */
          <div className="flex justify-center items-center">
            <button 
              onClick={handleSnap}
              disabled={!isStreaming}
              className="w-20 h-20 rounded-full border-[6px] border-white/80 flex items-center justify-center hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <div className="w-16 h-16 bg-white rounded-full group-active:scale-90 transition-transform duration-100" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};