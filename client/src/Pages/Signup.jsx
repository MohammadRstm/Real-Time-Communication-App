import { useState } from "react";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_BASE_URL;
export function Signup(){

    const [signupForm , setSignupForm] = useState({
        fullName: "",
        email : "",
        password : ""
    });

    const handleChange = (e) =>{
        setSignupForm((prev) => ({
            ...prev,
            [e.target.name] : e.target.value
        })
    );
    };

    const submitForm = async () =>{
        try{
            const response = await axios.post(`${BASE_URL}/signup` , signupForm );

            const data = response.data;
            const token = data.token;
            localStorage.setItem("token" , token);
            // set location to main dashboard
            
        }catch(err){
            if(err.response)
                alert(err.response.message || 'Server error');
            else
                alert('Network error');
        }
    }


    return(
        <>
            <form onSubmit={submitForm}>
                <label>Full Name</label>
                <input type='text' name='fullName' onChange={(e) => handleChange(e)} />
                <label>Email</label>
                <input type='email' name='email' onChange={(e) => handleChange(e)} />
                <label>Email</label>
                <input type='password' name='password' onChange={(e) => handleChange(e)} />

                <input type="submit">Login</input>
            </form>
        </>
    )
}