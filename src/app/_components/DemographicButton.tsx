


//NOT BEING USED ANY WHERE RIGHT NOW SH

import React from "react";
import { cn } from "../_utils/cn/cn";

interface DemographicButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

const DemographicButton = React.forwardRef<HTMLButtonElement, DemographicButtonProps>(
  ({ className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "w-full sm:w-auto bg-white border border-white/20 text-pink-600 text-sm sm:text-base md:text-lg py-3 sm:py-4 font-bold rounded-full hover:bg-gray-100 transition-all",
          className
        )}
        {...props}
      />
    );
  }
);

DemographicButton.displayName = "DemographicButton";

export default DemographicButton;