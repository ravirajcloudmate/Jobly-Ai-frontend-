'use client';

import { useEffect, useState } from 'react';
import { PageSkeleton } from './SkeletonLoader';

interface ModuleLoaderProps {
  isLoading: boolean;
  children: React.ReactNode;
}

export function ModuleLoader({ isLoading, children }: ModuleLoaderProps) {
  const [showProgress, setShowProgress] = useState(false);

  useEffect(() => {
    if (isLoading) {
      setShowProgress(true);
    } else {
      // Keep showing progress for a moment after loading completes
      const timer = setTimeout(() => {
        setShowProgress(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  // Show skeleton loader when loading
  if (isLoading) {
    return <PageSkeleton />;
  }

  return (
    <div className="relative">
      {/* Blue Progress Line */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-transparent z-50">
        <div 
          className={`h-full bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 transition-all duration-700 ease-out ${
            showProgress ? 'w-full opacity-100' : 'w-0 opacity-0'
          }`}
          style={{
            boxShadow: showProgress ? '0 2px 10px rgba(59, 130, 246, 0.6), 0 0 20px rgba(59, 130, 246, 0.3)' : 'none'
          }}
        />
      </div>
      
      {/* Content without fade - keep it clean */}
      <div>
        {children}
      </div>
    </div>
  );
}
