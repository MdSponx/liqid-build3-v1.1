import React, { useEffect, useState } from 'react';
import { Copy, Scissors, Clipboard, Trash2, CheckCircle } from 'lucide-react';

export interface NotificationData {
  id: string;
  type: 'copy' | 'cut' | 'paste' | 'delete';
  count: number;
  timestamp: number;
}

interface ClipboardNotificationProps {
  notification: NotificationData | null;
  onDismiss: (id: string) => void;
}

const ClipboardNotification: React.FC<ClipboardNotificationProps> = ({ 
  notification, 
  onDismiss 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (notification) {
      setIsVisible(true);
      setIsExiting(false);
      
      // Auto-dismiss after 3 seconds
      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => {
          onDismiss(notification.id);
          setIsVisible(false);
        }, 300); // Wait for exit animation
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [notification, onDismiss]);

  if (!notification || !isVisible) return null;

  const getIcon = () => {
    switch (notification.type) {
      case 'copy':
        return <Copy size={16} className="text-blue-500" />;
      case 'cut':
        return <Scissors size={16} className="text-orange-500" />;
      case 'paste':
        return <Clipboard size={16} className="text-green-500" />;
      case 'delete':
        return <Trash2 size={16} className="text-red-500" />;
      default:
        return <CheckCircle size={16} className="text-gray-500" />;
    }
  };

  const getMessage = () => {
    const blockText = notification.count === 1 ? 'block' : 'blocks';
    switch (notification.type) {
      case 'copy':
        return `Copied ${notification.count} ${blockText}`;
      case 'cut':
        return `Cut ${notification.count} ${blockText}`;
      case 'paste':
        return `Pasted ${notification.count} ${blockText}`;
      case 'delete':
        return `Deleted ${notification.count} ${blockText}`;
      default:
        return `Action completed`;
    }
  };

  const getBackgroundColor = () => {
    switch (notification.type) {
      case 'copy':
        return 'bg-blue-500';
      case 'cut':
        return 'bg-orange-500';
      case 'paste':
        return 'bg-green-500';
      case 'delete':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div
      className={`fixed top-20 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white font-medium transition-all duration-300 ${
        getBackgroundColor()
      } ${
        isExiting 
          ? 'transform translate-x-full opacity-0' 
          : 'transform translate-x-0 opacity-100'
      }`}
      style={{
        backdropFilter: 'blur(10px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
      }}
    >
      {getIcon()}
      <span>{getMessage()}</span>
      <button
        onClick={() => {
          setIsExiting(true);
          setTimeout(() => {
            onDismiss(notification.id);
            setIsVisible(false);
          }, 300);
        }}
        className="ml-2 text-white/80 hover:text-white transition-colors"
      >
        ×
      </button>
    </div>
  );
};

export default ClipboardNotification;
