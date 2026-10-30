import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { AuthProvider } from "./context/AuthProvider";
import { StudentAuthProvider } from "./context/StudentAuthContext";
import { TeacherAuthProvider } from "./context/TeacherAuthContext";

import App from "./App.jsx";

import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <StudentAuthProvider>
          <TeacherAuthProvider>
            <App />
          </TeacherAuthProvider>
        </StudentAuthProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
