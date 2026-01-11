
import React from 'react';

interface BrutalCardProps {
  children: React.ReactNode;
  className?: string;
  bgColor?: string;
}

export const BrutalCard: React.FC<BrutalCardProps> = ({ children, className = "", bgColor = "bg-white" }) => {
  return (
    <div className={`brutal-border brutal-shadow ${bgColor} p-6 ${className}`}>
      {children}
    </div>
  );
};
