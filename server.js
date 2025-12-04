const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

// Static files (index.html, models, etc.) public folder se serve honge
app.use(express.static('public'));

let waitingUser = null;

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // 1. User Join Logic
    socket.on('join', () => {
        if (waitingUser && waitingUser.id !== socket.id) {
            // Partner mil gaya!
            socket.emit('chat-start', { initiator: true }); 
            waitingUser.emit('chat-start', { initiator: false }); 
            
            // Dono ko ek doosre ki ID bhej do signaling aur chatting ke liye
            socket.partnerId = waitingUser.id;
            waitingUser.partnerId = socket.id;
            
            waitingUser = null; 
            console.log(`Chat started between ${socket.id} and ${socket.partnerId}`);
        } else if (!waitingUser) {
            // Koi nahi hai, wait karo
            waitingUser = socket;
            socket.emit('waiting', 'Searching for a stranger...');
        }
    });

    // 2. WebRTC Signaling (Video Connection)
    socket.on('signal', (data) => {
        if (socket.partnerId) {
            // Data mein name bhi bhej rahe hain
            io.to(socket.partnerId).emit('signal', data); 
        }
    });

    // 3. Text Message Handler
    socket.on('send-message', (data) => {
        if (socket.partnerId) {
            // Message sirf connected partner ko bhejenge
            io.to(socket.partnerId).emit('receive-message', data);
        }
    });

    // 4. Disconnect Handler
    socket.on('disconnect', () => {
        if (waitingUser === socket) {
            waitingUser = null;
        }
        if (socket.partnerId) {
            // Partner ko notify karein
            io.to(socket.partnerId).emit('partner-disconnected');
        }
        console.log('User disconnected');
    });
});

// Render Deployment Ke Liye Dynamic Port Setting
const PORT = process.env.PORT || 3000; 
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Local Test Link: http://localhost:3000`);
});
