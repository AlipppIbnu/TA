import React, { useState } from 'react';
import { logout, getCurrentUser } from '@/lib/authService';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const UserDropdown = () => {
  const user = getCurrentUser();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    try {
      setOpen(false);
      await logout();
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };



  if (!user) {
    return null;
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <div className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
          {/* User Avatar */}
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium text-base">
            {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
          </div>
          
          {/* User Info */}
          <div className="flex flex-col text-left">
            <span className="font-semibold text-gray-800 text-base">
              {user.fullName || 'User'}
            </span>
            <span className="text-sm text-gray-600">
              {user.email || 'user@example.com'}
            </span>
          </div>
          
          {/* Dropdown Arrow */}
          <svg 
            className="w-4 h-4 text-gray-500" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-72 p-2" align="end">
        {/* User Info Header */}
        <DropdownMenuLabel className="pb-2 mb-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium text-base">
              {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-gray-800 text-base">
                {user.fullName || 'User'}
              </span>
              <span className="text-sm text-gray-600">
                {user.email || 'user@example.com'}
              </span>
            </div>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        {/* Profile Settings */}
        <DropdownMenuItem 
          onClick={() => {
            setOpen(false);
            window.location.href = '/profile/settings';
          }}
          className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 rounded-md"
        >
          <svg 
            className="w-4 h-4 text-gray-600" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="text-gray-700 text-sm">Profile Settings</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        {/* Logout */}
        <DropdownMenuItem 
          onClick={handleLogout}
          className="flex items-center gap-3 p-3 cursor-pointer hover:bg-red-50 rounded-md text-red-600"
        >
          <svg 
            className="w-4 h-4 text-red-600" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="text-red-600 text-sm">Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserDropdown; 