import React, { useState, useMemo, useRef } from 'react';
import { FiX, FiCamera } from 'react-icons/fi';
import Jdenticon from 'react-jdenticon';
import { SERVER_URL } from '../config'; // <-- IMPORT FROM CONFIG

const ChatDetail = ({ profile, messages, onClose, currentUserInfo }) => {
    const [activeTab, setActiveTab] = useState('media');
    const fileInputRef = useRef(null);

    const handleAvatarClick = () => {
        if (profile && currentUserInfo && profile.username === currentUserInfo.username) {
            fileInputRef.current.click();
        }
    };

    const handleAvatarChange = async (e) => {
        const file = e.target.files[0];
        if (!file || !currentUserInfo) return;

        const formData = new FormData();
        formData.append('avatar', file);
        formData.append('username', currentUserInfo.username);

        try {
            // --- THIS IS THE FIX ---
            await fetch(`${SERVER_URL}/api/upload-avatar`, { method: 'POST', body: formData });
        } catch (error) {
            console.error("Error uploading avatar:", error);
        }
    };

    const { media, links } = useMemo(() => {
        if (!messages) return { media: [], links: [] };
        const media = messages.filter(msg => msg.type === 'image');
        const links = messages.filter(msg => msg.message.startsWith('http'));
        return { media, links };
    }, [messages]);

    if (!profile) {
        return <div className="chat-detail-panel" />;
    }

    const isGroup = profile.type === 'group';
    const profileName = isGroup ? profile.name : profile.username;
    const avatarUrl = isGroup ? null : profile.avatarUrl || profile.avatar_url;
    const isCurrentUserProfile = currentUserInfo && profile.username === currentUserInfo.username;
    const description = isGroup ? `${profile.members.length} members` : (profile.isOnline ? 'Online' : 'Offline');

    return (
        <div className="chat-detail-panel">
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleAvatarChange} accept="image/*" />
            <div className="panel-header">
                <h4>Details</h4>
                <FiX className="close-icon" onClick={onClose} style={{ cursor: 'pointer' }} />
            </div>
            <div className="detail-content">
                <div className="profile-info-large">
                    <div className="avatar-large-wrapper" onClick={handleAvatarClick} style={{ cursor: isCurrentUserProfile ? 'pointer' : 'default' }}>
                        {/* --- THIS IS THE FIX --- */}
                        {avatarUrl ? (
                            <img src={`${SERVER_URL}${avatarUrl}`} alt={profileName} className="avatar-image-large" />
                        ) : (
                            <Jdenticon size="120" value={profileName} />
                        )}
                        {isCurrentUserProfile && (
                            <div className="avatar-overlay">
                                <FiCamera />
                                <span>Change Photo</span>
                            </div>
                        )}
                    </div>
                    <h3>{profileName}</h3>
                    <p className="profile-description">{description}</p>
                </div>

                {!isGroup && (
                    <div className="detail-section">
                        <div className="media-tabs">
                            <button className={activeTab === 'media' ? 'active' : ''} onClick={() => setActiveTab('media')}>Media</button>
                            <button className={activeTab === 'links' ? 'active' : ''} onClick={() => setActiveTab('links')}>Links</button>
                            <button className={activeTab === 'docs' ? 'active' : ''} onClick={() => setActiveTab('docs')}>Docs</button>
                        </div>
                        <div className="media-content">
                            {activeTab === 'media' && (
                                <div className="media-grid">{media.length > 0 ? media.map(msg => (<div key={msg.id} className="media-grid-item" style={{ backgroundImage: `url(${SERVER_URL}${msg.message})` }}></div>)) : <p className="empty-media-text">No media shared yet.</p>}</div>
                            )}
                            {activeTab === 'links' && (
                                <div className="links-list">{links.length > 0 ? links.map(msg => (<a key={msg.id} href={msg.message} target="_blank" rel="noopener noreferrer" className="link-item">{msg.message}</a>)) : <p className="empty-media-text">No links shared yet.</p>}</div>
                            )}
                            {activeTab === 'docs' && <p className="empty-media-text">No documents shared yet.</p>}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatDetail;