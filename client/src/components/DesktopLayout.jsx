import React from 'react';
import ChatList from './ChatList';
import Conversation from './Conversation';
import ChatDetail from './ChatDetail';

const DesktopLayout = ({
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
    const currentRoomId = activeChat
        ? (activeChat.type === 'group' ? `group-${activeChat.id}` : [currentUser, activeChat.username].sort().join('--'))
        : null;

    return (
        <>
            <ChatList
                users={users}
                groups={groups}
                onSelectChat={onSelectChat}
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
            // No onBack prop for desktop
            />
            <ChatDetail chat={activeChat} />
        </>
    );
};

export default DesktopLayout;