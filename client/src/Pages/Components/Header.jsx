import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { FiMenu, FiX } from "react-icons/fi";

export function Header({ isLogged, setIsLogged }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsLogged(!!token);
  }, [setIsLogged]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsLogged(false);
    navigate("/");
  };

  const isActive = (path) => location.pathname === path;

  const navLinks = [
    { name: "Dashboard", path: "/dashboard" },
    { name: "Profile" , path : "/profile"}
  ];

  return (
    <header className="w-full bg-white/80 backdrop-blur-md border-b border-gray-200 fixed top-0 left-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3">
        {/* Logo */}
        <Link to="/" className="text-2xl font-semibold text-gray-800 tracking-tight select-none">
          RealTime<span className="text-blue-600">App</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`relative font-medium text-gray-700 hover:text-blue-600 transition-colors duration-200
                after:content-[''] after:absolute after:left-0 after:-bottom-1 after:h-[2px] after:w-full after:scale-x-0 after:bg-blue-600 after:origin-right after:transition-transform after:duration-300 hover:after:scale-x-100 hover:after:origin-left
                ${isActive(link.path) ? "text-blue-600 after:scale-x-100" : ""}`}
            >
              {link.name}
            </Link>
          ))}

          {isLogged ? (
            <button
              onClick={handleLogout}
              className="text-gray-700 hover:text-red-500 font-medium transition-colors duration-200"
            >
              Logout
            </button>
          ) : (
            <Link
              to="/"
              className={`font-medium transition-colors duration-200 ${
                isActive("/login")
                  ? "text-blue-600"
                  : "text-gray-700 hover:text-blue-600"
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
      </div>

      {/* Mobile Dropdown */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200 shadow-sm">
          <nav className="flex flex-col items-center py-4 space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMenuOpen(false)}
                className={`text-base font-medium transition-colors duration-200 ${
                  isActive(link.path)
                    ? "text-blue-600"
                    : "text-gray-700 hover:text-blue-600"
                }`}
              >
                {link.name}
              </Link>
            ))}

            {isLogged ? (
              <button
                onClick={() => {
                  handleLogout();
                  setMenuOpen(false);
                }}
                className="text-base font-medium text-gray-700 hover:text-red-500 transition-colors duration-200"
              >
                Logout
              </button>
            ) : (
              <Link
                to="/login"
                onClick={() => setMenuOpen(false)}
                className={`text-base font-medium transition-colors duration-200 ${
                  isActive("/login")
                    ? "text-blue-600"
                    : "text-gray-700 hover:text-blue-600"
                }`}
              >
                Login
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
