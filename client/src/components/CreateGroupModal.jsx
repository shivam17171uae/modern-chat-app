import React, { useState } from 'react';
import { FiX } from 'react-icons/fi';

const CreateGroupModal = ({ onlineUsers, onCreateGroup, onClose }) => {
    const [groupName, setGroupName] = useState('');
    const [selectedMembers, setSelectedMembers] = useState([]);

    const handleMemberToggle = (username) => {
        setSelectedMembers(prev =>
            prev.includes(username)
                ? prev.filter(m => m !== username)
                : [...prev, username]
        );
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (groupName.trim() && selectedMembers.length > 0) {
            onCreateGroup({ groupName, members: selectedMembers });
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h2>Create New Group</h2>
                    <FiX className="close-icon" onClick={onClose} />
                </div>
                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        placeholder="Group Name"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        className="group-name-input"
                        required
                    />
                    <h5>Select Members</h5>
                    <div className="member-selection-list">
                        {onlineUsers.map(user => (
                            <div key={user.username} className="member-item">
                                <input
                                    type="checkbox"
                                    id={`member-${user.username}`}
                                    checked={selectedMembers.includes(user.username)}
                                    onChange={() => handleMemberToggle(user.username)}
                                />
                                <label htmlFor={`member-${user.username}`}>{user.username}</label>
                            </div>
                        ))}
                    </div>
                    <button type="submit" className="create-group-btn">Create Group</button>
                </form>
            </div>
        </div>
    );
};

export default CreateGroupModal;