var socket;

var c;
var otherC;

var appleX, appleY;
var gotApple = false;
var nickname = "";

const BACKGROUND_COLOR = 51;
const TILE_SIZE = 10;
const UPDATE_SPEED = 5;
const RESPAWN_TIME = 3;

var id;

var colors = [], other_xs = [[]], other_ys = [[]], ids = [], names = [], hiddens = [];

var currentLeader;
var currentLeaderLength;
var leaderLength;
var leader;

var s = new Snake();

function setup() {
    createCanvas(1280, 720);
    noStroke();
    background(BACKGROUND_COLOR);

    c = color(random(255), random(255), random(255));

    //socket = io.connect("http://localhost:3000");
    socket = io.connect("https://sna-multiplayer.herokuapp.com/");
    // socket.on('color', (data) => {
    //     otherC = color(data.r, data.g, data.b);
    // });
    //socket.emit('mouse', data);

    socket.on('id', (data) =>{
        this.id = data.id;
        console.log("My ID: " + this.id);
    })

    socket.on('disconnect', (data) =>{
        if(ids.indexOf(data) > -1){
            ids.splice(data, 1);
            colors.splice(data, 1);
            other_xs.splice(data, 1);
            other_ys.splice(data, 1);
            names.splice(data, 1);
            console.log("remov");
        }
    })

    socket.on('leader', (data) => {
        currentLeader = data.name;
        currentLeaderLength = data.length;
        console.log("Got leader");
    });

    if(!gotApple){
        console.log("Got apple");
        socket.on('apple', (data) =>{
            appleX = data.x;
            appleY = data.y;
        });

        gotApple = true;
    }

    socket.on('snakeData', (data) =>{
        if(this.ids.indexOf(data.id) == -1 && data.id != this.id){
            console.log(data);
            this.ids.push(data.id);
            console.log("ADDED: " + data.id);
            this.colors.push(color(data.r, data.g, data.b, data.a));
            console.log("Got name: " + data.name);
            names.push(data.name);
            this.hiddens.push(data.hidden);
            this.other_xs.push(data.x_posi);
            this.other_ys.push(data.y_posi);
        }else{
            let index = this.ids.indexOf(data.id);
            this.other_xs[index] = data.x_posi;
            this.other_ys[index] = data.y_posi;
            this.hiddens.push(data.hidden);
        }
    });

    socket.on('updateHidden', (data) => {
        let index = ids.indexOf(data.id);
        if(index > -1){
            hiddens[index] = data.hidden;
        }
    })

    socket.on('gained', (data) => {
        s.gain(data);
    });
    
    input = createInput();
    input.position(width / 2, height / 2);
    button = createButton("Submit");
    button.position(input.x + input.width, height / 2);
    button.mousePressed(goON);
    greeting = createElement('h2','Nickname: ');
    greeting.position(width / 2 + input.width / 4, height / 2 - input.height * 3);
    giveApple();
}

function goON(){
    s.init();
}

var input, button, greeting;

function keyPressed(){
    s.keyPressed(key, keyCode);
}

function draw() {
    background(BACKGROUND_COLOR);

    if(s.hitApple){
        hitApple();
    }

    leaderLength = 0;
    if(s.length > leaderLength){
        leader = nickname;
        leaderLength = s.length;
    }

    for(let i = 0; i < ids.length; i++){
        if(other_xs[i].length > leaderLength){
            leader = names[i];
            leaderLength = other_xs[i].length;
        }
    }

    let data = {name: leader, length: leaderLength}
    socket.emit('leader', data);

    s.show();
}

function hitApple(){
    socket.emit('hitApple', { hit: 1, x: floor(random(128)) * TILE_SIZE, y: floor(random(72)) * TILE_SIZE});
    s.hitApple = false;
}

function giveApple(){
    let appleData = {x: floor(random(128)) * TILE_SIZE, y: floor(random(72)) * TILE_SIZE}
    console.log("Client sent apple");
    socket.emit('apple', appleData);
}

function Snake(){
    this.x_pos = [];
    this.y_pos = [];

    this.length = 1;
    this.dir = [1, 0];

    this.dead = false;
    this.countdown = RESPAWN_TIME;
    this.timer = 0;
    this.hitApple = false;
    this.started = false;
    this.hidden = false;

    this.init = function(){
        nickname = input.value();
        input.remove();
        button.remove();
        greeting.remove();
        this.x_pos.push(floor(random(128)) * TILE_SIZE);
        this.y_pos.push(floor(random(72)) * TILE_SIZE);
        this.started = true;
        console.log("init");
    }

    this.show = function(){
        window.onblur = function(){
            this.hidden = true;
            let data = {hidden: this.hidden, id: id}
            socket.emit('updateHidden', data);
        }

        window.onfocus = function(){
            this.hidden = false;
            let data = {hidden: this.hidden, id: id}
            socket.emit('updateHidden', data);
        }

        if(!this.dead && this.started){
            //Movement and logic updating every few frames
            if(frameCount % UPDATE_SPEED == 0){
                let futureXPos = this.x_pos[0] + (this.dir[0] * TILE_SIZE);
                let futureYPos = this.y_pos[0] + (this.dir[1] * TILE_SIZE); 
    
                this.x_pos.splice(length - 1, 1);
                this.x_pos.unshift(futureXPos);
                this.y_pos.splice(length - 1, 1);
                this.y_pos.unshift(futureYPos);
    
                if(this.x_pos[0] < 0 || this.x_pos[0] >= width || this.y_pos[0] < 0 || this.y_pos[0] >= height){
                    this.dead = true;
                    this.timer = millis();
                }

                for(let i = 1; i < this.length; i++){
                    if(dist(this.x_pos[0], this.y_pos[0], this.x_pos[i], this.y_pos[i]) <= 0){
                        this.dead = true;
                        this.timer = millis();
                    }
                }

                if(dist(this.x_pos[0], this.y_pos[0], appleX, appleY) <= 0){
                    this.gain(4);
                    this.hitApple = true;
                }

                let snakeData = {x_posi: this.x_pos, y_posi: this.y_pos, r: red(c), g: green(c), b: blue(c), id: id, name: nickname, hidden: this.hidden}
                socket.emit('snakeData', snakeData);

                if(this.x_pos.length != this.length){
                    this.x_pos.push(this.x_pos[length - 1]);
                    this.y_pos.push(this.y_pos[length - 1]);
                }
            }
    
           //Show things
                
           if(other_xs.length > 0){
                for(let i = 0; i < other_xs.length; i++){
                    if(!hiddens[i]){
                        for(let j = 0; j < other_xs[i].length; j++){
                            if(dist(this.x_pos[0], this.y_pos[0], other_xs[i][j], other_ys[i][j]) <= 0){
                                let data = {id: ids[i], length: this.length}
                                socket.emit('hitOther', data);
                                this.dead = true;
                                this.timer = millis();
                            }
                        }
                    }
                }
            }

           for(let i = 0; i < ids.length; i++){
               if(!hiddens[i]){
                    fill(255);
                    textSize(15);
                    textAlign(CENTER);
                    text(names[i].toString(), other_xs[i][0], other_ys[i][0]);
                    fill(colors[i]);
                    for(let j = 0; j < other_xs[i].length; j++){
                        rect(other_xs[i][j], other_ys[i][j], TILE_SIZE, TILE_SIZE);
                    }
               }else{
                fill(color(255, 255, 255, 100));
                textSize(15);
                textAlign(CENTER);
                text(names[i].toString(), other_xs[i][0], other_ys[i][0]);
                fill(color(red(colors[i]), green(colors[i]), blue(colors[i]), 50));
                for(let j = 0; j < other_xs[i].length; j++){
                    rect(other_xs[i][j], other_ys[i][j], TILE_SIZE, TILE_SIZE);
                }
               }
           }

            for(let i = 0; i < this.length; i++){
                fill(c);
                rect(this.x_pos[i], this.y_pos[i], TILE_SIZE, TILE_SIZE);
            }

            textSize(15);
            textAlign(CENTER);
            fill(255);
            text(nickname, this.x_pos[0], this.y_pos[0] - 10);

            textSize(20);
            fill(255);
            textAlign(LEFT);
            text("Length: " + this.length, 15, 20);
            if(currentLeaderLength != null && currentLeader != null){
                text("Current leader: " + currentLeader + " - " + leaderLength, 15, 45);
            }

            if(appleX != null){
                fill(255, 255, 0);
                rect(appleX, appleY,TILE_SIZE, TILE_SIZE);
            }
        } else if(this.started && this.dead){
            //Countdown timer to respawn
            if(millis() - this.timer >= 1000){
                this.countdown -= 1;
                this.timer = millis();
            }

            textSize(25);
            textAlign(CENTER);
            fill(255);
            text("RESPAWN IN", width / 2, height / 2);
            text(this.countdown.toString(), width / 2, height / 2 + 40);

            if(this.countdown <= 0){
                this.timer = 0;
                this.countdown = RESPAWN_TIME;
                this.respawn();
            }
        }
    }

    this.gain = function(amt){
        this.length += amt;
    }

    this.respawn = function(){
        this.length = 1;
        this.x_pos = [];
        this.y_pos = [];

        this.dir = [1, 0];
        
        this.x_pos.push(floor(random(128)) * TILE_SIZE);
        this.y_pos.push(floor(random(72)) * TILE_SIZE);
        this.dead = false;
    }

    this.keyPressed = function(key, keyCode){
        if(key == 'W' || keyCode == UP_ARROW){
            if(this.length > 1){
                if(this.dir[1] != 1)
                    this.dir = [0, -1];
            }else{
                this.dir = [0, -1];
            }
        }else if(key == 'S' || keyCode == DOWN_ARROW){
            if(this.length > 1){
                if(this.dir[1] != -1)
                    this.dir = [0, 1];
            }else{
                this.dir = [0, 1];
            }
        }else if(key == 'A' || keyCode == LEFT_ARROW){
            if(this.length > 1){
                if(this.dir[0] != 1)
                    this.dir = [-1, 0];
            }else{
                this.dir = [-1, 0];
            }
        }else if(key == 'D' || keyCode == RIGHT_ARROW){
            if(this.length > 1){
                if(this.dir[0] != -1){
                    this.dir = [1, 0];
                }
            }else{
                this.dir = [1, 0];
            }
        }
    }
}
