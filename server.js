var express = require('express');

var app = express();
var server = app.listen(process.env.PORT || 3000);

app.use(express.static('public'))

var socket = require('socket.io');
var io = socket(server);

var appleOut = false;
this.appleX = 0;
this.appleY = 0;

io.sockets.on('connection', (socket) =>{

    console.log(socket.id + " connected")

    socket.emit('id', {id: socket.id});

    if(!appleOut){
        socket.on('apple', (data) => {     
            console.log(data);
            this.appleX = data.x;
            this.appleY = data.y;
            io.sockets.emit('apple', data);
            appleOut = true;
        });
    }

    if(appleOut){
        let appleData = {x: this.appleX, y: this.appleY}
        io.sockets.emit('apple', appleData);
    }

    socket.on('hitApple', (data) =>{
        if(data.hit == 1){
            appleOut = false;
        }
        newApple(data);
    })

    socket.on('disconnect', (data) => {
        console.log(socket.id + " disconnected");
        io.sockets.emit('disconnect', socket.id);
    })
    
    socket.on('snakeData', (data) => {
        let newData= {x_posi: data.x_posi, y_posi: data.y_posi, id: data.id, name: data.name, r: data.r, g: data.g, b:data.b, a: 100, hidden: data.hidden}
        socket.broadcast.emit('snakeData', newData);
    })

    socket.on('leader', (data) => {
        io.sockets.emit('leader', data);
    })

    socket.on('hitOther', (data) => {
        io.to(data.id).emit('gained', data.length);
    });

    socket.on('updateHidden', (data) => {
        socket.broadcast.emit('updateHidden', data);
    });

});
function newApple(data){
    this.appleX = data.x;
    this.appleY = data.y;
    io.sockets.emit('apple', data);
    appleOut = true;
}