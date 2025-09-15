import React from 'react';
import { FiSearch, FiPlus } from 'react-icons/fi';
import ThemeToggle from './ThemeToggle';
import Jdenticon from 'react-jdenticon';

const ChatList = ({ users, groups, onSelectChat, activeChatId, onNewGroup }) => {
    return (
        <div className="chat-list-panel">
            <div className="profile-header">
                <div className="profile-info">
                    <div className="avatar-wrapper"><Jdenticon size="40" value="My App" /></div>
                    <div><h4>My Chat App</h4></div>
                </div>
                <div className="header-actions">
                    <FiSearch className="action-icon" />
                    <ThemeToggle />
                </div>
            </div>
            <div className="chat-list">
                <div className="list-section-header">
                    <h5 className="list-heading">Groups</h5>
                    <FiPlus className="action-icon" onClick={onNewGroup} />
                </div>
                {groups.map(group => (
                    <div
                        key={`group-${group.id}`}
                        className={`chat-list-item ${group.id === activeChatId ? 'active' : ''}`}
                        onClick={() => onSelectChat({ ...group, type: 'group' })}
                    >
                        <div className="avatar-wrapper"><Jdenticon size="48" value={group.name} /></div>
                        <div className="chat-details">
                            <div className="chat-header">
                                <span className="chat-name">{group.name}</span>
                                <span className="chat-timestamp">{group.timestamp}</span>
                            </div>
                            <div className="chat-last-message">
                                <p>{group.lastMessage}</p>
                                {/* NEW: Render the unread badge for groups */}
                                {group.unreadCount > 0 && <span className="unread-badge">{group.unreadCount}</span>}
                            </div>
                        </div>
                    </div>
                ))}

                <div className="list-section-header">
                    <h5 className="list-heading">Online Users</h5>
                </div>
                {users.map(user => (
                    <div
                        key={user.username}
                        className={`chat-list-item ${user.username === activeChatId ? 'active' : ''}`}
                        onClick={() => onSelectChat({ ...user, type: 'personal' })}
                    >
                        <div className="avatar-wrapper"><Jdenticon size="48" value={user.username} /></div>
                        <div className="chat-details">
                            <div className="chat-header">
                                <span className="chat-name">{user.username}</span>
                                <span className="chat-timestamp">{user.timestamp}</span>
                            </div>
                            <div className="chat-last-message">
                                <p>{user.lastMessage}</p>
                                {user.unreadCount > 0 && <span className="unread-badge">{user.unreadCount}</span>}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ChatList;