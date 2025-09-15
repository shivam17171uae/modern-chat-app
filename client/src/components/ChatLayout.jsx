import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import ChatList from './ChatList';
import Conversation from './Conversation';
import ChatDetail from './ChatDetail';
import CreateGroupModal from './CreateGroupModal';

// This line handles connecting to the correct server URL in development vs. production
const SERVER_URL = import.meta.env.PROD ? '' : 'http://localhost:8080';
const socket = io(SERVER_URL);

const ChatLayout = ({ username }) => {
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [groups, setGroups] = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    const [messages, setMessages] = useState({});
    const [isCreatingGroup, setIsCreatingGroup] = useState(false);
    const [typingUsers, setTypingUsers] = useState([]);

    // NEW: State to manage mobile view
    const [isConversationVisible, setIsConversationVisible] = useState(false);

    const activeChatRef = useRef(activeChat);
    const notificationSoundRef = useRef(new Audio('/message.mp3'));
    useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);

    const handleNotification = (newMessage) => {
        const { author, message, type, roomId } = newMessage;
        const currentActiveChat = activeChatRef.current;
        const chatSourceId = roomId.startsWith('group-') ? parseInt(roomId.split('-')[1]) : author;
        const isChatOpen = currentActiveChat && currentActiveChat.id === chatSourceId;

        if (document.hidden) {
            notificationSoundRef.current.play().catch(e => console.error("Sound error:", e));
            if (Notification.permission === 'granted') { new Notification(author, { body: type === 'image' ? 'Sent an image' : message }); }
        } else if (!isChatOpen) {
            notificationSoundRef.current.play().catch(e => console.error("Sound error:", e));
        }
    };

    useEffect(() => {
        socket.emit('join_chat', username);
        socket.on('online_users', (users) => setOnlineUsers(users.filter(u => u.username !== username)));
        socket.on('user_groups', (userGroups) => setGroups(userGroups));
        socket.on('new_group_created', (newGroup) => {
            setGroups(prev => prev.find(g => g.id === newGroup.id) ? prev : [...prev, newGroup]);
        });
        socket.on('chat_history', ({ roomId, messages: history }) => {
            setMessages(prev => ({ ...prev, [roomId]: history }));
        });

        const messageListener = (newMessage) => {
            const { roomId, author } = newMessage;
            setMessages(prev => ({ ...prev, [roomId]: [...(prev[roomId] || []), newMessage] }));
            if (author !== username) handleNotification(newMessage);
        };
        socket.on('receive_private_message', messageListener);
        socket.on('receive_group_message', messageListener);

        socket.on('messages_status_updated', ({ roomId, updatedMessages }) => {
            setMessages(prev => {
                if (!prev[roomId]) return prev;
                const newRoomMessages = prev[roomId].map(msg => {
                    const update = updatedMessages.find(u => u.id === msg.id);
                    return update ? { ...msg, status: update.status } : msg;
                });
                return { ...prev, [roomId]: newRoomMessages };
            });
        });

        socket.on('user_typing', ({ username: typingUsername }) => setTypingUsers(prev => [...new Set([...prev, typingUsername])]));
        socket.on('user_stop_typing', ({ username: typingUsername }) => setTypingUsers(prev => prev.filter(user => user !== typingUsername)));

        return () => {
            socket.off('online_users'); socket.off('user_groups'); socket.off('new_group_created');
            socket.off('chat_history'); socket.off('receive_private_message'); socket.off('receive_group_message');
            socket.off('messages_status_updated'); socket.off('user_typing'); socket.off('user_stop_typing');
        };
    }, [username]);

    const handleSelectChat = (chat) => {
        setActiveChat(chat);
        setIsConversationVisible(true); // Switch to conversation view on mobile

        if (chat.type === 'group') {
            socket.emit('get_group_history', chat.id);
        } else {
            socket.emit('get_chat_history', chat.username);
            const roomId = [username, chat.username].sort().join('--');
            socket.emit('mark_as_read', { roomId, readerUsername: username });
        }
    };

    const handleBackToList = () => {
        setIsConversationVisible(false); // Switch back to chat list view
    };

    const handleSendMessage = (messageContent, type = 'text') => {
        if (!activeChat) return;
        const messageData = { author: username, message: messageContent, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), type };
        if (activeChat.type === 'group') {
            socket.emit('send_group_message', { ...messageData, groupId: activeChat.id });
        } else {
            socket.emit('send_private_message', { ...messageData, recipient: activeChat.username });
        }
    };

    const handleCreateGroup = ({ groupName, members }) => {
        socket.emit('create_group', { groupName, members });
        setIsCreatingGroup(false);
    };

    const currentRoomId = activeChat ? (activeChat.type === 'group' ? `group-${activeChat.id}` : [username, activeChat.username].sort().join('--')) : null;

    const usersWithChatInfo = onlineUsers.map(user => {
        const roomId = [username, user.username].sort().join('--');
        const roomMessages = messages[roomId] || [];
        const lastMessage = roomMessages[roomMessages.length - 1];
        const unreadCount = roomMessages.filter(msg => msg.author === user.username && msg.status !== 'read').length;
        let lastMessagePreview = 'Online';
        if (lastMessage) { lastMessagePreview = lastMessage.type === 'image' ? '📷 Image' : lastMessage.message; }
        return { ...user, lastMessage: lastMessagePreview, timestamp: lastMessage ? lastMessage.time : '', unreadCount };
    });

    const groupsWithChatInfo = groups.map(group => {
        const roomId = `group-${group.id}`;
        const roomMessages = messages[roomId] || [];
        const lastMessage = roomMessages[roomMessages.length - 1];
        const unreadCount = roomMessages.filter(msg => msg.author !== username).length; // Simplified for now
        let lastMessagePreview = 'No messages yet';
        if (lastMessage) { lastMessagePreview = lastMessage.type === 'image' ? '📷 Image' : `${lastMessage.author}: ${lastMessage.message}`; }
        return { ...group, lastMessage: lastMessagePreview, timestamp: lastMessage ? lastMessage.time : '', unreadCount };
    });

    return (
        <div className={isConversationVisible ? 'conversation-visible' : ''}>
            {isCreatingGroup && <CreateGroupModal onlineUsers={onlineUsers} onCreateGroup={handleCreateGroup} onClose={() => setIsCreatingGroup(false)} />}
            <ChatList
                users={usersWithChatInfo}
                groups={groupsWithChatInfo}
                onSelectChat={handleSelectChat}
                activeChatId={activeChat?.id}
                onNewGroup={() => setIsCreatingGroup(true)}
            />
            <Conversation
                chat={activeChat}
                messages={messages[currentRoomId] || []}
                currentUser={username}
                onSendMessage={handleSendMessage}
                typingUsers={typingUsers}
                socket={socket}
                onBack={handleBackToList}
            />
            <ChatDetail chat={activeChat} />
        </div>
    );
};

export default ChatLayout;