(function(){
  const dataKey = "horti_result_v1";
  const sessionKey = "horti_session_v1";

  const nameEl = document.getElementById("rName");
  const scoreEl= document.getElementById("rScore");
  const tableEl= document.getElementById("rTable");
  const retryBtn= document.getElementById("retryBtn");
  const homeBtn = document.getElementById("backHomeBtn");

  const raw = localStorage.getItem(dataKey);
  if(!raw){
    alert("找不到結果，可能還沒作答。");
    location.href="./index.html";
    return;
  }
  const d = JSON.parse(raw);
  nameEl.textContent = d.name || "未填寫";
  scoreEl.textContent= String(d.score ?? 0);

  tableEl.innerHTML = "";
  d.results.forEach(r=>{
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.no}</td>
      <td>${(r.chosen||"").replaceAll("<","&lt;")}</td>
      <td>${(r.correct||"").replaceAll("<","&lt;")}</td>
      <td class="${r.ok ? "correct":"wrong"}">${r.ok ? "✔" : "✘"}</td>
    `;
    tableEl.appendChild(tr);
  });

  retryBtn.addEventListener("click", ()=>{
    localStorage.removeItem(sessionKey);
    location.href="./quiz.html";
  });
  homeBtn.addEventListener("click", ()=>{
    localStorage.removeItem(sessionKey);
    location.href="./index.html";
  });
})();