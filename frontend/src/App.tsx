import { Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider } from "./contexts/AuthContext";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import LoginPage from "./pages/LoginPage";
import MemberDashboardPage from "./pages/MemberDashboardPage";
import RoundPage from "./pages/RoundPage";

import { AppShell } from "./ui/AppShell";

import { BrowserRouter } from "react-router-dom";
import RequireRole from "./ui/RequireRole";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppShell>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/admin"
              element={
                <RequireRole roles={["admin"]}>
                  <AdminDashboardPage />
                </RequireRole>
              }
            />
            <Route
              path="/member"
              element={
                <RequireRole roles={["member"]}>
                  <MemberDashboardPage />
                </RequireRole>
              }
            />
            <Route
              path="/round/:roundId"
              element={
                <RequireRole roles={["admin", "member"]}>
                  <RoundPage />
                </RequireRole>
              }
            />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
    </AuthProvider>
  );
}
