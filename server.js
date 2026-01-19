
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const fs = require("fs");
const path = require("path");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const DATA_FILE = path.join(__dirname, "data", "rankings.json");

// Ensure data directory exists (Render-safe)
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let teams = {};

function load() {
  if (fs.existsSync(DATA_FILE)) {
    teams = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } else {
    teams = { "Team A": [], "Team B": [] };
    save();
  }
}

function save() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(teams, null, 2));
}

load();
app.use(express.static("public"));

wss.on("connection", ws => {
  ws.send(JSON.stringify({ type: "init", teams }));

  ws.on("message", msg => {
    const d = JSON.parse(msg);

    if (d.type === "addItem")
      Object.values(teams).forEach(t => t.push(d.item));

    if (d.type === "reorder")
      teams[d.team] = d.items;

    if (d.type === "addTeam") {
      const first = Object.keys(teams)[0];
      teams[d.name] = first ? JSON.parse(JSON.stringify(teams[first])) : [];
    }

    if (d.type === "renameTeam") {
      teams[d.newName] = teams[d.oldName];
      delete teams[d.oldName];
    }

    if (d.type === "deleteTeam")
      delete teams[d.name];

    if (d.type === "import")
      teams = d.teams;

    save();
    wss.clients.forEach(c => c.send(JSON.stringify({ type: "update", teams })));
  });
});

server.listen(process.env.PORT || 3000);
