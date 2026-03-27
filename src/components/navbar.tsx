
"use client"

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/components/theme-provider';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Moon, Sun, Menu, User, LayoutDashboard } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navbar() {
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();
  const router = useRouter();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-white/5 bg-background/80 backdrop-blur-md px-4 md:px-8 flex items-center justify-between">
      <Link href="/" className="flex items-baseline space-x-0.5 group">
        <span className="text-2xl font-headline font-extrabold text-foreground group-hover:scale-105 transition-transform">Que</span>
        <span className="text-2xl font-headline font-extrabold text-primary group-hover:scale-105 transition-transform">Up</span>
      </Link>

      <div className="flex items-center space-x-2 md:space-x-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="rounded-full"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="hidden md:flex items-center space-x-2 rounded-full border border-white/10">
                <User className="h-4 w-4" />
                <span>{user.displayName}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {user.role === 'consultant' ? (
                <DropdownMenuItem asChild>
                  <Link href="/consultant" className="flex items-center">
                    <LayoutDashboard className="h-4 w-4 mr-2" /> Consultant Dashboard
                  </Link>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem asChild>
                  <Link href="/queue/my-tickets">My Queue Status</Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => { signOut(); router.push('/'); }} className="text-destructive font-bold">
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button 
            variant="outline" 
            className="hidden md:flex border-foreground/20 hover:border-primary hover:text-primary rounded-full px-6"
            onClick={() => router.push('/auth/signin')}
          >
            Sign In
          </Button>
        )}

        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-6 w-6" />
        </Button>
      </div>
    </nav>
  );
}
