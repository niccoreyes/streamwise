import { useContext } from "react";
import { SettingsContext, SettingsContextType } from "./SettingsContext";

/**
 * Custom hook to access the SettingsContext.
 * Throws an error if used outside of a SettingsProvider.
 */
export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};