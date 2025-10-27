import { Navigate, useLocation } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");
  const location = useLocation();

  if (!token) {
    // Not logged in, redirect to login and store intended URL
    return <Navigate to={`/?redirect=${encodeURIComponent(location.pathname)}`} />;
  }

  return children;
}
