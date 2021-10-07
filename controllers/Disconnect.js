const { getPlayersCount } = require('./helpers');

class Disconnect {
    constructor(io, socket) {
        this.io = io;
        this.socket = socket;
    }

    onDisconnect() {
        const { io, socket } = this;
        const { roomID } = socket;
        if (games[roomID]) {
            if (Number.isInteger(games[roomID][socket.id].score)) delete games[roomID][socket.id];            
            console.log(getPlayersCount(roomID), Number.isInteger(games[roomID].totalGuesses))
            if (getPlayersCount(roomID) < 2 && Number.isInteger(games[roomID].totalGuesses))
                delete games[roomID];
        }
        if (socket.player) {
            socket.player.id = socket.id;
            socket.to(socket.roomID).emit('disconnection', socket.player);
        }
    }
}

module.exports = Disconnect;