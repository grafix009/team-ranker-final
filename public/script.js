
const protocol = location.protocol === "https:" ? "wss" : "ws";
const socket = new WebSocket(`${protocol}://${location.host}`);
const lists = document.getElementById("lists");

socket.onmessage = e => {
  const d = JSON.parse(e.data);
  if (d.teams) render(d.teams);
};

function render(teams) {
  lists.innerHTML = "";
  for (const team in teams) {
    const div = document.createElement("div");
    div.className = "team";
    div.innerHTML = `<h4>${team}</h4>
      <button onclick="renameTeam('${team}')">Rename</button>
      <button onclick="deleteTeam('${team}')">Delete</button>`;

    const ul = document.createElement("ul");
let dragIndex = null;

teams[team].forEach((item, idx) => {
  const li = document.createElement("li");
  li.textContent = `${idx + 1}. ${item.text}`;
  li.draggable = true;

  li.addEventListener("dragstart", () => {
    dragIndex = idx;
  });

  ul.appendChild(li);
});

ul.addEventListener("dragover", (e) => {
  e.preventDefault();
});

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

  const updated = [...teams[team]];
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

function addItem() {
  socket.send(JSON.stringify({
    type:"addItem",
    item:{ text:text.value, number:num.value }
  }));
}

function addTeam() {
  socket.send(JSON.stringify({ type:"addTeam", name:teamName.value }));
}

function renameTeam(name) {
  const n = prompt("New name", name);
  if(n) socket.send(JSON.stringify({ type:"renameTeam", oldName:name, newName:n }));
}

function deleteTeam(name) {
  if(confirm("Delete "+name+"?"))
    socket.send(JSON.stringify({ type:"deleteTeam", name }));
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
