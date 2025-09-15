import React, { useState, useEffect, useRef, useMemo } from 'react';
import Peer from 'simple-peer';
import MobileLayout from './MobileLayout';
import CreateGroupModal from './CreateGroupModal';
import CallModal from './CallModal';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useSocket } from '../context/SocketContext';
import ChatList from './ChatList';
import Conversation from './Conversation';
import ChatDetail from './ChatDetail';

const ChatContainer = ({ username }) => {
    const socket = useSocket();
    const [myId, setMyId] = useState(''); // <-- NEW: State to hold our own unique socket ID
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [recentChats, setRecentChats] = useState([]);
    const [groups, setGroups] = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    const [messages, setMessages] = useState({});
    const [isCreatingGroup, setIsCreatingGroup] = useState(false);
    const [usersInfo, setUsersInfo] = useState({});
    const [profileToShow, setProfileToShow] = useState(null);

    const [stream, setStream] = useState(null);
    const [isReceivingCall, setIsReceivingCall] = useState(false);
    const [caller, setCaller] = useState("");
    const [callerSignal, setCallerSignal] = useState();
    const [call, setCall] = useState({});
    const [callAccepted, setCallAccepted] = useState(false);
    const [isMicOn, setIsMicOn] = useState(true);
    const [isCamOn, setIsCamOn] = useState(true);

    const userVideoRef = useRef();
    const connectionRef = useRef();
    const activeChatRef = useRef(activeChat);
    const ringtoneRef = useRef(new Audio('/message.mp3'));

    useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);

    const getRoomId = (chat) => {
        if (!chat) return null;
        return chat.type === 'group' ? `group-${chat.id}` : [username, chat.username].sort().join('--');
    };

    const handleNotification = (newMessage) => {
        if (document.hidden) {
            ringtoneRef.current.play().catch(e => console.error("Sound error:", e));
            if (Notification.permission === 'granted') {
                new Notification(newMessage.author, { body: newMessage.type === 'image' ? 'Sent an image' : newMessage.message });
            }
        }
    };

    useEffect(() => {
        if (!username) return;
        socket.connect();
        socket.emit('join_app', username);
        socket.emit('get_recent_chats', username);

        socket.on('me', (id) => setMyId(id)); // <-- NEW: Listen for our unique ID from the server

        socket.on('user_details', (user) => setUsersInfo(prev => ({ ...prev, [user.username]: user })));
        socket.on('users_details_updated', (users) => {
            const usersMap = users.reduce((acc, user) => ({ ...acc, [user.username]: user }), {});
            setUsersInfo(prev => ({ ...prev, ...usersMap }));
        });
        socket.on('avatar_updated', ({ username: updatedUsername, avatarUrl }) => {
            setUsersInfo(prev => ({ ...prev, [updatedUsername]: { ...(prev[updatedUsername] || {}), avatar_url: avatarUrl } }));
        });
        socket.on('recent_chats_list', (usernames) => {
            setRecentChats(usernames);
            if (usernames.length > 0) socket.emit('get_users_details', usernames);
        });

        const handleOnlineUsers = (newOnlineUsers) => {
            setOnlineUsers(newOnlineUsers);
            const unknownUsers = newOnlineUsers.filter(u => !usersInfo[u]);
            if (unknownUsers.length > 0) {
                socket.emit('get_users_details', unknownUsers);
            }
        };
        socket.on('online_users_updated', handleOnlineUsers);

        socket.on('user_groups', setGroups);
        socket.on('new_group_created', (group) => setGroups(prev => [...prev, group]));
        socket.on('receive_message', (msg) => {
            setMessages(prev => ({ ...prev, [msg.roomId]: [...(prev[msg.roomId] || []), msg] }));
            if (msg.author !== username) handleNotification(msg);
        });
        socket.on('chat_history', ({ roomId, messages }) => setMessages(prev => ({ ...prev, [roomId]: messages })));

        socket.on("callUser", (data) => {
            setIsReceivingCall(true);
            setCaller(data.from);
            setCall({ name: data.name });
            setCallerSignal(data.signal);
            ringtoneRef.current.play();
        });
        socket.on("callEnded", () => leaveCall(false));

        socket.on("callAccepted", (signal) => {
            setCallAccepted(true);
            if (connectionRef.current) {
                connectionRef.current.signal(signal);
            }
        });

        return () => {
            socket.off('me');
            socket.off('user_details');
            socket.off('users_details_updated');
            socket.off('avatar_updated');
            socket.off('online_users_updated');
            socket.off('recent_chats_list');
            socket.off('user_groups');
            socket.off('new_group_created');
            socket.off('receive_message');
            socket.off('chat_history');
            socket.off("callUser");
            socket.off("callEnded");
            socket.off("callAccepted");
            socket.disconnect();
        };
    }, [username]);

    const callUser = (userToCall) => {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
            setStream(stream);
            setCall({ name: userToCall });
            const peer = new Peer({ initiator: true, trickle: false, stream });
            peer.on("signal", (data) => {
                // --- THIS IS THE FIX ---
                // We now send our reliable, unique 'myId' state
                socket.emit("callUser", { userToCall, signalData: data, from: myId, name: username });
            });
            peer.on("stream", (currentStream) => { if (userVideoRef.current) userVideoRef.current.srcObject = currentStream; });
            connectionRef.current = peer;
        });
    };

    const answerCall = () => {
        ringtoneRef.current.pause();
        setCallAccepted(true);
        navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
            setStream(stream);
            const peer = new Peer({ initiator: false, trickle: false, stream });
            peer.on("signal", (data) => {
                socket.emit("answerCall", { signal: data, to: caller });
            });
            peer.on("stream", (currentStream) => { if (userVideoRef.current) userVideoRef.current.srcObject = currentStream; });
            peer.signal(callerSignal);
            connectionRef.current = peer;
        });
    };

    const leaveCall = (notifyPeer = true) => {
        ringtoneRef.current.pause();
        if (notifyPeer && call.name) socket.emit("endCall", { to: call.name });
        if (stream) stream.getTracks().forEach(track => track.stop());
        if (connectionRef.current) connectionRef.current.destroy();
        setStream(null);
        setCallAccepted(false);
        setIsReceivingCall(false);
        setCall({});
        setCallerSignal(null);
    };

    const toggleMic = () => {
        if (stream) {
            stream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
            setIsMicOn(prev => !prev);
        }
    };

    const toggleCam = () => {
        if (stream) {
            stream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
            setIsCamOn(prev => !prev);
        }
    };

    const handleSelectChat = (chat) => {
        setActiveChat(chat);
        setProfileToShow(null);
        const roomId = getRoomId(chat);
        if (roomId) {
            socket.emit('get_history', roomId);
        }
    };

    const showProfile = (user) => setProfileToShow(user);
    const closeProfile = () => setProfileToShow(null);

    const handleSendMessage = (content, type = 'text') => {
        if (!activeChat) return;
        const messageData = { message: content, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), type };
        const payload = activeChat.type === 'group' ? { ...messageData, groupId: activeChat.id } : { ...messageData, recipient: activeChat.username };
        socket.emit('send_message', payload);
    };

    const handleCreateGroup = (data) => {
        socket.emit('create_group', { ...data, members: [...data.members, username] });
        setIsCreatingGroup(false);
    };

    const usersWithChatInfo = useMemo(() => {
        const allUsernames = new Set([...recentChats, ...onlineUsers.filter(u => u !== username)]);
        return Array.from(allUsernames).map(user => {
            const roomId = [username, user].sort().join('--');
            const roomMessages = messages[roomId] || [];
            const lastMessage = roomMessages[roomMessages.length - 1];
            const isOnline = onlineUsers.includes(user);
            let lastMessagePreview = isOnline ? 'Online' : 'Offline';
            if (lastMessage) lastMessagePreview = lastMessage.type === 'image' ? '📷 Image' : lastMessage.message;

            return { username: user, lastMessage: lastMessagePreview, timestamp: lastMessage ? lastMessage.time : '', isOnline, type: 'personal', avatarUrl: usersInfo[user]?.avatar_url || null };
        });
    }, [recentChats, onlineUsers, messages, username, usersInfo]);

    const groupsWithChatInfo = useMemo(() => groups.map(group => {
        const roomId = `group-${group.id}`;
        const roomMessages = messages[roomId] || [];
        const lastMessage = roomMessages[roomMessages.length - 1];
        let lastMessagePreview = 'No messages yet';
        if (lastMessage) lastMessagePreview = lastMessage.type === 'image' ? '📷 Image' : `${lastMessage.author}: ${lastMessage.message}`;
        return { ...group, lastMessage: lastMessagePreview, timestamp: lastMessage ? lastMessage.time : '', type: 'group' };
    }), [groups, messages, username]);

    const isMobile = useMediaQuery('(max-width: 900px)');
    const currentRoomId = getRoomId(activeChat);
    const currentUserInfo = usersInfo[username];

    return (
        <>
            {(stream || isReceivingCall) && (
                <CallModal
                    call={call}
                    callAccepted={callAccepted}
                    userVideoRef={userVideoRef}
                    stream={stream}
                    isReceivingCall={isReceivingCall}
                    answerCall={answerCall}
                    leaveCall={leaveCall}
                    isMicOn={isMicOn}
                    isCamOn={isCamOn}
                    toggleMic={toggleMic}
                    toggleCam={toggleCam}
                />
            )}

            <div className={`app-content ${(stream || isReceivingCall) ? 'blur-background' : ''}`}>
                <div className={`desktop-layout ${profileToShow ? 'details-visible' : ''}`}>
                    <ChatList
                        users={usersWithChatInfo}
                        groups={groupsWithChatInfo}
                        onSelectChat={handleSelectChat}
                        activeChatId={activeChat?.type === 'group' ? activeChat.id : activeChat?.username}
                        onNewGroup={() => setIsCreatingGroup(true)}
                        currentUserInfo={currentUserInfo}
                        onShowProfile={showProfile}
                    />
                    <Conversation
                        chat={activeChat}
                        messages={messages[currentRoomId] || []}
                        currentUser={username}
                        onSendMessage={handleSendMessage}
                        typingInfo={{}}
                        onShowProfile={showProfile}
                        onCallUser={callUser}
                    />
                    <ChatDetail
                        profile={profileToShow}
                        messages={profileToShow && profileToShow.type !== 'group' ? messages[getRoomId(profileToShow)] : []}
                        onClose={closeProfile}
                        currentUserInfo={currentUserInfo}
                    />
                </div>
            </div>
        </>
    );
};

export default ChatContainer;