import { useState } from 'react';
import './App.css';
import LoginScreen from './components/LoginScreen'; // <-- IMPORT the component
import ChatLayout from './components/ChatLayout';
// useTheme is not used here, so we can remove it for now.

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
        <ChatLayout username={username} />
      )}
    </div>
  );
}

export default App;