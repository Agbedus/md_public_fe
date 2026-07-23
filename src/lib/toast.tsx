import { toast as hotToast, ToastOptions } from 'react-hot-toast';
import { FiCheckCircle, FiInfo, FiAlertCircle, FiXCircle } from 'react-icons/fi';
import { playNotificationSound, getSoundEffectsEnabled } from '@/lib/notification-sounds';
import React from 'react';

function tryPlaySound(type: string) {
  if (typeof window !== 'undefined' && getSoundEffectsEnabled()) {
    playNotificationSound(type);
  }
}

const toastFunction = (message: string, options?: ToastOptions) => {
    tryPlaySound('info');
    return hotToast(message, {
        icon: <FiInfo size={22} className="text-blue-400" />,
        ...options,
    });
};

export const toast = Object.assign(toastFunction, {
    success: (message: string, options?: ToastOptions) => {
        tryPlaySound('success');
        return hotToast.success(message, {
            icon: <FiCheckCircle size={22} className="text-emerald-400" />,
            ...options,
        });
    },
    error: (message: string, options?: ToastOptions) => {
        tryPlaySound('error');
        return hotToast.error(message, {
            icon: <FiXCircle size={22} className="text-rose-400" />,
            ...options,
        });
    },
    info: (message: string, options?: ToastOptions) => {
        tryPlaySound('info');
        return hotToast(message, {
            icon: <FiInfo size={22} className="text-blue-400" />,
            ...options,
        });
    },
    warning: (message: string, options?: ToastOptions) => {
        tryPlaySound('warning');
        return hotToast.error(message, {
            icon: <FiAlertCircle size={22} className="text-amber-400" />,
            ...options,
        });
    },
    custom: hotToast.custom,
    loading: hotToast.loading,
    dismiss: hotToast.dismiss,
    remove: hotToast.remove,
    promise: hotToast.promise,
    undoable: (message: string, onUndo: () => void, options?: ToastOptions) => {
        return hotToast.custom((t) => (
            <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-sm w-full bg-card shadow-xl rounded-2xl pointer-events-auto flex ring-1 ring-card-border overflow-hidden`}>
                <div className="flex-1 w-0 p-4">
                    <div className="flex items-start">
                        <div className="flex-shrink-0 pt-0.5 text-blue-400">
                            <FiInfo size={20} />
                        </div>
                        <div className="ml-3 flex-1">
                            <p className="text-sm font-medium text-foreground tracking-tight">{message}</p>
                            <p className="mt-1 text-[11px] text-text-muted">You can undo this action.</p>
                        </div>
                    </div>
                </div>
                <div className="flex border-l border-card-border bg-foreground/[0.02]">
                    <button
                        onClick={() => {
                            onUndo();
                            hotToast.dismiss(t.id);
                        }}
                        className="w-full border border-transparent rounded-none rounded-r-2xl p-4 flex items-center justify-center text-sm font-bold text-blue-400 hover:text-blue-300 hover:bg-foreground/[0.05] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    >
                        Undo
                    </button>
                </div>
            </div>
        ), { duration: 5000, ...options });
    }
});
