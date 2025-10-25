import './App.css'
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect, useState } from 'react';
import { VideoCalling } from './Pages/VideoCalling';
import { Header } from './Pages/Components/Header';
import { Dashboard } from './Pages/Dashboard';
import { Signup } from './Pages/Signup';
import { Login } from './Pages/Login';
import { RoomDashboard } from './Pages/RoomDashboard';
import CustomAlert from './Pages/Components/CustomAlert';
import { Profile } from './Pages/Profile';
import * as signalR from "@microsoft/signalr";

// Next Step(s):

// For the video call room :
// Create a dashboard to be able to share files 
// share a canvas to type/draw
// screen sharing

// For the website in general : 
// Create the notifications system 
// Create a Profile page for users -- done
// Fix the UI/UX design for the Main dashboard

// More features :
// Add a page where the user can view his friend's list -- done
// Add the ability to block friends or remove them 
// Add the ability to join a room via a link sent by the owner
// Add the ability to message friends -- done
// Add group chat inside video call room
// Add a custom alert module -- done


// Debugging:
// User names are not appearing in the friend request section or in friends list when creating a video call
// Remote feeds are not visible during video calls

const BASE_URL = import.meta.env.VITE_BASE_URL;

function App() {

  const [isLogged, setIsLogged] = useState(false);
  const [alert , setAlert] = useState(null);
  
  const getToken = () => localStorage.getItem("token");

  const showAlert = (type , message) => {
    setAlert({type , message});
  }

  // notfication center
  useEffect(() =>{
    const token = getToken();
    if(!token) return;// only mount on login
    const connection = new signalR.HubConnectionBuilder()
          .withUrl(`${BASE_URL}/notificationHub`, {
            accessTokenFactory: () => token,
            transport: signalR.HttpTransportType.WebSockets,
            skipNegotiation: true,
          })
          .withAutomaticReconnect()
          .build();
    connection
      .start()
      .then(() => console.log("Connected to notification hub"))
      .catch((err) => console.error("Connection failed:", err));
    
    connection.on("ReceiveNotification", (notificationMessage) => {
      showAlert("info" , notificationMessage);
    });

    connection.on("Error", (errorMsg) => {
      console.error("SignalR error:", errorMsg);
    });

  return () => {
    connection.stop();
  };
  } , [])

  return (
    <>  
      <Router>
         {alert && (
          <CustomAlert
            type={alert.type}
            message={alert.message}
            onClose={() => setAlert(null)}
          />
        )}
        <Header 
        isLogged= {isLogged}
        setIsLogged={setIsLogged}
        />
        <Routes>
          <Route path="/" element={<Dashboard
          showAlert={showAlert}
          isLogged= {isLogged}
          setIsLogged={setIsLogged}
           />} />
          <Route path="/videoCalling/:code" element={<VideoCalling showAlert={showAlert} />}/>
          <Route path="/roomDashboard" element={<RoomDashboard showAlert={showAlert} />} />
          <Route path="/login" element={<Login showAlert={showAlert} />} />
          <Route path="/signup" element={<Signup showAlert={showAlert} />} />
          <Route path="/profile" element={<Profile showAlert={showAlert} />}/>
        </Routes>
      </Router>
    </>
  )
}

export default App
