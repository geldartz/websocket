import express from 'express';
import { createServer } from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));


server.timeout = 10800000;
const wss = new WebSocketServer({ server });

const channels = new Map();

wss.on('connection', function connection(ws) {
    ws.subscribedChannels = new Set();

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

server.listen(8080, () => {
    console.log('Server is listening on http://localhost:8080');
});