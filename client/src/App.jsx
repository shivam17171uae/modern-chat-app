import { useState } from 'react';
import './App.css';
import LoginScreen from './components/LoginScreen';
import ChatContainer from './components/ChatContainer'; // <-- IMPORT THE NEW CONTAINER

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");

  const handleLogin = (name) => {
    if (name.trim() !== "") {
      setUsername(name);
      setIsLoggedIn(true);
    }
  };

  return (
    <div className="app-layout">
      {!isLoggedIn ? (
        <LoginScreen onLogin={handleLogin} />
      ) : (
        <ChatContainer username={username} /> // <-- RENDER THE NEW CONTAINER
      )}
    </div>
  );
}

export default App;