
import React, { useState, useEffect } from 'react';
import { X, Save, KeyRound, Cloud, LogOut, Image as ImageIcon, Paintbrush, BookOpen, Clock, Building2, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { setAdminPin, saveFirebaseConfig, getFirebaseConfig, clearFirebaseConfig, isCloudConnected, initFirestoreSync } from '../services/storageService';


interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  // Admin PIN State
  const [newPin, setNewPin] = useState('');

  // General App Settings State
  const [appName, setAppName] = useState(() => localStorage.getItem('biblio_app_name') || 'BiblioClasificador');
  const [centerName, setCenterName] = useState(() => localStorage.getItem('biblio_center_name') || 'Centro Educativo');
  const [centerType, setCenterType] = useState(() => localStorage.getItem('biblio_center_type') || 'SCHOOL');
  const [logoUrl, setLogoUrl] = useState(() => localStorage.getItem('biblio_logo_url') || '');
  const [primaryColor, setPrimaryColor] = useState(() => localStorage.getItem('biblio_primary_color') || '#4f46e5'); // indigo-600 default

  // Policies State
  const [maxLoanDays, setMaxLoanDays] = useState(() => localStorage.getItem('biblio_max_loan_days') || '15');
  const [maxBooksPerUser, setMaxBooksPerUser] = useState(() => localStorage.getItem('biblio_max_books_per_user') || '3');
  const [sanctionDays, setSanctionDays] = useState(() => localStorage.getItem('biblio_sanction_days') || '1');

  // Firebase Config State
  const [apiKey, setApiKey] = useState('');
  const [authDomain, setAuthDomain] = useState('');
  const [projectId, setProjectId] = useState('');
  const [storageBucket, setStorageBucket] = useState('');
  const [messagingSenderId, setMessagingSenderId] = useState('');
  const [appId, setAppId] = useState('');

  const [hasConfig, setHasConfig] = useState(false);
  const [cloudConnected, setCloudConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const config = getFirebaseConfig();
      if (config) {
        setApiKey(config.apiKey || '');
        setAuthDomain(config.authDomain || '');
        setProjectId(config.projectId || '');
        setStorageBucket(config.storageBucket || '');
        setMessagingSenderId(config.messagingSenderId || '');
        setAppId(config.appId || '');
        setHasConfig(true);
      }
      setCloudConnected(isCloudConnected());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    try {
      // Save PIN if changed
      if (newPin.trim().length > 0) {
        if (newPin.length < 4) throw new Error("El PIN debe tener al menos 4 caracteres.");
        setAdminPin(newPin);
        alert("PIN de administrador actualizado.");
      }

      // Save General Settings
      localStorage.setItem('biblio_app_name', appName);
      localStorage.setItem('biblio_center_name', centerName);
      localStorage.setItem('biblio_center_type', centerType);
      localStorage.setItem('biblio_logo_url', logoUrl);
      localStorage.setItem('biblio_primary_color', primaryColor);

      // Save Policies
      localStorage.setItem('biblio_max_loan_days', maxLoanDays);
      localStorage.setItem('biblio_max_books_per_user', maxBooksPerUser);
      localStorage.setItem('biblio_sanction_days', sanctionDays);

      // Dispatch event to update App immediately
      window.dispatchEvent(new Event('biblio_settings_changed'));

      // Save Firebase Config and attempt real connection
      if (apiKey && projectId) {
        const config = {
          apiKey,
          authDomain,
          projectId,
          storageBucket,
          messagingSenderId,
          appId
        };
        saveFirebaseConfig(config);

        // Attempt Firestore initialization with the new config
        setIsSyncing(true);
        const connected = await initFirestoreSync();
        setCloudConnected(connected);
        setIsSyncing(false);

        if (connected) {
          alert("✅ Configuración guardada. Conexión con Firestore establecida correctamente.");
        } else {
          alert("⚠️ Configuración guardada, pero no se pudo conectar con Firestore. Verifica que las credenciales sean correctas y que Firestore esté habilitado en tu proyecto Firebase.");
        }
      }

      onClose();
    } catch (e: any) {
      setIsSyncing(false);
      alert(`Error: ${e.message}`);
    }
  };


  const handleDisconnect = () => {
    if (confirm("¿Estás seguro de desconectar la base de datos? La aplicación volverá a modo local.")) {
      clearFirebaseConfig();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2 text-slate-800">
            <KeyRound className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-bold">Configuración</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">

          {/* Admin PIN Section */}
          <div className="mb-8">
            <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-slate-400" />
              Seguridad (PIN)
            </h3>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Cambiar PIN de Acceso</label>
              <input
                type="text"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="Nuevo PIN (Dejar vacío para mantener)"
                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              />
            </div>
          </div>

          {/* General App Section */}
          <div className="mb-8">
            <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400" />
              Institución y Marca
            </h3>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre de la Aplicación</label>
                  <input type="text" value={appName} onChange={(e) => setAppName(e.target.value)} placeholder="Ej: BiblioClasificador" className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre del Centro/Biblioteca</label>
                  <input type="text" value={centerName} onChange={(e) => setCenterName(e.target.value)} placeholder="Ej: CEIP San Isidro" className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-xs" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo de Instalación</label>
                <select value={centerType} onChange={(e) => setCenterType(e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-xs">
                  <option value="SCHOOL">Centro Educativo (Colegio/Instituto)</option>
                  <option value="PUBLIC">Biblioteca Pública o Comunitaria</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1">Ajusta los términos (Cursos vs. Categorías) y reglas de préstamo.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><ImageIcon className="w-3 h-3" /> Vínculo al Logotipo (URL)</label>
                  <input type="text" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><Paintbrush className="w-3 h-3" /> Color Principal</label>
                  <div className="flex gap-2 items-center">
                    <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-8 h-8 rounded border border-slate-300 cursor-pointer p-0" />
                    <input type="text" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-xs" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Policies Section */}
          <div className="mb-8">
            <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-slate-400" />
              Políticas de Préstamo
            </h3>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1" title="Libros simultáneos permitidos por lector">Máx. Libros</label>
                  <input type="number" min="1" value={maxBooksPerUser} onChange={(e) => setMaxBooksPerUser(e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1" title="Días que un libro puede estar prestado"><Clock className="w-3 h-3" /> Máx. Días</label>
                  <input type="number" min="1" value={maxLoanDays} onChange={(e) => setMaxLoanDays(e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1" title="Días de penalización por cada día de retraso">Días Sanción</label>
                  <input type="number" min="0" value={sanctionDays} onChange={(e) => setSanctionDays(e.target.value)} className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-xs" />
                </div>
              </div>
              <p className="text-[10px] text-slate-500">
                Determina cuántos libros puede llevarse una persona, cuánto tiempo, y si se le restringe el acceso al pasarse de la fecha de entrega.
              </p>
            </div>
          </div>

          {/* Firebase Config Section */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Cloud className="w-4 h-4 text-slate-400" />
                Conexión Nube (Firebase)
                {/* Connection status badge */}
                {hasConfig && (
                  cloudConnected
                    ? <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-semibold"><CheckCircle className="w-3 h-3" />Conectado</span>
                    : <span className="inline-flex items-center gap-1 text-xs text-red-500 font-semibold"><XCircle className="w-3 h-3" />Desconectado</span>
                )}
              </h3>
              {hasConfig && (
                <button onClick={handleDisconnect} className="text-xs text-red-500 hover:text-red-700 font-bold flex items-center gap-1">
                  <LogOut className="w-3 h-3" /> Desconectar
                </button>
              )}
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
              <p className="text-xs text-slate-500 mb-2">
                Ingresa los datos de tu proyecto Firebase (Firestore) para sincronizar el catálogo entre dispositivos.{' '}
                <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="text-indigo-500 underline">Abrir consola Firebase →</a>
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">API Key</label>
                <input type="text" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="w-full p-2 border border-slate-300 rounded text-xs" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Project ID</label>
                <input type="text" value={projectId} onChange={(e) => setProjectId(e.target.value)} className="w-full p-2 border border-slate-300 rounded text-xs" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Auth Domain</label>
                  <input type="text" value={authDomain} onChange={(e) => setAuthDomain(e.target.value)} className="w-full p-2 border border-slate-300 rounded text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Storage Bucket</label>
                  <input type="text" value={storageBucket} onChange={(e) => setStorageBucket(e.target.value)} className="w-full p-2 border border-slate-300 rounded text-xs" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Messaging Sender ID</label>
                  <input type="text" value={messagingSenderId} onChange={(e) => setMessagingSenderId(e.target.value)} className="w-full p-2 border border-slate-300 rounded text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">App ID</label>
                  <input type="text" value={appId} onChange={(e) => setAppId(e.target.value)} className="w-full p-2 border border-slate-300 rounded text-xs" />
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={isSyncing}
            className="w-full py-3 px-4 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-wait"
          >
            {isSyncing
              ? <><RefreshCw className="w-4 h-4 animate-spin" /> Conectando con Firebase...</>
              : <><Save className="w-4 h-4" /> Guardar</>
            }
          </button>
        </div>
      </div>
    </div>
  );
};

