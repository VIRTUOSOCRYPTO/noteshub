import { useState, useEffect } from "react";
import { AlertCircle, CheckCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

let toastCounter = 0;
let toastHandler: ((message: string, type: ToastType) => void) | null = null;

export function showToast(message: string, type: ToastType = "success") {
  if (toastHandler) {
    toastHandler(message, type);
  }
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    toastHandler = (message: string, type: ToastType) => {
      const id = toastCounter++;
      setToasts(prevToasts => [...prevToasts, { id, message, type }]);
      
      setTimeout(() => {
        setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
      }, 5000);
    };
    
    return () => {
      toastHandler = null;
    };
  }, []);

  const removeToast = (id: number) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  };

  const getToastIcon = (type: ToastType) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-5 w-5" />;
      case "error":
        return <AlertCircle className="h-5 w-5" />;
      case "warning":
        return <AlertCircle className="h-5 w-5" />;
      case "info":
        return <Info className="h-5 w-5" />;
    }
  };

  const getToastClass = (type: ToastType) => {
    switch (type) {
      case "success":
        return "bg-green-600";
      case "error":
        return "bg-red-600";
      case "warning":
        return "bg-amber-500";
      case "info":
        return "bg-blue-500";
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md space-y-2">
      {toasts.map(toast => (
        <div 
          key={toast.id} 
          className={`${getToastClass(toast.type)} text-white px-4 py-3 rounded-md shadow-lg flex items-start animate-in slide-in-from-right`}
        >
          <div className="mr-2">
            {getToastIcon(toast.type)}
          </div>
          <div>
            <h3 className="font-medium">{toast.type.charAt(0).toUpperCase() + toast.type.slice(1)}</h3>
            <p className="text-sm">{toast.message}</p>
          </div>
          <button 
            className="ml-auto text-white self-start" 
            onClick={() => removeToast(toast.id)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      ))}
    </div>
  );
}
