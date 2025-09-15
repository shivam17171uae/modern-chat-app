import React, { useState, useRef, useEffect } from 'react';
import { FiPhone, FiVideo, FiMoreVertical, FiSmile } from 'react-icons/fi';
import { IoSend } from 'react-icons/io5';
import { GrAttachment } from 'react-icons/gr';
import { BsCheck, BsCheck2, BsCheck2All } from 'react-icons/bs';
import EmojiPicker from 'emoji-picker-react';
import Linkify from 'react-linkify';
import Jdenticon from 'react-jdenticon';

const ReadReceipt = ({ status }) => {
    if (status === 'read') return <BsCheck2All className="read-receipt read" />;
    if (status === 'delivered') return <BsCheck2All className="read-receipt" />;
    if (status === 'sent') return <BsCheck className="read-receipt" />;
    return null;
}

const MessageInput = ({ onSendMessage, socket, chat }) => {
    const [messageInput, setMessageInput] = useState("");
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const typingTimeoutRef = useRef(null);
    const fileInputRef = useRef(null);

    const handleTyping = (e) => {
        setMessageInput(e.target.value);
        if (!chat) return;
        const typingPayload = chat.type === 'group' ? { groupId: chat.id } : { recipient: chat.username };
        if (!typingTimeoutRef.current) { socket.emit('typing', typingPayload); }
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            socket.emit('stop_typing', typingPayload);
            typingTimeoutRef.current = null;
        }, 1500);
    };

    const handleSend = () => {
        if (messageInput.trim()) {
            onSendMessage(messageInput, 'text');
            setMessageInput("");
            if (chat) {
                const typingPayload = chat.type === 'group' ? { groupId: chat.id } : { recipient: chat.username };
                clearTimeout(typingTimeoutRef.current);
                socket.emit('stop_typing', typingPayload);
                setShowEmojiPicker(false);
                typingTimeoutRef.current = null;
            }
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        try {
            const response = await fetch('http://localhost:8080/upload', { method: 'POST', body: formData });
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
                <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} accept="image/*" />
                <FiSmile className="input-icon" onClick={() => setShowEmojiPicker(!showEmojiPicker)} />
                <GrAttachment className="input-icon" onClick={handleAttachmentClick} />
                <input type="text" placeholder="Type something..." value={messageInput} onChange={handleTyping} onKeyPress={(e) => e.key === 'Enter' && handleSend()} disabled={!chat} />
                <button className="send-button" onClick={handleSend} disabled={!chat}><IoSend /></button>
            </div>
        </div>
    );
}

const TypingIndicator = ({ typingUsers, chat, currentUser }) => {
    const otherTypingUsers = typingUsers.filter(user => user !== currentUser);
    if (!chat || otherTypingUsers.length === 0) {
        return <div className="typing-indicator-placeholder" />;
    }

    // Only show typing indicator for the currently active chat
    if (chat.type === 'group' || (chat.type === 'personal' && otherTypingUsers.includes(chat.username))) {
        const usersString = otherTypingUsers.join(', ');
        const verb = otherTypingUsers.length > 1 ? 'are' : 'is';
        return <div className="typing-indicator">{`${usersString} ${verb} typing...`}</div>;
    }

    return <div className="typing-indicator-placeholder" />;
}

const Conversation = ({ chat, messages, currentUser, onSendMessage, typingUsers, socket }) => {
    const messagesEndRef = useRef(null);
    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    if (!chat) {
        return (<div className="conversation-panel welcome-screen"><h2>Select a chat to start messaging</h2></div>);
    }

    const chatName = chat.type === 'group' ? chat.name : chat.username;

    return (
        <div className="conversation-panel">
            <div className="panel-header">
                <div className="header-info">
                    <div className="avatar-wrapper"><Jdenticon size="40" value={chatName} /></div>
                    <div><h4>{chatName}</h4></div>
                </div>
                <div className="header-icons"><FiVideo /><FiPhone /><FiMoreVertical /></div>
            </div>
            <div className="message-area">
                {messages.map((msg) => (
                    <div key={msg.id} className={`message-bubble ${msg.author === currentUser ? 'sent' : 'received'}`}>
                        {chat.type === 'group' && msg.author !== currentUser && <div className="message-author">{msg.author}</div>}
                        {msg.type === 'image' ? (<img src={msg.message} alt="sent content" className="message-image" />) : (<p><Linkify componentDecorator={(decoratedHref, decoratedText, key) => (<a target="_blank" rel="noopener noreferrer" href={decoratedHref} key={key} className="message-link">{decoratedText}</a>)}>{msg.message}</Linkify></p>)}
                        <div className="message-meta">
                            <span>{msg.time}</span>
                            {msg.author === currentUser && chat.type === 'personal' && <ReadReceipt status={msg.status} />}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <TypingIndicator typingUsers={typingUsers} chat={chat} currentUser={currentUser} />
            <MessageInput onSendMessage={onSendMessage} socket={socket} chat={chat} />
        </div>
    );
};

export default Conversation;