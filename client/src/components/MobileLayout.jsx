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
    typingUsers,
    socket,
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

    // --- THIS IS THE FIX ---
    // We add the "mobile-layout" class to the main div so the CSS can target it.
    return (
        <div className={`mobile-layout ${isConversationVisible ? 'conversation-visible' : ''}`}>
            <ChatList
                users={users}
                groups={groups}
                onSelectChat={handleSelectChatMobile}
                activeChatId={activeChat?.id}
                onNewGroup={onNewGroup}
            />
            <Conversation
                chat={activeChat}
                messages={messages[currentRoomId] || []}
                currentUser={currentUser}
                onSendMessage={onSendMessage}
                typingUsers={typingUsers}
                socket={socket}
                onBack={handleBackToList} // Pass the back handler
            />
        </div>
    );
};

export default MobileLayout;