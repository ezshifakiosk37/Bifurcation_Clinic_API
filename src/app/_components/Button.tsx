import React from "react";
import { cn } from "../_utils/cn/cn";
import { Slot } from "@radix-ui/react-slot";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: "pink" | "default" | "demographic"; 
  className?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, asChild = false, variant = "default", ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    // Decide styles based on variant
    const backgroundStyle =
      variant === "pink"
        ? { backgroundColor: "var(--secondary)", color: "white" }
        : variant === "demographic"
        ? { backgroundColor: "white", color: "var(--secondary)" } // white bg, pink text
        : {
            background: "linear-gradient(136deg, var(--primary), var(--secondary))",
            color: "white",
          };

    return (
      <Comp
        ref={ref}
            className={cn(
              "relative group overflow-hidden px-6 py-3 md:px-8 md:py-4 uppercase w-full rounded-full font-extrabold text-sm md:text-base whitespace-nowrap tracking-tight transition-all hover:-translate-y-0.5 active:scale-95",
  
             variant === "demographic"
              ? "shadow-xl shadow-black/20"
             : "shadow-lg shadow-blue-500/10",
    
            className
            )}
        style={backgroundStyle}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export default Button;