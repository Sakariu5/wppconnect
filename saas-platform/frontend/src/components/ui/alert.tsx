/*
 * This file is part of WPPConnect.
 *
 * WPPConnect is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * WPPConnect is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with WPPConnect.  If not, see <https://www.gnu.org/licenses/>.
 */
'use client';
import React from 'react';
import { cn } from "@/lib/utils";

interface AlertProps {
  className?: string;
  variant?: 'default' | 'destructive';
  children?: any;
  [key: string]: any;
}

interface AlertDescriptionProps {
  className?: string;
  children?: any;
  [key: string]: any;
}

export const Alert = ({ className, variant = 'default', children, ...props }: AlertProps) => {
  return (
    <div
      className={cn(
        "relative w-full rounded-lg border p-4",
        variant === 'destructive' 
          ? "border-red-200 bg-red-50 text-red-900" 
          : "border-gray-200 bg-gray-50 text-gray-900",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const AlertDescription = ({ className, children, ...props }: AlertDescriptionProps) => {
  return (
    <div
      className={cn("text-sm [&_p]:leading-relaxed", className)}
      {...props}
    >
      {children}
    </div>
  );
};
