
import React, { useState } from 'react';
import { X, Lock, KeyRound } from 'lucide-react';
import { verifyUserPin, isDefaultPin, replaceDefaultPin } from '../services/storageService';
import { UserRole } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (role: UserRole) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  // Role that entered with a factory PIN and must choose a new one
  const [pendingRole, setPendingRole] = useState<UserRole | null>(null);
  const [newPin, setNewPin] = useState('');
  const [newPinError, setNewPinError] = useState<string | null>(null);

  if (!isOpen) return null;

  const finishLogin = (role: UserRole) => {
    onLoginSuccess(role);
    setPin('');
    setNewPin('');
    setPendingRole(null);
    setError(false);
    onClose();
  };

  const handleClose = () => {
    setPin('');
    setNewPin('');
    setPendingRole(null);
    setNewPinError(null);
    onClose();
  };

  const handleNewPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingRole) return;
    try {
      await replaceDefaultPin(pendingRole, newPin);
      finishLogin(pendingRole);
    } catch (err: any) {
      setNewPinError(err.message);
    }
  };

  if (pendingRole) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
        <div className="bg-white rounded-xl shadow-2xl max-w-xs w-full p-6 relative">
          <button onClick={handleClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
          <div className="flex flex-col items-center mb-6">
            <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mb-4 text-amber-600">
              <KeyRound className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-slate-800 text-center">Cambia el PIN de fábrica</h2>
            <p className="text-xs text-slate-500 mt-1 text-center">
              El PIN por defecto de {pendingRole === 'ADMIN' ? 'administrador' : 'ayudante'} es público. Elige uno nuevo para continuar.
            </p>
          </div>
          <form onSubmit={handleNewPin}>
            <input
              type="password"
              inputMode="numeric"
              value={newPin}
              onChange={(e) => {
                setNewPin(e.target.value);
                setNewPinError(null);
              }}
              placeholder="Nuevo PIN (mín. 4 dígitos)"
              className="w-full px-4 py-2 mb-4 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-center tracking-widest text-lg font-bold"
              autoFocus
            />
            {newPinError && (
              <p className="text-red-500 text-xs text-center mb-4 font-bold">{newPinError}</p>
            )}
            <button
              type="submit"
              className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors"
            >
              Guardar y entrar
            </button>
          </form>
        </div>
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const role = await verifyUserPin(pin);

    if (role && isDefaultPin(role)) {
      setPin('');
      setPendingRole(role);
    } else if (role) {
      finishLogin(role);
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
