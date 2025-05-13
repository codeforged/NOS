
const net = require("net");

function matchTopic(topic, pattern) {
    const t = topic.split("/");
    const p = pattern.split("/");

    for (let i = 0; i < p.length; i++) {
        if (p[i] === "#") return true;
        if (p[i] === "+") continue;
        if (!t[i] || t[i] !== p[i]) return false;
    }
    return t.length === p.length;
}

const PORT = 1884;
const HOST = "0.0.0.0";

let subscribers = []; // each: { socket, topics: Set<string> }

const server = net.createServer((socket) => {
    socket.setEncoding("utf8");
    let buffer = "";

    socket.on("data", (data) => {
        buffer += data;
        const lines = buffer.split("\n");
        buffer = lines.pop();

        // console.log(`>> ${data}`)
        for (const line of lines) {
            const parts = line.trim().split(";");
            if (parts.length === 2) {
                const [encodedTopic, encodedMsg] = parts;
                const topic = Buffer.from(encodedTopic, "base64").toString("utf8");
                const msg = Buffer.from(encodedMsg, "base64").toString("utf8");

                let done = 0;
                for (const sub of subscribers) {
                    for (const pattern of sub.topics) {
                        if (matchTopic(topic, pattern)) {
                            try {
                                sub.socket.write(`${encodedTopic};${encodedMsg}\n`);
                                console.log(`&&${topic} >> ${msg}`)
                                done = 1;
                                break;
                            } catch { }
                        }
                    }
                }
            } else if (parts.length === 1 && parts[0].startsWith("SUB:")) {
                const topic = parts[0].substring(4);
                // console.log(`Ada yang subscribe: ${topic}`);
                const sub = subscribers.find(s => s.socket === socket);
                if (sub) {
                    sub.topics.add(topic);
                } else {
                    subscribers.push({ socket, topics: new Set([topic]) });
                }
            }
        }
    });

    socket.on("close", () => {
        subscribers = subscribers.filter(s => s.socket !== socket);
    });

    socket.on("error", () => {
        subscribers = subscribers.filter(s => s.socket !== socket);
    });
});

server.listen(PORT, HOST, () => {
    console.log(`🚀 MiniBrokerTCP listening on tcp://${HOST}:${PORT}`);
});

