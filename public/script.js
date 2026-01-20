const protocol = location.protocol === "https:" ? "wss" : "ws";
const socket = new WebSocket(`${protocol}://${location.host}`);

const lists = document.getElementById("lists");

// ✅ GLOBAL STATE (THIS WAS MISSING)
let currentTeams = {};

socket.onmessage = (e) => {
  const data = JSON.parse(e.data);
  if (data.teams) {
    currentTeams = data.teams;
    renderTeams();
  }
};

// =======================
// RENDER
// =======================
function renderTeams() {
  lists.innerHTML = "";

  for (const team in currentTeams) {
    const div = document.createElement("div");
    div.className = "team";

    div.innerHTML = `
      <h4>${team}</h4>
      <button onclick="renameTeam('${team}')">Rename</button>
      <button onclick="deleteTeam('${team}')">Delete</button>
    `;

    const ul = document.createElement("ul");
    let dragIndex = null;

    currentTeams[team].forEach((item, idx) => {
      const li = document.createElement("li");
      li.textContent = `${idx + 1}. ${item.text}`;
      li.draggable = true;

      li.addEventListener("dragstart", () => {
        dragIndex = idx;
      });

      ul.appendChild(li);
    });

    // ✅ DRAG OVER
    ul.addEventListener("dragover", (e) => {
      e.preventDefault();
    });

    // ✅ DROP (PRECISE)
    ul.addEventListener("drop", (e) => {
      e.preventDefault();
      if (dragIndex === null) return;

      const items = Array.from(ul.children);
      let dropIndex = items.length;

      for (let i = 0; i < items.length; i++) {
        const rect = items[i].getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;

        if (e.clientY < midpoint) {
          dropIndex = i;
          break;
        }
      }

      if (dropIndex === dragIndex) return;

      const updated = [...currentTeams[team]];
      const [moved] = updated.splice(dragIndex, 1);
      updated.splice(dropIndex, 0, moved);

      socket.send(JSON.stringify({
        type: "reorder",
        team,
        items: updated
      }));

      dragIndex = null;
    });

    div.appendChild(ul);
    lists.appendChild(div);
  }
}

// =======================
// ACTIONS
// =======================
function addItem() {
  socket.send(JSON.stringify({
    type: "addItem",
    item: {
      text: document.getElementById("text").value,
      number: document.getElementById("num").value
    }
  }));
}

function addTeam() {
  const name = document.getElementById("teamName").value.trim();
  if (!name) return alert("Enter a team name");
  socket.send(JSON.stringify({ type: "addTeam", name }));
  document.getElementById("teamName").value = "";
}

function renameTeam(oldName) {
  const newName = prompt("New team name:", oldName);
  if (!newName) return;
  socket.send(JSON.stringify({
    type: "renameTeam",
    oldName,
    newName
  }));
}

function deleteTeam(name) {
  if (!confirm(`Delete ${name}?`)) return;
  socket.send(JSON.stringify({
    type: "deleteTeam",
    name
  }));
}


function exportCSV() {
  let csv = "";
  Object.entries(window.lastTeams || {}).forEach(([t,items])=>{
    csv += t + "\n";
    items.forEach((i,x)=> csv += `${x+1},${i.text}\n`);
    csv += "\n";
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv]));
  a.download = "rankings.csv";
  a.click();
}

function importCSV(e) {
  const r = new FileReader();
  r.onload = () => {
    const lines = r.result.split("\n");
    let teams={}, current=null;
    lines.forEach(l=>{
      if(!l.includes(",")) current=l.trim(), teams[current]=[];
      else {
        const [,text] = l.split(",");
        teams[current].push({text});
      }
    });
    socket.send(JSON.stringify({ type:"import", teams }));
  };
  r.readAsText(e.target.files[0]);
}
