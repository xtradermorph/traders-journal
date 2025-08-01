"use client"

import { usePathname } from "next/navigation";
import Link from "next/link";
import { 
  LayoutDashboard, 
  BarChart2, 
  Calendar, 
  User,
  PlusCircle
} from "lucide-react";
import { useState } from "react";
import AddTradeDialog from "./AddTradeDialog";

const MobileNavigation = () => {
  const pathname = usePathname();
  const [isAddTradeDialogOpen, setIsAddTradeDialogOpen] = useState(false);
  
  // Don't show on auth pages or landing page
  const isAuthPage = pathname === '/login' || pathname === '/register';
  const isLandingPage = pathname === '/';
  
  if (isAuthPage || isLandingPage) {
    return null;
  }

  return (
    <>
      {/* Safe area padding for iPhone */}
      <div className="h-4 lg:hidden" />
      
      <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 px-2 py-3 flex justify-around lg:hidden z-50 shadow-lg">
        <Link 
          href="/dashboard" 
          className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] rounded-lg transition-colors ${
            pathname === '/dashboard' 
              ? 'text-primary bg-primary/10' 
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <LayoutDashboard className="h-6 w-6 mb-1" />
          <span className="text-xs font-medium">Dashboard</span>
        </Link>
        
        <Link 
          href="/trade-records" 
          className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] rounded-lg transition-colors ${
            pathname === '/trade-records' 
              ? 'text-primary bg-primary/10' 
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <BarChart2 className="h-6 w-6 mb-1" />
          <span className="text-xs font-medium">Trades</span>
        </Link>
        
        <button 
          onClick={() => setIsAddTradeDialogOpen(true)}
          className="flex flex-col items-center justify-center min-h-[44px] min-w-[44px] rounded-lg transition-colors text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <PlusCircle className="h-6 w-6 mb-1" />
          <span className="text-xs font-medium">Add Trade</span>
        </button>
        
        <Link 
          href="/social-forum" 
          className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] rounded-lg transition-colors ${
            pathname === '/social-forum' 
              ? 'text-primary bg-primary/10' 
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Calendar className="h-6 w-6 mb-1" />
          <span className="text-xs font-medium">Forum</span>
        </Link>
        
        <Link 
          href="/profile" 
          className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] rounded-lg transition-colors ${
            pathname === '/profile' 
              ? 'text-primary bg-primary/10' 
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <User className="h-6 w-6 mb-1" />
          <span className="text-xs font-medium">Profile</span>
        </Link>
      </nav>
      
      {/* Bottom safe area for iPhone */}
      <div className="h-20 lg:hidden" />
      
      <AddTradeDialog 
        isOpen={isAddTradeDialogOpen}
        onClose={() => setIsAddTradeDialogOpen(false)}
      />
    </>
  );
};

export default MobileNavigation;