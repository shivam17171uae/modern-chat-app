// src/components/TypingIndicator.jsx
import React from 'react';

const TypingIndicator = ({ typingInfo }) => {
    if (!typingInfo || !typingInfo.isTyping || !typingInfo.user) {
        return <div className="typing-indicator-placeholder" />;
    }

    return (
        <div className="typing-indicator">
            {`${typingInfo.user} is typing...`}
        </div>
    );
};

export default TypingIndicator;