import './App.css'
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { VideoCalling } from './Pages/VideoCalling';
import { Header } from './Pages/Components/Header';
import { Dashboard } from './Pages/Dashboard';
import { Signup } from './Pages/Signup';
import { Login } from './Pages/Login';

// start with creating users , db , authentication (tokens) , and data encryption first(bcrypt)

function App() {

  return (
    <>  
      <Router>
        <Header />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/videoCalling" element={<VideoCalling />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
        </Routes>
      </Router>
    </>
  )
}

export default App
