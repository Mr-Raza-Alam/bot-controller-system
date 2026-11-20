// reusable badge to show status labels with color coding

import "./StatusBadge.css";

const StatusBadge = ({ label, type }) => {
  // type: "safe" | "danger" | "warning" | "info"
  return <span className={`badge badge-${type}`}>{label}</span>;
};

export default StatusBadge;
