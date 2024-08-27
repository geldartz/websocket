import WebSocket, { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });


const channels = new Map();

wss.on('connection', function connection(ws) {
    ws.subscribedChannels = new Set();

    // Handle incoming messages
    ws.on('message', function message(data) {
        const parsedData = JSON.parse(data);
        const { action, channel, message } = parsedData;

        switch (action) {
            case 'subscribe':
                if (!channels.has(channel)) {
                    channels.set(channel, new Set());
                }
                channels.get(channel).add(ws);
                ws.subscribedChannels.add(channel);
                break;

            case 'unsubscribe':
                if (channels.has(channel)) {
                    channels.get(channel).delete(ws);
                    if (channels.get(channel).size === 0) {
                        channels.delete(channel);
                    }
                }
                ws.subscribedChannels.delete(channel);
                break;

            case 'message':
                if (channels.has(channel)) {
                    channels.get(channel).forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ channel, message }));
                        }
                    });
                }
                break;

            default:
                console.error('Unknown action:', action);
        }
    });

    ws.on('close', function close() {
        ws.subscribedChannels.forEach(channel => {
            if (channels.has(channel)) {
                channels.get(channel).delete(ws);
                if (channels.get(channel).size === 0) {
                    channels.delete(channel);
                }
            }
        });
    });
});

console.log('WebSocket server is running on ws://localhost:8080');


