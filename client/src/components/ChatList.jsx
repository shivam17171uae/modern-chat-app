import React, { useState } from 'react';
import { FiSearch, FiPlus } from 'react-icons/fi';
import ThemeToggle from './ThemeToggle';
import Jdenticon from 'react-jdenticon';
import { SERVER_URL } from '../config'; // <-- IMPORT FROM CONFIG

const Avatar = ({ user, size = "48" }) => {
    const avatarUrl = user?.avatarUrl || user?.avatar_url;
    if (avatarUrl) {
        // --- THIS IS THE FIX ---
        return <img src={`${SERVER_URL}${avatarUrl}`} alt={user.username || user.name} className="avatar-image" />;
    }
    return <Jdenticon size={size} value={user?.username || user?.name || 'default'} />;
};

const ChatList = ({ users, groups, onSelectChat, activeChatId, onNewGroup, currentUserInfo, onShowProfile }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredUsers = users.filter(user =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const filteredGroups = groups.filter(group =>
        group.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="chat-list-panel">
            <div className="profile-header">
                <div className="profile-info" onClick={() => onShowProfile(currentUserInfo)} style={{ cursor: 'pointer' }}>
                    <div className="avatar-wrapper">
                        {currentUserInfo ? <Avatar user={currentUserInfo} size="40" /> : <Jdenticon size="40" value="My App" />}
                    </div>
                    <h4>{currentUserInfo?.username || 'My Chat App'}</h4>
                </div>
                <div className="header-actions"><ThemeToggle /></div>
            </div>

            <div className="search-container">
                <FiSearch className="search-icon" />
                <input
                    type="text"
                    placeholder="Search or start new chat"
                    className="search-input"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="chat-list">
                <div className="list-section-header">
                    <h5 className="list-heading">Groups</h5>
                    <FiPlus className="action-icon" onClick={onNewGroup} />
                </div>
                {filteredGroups.map(group => (
                    <div
                        key={`group-${group.id}`}
                        className={`chat-list-item ${group.id === activeChatId ? 'active' : ''}`}
                        onClick={() => onSelectChat(group)}
                    >
                        <div className="avatar-wrapper"><Avatar user={group} /></div>
                        <div className="chat-details">
                            <div className="chat-header">
                                <span className="chat-name">{group.name}</span>
                                <span className="chat-timestamp">{group.timestamp}</span>
                            </div>
                            <div className="chat-last-message">
                                <p>{group.lastMessage}</p>
                            </div>
                        </div>
                    </div>
                ))}

                <div className="list-section-header">
                    <h5 className="list-heading">Chats</h5>
                </div>
                {filteredUsers.map(user => (
                    <div
                        key={user.username}
                        className={`chat-list-item ${user.username === activeChatId ? 'active' : ''}`}
                        onClick={() => onSelectChat(user)}
                    >
                        <div className="avatar-wrapper">
                            <Avatar user={user} />
                            {user.isOnline && <div className="online-indicator"></div>}
                        </div>
                        <div className="chat-details">
                            <div className="chat-header">
                                <span className="chat-name">{user.username}</span>
                                <span className="chat-timestamp">{user.timestamp}</span>
                            </div>
                            <div className="chat-last-message">
                                <p>{user.lastMessage}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ChatList;