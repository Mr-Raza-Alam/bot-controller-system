import { useState, useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { pingServer, getBotStatus } from "../../services/api";
import { useSecurity } from "../../context/SecurityContext";
import "./Navbar.css";

const Navbar = () => {
  const { isArmed, openUnlockModal, lockStation } = useSecurity();
  const [isCloudOnline, setIsCloudOnline] = useState(false);
  const [botStatus, setBotStatus] = useState({ isOnline: false, secondsAgo: null });
  const [openDropdown, setOpenDropdown] = useState(null); // 'drive' | 'subsystems' | null

  const location = useLocation();
  const navRef = useRef(null);
  const closeTimeoutRef = useRef(null);

  useEffect(() => {
    const checkLinks = async () => {
      // 1. check cloud server
      const cloudRes = await pingServer();
      setIsCloudOnline(cloudRes.success === true);

      // 2. check bot hardware heartbeat
      const botRes = await getBotStatus();
      if (botRes.success && botRes.data) {
        setBotStatus(botRes.data);
      }
    };

    checkLinks();
    if (!isArmed) return; // In spectator mode, pause background loop completely
    const interval = setInterval(checkLinks, 4000);
    return () => clearInterval(interval);
  }, [isArmed]);

  // close dropdown on route change or escape key
  useEffect(() => {
    setOpenDropdown(null);
  }, [location.pathname]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setOpenDropdown(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const toggleDropdown = (menuName) => {
    setOpenDropdown((prev) => (prev === menuName ? null : menuName));
  };

  const isDriveActive =
    location.pathname === "/navigation" || location.pathname === "/obstacle";

  const isSubsystemsActive =
    location.pathname === "/flame" ||
    location.pathname === "/gas" ||
    location.pathname === "/health";

  return (
    <header className="control-header" ref={navRef}>
      <div className="header-top">
        <div className="brand-block">
          <h1 className="system-title">MULTI-PURPOSE BOT ASSISTANT</h1>
          <span className="system-subtitle">Virtual Controller &amp; Telemetry Station</span>
        </div>

        {/* status telemetry & commander security indicators */}
        <div className="status-indicators-group">
          <div className="system-status-badge">
            <span className={`status-signal ${isCloudOnline ? "signal-active" : "signal-inactive"}`}></span>
            <span className="status-text">
              {isCloudOnline ? "CLOUD: CONNECTED" : "CLOUD: DISCONNECTED"}
            </span>
          </div>

          <div className="system-status-badge">
            <span className={`status-signal ${botStatus.isOnline ? "signal-active" : "signal-standby"}`}></span>
            <span className="status-text">
              {botStatus.isOnline
                ? "BOT: ONLINE"
                : botStatus.secondsAgo !== null
                ? `BOT: STANDBY (${botStatus.secondsAgo}s ago)`
                : "BOT: OFFLINE"}
            </span>
          </div>

          {/* Commander Security Status Interlock */}
          <div className={`system-status-badge ${isArmed ? "security-badge-armed" : "security-badge-spectator"}`}>
            <span className={`status-signal ${isArmed ? "signal-active" : "signal-standby"}`}></span>
            <span className="status-text">
              {isArmed ? "COMMANDER: ARMED" : "SPECTATOR MODE"}
            </span>
            {isArmed ? (
              <button
                type="button"
                className="security-toggle-pill-btn lock-pill"
                onClick={lockStation}
                title="Lock station back to spectator mode"
              >
                Lock
              </button>
            ) : (
              <button
                type="button"
                className="security-toggle-pill-btn arm-pill"
                onClick={openUnlockModal}
                title="Enter Commander PIN to start stream & unlock controls"
              >
                Arm Station
              </button>
            )}
          </div>
        </div>
      </div>

      <nav className="toolbar-nav">
        {/* front-facing modal backdrop overlay */}
        {openDropdown && (
          <div
            className="nav-modal-backdrop"
            onClick={() => setOpenDropdown(null)}
            aria-hidden="true"
          />
        )}

        {/* 1. DASHBOARD */}
        <NavLink
          to="/"
          className={({ isActive }) => (isActive ? "nav-tab active-tab" : "nav-tab")}
          end
        >
          DASHBOARD
        </NavLink>

        {/* 2. DRIVE & SAFETY */}
        <div className={`nav-dropdown-wrapper ${openDropdown === "drive" ? "dropdown-open" : ""}`}>
          <button
            type="button"
            className={`nav-tab nav-dropdown-btn ${isDriveActive ? "active-tab" : ""}`}
            onClick={() => toggleDropdown("drive")}
          >
            DRIVE &amp; SAFETY
            <span className="dropdown-caret">&#9662;</span>
          </button>

          {openDropdown === "drive" && (
            <div className="nav-popup-modal" role="dialog" aria-modal="true">
              <div className="popup-modal-header">
                <div className="popup-modal-title-group">
                  <span className="popup-modal-tag">NAVIGATION MODULES</span>
                  <h4 className="popup-modal-title">Drive &amp; Safety Control</h4>
                </div>
                <button
                  type="button"
                  className="popup-modal-close-btn"
                  onClick={() => setOpenDropdown(null)}
                  aria-label="Close"
                >
                  &times;
                </button>
              </div>

              <div className="popup-modal-body">
                <NavLink
                  to="/navigation"
                  className={({ isActive }) =>
                    `popup-option-card ${isActive ? "popup-option-active" : ""}`
                  }
                  onClick={() => setOpenDropdown(null)}
                >
                  <div className="popup-option-icon">&#10148;</div>
                  <div className="popup-option-content">
                    <span className="popup-option-title">Smart Navigation</span>
                    <span className="popup-option-sub">
                      Manual D-Pad Pilot, Voice Commander &amp; Execution Trail
                    </span>
                  </div>
                </NavLink>

                <NavLink
                  to="/obstacle"
                  className={({ isActive }) =>
                    `popup-option-card ${isActive ? "popup-option-active" : ""}`
                  }
                  onClick={() => setOpenDropdown(null)}
                >
                  <div className="popup-option-icon">&#8767;</div>
                  <div className="popup-option-content">
                    <span className="popup-option-title">Obstacle Radar</span>
                    <span className="popup-option-sub">
                      HC-SR04 Sonar Proximity Arc &amp; Autonomous Collision Lockout
                    </span>
                  </div>
                </NavLink>
              </div>
            </div>
          )}
        </div>

        {/* 3. SUB-SYSTEMS */}
        <div className={`nav-dropdown-wrapper ${openDropdown === "subsystems" ? "dropdown-open" : ""}`}>
          <button
            type="button"
            className={`nav-tab nav-dropdown-btn ${isSubsystemsActive ? "active-tab" : ""}`}
            onClick={() => toggleDropdown("subsystems")}
          >
            SUB-SYSTEMS
            <span className="dropdown-caret">&#9662;</span>
          </button>

          {openDropdown === "subsystems" && (
            <div className="nav-popup-modal" role="dialog" aria-modal="true">
              <div className="popup-modal-header">
                <div className="popup-modal-title-group">
                  <span className="popup-modal-tag">ONBOARD SENSORS</span>
                  <h4 className="popup-modal-title">Subsystem Telemetry</h4>
                </div>
                <button
                  type="button"
                  className="popup-modal-close-btn"
                  onClick={() => setOpenDropdown(null)}
                  aria-label="Close"
                >
                  &times;
                </button>
              </div>

              <div className="popup-modal-body">
                <NavLink
                  to="/flame"
                  className={({ isActive }) =>
                    `popup-option-card ${isActive ? "popup-option-active" : ""}`
                  }
                  onClick={() => setOpenDropdown(null)}
                >
                  <div className="popup-option-icon">&#9670;</div>
                  <div className="popup-option-content">
                    <span className="popup-option-title">Flame Detection</span>
                    <span className="popup-option-sub">
                      Optical IR Intensity Spectrum, Emergency Hazard Siren
                    </span>
                  </div>
                </NavLink>

                <NavLink
                  to="/gas"
                  className={({ isActive }) =>
                    `popup-option-card ${isActive ? "popup-option-active" : ""}`
                  }
                  onClick={() => setOpenDropdown(null)}
                >
                  <div className="popup-option-icon">&#9670;</div>
                  <div className="popup-option-content">
                    <span className="popup-option-title">Air Safety</span>
                    <span className="popup-option-sub">
                      MQ-2 Semiconductor Gas, Smoke PPM &amp; Exhaust Ventilation
                    </span>
                  </div>
                </NavLink>

                <NavLink
                  to="/health"
                  className={({ isActive }) =>
                    `popup-option-card ${isActive ? "popup-option-active" : ""}`
                  }
                  onClick={() => setOpenDropdown(null)}
                >
                  <div className="popup-option-icon">&#9670;</div>
                  <div className="popup-option-content">
                    <span className="popup-option-title">Health Vitals</span>
                    <span className="popup-option-sub">
                      MAX30102 Photoplethysmography &amp; MLX90614 Contactless Thermometer
                    </span>
                  </div>
                </NavLink>
              </div>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
