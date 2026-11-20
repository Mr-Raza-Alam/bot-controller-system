import { useState, useEffect, useRef } from "react";
import { useSecurity } from "../../context/SecurityContext";
import "./SecurityModal.css";

const SecurityModal = () => {
  const { isUnlockModalOpen, closeUnlockModal, armStation } = useSecurity();
  const [pin, setPin] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isShaking, setIsShaking] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isUnlockModalOpen) {
      setPin("");
      setErrorMsg("");
      setIsShaking(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isUnlockModalOpen]);

  if (!isUnlockModalOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!pin) {
      setErrorMsg("Please enter Commander PIN");
      return;
    }

    const res = armStation(pin);
    if (!res.success) {
      setErrorMsg(res.error);
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      setPin("");
      inputRef.current?.focus();
    }
  };

  return (
    <div className="security-modal-backdrop" onClick={closeUnlockModal}>
      <div
        className={`security-modal-card ${isShaking ? "security-shake" : ""}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="security-modal-header">
          <div className="security-tag-block">
            <span className="security-badge-tag">CYBER-PHYSICAL INTERLOCK</span>
            <h3>Commander Authentication</h3>
          </div>
          <button
            type="button"
            className="security-close-btn"
            onClick={closeUnlockModal}
            aria-label="Close"
          >
            &#10005;
          </button>
        </div>

        <p className="security-modal-desc">
          Enter the secret Commander PIN to arm the virtual controller, start real-time telemetry streaming, and unlock live motor drive commands.
        </p>

        <form onSubmit={handleSubmit} className="security-form">
          <div className="security-input-wrapper">
            <input
              ref={inputRef}
              type="password"
              inputMode="numeric"
              maxLength={8}
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setErrorMsg("");
              }}
              placeholder="Enter Commander PIN"
              className="security-pin-input"
            />
          </div>

          {errorMsg && <div className="security-error-badge">{errorMsg}</div>}

          <div className="security-actions-row">
            <button
              type="button"
              className="security-cancel-btn"
              onClick={closeUnlockModal}
            >
              Cancel
            </button>
            <button type="submit" className="security-arm-submit-btn">
              Arm Station &bull; Start Stream
            </button>
          </div>
        </form>

        <div className="security-hint-note">
          Notice: Spectators can safely browse architecture and review reports without arming the station.
        </div>
      </div>
    </div>
  );
};

export default SecurityModal;
