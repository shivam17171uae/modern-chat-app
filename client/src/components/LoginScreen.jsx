import React, { useState } from 'react';

const LoginScreen = ({ onLogin }) => {
    const [name, setName] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();

        // --- NEW: Ask for notification permission ---
        // Check if the browser supports notifications and if permission hasn't been granted yet
        if ('Notification' in window && Notification.permission !== 'granted') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    console.log('Notification permission granted.');
                }
            });
        }

        onLogin(name);
    };

    return (
        <div className="login-container">
            <h3>Join Live Chat</h3>
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    placeholder="Enter your name..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                />
                <button type="submit">Enter</button>
            </form>
        </div>
    );
}

export default LoginScreen;