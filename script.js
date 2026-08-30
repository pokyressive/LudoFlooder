class LudoFlooder {
    #url = "://common.marketjs-multiplayer.com:2505/socket.io/?EIO=3&transport=";
    #interval;
    constructor() {
        this.bots = [];
    }

    async spawnBots(amount) {
        console.log(`]CLUSTER Spawning ${amount} multiplayer bot(s)...`)
        var bots = [];
        for (let i = 0; i < amount; i++) {
            try {
                bots.push(this._createBotSession(await this._initializeBot()));
                console.log(`]CLUSTER Progress: ${bots.length} / ${amount} successfully initialized`);
            } catch (err) {
                console.log("]CLUSTER Failed to initialize a bot:", err);
            }
        }
        console.log(`]CLUSTER Initialization complete. All ${amount} bot(s) are active.`);
        this.bots.push(...bots);
    }

    autoFlood(name, avatarId) {
        clearInterval(this.#interval);
        this.#interval = setInterval(() => {
            this.bots.forEach(bot => {
                if (!bot.room.onroomupdate) this.monitorRoomState(bot, null, name);
                if (bot.ws.readyState === WebSocket.OPEN && bot.room.id == null && !bot.room.gameStarted) bot.room.play(name, undefined, avatarId);
            });
        }, 1000);
    }

    stopFlood() {
        clearInterval(this.#interval);
        this.removeBotsFromRoom();
    }

    terminateBotSessions() {
        this.bots.forEach(bot => bot.ws.close());
        this.bots = [];
    }

    async deployBotsToRoom(name, roomId) {
        this.bots.forEach(bot => {
            this.monitorRoomState(bot, roomId);
            bot.room.play(name);
        });
    }

    removeBotsFromRoom() {
        this.bots.forEach(bot => {
            bot.room.leaveRoom();
        });
    }

    monitorRoomState(bot, roomId, name) {
        var index = this.bots.findIndex(e => e === bot);
        bot.room.onroomupdate = (room) => {
            if (room.players) {
                if (!bot.room.gameStarted) return;
                if (room.players.every(obj => obj.name === name)) {
                    console.log(`]BOT Evacuating bot ${index}: Room contains only bots`);
                    bot.room.leaveRoom();
                } else if (room.players.length === 1) {
                    console.log(`]BOT Evacuating bot ${index}: Room is empty`);
                    bot.room.leaveRoom();
                }
            } else if (room.id != null) {
                if (roomId) {
                    if (room.id !== roomId) {
                        console.log(`]BOT Bot ${index} failed to join target room. Left room: ${room.id}`);
                        bot.room.leaveRoom();
                    } else {
                        console.log(`]BOT Bot ${index} successfully joined the target room!`)
                    }
                } else {
                    console.log(`]BOT Bot ${index} joined room: ${room.id}`);
                }
            }
        }
    }
    _createBotSession(bot) {
        var session = {
            ws: bot,
            room: {
                players: [],
                id: null,
                gameStarted: false,
                size: null,
                onroomupdate: null,
                leaveRoom() {
                    session.room.gameStarted = false;
                    if (session.ws.readyState === WebSocket.OPEN) session.ws.send('42["mjs_msg",{"type":22}]');
                    session.room.players = [];
                    session.room.id = null;
                    session.room.size = null;
                },
                play(playerName, roomSize = Math.random() > 0.75 ? 2 : 4, avatarId = 6) {
                    if (session.ws.readyState !== WebSocket.OPEN) return false;
                    session.ws.send(`42["mjs_msg",{"type":20,"data":{"playerName":"${playerName}","avatarId":${avatarId},"roomSize":${roomSize},"clientVersion":1}}]`);
                    session.room.size = roomSize;
                    return true;
                }
            }
        };
        bot.addEventListener('message', event => {
            var parsed = this._parseSocketIO(event.data);
            if (!parsed) return;
            if (parsed.type === 5) {
                session.room.id = parsed.data.roomId;
                if (session.room.onroomupdate) session.room.onroomupdate({id: parsed.data.roomId});
            } else if (parsed.type === 4) {
                session.room.players = parsed.data.gameState;
                if (session.room.onroomupdate) session.room.onroomupdate({players: parsed.data.gameState});
            } else if (parsed.type === 52 && parsed.data.colorID != null) {
                session.room.gameStarted = true;
                session.room.players = parsed.data.data;
                if (session.room.onroomupdate) session.room.onroomupdate({players: parsed.data.data});
            }
        });
        return session;
    }
    async _initializeBot() {
        try {
            var response = await fetch("https" + this.#url + "polling");
            var rawText = await response.text();
            var jsonStart = rawText.indexOf('{');
            var jsonEnd = rawText.lastIndexOf('}') + 1;
            if (jsonStart === -1 || jsonEnd === -1) {
                console.error(`]INIT Failed to parse handshake. Missing valid JSON payload. Raw response: ${rawText}`);
                return null;
            }
            var handshakeData = JSON.parse(rawText.slice(jsonStart, jsonEnd));
            return new Promise((resolve, reject) => {
                var bot = new WebSocket("wss" + this.#url + "websocket&sid=" + handshakeData.sid);
                bot.onopen = () => {
                    bot.send("2probe");
                    bot.onopen = null;
                };
                bot.onmessage = msg => {
                    if (msg.data === "3probe") {
                        bot.send("5");
                        console.log(`]INIT ${handshakeData.sid} -> Protocol upgrade successful. Connection active.`);
                        this._startHeartbeat(bot);
                        bot.onmessage = null;
                        resolve(bot);
                    }
                };
                bot.onerror = err => {
                    console.error(`]BOT ${handshakeData.sid} -> WebSocket error encountered:`, err);
                    reject(err);
                };
                bot.onclose = () => {
                    console.log(`]BOT ${handshakeData.sid} -> Connection closed.`);
                };
            });
        } catch (err) {
            console.error("]INIT Engine.io initial handshake request aborted:", err);
            return null;
        }
    }
    // heartbeat to prevent bots from getting closed by server
    _startHeartbeat(bot) {
        setInterval(() => {
            if (bot.readyState === WebSocket.OPEN) {
                bot.send("2");
            }
        }, 20000)
    }
    _parseSocketIO(raw) {
        // check if it starts with the socket.io event prefix
        if (raw.startsWith('42')) {
            var payload = JSON.parse(raw.slice(2))[1];
            return payload;
        }
    }
}

var ludo = new LudoFlooder;
