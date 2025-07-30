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
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-gray-200 px-2 sm:px-4 py-2 sm:py-3 flex justify-around lg:hidden z-10 shadow-md">
        <Link 
          href="/dashboard" 
          className={`flex flex-col items-center ${pathname === '/dashboard' ? 'text-primary' : 'text-gray-500'}`}
        >
          <LayoutDashboard className="h-5 w-5" />
          <span className="text-xs mt-1">Dashboard</span>
        </Link>
        <Link 
          href="/trade-records" 
          className={`flex flex-col items-center ${pathname === '/trade-records' ? 'text-primary' : 'text-gray-500'}`}
        >
          <BarChart2 className="h-5 w-5" />
          <span className="text-xs mt-1">Trades</span>
        </Link>
        <button 
          onClick={() => setIsAddTradeDialogOpen(true)}
          className="flex flex-col items-center text-gray-500"
        >
          <PlusCircle className="h-5 w-5" />
          <span className="text-xs mt-1">Add Trade</span>
        </button>
        <Link 
          href="/social-forum" 
          className={`flex flex-col items-center ${pathname === '/social-forum' ? 'text-primary' : 'text-gray-500'}`}
        >
          <Calendar className="h-5 w-5" />
          <span className="text-xs mt-1">Forum</span>
        </Link>
        <Link 
          href="/profile" 
          className={`flex flex-col items-center ${pathname === '/profile' ? 'text-primary' : 'text-gray-500'}`}
        >
          <User className="h-5 w-5" />
          <span className="text-xs mt-1">Profile</span>
        </Link>
      </nav>
      
      <AddTradeDialog 
        isOpen={isAddTradeDialogOpen}
        onClose={() => setIsAddTradeDialogOpen(false)}
      />
    </>
  );
};

export default MobileNavigation;