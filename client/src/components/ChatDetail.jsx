import React from 'react';
import { FiX } from 'react-icons/fi';

const ChatDetail = ({ chat }) => {
    // --- THIS IS THE FIX ---
    // If no chat is selected, don't render this component.
    if (!chat) {
        return (
            <div className="chat-detail-panel">
                {/* You can optionally have a placeholder here */}
            </div>
        );
    }

    // The rest of the component remains the same
    return (
        <div className="chat-detail-panel">
            <div className="panel-header">
                <h4>Details</h4>
                <FiX className="close-icon" />
            </div>
            <div className="detail-content">
                <div className="group-info">
                    <div className="group-avatar">{chat.avatar}</div>
                    <h3>{chat.username}</h3> {/* Changed from chat.name to chat.username */}
                    <p className="group-description">User is currently online.</p>
                </div>
                <div className="detail-section">
                    <h5>Media</h5>
                    <div className="media-tabs">
                        <button className="active">Media</button>
                        <button>Link</button>
                        <button>Docs</button>
                    </div>
                    <div className="media-grid">
                        <div className="media-item"></div>
                        <div className="media-item"></div>
                        <div className="media-item"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatDetail;