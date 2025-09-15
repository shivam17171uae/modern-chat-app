import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPromise = open({ filename: path.join(__dirname, 'chat.db'), driver: sqlite3.Database });
async function setupDb() {
    const db = await dbPromise;
    await db.exec(`CREATE TABLE IF NOT EXISTS messages ( id INTEGER PRIMARY KEY, roomId TEXT, author TEXT, message TEXT, time TEXT, status TEXT, type TEXT );`);
    await db.exec(`CREATE TABLE IF NOT EXISTS groups ( id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, members TEXT );`);
}
setupDb();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });
app.use(cors());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => { cb(null, path.join(__dirname, 'uploads/')); },
        filename: (req, file, cb) => { cb(null, `${Date.now()}-${file.originalname}`); },
    })
});
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).send('No file uploaded.');
    res.status(200).json({ filePath: `/uploads/${req.file.filename}` });
});

const clientBuildPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientBuildPath));

const onlineUsers = new Map();
const getPrivateRoomId = (user1, user2) => [user1, user2].sort().join('--');
const getSocketIdByUsername = (username) => {
    for (const [id, user] of onlineUsers.entries()) { if (user.username === username) return id; }
    return null;
}

io.on('connection', (socket) => {
    socket.on('join_chat', async (username) => {
        socket.username = username;
        onlineUsers.set(socket.id, { username });
        io.emit('online_users', Array.from(onlineUsers.values()));

        try {
            const db = await dbPromise;
            const groups = await db.all("SELECT * FROM groups WHERE members LIKE ?", [`%"${username}"%`]);
            const parsedGroups = groups.map(g => ({ ...g, members: JSON.parse(g.members) }));
            socket.emit('user_groups', parsedGroups);
            parsedGroups.forEach(group => socket.join(`group-${group.id}`));

            const undeliveredMessages = await db.all(`SELECT DISTINCT author, roomId FROM messages WHERE roomId LIKE ? AND status = 'sent'`, [`%--${username}`, `${username}--%`]);
            if (undeliveredMessages.length > 0) {
                await db.run(`UPDATE messages SET status = 'delivered' WHERE roomId LIKE ? AND status = 'sent'`, [`%${username}%`]);
                for (const { author, roomId } of undeliveredMessages) {
                    const authorSocketId = getSocketIdByUsername(author);
                    if (authorSocketId) {
                        const updatedMessages = await db.all(`SELECT id, status FROM messages WHERE roomId = ? AND author = ?`, [roomId, author]);
                        io.to(authorSocketId).emit('messages_status_updated', { roomId, updatedMessages });
                    }
                }
            }
        } catch (err) { console.error("Error during join chat:", err); }
    });

    socket.on('create_group', async ({ groupName, members }) => {
        const allMembers = [...new Set([socket.username, ...members])];
        try {
            const db = await dbPromise;
            const result = await db.run('INSERT INTO groups (name, members) VALUES (?, ?)', [groupName, JSON.stringify(allMembers)]);
            const newGroup = { id: result.lastID, name: groupName, members: allMembers };
            allMembers.forEach(memberUsername => {
                const memberSocketId = getSocketIdByUsername(memberUsername);
                if (memberSocketId) {
                    io.to(memberSocketId).emit('new_group_created', newGroup);
                    io.sockets.sockets.get(memberSocketId)?.join(`group-${newGroup.id}`);
                }
            });
        } catch (err) { console.error("Error creating group:", err); }
    });

    socket.on('get_chat_history', async (recipientUsername) => {
        const roomId = getPrivateRoomId(socket.username, recipientUsername);
        const db = await dbPromise;
        const messages = await db.all('SELECT * FROM messages WHERE roomId = ? ORDER BY id ASC', roomId);
        socket.emit('chat_history', { roomId, messages });
    });

    socket.on('get_group_history', async (groupId) => {
        const roomId = `group-${groupId}`;
        const db = await dbPromise;
        const messages = await db.all('SELECT * FROM messages WHERE roomId = ? ORDER BY id ASC', roomId);
        socket.emit('chat_history', { roomId, messages });
    });

    socket.on('send_private_message', async (data) => {
        const { recipient, ...messageData } = data;
        const roomId = getPrivateRoomId(socket.username, recipient);
        const recipientSocketId = getSocketIdByUsername(recipient);
        const status = recipientSocketId ? 'delivered' : 'sent';
        try {
            const db = await dbPromise;
            const result = await db.run('INSERT INTO messages (roomId, author, message, time, status, type) VALUES (?, ?, ?, ?, ?, ?)', roomId, messageData.author, messageData.message, messageData.time, status, messageData.type);
            const newMessage = { ...messageData, id: result.lastID, status, roomId };
            socket.emit('receive_private_message', newMessage);
            if (recipientSocketId) { io.to(recipientSocketId).emit('receive_private_message', newMessage); }
        } catch (err) { console.error('Failed to save private message:', err); }
    });

    socket.on('send_group_message', async (data) => {
        const { groupId, ...messageData } = data;
        const roomId = `group-${groupId}`;
        try {
            const db = await dbPromise;
            const result = await db.run('INSERT INTO messages (roomId, author, message, time, status, type) VALUES (?, ?, ?, ?, ?, ?)', roomId, messageData.author, messageData.message, messageData.time, 'sent', messageData.type);
            const newMessage = { ...messageData, id: result.lastID, status: 'sent', roomId };
            io.to(roomId).emit('receive_group_message', newMessage);
        } catch (err) { console.error("Error sending group message:", err); }
    });

    socket.on('mark_as_read', async ({ roomId, readerUsername }) => {
        try {
            const db = await dbPromise;
            const authorUsername = roomId.split('--').find(name => name !== readerUsername);
            if (!authorUsername) return;
            await db.run(`UPDATE messages SET status = 'read' WHERE roomId = ? AND author = ? AND status != 'read'`, [roomId, authorUsername]);
            const updatedMessages = await db.all(`SELECT id, status FROM messages WHERE roomId = ? AND author = ?`, [roomId, authorUsername]);
            const authorSocketId = getSocketIdByUsername(authorUsername);
            if (authorSocketId && updatedMessages.length > 0) {
                io.to(authorSocketId).emit('messages_status_updated', { roomId, updatedMessages });
                socket.emit('messages_status_updated', { roomId, updatedMessages });
            }
        } catch (err) { console.error('Error updating status to read:', err); }
    });

    socket.on('typing', ({ recipient, groupId }) => {
        if (recipient) {
            const recipientSocketId = getSocketIdByUsername(recipient);
            if (recipientSocketId) {
                socket.to(recipientSocketId).emit('user_typing', { username: socket.username });
            }
        } else if (groupId) {
            const roomId = `group-${groupId}`;
            socket.to(roomId).emit('user_typing', { username: socket.username, group: true });
        }
    });

    socket.on('stop_typing', ({ recipient, groupId }) => {
        if (recipient) {
            const recipientSocketId = getSocketIdByUsername(recipient);
            if (recipientSocketId) {
                socket.to(recipientSocketId).emit('user_stop_typing', { username: socket.username });
            }
        } else if (groupId) {
            const roomId = `group-${groupId}`;
            socket.to(roomId).emit('user_stop_typing', { username: socket.username, group: true });
        }
    });

    socket.on('disconnect', () => {
        if (socket.username) {
            onlineUsers.delete(socket.id);
            io.emit('online_users', Array.from(onlineUsers.values()));
        }
    });
});

app.get(/^(?!\/api|\/uploads|\/socket\.io).*$/, (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => { console.log(`🚀 SERVER IS RUNNING ON PORT ${PORT}`); });