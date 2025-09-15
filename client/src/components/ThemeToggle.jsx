import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { FiSun, FiMoon } from 'react-icons/fi';

const ThemeToggle = () => {
    const { theme, toggleTheme } = useTheme();

    return (
        <button onClick={toggleTheme} className="theme-toggle-button action-icon">
            {theme === 'light' ? <FiMoon /> : <FiSun />}
        </button>
    );
};

export default ThemeToggle;