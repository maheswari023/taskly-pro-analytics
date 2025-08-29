// Taskly Pro — Analytics Edition
const STORAGE = "taskly_pro_v2";
let tasks = [];
let theme = localStorage.getItem("theme")||"dark";

function uid(){return Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-4)}
function todayISO(){return new Date().toISOString()}

function save(){localStorage.setItem(STORAGE, JSON.stringify(tasks))}
function load(){tasks = JSON.parse(localStorage.getItem(STORAGE)||"[]")}

function setTheme(t){theme=t;localStorage.setItem("theme",t);document.documentElement.classList.toggle("light", t==="light")}
setTheme(theme);

// UI refs
const title = document.getElementById("title");
const due = document.getElementById("due");
const category = document.getElementById("category");
const addBtn = document.getElementById("addBtn");
const taskList = document.getElementById("taskList");
const search = document.getElementById("search");
const filterCategory = document.getElementById("filterCategory");
const filterStatus = document.getElementById("filterStatus");
const cleanBtn = document.getElementById("cleanBtn");
const anomaliesDiv = document.getElementById("anomalies");
const cleanLog = document.getElementById("cleanLog");
const insights = document.getElementById("insights");
const sqlInput = document.getElementById("sqlInput");
const runSql = document.getElementById("runSql");
const sqlOutput = document.getElementById("sqlOutput");
const exportCsvBtn = document.getElementById("exportCsvBtn");
const exportReportBtn = document.getElementById("exportReportBtn");
const loadSampleBtn = document.getElementById("loadSampleBtn");
const chartCategory = document.getElementById("chartCategory");
const chartCategorySelect = document.getElementById("chartCategory");

// Charts
let completionChart, categoryChart, activityChart;

function renderTasks(){
  taskList.innerHTML = "";
  const q = search.value.trim().toLowerCase();
  const fc = filterCategory.value;
  const fs = filterStatus.value;
  const filtered = tasks.filter(t=>{
    if(q && !t.title.toLowerCase().includes(q)) return false;
    if(fc!=='All' && t.category!==fc) return false;
    if(fs==='Open' && t.completed) return false;
    if(fs==='Done' && !t.completed) return false;
    return true;
  });
  if(filtered.length===0){taskList.innerHTML='<div class="muted">No tasks found</div>'; return}
  filtered.forEach(t=>{
    const el = document.createElement("div"); el.className="task";
    el.innerHTML = `<div>
      <div class="title">${escape(t.title)}</div>
      <div class="meta">${t.due?("Due "+t.due):""} • <span class="badge">${escape(t.category)}</span></div>
    </div>
    <div class="controls">
      <input type="checkbox" ${t.completed?"checked":""} onchange="toggle('${t.id}', this.checked)"/>
      <button class="btn ghost" onclick="del('${t.id}')">Delete</button>
    </div>`;
    taskList.appendChild(el);
  });
  renderInsights();
  renderCharts();
}

function escape(s){return String(s).replace(/[&<>"']/g, (m)=>({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[m]))}

window.toggle = function(id, done){ const it = tasks.find(t=>t.id===id); if(!it) return; it.completed=!!done; it.completedAt = done?todayISO():null; save(); renderTasks() }
window.del = function(id){ tasks = tasks.filter(t=>t.id!==id); save(); renderTasks() }

addBtn.addEventListener("click", ()=>{
  const t = title.value.trim(); if(!t) return alert("Add title");
  const obj = { id: uid(), title: t, category: category.value||"Uncategorized", due: due.value||"", createdAt: todayISO(), completed:false, completedAt:null };
  tasks.unshift(obj); save(); title.value=""; due.value=""; renderTasks();
})

// Data cleaning: remove duplicates, fix missing categories
cleanBtn.addEventListener("click", ()=>{
  const log = [];
  // fill missing category
  tasks.forEach(t=>{ if(!t.category) { t.category="Uncategorized"; log.push("Filled missing category for '"+t.title+"'") } });
  // remove duplicate (same title+category)
  const seen = new Set(); const unique = [];
  tasks.forEach(t=>{
    const k = (t.title||"").toLowerCase()+"|"+(t.category||"").toLowerCase();
    if(seen.has(k)){ log.push("Removed duplicate: "+t.title); }
    else{ seen.add(k); unique.push(t) }
  });
  tasks = unique;
  save();
  cleanLog.innerHTML = log.map(l=>`<li>${escape(l)}</li>`).join("") || "<li>No changes</li>";
  renderTasks();
})

// load sample
loadSampleBtn.addEventListener("click", ()=>{
  const sample = [
    {id:uid(), title:"Finish analytics report", category:"Work", due:"", createdAt:todayISO(), completed:false},
    {id:uid(), title:"Study SQL basics", category:"Study", due:"", createdAt:todayISO(), completed:false},
    {id:uid(), title:"Buy groceries", category:"Errands", due:"", createdAt:todayISO(), completed:true, completedAt:todayISO()},
    {id:uid(), title:"Workout", category:"Health", due:"", createdAt:todayISO(), completed:false}
  ];
  tasks = sample.concat(tasks);
  save(); renderTasks();
})

// insights & anomalies
function renderInsights(){
  const total = tasks.length;
  const done = tasks.filter(t=>t.completed).length;
  const rate = total?Math.round(done/total*100):0;
  const byCat = {};
  tasks.forEach(t=> byCat[t.category]=(byCat[t.category]||0)+1);
  const top = Object.keys(byCat).sort((a,b)=>byCat[b]-byCat[a])[0]||"—";
  insights.innerHTML = `<li>Total tasks: ${total}</li><li>Completed: ${done}</li><li>Completion rate: ${rate}%</li><li>Top category: ${escape(top)}</li>`;
  // anomalies: missing due, duplicates preview
  const missingDue = tasks.filter(t=>!t.due);
  const dupPreview = (function(){
    const m={};
    tasks.forEach(t=>{ const k=(t.title||"").toLowerCase()+"|"+(t.category||"").toLowerCase(); m[k]=(m[k]||0)+1 })
    return Object.entries(m).filter(([k,v])=>v>1).map(([k,v])=>k.split("|")[0]+" ("+v+" copies)");
  })();
  anomaliesDiv.innerHTML = `<div>Missing due dates: ${missingDue.length}</div><div>Potential duplicates: ${dupPreview.length?dupPreview.join(", "):"0"}</div>`;
}

// Charts (Chart.js)
function renderCharts(){
  const ctx1 = document.getElementById("completionChart").getContext("2d");
  const ctx2 = document.getElementById("categoryChart").getContext("2d");
  const ctx3 = document.getElementById("activityChart").getContext("2d");

  const catFilter = chartCategory.value;
  const filtered = catFilter==="All"?tasks:tasks.filter(t=>t.category===catFilter);

  const completed = filtered.filter(t=>t.completed).length;
  const open = filtered.length - completed;
  if(completionChart) completionChart.destroy();
  completionChart = new Chart(ctx1, {type:"doughnut", data:{labels:["Completed","Open"], datasets:[{data:[completed,open], backgroundColor:["#22c55e","#3b82f6"]}]}});

  const byCat = {}; tasks.forEach(t=> byCat[t.category]=(byCat[t.category]||0)+1);
  if(categoryChart) categoryChart.destroy();
  categoryChart = new Chart(ctx2, {type:"pie", data:{labels:Object.keys(byCat), datasets:[{data:Object.values(byCat), backgroundColor:["#4f8cff","#7dd3fc","#f472b6","#f59e0b","#34d399"]}]}});

  // activity last 7 days created count
  const dates = []; for(let i=6;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); dates.push(d.toISOString().slice(0,10)); }
  const act = dates.map(dt=> tasks.filter(t=> t.createdAt.slice(0,10)===dt).length );
  if(activityChart) activityChart.destroy();
  activityChart = new Chart(ctx3, {type:"bar", data:{labels:dates, datasets:[{label:"Tasks Added", data:act, backgroundColor:"#60a5fa"}]}});
}

// Simple SQL-like parser (supports SELECT * FROM tasks WHERE <conds> with AND/OR and = or LIKE)
function runQuery(q){
  try{
    q = q.trim();
    const m = q.match(/^SELECT\s+\*\s+FROM\s+tasks\s*(WHERE\s+(.+))?$/i);
    if(!m) throw "Only: SELECT * FROM tasks [WHERE ...] supported";
    const cond = m[2];
    let res = tasks.slice();
    if(cond){
      // tokenize simple AND/OR split
      const clauses = cond.split(/\s+(AND|OR)\s+/i);
      // evaluate left-to-right with AND/OR (no precedence)
      let current = res;
      let op = null;
      for(let i=0;i<clauses.length;i++){
        const part = clauses[i].trim();
        if(/^(AND|OR)$/i.test(part)){ op = part.toUpperCase(); continue; }
        // parse expr like field='value' or field=true or field LIKE '%x%'
        const m2 = part.match(/^([a-zA-Z_]+)\s*(=|LIKE)\s*'?\"?(.+?)'?\"?$/i);
        if(!m2) throw "Unsupported where clause: "+part;
        const field = m2[1]; const oper = m2[2].toUpperCase(); const val = m2[3];
        const matchFn = (t)=>{
          const v = (t[field]===undefined?String(t[field]):t[field]);
          if(oper==='=') return String(v)==val || String(v)==(val==='true'? 'true': val);
          if(oper==='LIKE') return String(v).toLowerCase().includes(val.replace(/%/g,'').toLowerCase());
          return false;
        };
        const filtered = tasks.filter(matchFn);
        if(op===null) current = filtered; else if(op==="AND") current = current.filter(x=> filtered.includes(x)); else if(op==="OR") current = Array.from(new Set(current.concat(filtered)));
        op = null;
      }
      res = current;
    }
    return res;
  }catch(e){ throw e }
}

runSql.addEventListener("click", ()=>{
  try{
    const out = runQuery(sqlInput.value||"SELECT * FROM tasks");
    sqlOutput.textContent = JSON.stringify(out, null, 2);
  }catch(e){ sqlOutput.textContent = "ERROR: "+e }
});
document.getElementById("resetSql").addEventListener("click", ()=>{ sqlInput.value=""; sqlOutput.textContent=""; })

// CSV export & report
function toCSV(arr){
  const cols = ["id","title","category","due","createdAt","completed","completedAt"];
  const lines = [cols.join(",")];
  arr.forEach(o=> lines.push(cols.map(c=> "\""+String(o[c]||"").replace(/\"/g,'""')+"\"").join(",")));
  return lines.join("\n");
}
exportCsvBtn.addEventListener("click", ()=>{
  const csv = toCSV(tasks);
  const blob = new Blob([csv], {type:"text/csv"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url; a.download="tasks_export.csv"; a.click();
  URL.revokeObjectURL(url);
});
exportReportBtn.addEventListener("click", ()=>{
  const total = tasks.length; const done = tasks.filter(t=>t.completed).length; const rate = total?Math.round(done/total*100):0;
  const report = `Taskly Pro — Analytics Report\nGenerated: ${new Date().toLocaleString()}\n\nTotal tasks: ${total}\nCompleted: ${done}\nCompletion rate: ${rate}%\n\nTop categories:\n` + Object.entries(tasks.reduce((acc,t)=>{acc[t.category]=(acc[t.category]||0)+1;return acc},{})).map(([k,v])=>`- ${k}: ${v}`).join("\n") + `\n\nAnomalies:\n` + (document.getElementById("anomalies").innerText||"None");
  const blob = new Blob([report], {type:"text/plain"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url; a.download="taskly_report.txt"; a.click();
  URL.revokeObjectURL(url);
})

// SQL quick example default
sqlInput.value = "SELECT * FROM tasks WHERE category = 'Work' AND completed = false";

// listeners
search.addEventListener("input", renderTasks);
filterCategory.addEventListener("change", renderTasks);
filterStatus.addEventListener("change", renderTasks);
document.getElementById("themeBtn").addEventListener("click", ()=> setTheme(theme==="dark"?"light":"dark"));
document.getElementById("clearBtn").addEventListener("click", ()=>{ if(confirm("Clear all tasks?")){ tasks=[]; save(); renderTasks() } });

// chart category filter
chartCategory.addEventListener("change", renderCharts);

// init
load();
renderTasks();
renderCharts();