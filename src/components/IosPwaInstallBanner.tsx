
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface IosPwaInstallBannerProps {
  open: boolean;
  onClose: (dontRemindAgain: boolean) => void;
}

export const IosPwaInstallBanner: React.FC<IosPwaInstallBannerProps> = ({
  open,
  onClose,
}) => {
  const [dontRemind, setDontRemind] = useState(false);

  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed bottom-3 left-1/2 z-50 -translate-x-1/2 w-[98vw] max-w-sm bg-white border border-violet-300 shadow-lg rounded-xl px-4 py-4 sm:py-3 flex flex-col items-center",
        "animate-in fade-in slide-in-from-bottom-1/2"
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <img src="/ios/192.png" alt="" className="w-7 h-7 rounded" />
        <span className="text-base font-semibold text-gray-900">
          Add StreamWise to your Home Screen
        </span>
      </div>
      <p className="text-sm text-gray-700 text-center mb-2">
        For offline and fullscreen experience, tap
        <span className="inline-block align-middle mx-1 px-2 py-0.5 bg-gray-100 border text-xs rounded font-mono">Share&nbsp;
          <span role="img" aria-label="share">⬆️</span>
        </span>
        then <b>&quot;Add to Home Screen&quot;</b>.
      </p>
      <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer my-1">
        <input
          type="checkbox"
          checked={dontRemind}
          onChange={() => setDontRemind((v) => !v)}
        />
        Don&apos;t remind me again
      </label>
      <Button
        variant="ghost"
        className="w-full mt-2 text-gray-700"
        onClick={() => onClose(dontRemind)}
      >
        Maybe later
      </Button>
    </div>
  );
};
