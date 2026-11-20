// main application component with routing and security interlock provider
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SecurityProvider } from "./context/SecurityContext";
import SecurityModal from "./components/SecurityModal/SecurityModal";
import Navbar from "./components/Navbar/Navbar";
import Dashboard from "./pages/Dashboard/Dashboard";
import FlameDetection from "./pages/FlameDetection/FlameDetection";
import GasMonitor from "./pages/GasMonitor/GasMonitor";
import HealthMonitor from "./pages/HealthMonitor/HealthMonitor";
import Navigation from "./pages/Navigation/Navigation";
import ObstacleStatus from "./pages/ObstacleStatus/ObstacleStatus";

const App = () => {
  return (
    <SecurityProvider>
      <BrowserRouter>
        <div className="app-shell">
          <Navbar />
          <main className="content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/navigation" element={<Navigation />} />
              <Route path="/flame" element={<FlameDetection />} />
              <Route path="/gas" element={<GasMonitor />} />
              <Route path="/health" element={<HealthMonitor />} />
              <Route path="/obstacle" element={<ObstacleStatus />} />
            </Routes>
          </main>
          <SecurityModal />
        </div>
      </BrowserRouter>
    </SecurityProvider>
  );
};

export default App;
