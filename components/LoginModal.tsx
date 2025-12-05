
import React, { useState } from 'react';
import { X, Lock, KeyRound } from 'lucide-react';
import { verifyUserPin } from '../services/storageService';
import { UserRole } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (role: UserRole) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const role = verifyUserPin(pin);
    
    if (role) {
      onLoginSuccess(role);
      setPin('');
      setError(false);
      onClose();
    } else {
      setError(true);
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-xl shadow-2xl max-w-xs w-full p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
          <X className="w-5 h-5" />
        </button>
        
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 bg-indigo-50 rounded-full flex items-center justify-center mb-4 text-indigo-600">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Acceso Bibliotecario</h2>
          <p className="text-xs text-slate-500 mt-1 text-center">
            Introduce tu PIN de Admin (2025) o Ayudante (1875) para acceder.
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="relative mb-4">
            <KeyRound className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setError(false);
              }}
              placeholder="PIN de acceso"
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-center tracking-widest text-lg font-bold"
              autoFocus
            />
          </div>
          
          {error && (
            <p className="text-red-500 text-xs text-center mb-4 font-bold">PIN incorrecto</p>
          )}

          <button 
            type="submit"
            className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
};
