import React, { useState, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { FiSmile } from 'react-icons/fi';
import { IoSend } from 'react-icons/io5';
import { GrAttachment } from 'react-icons/gr';
import EmojiPicker from 'emoji-picker-react';
import { SERVER_URL } from '../config'; // <-- IMPORT FROM CONFIG

const MessageInput = ({ onSendMessage, chat, currentUser }) => {
    const socket = useSocket();
    const [messageInput, setMessageInput] = useState("");
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const typingTimeoutRef = useRef(null);
    const fileInputRef = useRef(null);

    const getRoomId = (currentChat) => {
        if (!currentChat) return null;
        if (currentChat.type === 'group') return `group-${currentChat.id}`;
        return [currentUser, currentChat.username].sort().join('--');
    };

    const handleTyping = (e) => {
        setMessageInput(e.target.value);
        const roomId = getRoomId(chat);
        if (!roomId) return;

        if (!typingTimeoutRef.current) {
            socket.emit('typing', { roomId });
        }
        clearTimeout(typingTimeoutRef.current);

        typingTimeoutRef.current = setTimeout(() => {
            socket.emit('stop_typing', { roomId });
            typingTimeoutRef.current = null;
        }, 1500);
    };

    const handleSend = () => {
        if (messageInput.trim()) {
            onSendMessage(messageInput, 'text');
            setMessageInput("");
            const roomId = getRoomId(chat);
            if (roomId) {
                clearTimeout(typingTimeoutRef.current);
                socket.emit('stop_typing', { roomId });
                typingTimeoutRef.current = null;
            }
            setShowEmojiPicker(false);
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        try {
            // --- THIS IS THE FIX ---
            const response = await fetch(`${SERVER_URL}/upload`, { method: 'POST', body: formData });
            const data = await response.json();
            if (response.ok) { onSendMessage(data.filePath, 'image'); }
            else { console.error('File upload failed:', data); }
        } catch (error) { console.error('Error uploading file:', error); }
    };

    const handleAttachmentClick = () => { fileInputRef.current.click(); };

    const onEmojiClick = (emojiObject) => {
        setMessageInput(prevInput => prevInput + emojiObject.emoji);
        setShowEmojiPicker(false);
    };

    return (
        <div className="message-input-container">
            {showEmojiPicker && (<div className="emoji-picker-wrapper"><EmojiPicker onEmojiClick={onEmojiClick} /></div>)}
            <div className="message-input-area">
                <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} accept="image/*,video/*,.pdf,.doc,.docx" />
                <FiSmile className="input-icon" onClick={() => setShowEmojiPicker(!showEmojiPicker)} />
                <GrAttachment className="input-icon" onClick={handleAttachmentClick} />
                <input type="text" placeholder="Type something..." value={messageInput} onChange={handleTyping} onKeyPress={(e) => e.key === 'Enter' && handleSend()} disabled={!chat} />
                <button className="send-button" onClick={handleSend} disabled={!chat}><IoSend /></button>
            </div>
        </div>
    );
};

export default MessageInput;