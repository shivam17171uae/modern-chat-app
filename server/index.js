import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

// --- Basic Setup ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

// --- Database Setup ---
const dbPromise = open({
    filename: path.join(__dirname, 'chat.db'),
    driver: sqlite3.Database
});

async function setupDb() {
    const db = await dbPromise;
    await db.exec(`CREATE TABLE IF NOT EXISTS users (username TEXT PRIMARY KEY, avatar_url TEXT);`);
    await db.exec(`CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY, roomId TEXT, author TEXT, message TEXT, time TEXT, status TEXT, type TEXT);`);
    await db.exec(`CREATE TABLE IF NOT EXISTS groups (id INTEGER PRIMARY KEY, name TEXT, members TEXT);`);
    console.log("Database setup complete.");
}
setupDb();

// --- Middleware & Static Files ---
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, '../client/dist')));

// --- File Uploads ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, 'uploads/')),
    filename: (req, file, cb) => cb(null, `${uuidv4()}-${file.originalname}`),
});
const upload = multer({ storage });

app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).send('No file uploaded.');
    res.status(200).json({ filePath: `/uploads/${req.file.filename}` });
});

app.post('/api/upload-avatar', upload.single('avatar'), async (req, res) => {
    const { username } = req.body;
    if (!req.file || !username) return res.status(400).send('Missing file or username.');
    const avatarUrl = `/uploads/${req.file.filename}`;
    try {
        const db = await dbPromise;
        await db.run('UPDATE users SET avatar_url = ? WHERE username = ?', [avatarUrl, username]);
        io.emit('avatar_updated', { username, avatarUrl });
        res.status(200).json({ avatarUrl });
    } catch (err) {
        res.status(500).send('Server error updating avatar.');
    }
});

// --- In-memory User Tracking & Helpers ---
const onlineUsers = new Map();

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);
    socket.emit("me", socket.id); // <-- THIS IS THE NEW, CRUCIAL LINE

    socket.on('join_app', async (username) => {
        socket.username = username;
        onlineUsers.set(username, socket.id);
        const db = await dbPromise;
        let user = await db.get('SELECT * FROM users WHERE username = ?', username);
        if (!user) {
            await db.run('INSERT INTO users (username, avatar_url) VALUES (?, ?)', [username, null]);
            user = { username, avatar_url: null };
        }
        socket.emit('user_details', user);
        io.emit('online_users_updated', Array.from(onlineUsers.keys()));
        const userGroups = await db.all("SELECT * FROM groups WHERE members LIKE ?", [`%"${username}"%`]);
        userGroups.forEach(group => socket.join(`group-${group.id}`));
        socket.emit('user_groups', userGroups.map(g => ({ ...g, members: JSON.parse(g.members) })));
    });

    socket.on('get_users_details', async (usernames) => {
        if (!usernames || usernames.length === 0) return;
        const db = await dbPromise;
        const placeholders = usernames.map(() => '?').join(',');
        const users = await db.all(`SELECT username, avatar_url FROM users WHERE username IN (${placeholders})`, usernames);
        socket.emit('users_details_updated', users);
    });

    socket.on('get_recent_chats', async (username) => {
        const db = await dbPromise;
        const rooms = await db.all("SELECT DISTINCT roomId FROM messages WHERE roomId LIKE ? AND roomId NOT LIKE 'group-%'", [`%${username}%`]);
        const recentUsernames = rooms.map(room => {
            const names = room.roomId.split('--');
            return names[0] === username ? names[1] : names[0];
        });
        socket.emit('recent_chats_list', recentUsernames);
    });

    socket.on('get_history', async (roomId) => {
        const db = await dbPromise;
        const messages = await db.all('SELECT * FROM messages WHERE roomId = ? ORDER BY id ASC', roomId);
        socket.emit('chat_history', { roomId, messages });
    });

    socket.on('send_message', async (data) => {
        const db = await dbPromise;
        const { recipient, groupId, ...messageData } = data;
        let roomId;
        if (groupId) {
            roomId = `group-${groupId}`;
        } else if (recipient) {
            roomId = [socket.username, recipient].sort().join('--');
        } else return;
        const status = onlineUsers.has(recipient) ? 'delivered' : 'sent';
        const result = await db.run('INSERT INTO messages (roomId, author, message, time, status, type) VALUES (?, ?, ?, ?, ?, ?)', roomId, socket.username, messageData.message, messageData.time, status, messageData.type);
        const newMessage = { id: result.lastID, roomId, author: socket.username, ...messageData, status };
        if (groupId) {
            io.to(roomId).emit('receive_message', newMessage);
        } else {
            const recipientSocketId = onlineUsers.get(recipient);
            if (recipientSocketId) {
                io.to(recipientSocketId).emit('receive_message', newMessage);
            }
            socket.emit('receive_message', newMessage);
        }
    });

    socket.on('mark_as_read', async ({ roomId }) => {
        const db = await dbPromise;
        await db.run("UPDATE messages SET status = 'read' WHERE roomId = ? AND author != ? AND status != 'read'", [roomId, socket.username]);
        const otherUser = roomId.split('--').find(name => name !== socket.username);
        const otherUserSocketId = onlineUsers.get(otherUser);
        if (otherUserSocketId) {
            io.to(otherUserSocketId).emit('messages_read', { roomId, reader: socket.username });
        }
    });

    socket.on('typing', ({ roomId }) => socket.to(roomId).emit('user_typing', { roomId, username: socket.username }));
    socket.on('stop_typing', ({ roomId }) => socket.to(roomId).emit('user_stop_typing', { roomId }));

    socket.on("callUser", ({ userToCall, signalData, from, name }) => {
        const userToCallSocketId = onlineUsers.get(userToCall);
        if (userToCallSocketId) {
            io.to(userToCallSocketId).emit("callUser", { signal: signalData, from, name });
        }
    });

    socket.on("answerCall", (data) => {
        io.to(data.to).emit("callAccepted", data.signal);
    });

    socket.on("endCall", ({ to }) => {
        const toSocketId = onlineUsers.get(to);
        if (toSocketId) {
            io.to(toSocketId).emit("callEnded");
        }
    });

    socket.on('disconnect', () => {
        if (socket.username) {
            onlineUsers.delete(socket.username);
            io.emit('online_users_updated', Array.from(onlineUsers.keys()));
        }
        socket.broadcast.emit("callEnded");
    });
});

app.get(/^(?!\/api|\/uploads|\/socket\.io).*$/, (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist', 'index.html'));
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`🚀 SERVER IS RUNNING ON PORT ${PORT}`));