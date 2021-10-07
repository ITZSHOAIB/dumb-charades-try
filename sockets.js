const socketio = require('socket.io');

const Room = require('./controllers/Rooms');
const Disconnect = require('./controllers/Disconnect');
const Game = require('./controllers/Game');

module.exports.init = (server) => {
    const io = socketio(server);
    io.on('connection', (socket) => {
        console.log('connected user');
        socket.on('roomExists', (data) => new Room(io, socket).roomExists(data));
        socket.on('newPrivateRoom', (player) => new Room(io, socket).createPrivateRoom(player));
        socket.on('joinRoom', async (data) => { await new Room(io, socket).joinRoom(data); });
        socket.on('disconnect', () => new Disconnect(io, socket).onDisconnect());
        socket.on('settingsUpdate', (data) => new Room(io, socket).updateSettings(data));
        socket.on('startGame', async () => { await new Game(io, socket).startGame(); });
        socket.on('message', (data) => new Game(io, socket).onMessage(data));
        socket.on('getPlayers', async () => { await new Game(io, socket).getPlayers(); });
        socket.on('connectedToPeer', () => new Game(io, socket).connectedToPeer());

        socket.on('getCurrentDrawer', () => new Game(io, socket).getCurrentDrawer());

    });
};
