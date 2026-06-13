import React from "react";

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
}

export default function Container({ children, className = "" }: ContainerProps) {
  return (
    <div
      className={className}
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        paddingLeft: 56,
        paddingRight: 56,
      }}
    >
      {children}
    </div>
  );
}
