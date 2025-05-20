import React, { forwardRef, DetailedHTMLProps, InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

// Extend the standard HTML input attributes with our custom attributes
export interface DirectoryInputProps
  extends Omit<DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>, 'webkitdirectory'> {
  webkitdirectory?: string;
}

const DirectoryInput = forwardRef<HTMLInputElement, DirectoryInputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
        // Add the webkit directory attribute manually to the HTML
        {...(props.webkitdirectory ? { 'webkitdirectory': '' } : {})}
      />
    );
  }
);

DirectoryInput.displayName = "DirectoryInput";

export { DirectoryInput };