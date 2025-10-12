import { useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

const BASE_URL = import.meta.env.VITE_BASE_URL;

export function Signup() {
    const [signupForm, setSignupForm] = useState({
        fullName: "",
        email: "",
        password: ""
    });

    const handleChange = (e) => {
        setSignupForm((prev) => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    const submitForm = async (e) => {
        e.preventDefault(); // prevent refresh
        try {
            const response = await axios.post(`${BASE_URL}/api/users/signup`, signupForm);
            const data = response.data;
            const token = data.token;
            localStorage.setItem("token", token);
            // redirect to dashboard here (use navigate)
            setTimeout(() => {
                window.location.href = '/login';
            } , 2000);
        } catch (err) {
            if (err.response)
                alert(err.response.data?.message || "Server error");
            else
                alert("Network error");
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <form
                onSubmit={submitForm}
                className="bg-white p-8 rounded-xl shadow-md w-full max-w-sm"
            >
                <h2 className="text-2xl font-semibold mb-6 text-center">Create an Account</h2>

                <label className="block mb-1 font-medium text-gray-700">Full Name</label>
                <input
                    type="text"
                    name="fullName"
                    onChange={handleChange}
                    className="w-full mb-4 px-3 py-2 border rounded-md focus:outline-none focus:ring focus:ring-indigo-300"
                    required
                />

                <label className="block mb-1 font-medium text-gray-700">Email</label>
                <input
                    type="email"
                    name="email"
                    onChange={handleChange}
                    className="w-full mb-4 px-3 py-2 border rounded-md focus:outline-none focus:ring focus:ring-indigo-300"
                    required
                />

                <label className="block mb-1 font-medium text-gray-700">Password</label>
                <input
                    type="password"
                    name="password"
                    onChange={handleChange}
                    className="w-full mb-4 px-3 py-2 border rounded-md focus:outline-none focus:ring focus:ring-indigo-300"
                    required
                />

                <button
                    type="submit"
                    className="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 transition"
                >
                    Sign Up
                </button>

                <p className="text-sm text-center mt-4 text-gray-600">
                    Already have an account?{" "}
                    <Link to="/login" className="text-indigo-600 hover:underline">
                        Login
                    </Link>
                </p>
            </form>
        </div>
    );
}
