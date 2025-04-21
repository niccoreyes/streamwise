
import React, { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface PwaInstallPromptProps {
  open: boolean;
  onInstall: () => void;
  onCancel: (dontAskAgain: boolean) => void;
}

export const PwaInstallPrompt: React.FC<PwaInstallPromptProps> = ({
  open,
  onInstall,
  onCancel,
}) => {
  const [dontRemind, setDontRemind] = useState(false);

  return (
    <Dialog open={open} onOpenChange={() => onCancel(dontRemind)}>
      <DialogContent className="sm:max-w-[380px] flex flex-col items-center gap-4">
        <div className="text-lg font-semibold mb-1">Install this app?</div>
        <div className="text-sm text-gray-500 mb-1 text-center">
          Get a fast, offline-ready experience by adding StreamWise to your device. You can always install later from your browser.
        </div>
        <Button className="w-full" onClick={onInstall}>
          Install app
        </Button>
        <label className={cn("flex items-center space-x-2 text-xs text-gray-500 mt-2 cursor-pointer")}>
          <Checkbox checked={dontRemind} id="dont-remind-checkbox" onCheckedChange={v => setDontRemind(!!v)} />
          <span>Don&apos;t remind me again</span>
        </label>
        <Button
          variant="ghost"
          className="w-full mt-2 text-gray-700"
          onClick={() => onCancel(dontRemind)}
        >
          Maybe later
        </Button>
      </DialogContent>
    </Dialog>
  );
};
