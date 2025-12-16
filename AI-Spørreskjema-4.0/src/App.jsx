import React from "react";
import { Routes, Route, Link } from "react-router-dom";
import Chat from "./pages/Chat.jsx";
import Doctor from "./pages/Doctor.jsx";

export default function App() {
  return (
    <div className="container">
      <div className="nav">
        <div className="pills">
          <Link className="pill" to="/">🗨️ Pasient-demo</Link>
          <Link className="pill" to="/doctor">🩺 Veileder/lege-demo</Link>
        </div>
        <div className="brand">demo utviklet av Hans og Erik</div>
      </div>

      <Routes>
        <Route path="/" element={<Chat />} />
        <Route path="/doctor" element={<Doctor />} />
      </Routes>

      <div className="small footer">
        Web Service demo: submissions lagres i RAM på serveren (resett ved restart).
      </div>
    </div>
  );
}
