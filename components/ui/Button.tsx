
import type React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', className = '', style, ...props }) => {
  const baseClasses = 'inline-flex items-center justify-center font-bold transition-all transform hover:scale-[1.01] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'hover:brightness-125 text-white',
    secondary: 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 hover:border-neutral-500',
    danger: 'bg-red-950/20 hover:bg-red-900/40 text-red-500 border border-red-900/50',
  };

  const dynamicStyle = variant === 'primary' ? {
    backgroundColor: 'var(--button-bg)',
    color: 'var(--button-text)',
    fontFamily: 'var(--button-font)',
    ...style
  } : {
    fontFamily: 'var(--button-font)',
    ...style
  };

  return (
    <button 
      className={`${baseClasses} ${variantClasses[variant]} ${className}`} 
      style={dynamicStyle}
      {...props}
    >
      {children}
    </button>
  );
};
