import React, { createContext, useState, useEffect, useContext } from 'react';

// Create a context with a default value
const ThemeContext = createContext();

// Create a provider component
export const ThemeProvider = ({ children }) => {
    // Initialize state by reading from localStorage or defaulting to 'light'
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

    useEffect(() => {
        // Apply the theme class to the body
        const body = window.document.body;
        body.classList.remove('theme-light', 'theme-dark');
        body.classList.add(`theme-${theme}`);

        // Save the theme choice to localStorage
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

// Custom hook to use the theme context easily
export const useTheme = () => useContext(ThemeContext);