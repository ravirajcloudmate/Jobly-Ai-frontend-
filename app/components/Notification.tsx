'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, Trash2, X } from 'lucide-react';

interface NotificationProps {
  type: 'success' | 'error' | 'delete';
  title: string;
  message: string;
  isVisible: boolean;
  onClose: () => void;
  autoClose?: boolean;
  duration?: number;
}

export function Notification({ 
  type, 
  title, 
  message, 
  isVisible, 
  onClose, 
  autoClose = true, 
  duration = 3000 
}: NotificationProps) {
  const [show, setShow] = useState(false);
  const [progressStarted, setProgressStarted] = useState(false);

  useEffect(() => {
    if (isVisible) {
      // Show the notification immediately
      setShow(true);
      
      // Start progress bar animation after a small delay
      const progressTimer = setTimeout(() => {
        setProgressStarted(true);
      }, 100);
      
      if (autoClose) {
        // Auto close after specified duration
        const closeTimer = setTimeout(() => {
          setShow(false);
          // Wait for exit animation to complete before calling onClose
          setTimeout(() => {
            onClose();
          }, 300);
        }, duration);
        
        return () => {
          clearTimeout(progressTimer);
          clearTimeout(closeTimer);
        };
      }
      
      return () => clearTimeout(progressTimer);
    } else {
      setShow(false);
      setProgressStarted(false);
    }
  }, [isVisible, autoClose, duration, onClose]);

  if (!isVisible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'delete':
        return <Trash2 className="h-5 w-5 text-red-600" />;
      case 'error':
        return <X className="h-5 w-5 text-red-600" />;
      default:
        return <CheckCircle className="h-5 w-5 text-green-600" />;
    }
  };

  const getBgColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'delete':
        return 'bg-red-50 border-red-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-green-50 border-green-200';
    }
  };

  const getTextColor = () => {
    switch (type) {
      case 'success':
        return 'text-green-800';
      case 'delete':
        return 'text-red-800';
      case 'error':
        return 'text-red-800';
      default:
        return 'text-green-800';
    }
  };

  return (
    <div 
      className={`fixed top-4 right-4 z-50 transition-all duration-300 ease-out ${
        show ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <div className={`max-w-sm w-full ${getBgColor()} border rounded-lg shadow-lg p-4`}>
        <div className="flex items-start gap-3">
          {getIcon()}
          <div className="flex-1 min-w-0">
            <h4 className={`font-medium text-sm ${getTextColor()}`}>
              {title}
            </h4>
            <p className={`text-sm mt-1 ${getTextColor()} opacity-90`}>
              {message}
            </p>
          </div>
          <button
            onClick={() => {
              setShow(false);
              setTimeout(onClose, 300);
            }}
            className={`${getTextColor()} hover:opacity-70 transition-opacity`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        {/* Progress bar */}
        {autoClose && (
          <div className="mt-3 h-1 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all ease-linear ${
                type === 'success' ? 'bg-green-500' : 'bg-red-500'
              }`}
              style={{
                width: progressStarted ? '0%' : '100%',
                transitionDuration: progressStarted ? `${duration - 100}ms` : '0ms'
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
