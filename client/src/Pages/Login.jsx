import axios from "axios";
import { useState } from "react"

const BASE_URL = import.meta.env.VITE_BASE_URL;

export function Login(){

    const [loginForm , setLoginForm] = useState({
        email : "",
        password : ""
    });

    const handleChange = (e) =>{
        setLoginForm((prev) => ({
            ...prev,
            [e.target.name] : e.target.value
        })
    );
    };

    const submitForm = async () =>{
        try{
            const response = await axios.post(`${BASE_URL}/login` , loginForm );

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
                <label>Email</label>
                <input type='email' name='email' onChange={(e) => handleChange(e)} />
                <label>Email</label>
                <input type='password' name='password' onChange={(e) => handleChange(e)} />

                <input type="submit">Login</input>
            </form>
        </>
    )
}