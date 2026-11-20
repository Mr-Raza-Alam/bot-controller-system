import { createContext, useContext, useState, useEffect } from "react";

const SecurityContext = createContext(null);

const DEFAULT_PIN = import.meta.env.VITE_COMMANDER_PIN || "2327";

export const SecurityProvider = ({ children }) => {
  const [isArmed, setIsArmed] = useState(() => {
    return sessionStorage.getItem("bot_commander_armed") === "true";
  });
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);

  const armStation = (enteredPin) => {
    if (enteredPin === DEFAULT_PIN) {
      setIsArmed(true);
      sessionStorage.setItem("bot_commander_armed", "true");
      setIsUnlockModalOpen(false);
      return { success: true };
    }
    return { success: false, error: "Invalid Commander PIN. Access Denied." };
  };

  const lockStation = () => {
    setIsArmed(false);
    sessionStorage.removeItem("bot_commander_armed");
  };

  const openUnlockModal = () => setIsUnlockModalOpen(true);
  const closeUnlockModal = () => setIsUnlockModalOpen(false);

  return (
    <SecurityContext.Provider
      value={{
        isArmed,
        armStation,
        lockStation,
        isUnlockModalOpen,
        openUnlockModal,
        closeUnlockModal,
      }}
    >
      {children}
    </SecurityContext.Provider>
  );
};

export const useSecurity = () => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error("useSecurity must be used within a SecurityProvider");
  }
  return context;
};
