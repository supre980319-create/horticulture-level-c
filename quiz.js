/*
  8歲也能看懂的版本：
  - 先把題庫(questions.json)讀進來
  - 按照比例抽出 100 題
  - 每題：正確1個 + 錯誤3個（中文名稱不同）
  - 記錄你的答案
*/
(function(){
  const nameKey  = "horti_player_name_v1";
  const sessionKey = "horti_session_v1";

  const qIndexEl = document.getElementById("qIndex");
  const timeEl   = document.getElementById("timeLeft");
  const imgEl    = document.getElementById("qImg");
  const optBox   = document.getElementById("options");
  const prevBtn  = document.getElementById("prevBtn");
  const nextBtn  = document.getElementById("nextBtn");
  const submitBtn= document.getElementById("submitBtn");
  const saveExitBtn = document.getElementById("saveExitBtn");

  const TOTAL_Q = 100;
  const TOTAL_SECONDS = 40 * 60;

  const pickRule = [
    ["fruit", 20],
    ["vegetables", 20],
    ["aquatic", 4],
    ["vine", 6],
    ["herbaceous", 20],
    ["shrub", 10],
    ["trees", 10],
    ["materials", 10],
  ];

  function shuffle(arr){
    const a = arr.slice();
    for(let i=a.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [a[i],a[j]] = [a[j],a[i]];
    }
    return a;
  }

  function groupByCategory(items){
    const map = {};
    for(const it of items){
      (map[it.category] ||= []).push(it);
    }
    return map;
  }

  function getChineseName(it){
    // 題庫欄位 name 就是中文名稱（不含編號）
    return (it.name || "").trim();
  }

  function pickQuestions(poolByCat){
    const picked = [];
    for(const [cat, n] of pickRule){
      const pool = poolByCat[cat] || [];
      if(pool.length < n){
        alert(`題庫不足：${cat} 需要 ${n} 題，但只有 ${pool.length} 題。\n請先補齊 questions.json`);
        throw new Error("Not enough questions");
      }
      picked.push(...shuffle(pool).slice(0,n));
    }
    return shuffle(picked); // 全部再洗牌
  }

  function pickWrongOptions(allItems, correctItem){
    // 錯誤選項：中文名稱不能跟正確一樣
    const correctName = getChineseName(correctItem);
    const candidates = allItems.filter(it => getChineseName(it) && getChineseName(it) !== correctName);
    const picked = [];
    const usedNames = new Set([correctName]);

    // 逐一找 3 個不同中文名稱
    for(const it of shuffle(candidates)){
      const nm = getChineseName(it);
      if(!usedNames.has(nm)){
        usedNames.add(nm);
        picked.push(it);
      }
      if(picked.length === 3) break;
    }
    if(picked.length < 3){
      throw new Error("Wrong options not enough (need more diverse names)");
    }
    return picked;
  }

  function makeQuestionSet(allItems){
    const byCat = groupByCategory(allItems);
    const chosen = pickQuestions(byCat);

    return chosen.map((correctItem, idx) => {
      const wrongItems = pickWrongOptions(allItems, correctItem);
      const options = shuffle([
        {text: getChineseName(correctItem), isCorrect: true},
        ...wrongItems.map(w => ({text: getChineseName(w), isCorrect:false}))
      ]);
      return {
        id: idx+1,
        image: correctItem.image,
        correctName: getChineseName(correctItem),
        options
      };
    });
  }

  function formatTime(sec){
    const m = Math.floor(sec/60);
    const s = sec%60;
    const mm = String(m).padStart(2,"0");
    const ss = String(s).padStart(2,"0");
    return `${mm}:${ss}`;
  }

  async function loadBank(){
    const res = await fetch("./questions.json", {cache:"no-store"});
    if(!res.ok) throw new Error("Cannot load questions.json");
    const data = await res.json();
    if(!Array.isArray(data)) throw new Error("questions.json must be an array");
    return data;
  }

  function saveSession(session){
    localStorage.setItem(sessionKey, JSON.stringify(session));
  }
  function loadSession(){
    const raw = localStorage.getItem(sessionKey);
    if(!raw) return null;
    try{ return JSON.parse(raw); }catch{ return null; }
  }

  function render(session){
    const q = session.questions[session.currentIndex];
    qIndexEl.textContent = String(session.currentIndex+1);
    imgEl.src = encodeURI(q.image);
    imgEl.onerror = ()=>{ imgEl.alt="圖片載入失敗（檢查 image URL）"; };

    optBox.innerHTML = "";
    q.options.forEach((op, i)=>{
      const btn = document.createElement("button");
      btn.className = "optionBtn";
      btn.textContent = `${String.fromCharCode(65+i)}. ${op.text}`;
      btn.addEventListener("click", ()=>{
        session.answers[session.currentIndex] = op.text;
        saveSession(session);
        render(session);
      });

      // 顯示已選
      if(session.answers[session.currentIndex] === op.text){
        btn.style.outline = "3px solid rgba(43,108,255,.35)";
        btn.style.borderColor = "#2b6cff";
      }
      optBox.appendChild(btn);
    });

    prevBtn.disabled = session.currentIndex===0;
    nextBtn.disabled = session.currentIndex===TOTAL_Q-1;
  }

  function grade(session){
    const results = session.questions.map((q, idx)=>{
      const chosen = session.answers[idx] || "";
      const ok = chosen === q.correctName;
      return {no: idx+1, correct: q.correctName, chosen, ok};
    });
    const score = results.filter(r=>r.ok).length; // 每題1分
    return {score, results};
  }

  function goResult(session){
    const name = localStorage.getItem(nameKey) || "未填寫";
    const {score, results} = grade(session);
    const payload = {name, score, results, finishedAt: Date.now()};
    localStorage.setItem("horti_result_v1", JSON.stringify(payload));
    location.href = "./result.html";
  }

  // --- main ---
  (async function init(){
    let session = loadSession();
    if(!session){
      const bank = await loadBank();

      // 最少要能湊滿 100 題
      if(bank.length < TOTAL_Q){
        alert(`題庫太少：目前只有 ${bank.length} 題，至少需要 100 題。\n你可以先用內建假題庫練習。`);
      }

      const questions = makeQuestionSet(bank);
      session = {
        startedAt: Date.now(),
        timeLeft: TOTAL_SECONDS,
        currentIndex: 0,
        questions,
        answers: Array(TOTAL_Q).fill("")
      };
      saveSession(session);
    }

    // 倒數計時
    let lastTick = Date.now();
    setInterval(()=>{
      const now = Date.now();
      const dt = Math.floor((now - lastTick)/1000);
      if(dt>0){
        lastTick = now;
        session.timeLeft = Math.max(0, (session.timeLeft || TOTAL_SECONDS) - dt);
        timeEl.textContent = formatTime(session.timeLeft);
        saveSession(session);
        if(session.timeLeft===0){
          goResult(session);
        }
      }
    }, 250);

    timeEl.textContent = formatTime(session.timeLeft || TOTAL_SECONDS);
    render(session);

    prevBtn.addEventListener("click", ()=>{
      session.currentIndex = Math.max(0, session.currentIndex-1);
      saveSession(session);
      render(session);
    });
    nextBtn.addEventListener("click", ()=>{
      session.currentIndex = Math.min(TOTAL_Q-1, session.currentIndex+1);
      saveSession(session);
      render(session);
    });

    submitBtn.addEventListener("click", ()=>{
      goResult(session);
    });

    saveExitBtn.addEventListener("click", ()=>{
      alert("已儲存！你可以回到首頁再按開始測驗繼續。");
      location.href="./index.html";
    });
  })().catch(err=>{
    console.error(err);
    alert("初始化失敗：" + err.message);
  });
})();
