'use client';

export function LogoutLoader() {
  return (
    <div className="text-center">
      {/* Three Blue Dots Animation */}
      <div className="flex justify-center items-center mb-6 h-12">
        <div className="flex space-x-3">
          <div 
            className="w-4 h-4 bg-blue-500 rounded-full animate-bounce"
            style={{ animationDelay: '0ms' }}
          ></div>
          <div 
            className="w-4 h-4 bg-blue-600 rounded-full animate-bounce"
            style={{ animationDelay: '150ms' }}
          ></div>
          <div 
            className="w-4 h-4 bg-blue-700 rounded-full animate-bounce"
            style={{ animationDelay: '300ms' }}
          ></div>
        </div>
      </div>
      <p className="text-lg text-muted-foreground font-medium">Logout</p>
    </div>
  );
}
