import { useEffect, useState } from "react";
import { FaTimes, FaCheckCircle, FaInfoCircle, FaExclamationCircle } from "react-icons/fa";

export default function CustomAlert({ message, type = "info", onClose }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Start with invisible (for slide-in)
    setTimeout(() => setVisible(true), 10);

    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300); // Wait for fade-out animation
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    info: <FaInfoCircle className="text-blue-500 text-xl" />,
    success: <FaCheckCircle className="text-green-500 text-xl" />,
    error: <FaExclamationCircle className="text-red-500 text-xl" />,
  };

  const bgColors = {
    info: "bg-blue-100 border-blue-400",
    success: "bg-green-100 border-green-400",
    error: "bg-red-100 border-red-400",
  };

  const textColors = {
    info: "text-blue-800",
    success: "text-green-800",
    error: "text-red-800",
  };

  return (
    <div
      className={`fixed top-5 right-5 z-[9999] border-l-4 rounded-xl shadow-lg px-5 py-4 flex items-center gap-3 min-w-[260px] 
        transition-all duration-300 ease-in-out
        ${
          visible
            ? "opacity-100 translate-x-0 translate-y-0"
            : "opacity-0 translate-x-5 translate-y-[-10px]"
        }
        ${bgColors[type]} ${textColors[type]}`}
    >
      {icons[type]}
      <span className="flex-1 font-medium">{message}</span>
      <button
        onClick={() => {
          setVisible(false);
          setTimeout(onClose, 300);
        }}
        className="text-gray-500 hover:text-gray-700 transition-transform duration-200 hover:scale-110"
      >
        <FaTimes />
      </button>
    </div>
  );
}
