import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { FiMenu, FiX } from "react-icons/fi"; // for hamburger icons

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLogged, setIsLogged] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsLogged(!!token);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsLogged(false);
    navigate("/login");
  };

  // Helper to detect active route
  const isActive = (path) => location.pathname === path;

  return (
    <header className="w-full bg-white shadow-md py-4 px-6 flex justify-between items-center">
      {/* Brand / Logo */}
      <h1 className="text-xl font-semibold text-gray-800 select-none">RealTimeApp</h1>

      {/* Desktop Nav */}
      <nav className="hidden md:flex gap-4">
        <Link
          to="/"
          className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 hover:shadow-md ${
            isActive("/dashboard")
              ? "bg-blue-500 text-white shadow-md"
              : "bg-blue-200 text-blue-800"
          }`}
        >
          Dashboard
        </Link>

        {isLogged ? (
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-blue-200 text-blue-800 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 hover:shadow-md"
          >
            Logout
          </button>
        ) : (
          <Link
            to="/login"
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 hover:shadow-md ${
              isActive("/login")
                ? "bg-blue-500 text-white shadow-md"
                : "bg-blue-200 text-blue-800"
            }`}
          >
            Login
          </Link>
        )}
      </nav>

      {/* Mobile Menu Button */}
      <button
        className="md:hidden text-2xl text-gray-700"
        onClick={() => setMenuOpen((prev) => !prev)}
      >
        {menuOpen ? <FiX /> : <FiMenu />}
      </button>

      {/* Mobile Dropdown */}
      {menuOpen && (
        <div className="absolute top-16 left-0 w-full bg-white shadow-lg py-4 flex flex-col gap-3 items-center z-50 transition-all duration-300">
          <Link
            to="/dashboard"
            onClick={() => setMenuOpen(false)}
            className={`w-10/12 text-center py-2 rounded-lg font-medium transition-all duration-200 ${
              isActive("/dashboard")
                ? "bg-blue-500 text-white shadow-md"
                : "bg-blue-200 text-blue-800 hover:scale-105"
            }`}
          >
            Dashboard
          </Link>

          {isLogged ? (
            <button
              onClick={() => {
                handleLogout();
                setMenuOpen(false);
              }}
              className="w-10/12 py-2 bg-blue-200 text-blue-800 rounded-lg font-medium transition-all duration-200 hover:scale-105"
            >
              Logout
            </button>
          ) : (
            <Link
              to="/login"
              onClick={() => setMenuOpen(false)}
              className={`w-10/12 text-center py-2 rounded-lg font-medium transition-all duration-200 ${
                isActive("/login")
                  ? "bg-blue-500 text-white shadow-md"
                  : "bg-blue-200 text-blue-800 hover:scale-105"
              }`}
            >
              Login
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
