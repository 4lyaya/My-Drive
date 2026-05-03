'use client';

import { useState, useEffect } from 'react';
import { X, Lock, Unlock, Eye, EyeOff } from 'lucide-react';
import type { AppSettings } from '@/lib/types';

interface SettingsModalProps {
  isOpen: boolean;
  settings: AppSettings | null;
  onClose: () => void;
  onSave: (updates: Partial<AppSettings>) => void;
}

export function SettingsModal({ isOpen, settings, onClose, onSave }: SettingsModalProps) {
  const [pinEnabled, setPinEnabled] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && settings) {
      setPinEnabled(!!settings.pinCode);
      setPin('');
      setConfirmPin('');
      setError('');
    }
  }, [isOpen, settings]);

  const handleSave = () => {
    if (pinEnabled) {
      if (pin.length < 4) {
        setError('PIN must be at least 4 characters');
        return;
      }
      if (pin !== confirmPin) {
        setError('PINs do not match');
        return;
      }
      onSave({ pinCode: pin });
    } else {
      onSave({ pinCode: null });
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 bg-card border border-border rounded-lg shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-accent transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* PIN Lock Section */}
          <div>
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              {pinEnabled ? (
                <Lock className="h-4 w-4 text-emerald-400" />
              ) : (
                <Unlock className="h-4 w-4 text-muted-foreground" />
              )}
              PIN Lock
            </h3>
            
            <label className="flex items-center gap-3 mb-4">
              <input
                type="checkbox"
                checked={pinEnabled}
                onChange={e => {
                  setPinEnabled(e.target.checked);
                  setError('');
                }}
                className="h-4 w-4 rounded border-border"
              />
              <span className="text-sm">Enable PIN lock on startup</span>
            </label>

            {pinEnabled && (
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type={showPin ? 'text' : 'password'}
                    value={pin}
                    onChange={e => {
                      setPin(e.target.value);
                      setError('');
                    }}
                    placeholder="Enter PIN (min 4 characters)"
                    className="w-full px-3 py-2 pr-10 text-sm bg-muted rounded-lg border border-transparent focus:border-ring focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                  >
                    {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <input
                  type={showPin ? 'text' : 'password'}
                  value={confirmPin}
                  onChange={e => {
                    setConfirmPin(e.target.value);
                    setError('');
                  }}
                  placeholder="Confirm PIN"
                  className="w-full px-3 py-2 text-sm bg-muted rounded-lg border border-transparent focus:border-ring focus:outline-none"
                />
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Privacy Notice</p>
            <p>All your files are stored locally in your browser using IndexedDB. No data is ever sent to any server.</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-border bg-muted/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// PIN Lock Screen
interface PinLockScreenProps {
  onUnlock: () => void;
  correctPin: string;
}

export function PinLockScreen({ onUnlock, correctPin }: PinLockScreenProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [showPin, setShowPin] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === correctPin) {
      onUnlock();
    } else {
      setError(true);
      setPin('');
      setTimeout(() => setError(false), 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div className="w-full max-w-sm mx-4 text-center">
        <div className="mb-8">
          <Lock className="h-16 w-16 mx-auto mb-4 text-primary" />
          <h1 className="text-2xl font-bold">My Drive</h1>
          <p className="text-muted-foreground mt-2">Enter your PIN to unlock</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={showPin ? 'text' : 'password'}
              value={pin}
              onChange={e => setPin(e.target.value)}
              placeholder="Enter PIN"
              autoFocus
              className={`w-full px-4 py-3 text-center text-lg bg-muted rounded-lg border-2 transition-colors focus:outline-none ${
                error ? 'border-destructive' : 'border-transparent focus:border-ring'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
            >
              {showPin ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          
          {error && (
            <p className="text-sm text-destructive">Incorrect PIN. Please try again.</p>
          )}

          <button
            type="submit"
            disabled={!pin}
            className="w-full py-3 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            Unlock
          </button>
        </form>
      </div>
    </div>
  );
}
