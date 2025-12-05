
import React, { useState, useEffect } from 'react';
import { X, Save, KeyRound, Cloud, LogOut } from 'lucide-react';
import { setAdminPin, saveFirebaseConfig, getFirebaseConfig, clearFirebaseConfig } from '../services/storageService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  // Admin PIN State
  const [newPin, setNewPin] = useState('');
  
  // Firebase Config State
  const [apiKey, setApiKey] = useState('');
  const [authDomain, setAuthDomain] = useState('');
  const [projectId, setProjectId] = useState('');
  const [storageBucket, setStorageBucket] = useState('');
  const [messagingSenderId, setMessagingSenderId] = useState('');
  const [appId, setAppId] = useState('');

  const [hasConfig, setHasConfig] = useState(false);

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
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    try {
      // Save PIN if changed
      if (newPin.trim().length > 0) {
        if (newPin.length < 4) throw new Error("El PIN debe tener al menos 4 caracteres.");
        setAdminPin(newPin);
        alert("PIN de administrador actualizado.");
      }

      // Save Firebase Config
      if (apiKey && projectId) {
        const config = {
          apiKey,
          authDomain,
          projectId,
          storageBucket,
          messagingSenderId,
          appId
        };
        saveFirebaseConfig(config); // This reloads the page
      } else {
        onClose();
      }
    } catch (e: any) {
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

          {/* Firebase Config Section */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
               <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                 <Cloud className="w-4 h-4 text-slate-400" />
                 Conexión Nube (Firebase)
               </h3>
               {hasConfig && (
                 <button onClick={handleDisconnect} className="text-xs text-red-500 hover:text-red-700 font-bold flex items-center gap-1">
                   <LogOut className="w-3 h-3" /> Desconectar
                 </button>
               )}
            </div>
            
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
              <p className="text-xs text-slate-500 mb-2">
                Ingresa los datos de tu proyecto Firebase para sincronizar entre dispositivos.
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
            className="w-full py-3 px-4 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-colors flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            Guardar y Reiniciar
          </button>
        </div>
      </div>
    </div>
  );
};
