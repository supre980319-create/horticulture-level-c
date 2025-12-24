(function(){
  const totalKey = "horti_total_players_v1";
  const nameKey  = "horti_player_name_v1";

  const totalEl = document.getElementById("totalPlayers");
  const inputEl = document.getElementById("playerName");
  const startBtn= document.getElementById("startBtn");

  // 讀取累計人數
  const total = Number(localStorage.getItem(totalKey) || 0);
  totalEl.textContent = String(total);

  // 讀取上次名字
  inputEl.value = localStorage.getItem(nameKey) || "";

  startBtn.addEventListener("click", ()=>{
    const name = (inputEl.value || "").trim() || "未填寫";
    localStorage.setItem(nameKey, name);

    // 累計 +1
    const newTotal = Number(localStorage.getItem(totalKey) || 0) + 1;
    localStorage.setItem(totalKey, String(newTotal));

    // 進入作答頁
    location.href = "./quiz.html";
  });
})();