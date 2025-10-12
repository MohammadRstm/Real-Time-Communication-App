import './App.css'
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState } from 'react';
import { VideoCalling } from './Pages/VideoCalling';
import { Header } from './Pages/Components/Header';
import { Dashboard } from './Pages/Dashboard';
import { Signup } from './Pages/Signup';
import { Login } from './Pages/Login';

// start with creating users , db , authentication (tokens) , and data encryption first(bcrypt)

function App() {

  const [isLogged, setIsLogged] = useState(false);
  
  return (
    <>  
      <Router>
        <Header 
        isLogged= {isLogged}
        setIsLogged={setIsLogged}
        />
        <Routes>
          <Route path="/" element={<Dashboard
          isLogged= {isLogged}
          setIsLogged={setIsLogged}
           />} />
          <Route path="/videoCalling" element={<VideoCalling
          isLogged= {isLogged}
          setIsLogged={setIsLogged}
          />}/>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
        </Routes>
      </Router>
    </>
  )
}

export default App
