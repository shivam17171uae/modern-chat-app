import React, { useState } from 'react';
import ChatList from './ChatList';
import Conversation from './Conversation';

const MobileLayout = ({
    users,
    groups,
    onSelectChat,
    activeChat,
    messages,
    currentUser,
    onSendMessage,
    typingInfo, // <-- UPDATED: Changed from typingUsers to typingInfo
    onNewGroup,
}) => {
    const [isConversationVisible, setIsConversationVisible] = useState(false);

    const handleSelectChatMobile = (chat) => {
        onSelectChat(chat);
        setIsConversationVisible(true);
    };

    const handleBackToList = () => {
        setIsConversationVisible(false);
    };

    const currentRoomId = activeChat
        ? (activeChat.type === 'group' ? `group-${activeChat.id}` : [currentUser, activeChat.username].sort().join('--'))
        : null;

    return (
        <div className={`mobile-layout ${isConversationVisible ? 'conversation-visible' : ''}`}>
            <ChatList
                users={users}
                groups={groups}
                onSelectChat={handleSelectChatMobile}
                activeChatId={activeChat?.id || activeChat?.username}
                onNewGroup={onNewGroup}
            />
            <Conversation
                chat={activeChat}
                messages={messages[currentRoomId] || []}
                currentUser={currentUser}
                onSendMessage={onSendMessage}
                typingInfo={typingInfo} // <-- UPDATED: Pass the new typingInfo prop
                onBack={handleBackToList}
            />
        </div>
    );
};

export default MobileLayout;