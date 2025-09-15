import React, { useRef, useEffect } from 'react';
import { FiPhone, FiVideo, FiMoreVertical, FiArrowLeft } from 'react-icons/fi';
import { BsCheck, BsCheck2All } from 'react-icons/bs';
import Linkify from 'react-linkify';
import Jdenticon from 'react-jdenticon';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';
import { SERVER_URL } from '../config'; // <-- IMPORT FROM CONFIG

const ReadReceipt = ({ status }) => {
    if (status === 'read') return <BsCheck2All className="read-receipt read" />;
    if (status === 'delivered') return <BsCheck2All className="read-receipt" />;
    if (status === 'sent') return <BsCheck className="read-receipt" />;
    return null;
}

const Conversation = ({ chat, messages, currentUser, onSendMessage, typingInfo, onShowProfile, onCallUser }) => {
    const messagesEndRef = useRef(null);
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleCallClick = () => {
        if (chat.type === 'group') {
            alert("Group calls are not supported yet.");
            return;
        }
        onCallUser(chat.username);
    };

    if (!chat) {
        return (
            <div className="conversation-panel welcome-screen">
                <h2>Select a chat to start messaging</h2>
            </div>
        );
    }

    const chatName = chat.type === 'group' ? chat.name : chat.username;

    return (
        <div className="conversation-panel">
            <div className="panel-header">
                <div className="header-info" onClick={() => onShowProfile(chat)} style={{ cursor: 'pointer' }}>
                    <div className="avatar-wrapper">
                        {/* --- THIS IS THE FIX --- */}
                        {chat.avatarUrl ? (
                            <img src={`${SERVER_URL}${chat.avatarUrl}`} alt={chatName} className="avatar-image" />
                        ) : (
                            <Jdenticon size="40" value={chatName} />
                        )}
                    </div>
                    <div><h4>{chatName}</h4></div>
                </div>
                <div className="header-icons">
                    <FiVideo onClick={handleCallClick} style={{ cursor: 'pointer' }} />
                    <FiPhone onClick={handleCallClick} style={{ cursor: 'pointer' }} />
                    <FiMoreVertical onClick={() => onShowProfile(chat)} style={{ cursor: 'pointer' }} />
                </div>
            </div>
            <div className="message-area">
                {(messages || []).map((msg, index) => (
                    <div key={msg.id || index} className={`message-bubble ${msg.author === currentUser ? 'sent' : 'received'}`}>
                        {chat.type === 'group' && msg.author !== currentUser && <div className="message-author">{msg.author}</div>}
                        {/* --- THIS IS THE FIX --- */}
                        {msg.type === 'image' ? (
                            <img src={`${SERVER_URL}${msg.message}`} alt="sent content" className="message-image" />
                        ) : (
                            <p>
                                <Linkify componentDecorator={(decoratedHref, decoratedText, key) => (
                                    <a target="_blank" rel="noopener noreferrer" href={decoratedHref} key={key} className="message-link">{decoratedText}</a>
                                )}>{msg.message}</Linkify>
                            </p>
                        )}
                        <div className="message-meta">
                            <span>{msg.time}</span>
                            {msg.author === currentUser && <ReadReceipt status={msg.status} />}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <TypingIndicator typingInfo={typingInfo} />
            <MessageInput
                onSendMessage={onSendMessage}
                chat={chat}
                currentUser={currentUser}
            />
        </div>
    );
};

export default Conversation;