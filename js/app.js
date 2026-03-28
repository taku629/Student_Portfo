/* =============================================
   Student Portfo — Application Logic
   ============================================= */

// ─── State ───
let portfolio = JSON.parse(localStorage.getItem('studentPortfo')) || [];
let detectedAssets = [];
let allocationChart = null;
let simulatorChart = null;
let updateCount = parseInt(localStorage.getItem('studentPortfoUpdates') || '0');

// ─── Chart Colors ───
const CHART_COLORS = [
  '#00ff9d', '#00b8ff', '#6c5ce7', '#ff8c00',
  '#e84393', '#00d2d3', '#f368e0', '#ff6b6b',
  '#48dbfb', '#feca57', '#1dd1a1', '#5f27cd',
  '#54a0ff', '#ff9ff3', '#c8d6e5', '#8395a7'
];

// ─── Splash Screen ───
function initSplash() {
  const bar = document.querySelector('.splash-bar-fill');
  if (!bar) return;

  requestAnimationFrame(() => {
    bar.style.width = '80%';
  });

  setTimeout(() => {
    bar.style.width = '100%';
    setTimeout(() => {
      document.querySelector('.splash').classList.add('fade-out');
    }, 300);
  }, 800);
}

// ─── Particle Background ───
function initParticles() {
  const canvas = document.getElementById('particleCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let particles = [];
  let animationId;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  resize();
  window.addEventListener('resize', resize);

  class Particle {
    constructor() {
      this.reset();
    }

    reset() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.size = Math.random() * 2 + 0.5;
      this.speedX = (Math.random() - 0.5) * 0.3;
      this.speedY = (Math.random() - 0.5) * 0.3;
      this.opacity = Math.random() * 0.4 + 0.1;
      this.hue = Math.random() > 0.5 ? 157 : 200; // green or blue
    }

    update() {
      this.x += this.speedX;
      this.y += this.speedY;

      if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
      if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${this.hue}, 100%, 70%, ${this.opacity})`;
      ctx.fill();
    }
  }

  // Create particles (fewer on mobile)
  const count = window.innerWidth < 640 ? 40 : 80;
  for (let i = 0; i < count; i++) {
    particles.push(new Particle());
  }

  function connectParticles() {
    const maxDist = 120;
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < maxDist) {
          const opacity = (1 - dist / maxDist) * 0.08;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(0, 255, 157, ${opacity})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.update();
      p.draw();
    });
    connectParticles();
    animationId = requestAnimationFrame(animate);
  }

  animate();
}

// ─── Navbar Scroll Effect ───
function initNavScroll() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });
}

// ─── Toast Notifications ───
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const icons = {
    success: '✅',
    error: '❌',
    info: '💡'
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || '✅'}</span>
    <span class="toast-message">${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// ─── Gemini API Key Management ───
function getApiKey() {
  return localStorage.getItem('geminiApiKey') || '';
}

function saveApiKey(key) {
  localStorage.setItem('geminiApiKey', key.trim());
}

function showApiKeyDialog() {
  const existing = getApiKey();
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'apiKeyModal';
  modal.innerHTML = `
    <div class="modal-content">
      <h3>🔑 Gemini API Key 設定</h3>
      <p class="modal-desc">
        スクショ読み取りにはGoogle Gemini APIを使用します。<br>
        <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">Google AI Studio</a> で無料のAPI Keyを取得してください。
      </p>
      <div class="input-group">
        <label class="input-label">API Key</label>
        <input type="password" id="apiKeyInput" value="${existing}" placeholder="AIzaSy...">
      </div>
      <div style="display:flex; gap:10px; margin-top:16px;">
        <button class="btn-primary" style="flex:1" onclick="confirmApiKey()">保存</button>
        <button class="btn-secondary" style="flex:1" onclick="closeModal()">キャンセル</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  // Focus the input
  setTimeout(() => document.getElementById('apiKeyInput').focus(), 100);
}

function confirmApiKey() {
  const key = document.getElementById('apiKeyInput').value.trim();
  if (key) {
    saveApiKey(key);
    showToast('API Key を保存しました', 'success');
  }
  closeModal();
}

function closeModal() {
  const modal = document.getElementById('apiKeyModal');
  if (modal) modal.remove();
}

// ─── File to Base64 ───
function fileToBase64(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      // Remove the data URL prefix (data:image/xxx;base64,)
      const base64 = e.target.result.split(',')[1];
      resolve(base64);
    };
    reader.readAsDataURL(file);
  });
}

// ─── OCR via Gemini API ───
async function startOCR() {
  const apiKey = getApiKey();
  if (!apiKey) {
    showApiKeyDialog();
    return;
  }

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';

  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const overlay = document.getElementById('ocrOverlay');
    const titleEl = document.getElementById('ocrProgressTitle');
    const descEl = document.getElementById('ocrProgressDesc');
    const progressEl = document.getElementById('ocrProgressBar');

    if (overlay) overlay.classList.add('show');
    if (titleEl) titleEl.textContent = '⏳ スキャン準備中...';
    if (descEl) descEl.textContent = '画像を読み込んでいます';
    if (progressEl) progressEl.style.width = '2%';

    let fakeProgress = 2;
    const progressInterval = setInterval(() => {
      if (fakeProgress < 90) {
        fakeProgress += (90 - fakeProgress) * 0.05;
        if (progressEl) progressEl.style.width = Math.floor(fakeProgress) + '%';
      }
    }, 400);

    try {
      const base64Image = await fileToBase64(file);
      const mimeType = file.type || 'image/jpeg';
      
      if (titleEl) titleEl.textContent = '🌟 AIに接続中...';
      if (descEl) descEl.textContent = 'Google Gemini と通信しています';

      if (titleEl) titleEl.textContent = '🔍 画像から資産を解析中...';
      if (descEl) descEl.textContent = '銘柄、数量、価格を抽出しています（約5〜10秒）';

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                {
                  text: `この画像は証券会社のアプリまたはWebサイトのスクリーンショットです。一覧に含まれる「投資商品（国内株式、米国株式、投資信託など）」の保有情報を抽出してください。

以下のJSON配列形式のみを出力してください（Markdownの修飾や他のテキストは一切含めないでください）：
[
  {
    "type": "stock または mutual_fund",
    "name": "銘柄名",
    "quantity": 100,
    "buy_price": 1650.0,
    "unit_price": 1369.0
  }
]

【抽出ルール】
0. type (種類): 個別株やETFなら "stock"、投資信託なら "mutual_fund" を指定してください。（「口」単位のものは投資信託です）
1. name (銘柄名): 証券コードや「国内株式」「NISA」などのカテゴリ名を除外した、純粋な企業名・ファンド名のみを抽出してください。（例：「国内株式 6571 キューピーネット HLDGS」→「キューピーネット HLDGS」）
2. quantity (数量): 保有している株数・口数を数値で取得します。（例：「100 株」「1,253 口」→ 100や1253。カンマは除外すること）
3. buy_price (取得単価・平均取得価額): 該当の資産を「いくらで購入したか」の単価を数値で取得してください。（現在値とは異なります）
4. unit_price (現在の単価): **「評価額（保有数×単価）」ではなく、必ず1株・1万口あたりの「現在値（現在価格）」**を数値で取得してください。（例：現在値が1,199.00円、評価額が136,900円の場合、必ず 1199.0 とする）`
                },
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: base64Image
                  }
                }
              ]
            }]
          })
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        console.error("API Response Error:", response.status, errData);

        if (response.status === 400) {
          showToast('API Keyの形式が間違っているか、無効です。設定を確認してください。', 'error');
          showApiKeyDialog();
          return;
        } else if (response.status === 403) {
          showToast('API Keyへのアクセスが拒否されました。正しいAPI Keyか確認してください。', 'error');
          showApiKeyDialog();
          return;
        } else if (response.status === 429) {
          showToast('🔄 APIの利用制限に達しました。約1分ほど待ってからもう一度お試しください！', 'error');
          return;
        }
        if (response.status === 503) {
          throw new Error('現在AIの利用が非常に混み合っています。数秒待ってからもう一度お試しください！');
        }
        
        throw new Error(errData.error?.message || `API error: ${response.status}`);
      }
      
      if (titleEl) titleEl.textContent = '✅ 解析完了！整理中...';
      if (descEl) descEl.textContent = '抽出したデータをリスト化しています';
      if (progressEl) progressEl.style.width = '100%';

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      console.log('Gemini Response:', text);

      // Parse JSON from response (handle markdown code blocks)
      let jsonStr = text.trim();
      // Remove markdown code block if present
      jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim();

      let parsedAssets = [];
      try {
        parsedAssets = JSON.parse(jsonStr);
      } catch (parseErr) {
        console.error('JSON parse error:', parseErr, 'Raw:', jsonStr);
        showToast('AIの応答を解析できませんでした。もう一度お試しください。', 'error');
        return;
      }

      if (!Array.isArray(parsedAssets) || parsedAssets.length === 0) {
        showToast('投資商品を検出できませんでした。', 'error');
        return;
      }

      // Map to our format
      detectedAssets = parsedAssets.map(a => ({
        type: a.type === 'mutual_fund' ? 'mutual_fund' : 'stock',
        name: String(a.name || '').trim(),
        quantity: parseFloat(a.quantity) || 0,
        currentPrice: parseFloat(a.unit_price || a.price) || 0,
        buyPrice: parseFloat(a.buy_price) || parseFloat(a.unit_price || a.price) || 0
      })).filter(a => a.name.length > 0 && a.name !== "null" && a.name !== "undefined");

      if (detectedAssets.length > 0) {
        let html = `<p class="detected-hint" style="border-color: rgba(0,255,157,0.3); color: var(--primary); background: rgba(0,255,157,0.06);">✅ AIが ${detectedAssets.length}件の投資商品を検出しました。内容を確認して追加してください。</p>`;
        html += `<button class="btn-primary" onclick="addAllAssets()" style="width: 100%; margin-bottom: 15px; padding: 12px; font-weight: bold; border-radius: 8px;">✅ リストのすべての資産を一気に追加する</button>`;
        detectedAssets.forEach((asset, index) => {
          html += `
            <div class="detected-item-editable" style="animation-delay: ${index * 0.05}s">
              <div class="detected-fields">
                <div class="detected-field-row">
                  <div class="detected-field">
                    <label class="detected-field-label">種類</label>
                    <select id="det-type-${index}" class="detected-input" style="padding: 8px;">
                      <option value="stock" ${asset.type !== 'mutual_fund' ? 'selected' : ''} style="color:#000;">個別株・ETF (1株)</option>
                      <option value="mutual_fund" ${asset.type === 'mutual_fund' ? 'selected' : ''} style="color:#000;">投資信託 (1万口)</option>
                    </select>
                  </div>
                </div>
                <div class="detected-field">
                  <label class="detected-field-label">銘柄名</label>
                  <input type="text" id="det-name-${index}" value="${asset.name}" class="detected-input detected-input-name" placeholder="銘柄名を入力">
                </div>
                <div class="detected-field-row">
                  <div class="detected-field">
                    <label class="detected-field-label">数量</label>
                    <input type="number" id="det-qty-${index}" value="${asset.quantity}" class="detected-input detected-input-small" placeholder="数量">
                  </div>
                  <div class="detected-field">
                    <label class="detected-field-label">取得単価(¥)</label>
                    <input type="number" id="det-buy-${index}" value="${asset.buyPrice}" class="detected-input detected-input-small" placeholder="取得単価">
                  </div>
                  <div class="detected-field">
                    <label class="detected-field-label">現在単価(¥)</label>
                    <input type="number" id="det-price-${index}" value="${asset.currentPrice}" class="detected-input detected-input-small" placeholder="現在単価">
                  </div>
                </div>
              </div>
              <button class="btn-add-detected" onclick="addSingleAsset(${index})">＋ 追加</button>
            </div>`;
        });
        document.getElementById('detectedItems').innerHTML = html;
        document.getElementById('detectedList').classList.add('show');
        if (window.confetti) confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        showToast(`${detectedAssets.length}件検出！ 内容を確認して追加してください`, 'success');
      } else {
        showToast('投資商品を検出できませんでした。', 'error');
      }
    } catch (err) {
      console.error('OCR Error:', err);
      showToast('画像の解析に失敗しました: ' + err.message, 'error');
      if (titleEl) titleEl.textContent = '❌ エラーが発生しました';
      if (descEl) descEl.textContent = err.message;
    } finally {
      clearInterval(progressInterval);
      setTimeout(() => {
        if (overlay) overlay.classList.remove('show');
        if (progressEl) setTimeout(() => progressEl.style.width = '0%', 400);
      }, 700);
    }
  };
  input.click();
}

// ─── Add Assets ───
function addSingleAsset(index, suppressRender = false) {
  // Read from editable input fields (user may have corrected OCR errors)
  const typeEl = document.getElementById(`det-type-${index}`);
  const nameEl = document.getElementById(`det-name-${index}`);
  const qtyEl = document.getElementById(`det-qty-${index}`);
  const buyEl = document.getElementById(`det-buy-${index}`);
  const priceEl = document.getElementById(`det-price-${index}`);

  if (!nameEl || !qtyEl || !priceEl) return;
  const type = typeEl ? typeEl.value : 'stock';

  const name = nameEl.value.trim();
  const quantity = parseFloat(qtyEl.value) || 100;
  const currentPrice = parseFloat(priceEl.value) || 0;
  const buyPrice = buyEl ? (parseFloat(buyEl.value) || currentPrice) : currentPrice;

  if (!name) {
    showToast('銘柄名を入力してください', 'error');
    return;
  }
  if (currentPrice <= 0) {
    showToast('単価を正しく入力してください', 'error');
    return;
  }

  portfolio.push({
    id: Date.now() + Math.random(),
    type: type,
    name: name,
    quantity: quantity,
    buyPrice: buyPrice,
    currentPrice: currentPrice,
    purchaseDate: new Date().toISOString()
  });

  // Gray out the added item
  const itemEl = nameEl.closest('.detected-item-editable');
  if (itemEl) {
    itemEl.style.opacity = '0.4';
    itemEl.style.pointerEvents = 'none';
  }

  if (!suppressRender) {
    save();
    renderAll();
    showToast(`${name} を追加しました`, 'success');
  }
  return true;
}

function addAllAssets() {
  let addedCount = 0;
  for (let i = 0; i < detectedAssets.length; i++) {
    const itemEl = document.getElementById(`det-name-${i}`);
    if (itemEl && itemEl.closest('.detected-item-editable').style.opacity !== '0.4') {
      const success = addSingleAsset(i, true);
      if (success) addedCount++;
    }
  }

  if (addedCount > 0) {
    save();
    renderAll();
    showToast(`${addedCount}件の資産を一括追加しました！`, 'success');
    document.getElementById('detectedList').classList.remove('show');
    detectedAssets = [];
  } else {
    showToast('追加可能な資産がありません', 'info');
  }
}

function addManualAsset() {
  const typeEl = document.getElementById('manualType');
  const nameEl = document.getElementById('manualName');
  const qtyEl = document.getElementById('manualQty');
  const buyEl = document.getElementById('manualBuyPrice');
  const priceEl = document.getElementById('manualPrice');

  const type = typeEl ? typeEl.value : 'stock';
  const name = nameEl.value.trim();
  const qty = parseFloat(qtyEl.value) || 100;
  const price = parseFloat(priceEl.value) || 3000;
  const buyPrice = buyEl ? (parseFloat(buyEl.value) || price) : price;

  if (!name) {
    showToast('銘柄名を入力してください', 'error');
    return;
  }

  portfolio.push({
    id: Date.now(),
    type: type,
    name: name,
    quantity: qty,
    buyPrice: buyPrice,
    currentPrice: price,
    purchaseDate: new Date().toISOString()
  });

  // Clear inputs
  nameEl.value = '';
  qtyEl.value = '100';
  priceEl.value = '3000';

  save();
  renderAll();
  showToast(`${name} を追加しました`, 'success');
}

function deleteAsset(id) {
  const asset = portfolio.find(a => a.id === id);
  if (!asset) return;

  portfolio = portfolio.filter(a => a.id !== id);
  save();
  renderAll();
  showToast(`${asset.name} を削除しました`, 'info');
}

// ─── Persistence ───
function save() {
  localStorage.setItem('studentPortfo', JSON.stringify(portfolio));
  updateCount++;
  localStorage.setItem('studentPortfoUpdates', updateCount.toString());
}

// ─── Value Helpers ───
function getAssetValue(a) {
  return a.type === 'mutual_fund' ? (a.quantity * a.currentPrice) / 10000 : a.quantity * a.currentPrice;
}

function getAssetCost(a) {
  const p = a.buyPrice || a.currentPrice;
  return a.type === 'mutual_fund' ? (a.quantity * p) / 10000 : a.quantity * p;
}

// ─── Render Everything ───
function renderAll() {
  renderStats();
  renderGamification();
  renderTable();
  renderChart();
  renderSimulator();
}

// ─── Gamification & Goals ───
const GOALS = [
  { amount: 50000, title: "💰 初めての投資！ (5万円)" },
  { amount: 100000, title: "♨️ ちょっとイイ温泉旅行 (10万円)" },
  { amount: 300000, title: "💻 最新MacBook Pro (30万円)" },
  { amount: 500000, title: "✈️ 憧れの海外卒業旅行 (50万円)" },
  { amount: 1000000, title: "🎓 学生投資家デビュー！ (100万円)" },
  { amount: 3000000, title: "🚗 新車購入資金 (300万円)" },
  { amount: 5000000, title: "🚀 独立・起業の第一歩 (500万円)" },
  { amount: 10000000, title: "💎 準富裕層の仲間入り (1000万円)" },
  { amount: 30000000, title: "🏖️ アッパーマス層・プチFIRE (3000万円)" }
];

function getLevelTitle(level) {
  if (level < 2) return "ひよっこ🐣";
  if (level < 5) return "見習い🔰";
  if (level < 10) return "学生投資家📝";
  if (level < 20) return "凄腕キャンパサー🐺";
  if (level < 30) return "若きエース✨";
  if (level < 50) return "キャンパスの伝説👑";
  return "神投資家🦅";
}

function renderGamification() {
  let totalValue = 0;
  portfolio.forEach(a => {
    totalValue += getAssetValue(a);
  });

  const exp = Math.floor(totalValue / 10000) + (updateCount * 50);
  const currentLevel = Math.floor(Math.sqrt(exp)) + 1;
  const nextLevelExp = Math.pow(currentLevel, 2);
  const currentLevelExp = Math.pow(currentLevel - 1, 2);
  const expProgress = ((exp - currentLevelExp) / (nextLevelExp - currentLevelExp)) * 100;

  const badge = document.getElementById('levelBadge');
  const expBar = document.getElementById('expBar');
  if (badge) badge.textContent = `Lv.${currentLevel} ${getLevelTitle(currentLevel)}`;
  if (expBar) expBar.style.width = `${Math.min(100, Math.max(0, expProgress))}%`;

  let currentGoal = GOALS[GOALS.length - 1];
  for (let i = 0; i < GOALS.length; i++) {
    if (totalValue < GOALS[i].amount) {
      currentGoal = GOALS[i];
      break;
    }
  }

  const goalTitle = document.getElementById('goalTitle');
  const goalBar = document.getElementById('goalBar');
  const goalText = document.getElementById('goalText');

  if (goalTitle && goalBar && goalText) {
    goalTitle.textContent = currentGoal.title;
    const pct = Math.min(100, (totalValue / currentGoal.amount) * 100);
    goalBar.style.width = `${pct}%`;
    goalText.textContent = `${pct.toFixed(1)}% (あと ¥${Math.max(0, currentGoal.amount - totalValue).toLocaleString()})`;
    
    if (pct >= 100) {
      goalBar.style.background = 'linear-gradient(90deg, #00b09b, #96c93d)';
    } else {
      goalBar.style.background = 'linear-gradient(90deg, #ff416c, #ff4b2b)';
    }
  }
}

// ─── Future Simulator ───
function renderSimulator() {
  let totalValue = 0;
  portfolio.forEach(a => {
    totalValue += getAssetValue(a);
  });

  const monthlyInput = document.getElementById('simMonthly');
  const returnInput = document.getElementById('simReturn');
  if (!monthlyInput || !returnInput) return;

  const monthlyAddition = parseFloat(monthlyInput.value) || 0;
  const annualReturn = (parseFloat(returnInput.value) || 0) / 100;
  const monthlyReturn = annualReturn / 12;

  let currentSimValue = totalValue;
  let currentPrincipal = totalValue;

  const labels = [];
  const valueData = [];
  const principalData = [];

  for (let year = 0; year <= 20; year++) {
    labels.push(`${year}年後`);
    valueData.push(Math.round(currentSimValue));
    principalData.push(Math.round(currentPrincipal));

    for (let month = 0; month < 12; month++) {
      currentSimValue = currentSimValue * (1 + monthlyReturn) + monthlyAddition;
      currentPrincipal += monthlyAddition;
    }
  }

  const finalValueEl = document.getElementById('simFutureValue');
  if (finalValueEl) {
    finalValueEl.textContent = `¥${Math.round(currentSimValue).toLocaleString()}`;
  }

  const ctx = document.getElementById('simulatorChart');
  if (!ctx) return;

  if (simulatorChart) {
    simulatorChart.data.labels = labels;
    simulatorChart.data.datasets[0].data = valueData;
    simulatorChart.data.datasets[1].data = principalData;
    simulatorChart.update();
  } else {
    simulatorChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: '複利運用した場合 (Asset)',
            data: valueData,
            borderColor: '#00ff9d',
            backgroundColor: 'rgba(0, 255, 157, 0.1)',
            fill: true,
            tension: 0.4
          },
          {
            label: 'ただ貯金した場合 (Principal)',
            data: principalData,
            borderColor: '#6c5ce7',
            backgroundColor: 'transparent',
            borderDash: [5, 5],
            tension: 0.4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#8b9bb4' } }
        },
        scales: {
          y: {
            ticks: {
              color: '#8b9bb4',
              callback: function(value) {
                if (value >= 10000) return (value / 10000) + '万';
                return value;
              }
            },
            grid: { color: 'rgba(255,255,255,0.05)' }
          },
          x: {
            ticks: { color: '#8b9bb4' },
            grid: { display: false }
          }
        }
      }
    });
  }
}

// ─── Stats ───
function renderStats() {
  let totalValue = 0;
  let totalProfit = 0;

  portfolio.forEach(a => {
    const value = getAssetValue(a);
    totalValue += value;
    totalProfit += value - getAssetCost(a);
  });

  const totalEl = document.getElementById('statTotal');
  const profitEl = document.getElementById('statProfit');
  const countEl = document.getElementById('statCount');

  if (totalEl) {
    totalEl.textContent = `¥${Math.round(totalValue).toLocaleString('ja-JP')}`;
  }

  if (profitEl) {
    profitEl.textContent = `${totalProfit >= 0 ? '+' : ''}¥${Math.round(totalProfit).toLocaleString('ja-JP')}`;
    profitEl.className = `stat-value ${totalProfit >= 0 ? 'positive' : 'negative'}`;
  }

  if (countEl) {
    countEl.textContent = portfolio.length;
  }
}

// ─── Table ───
function renderTable() {
  const tbody = document.getElementById('tableBody');
  if (!tbody) return;

  if (portfolio.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty-state">
            <div class="empty-icon">📊</div>
            <p>まだ資産が登録されていません<br>上の「資産追加」から始めましょう</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = '';

  portfolio.forEach((a, index) => {
    const value = getAssetValue(a);
    const cost = getAssetCost(a);
    const profit = value - cost;
    const profitPct = cost > 0 ? ((value / cost - 1) * 100).toFixed(1) : '—';
    const unitStr = a.type === 'mutual_fund' ? '口' : '株';

    const row = document.createElement('tr');
    row.style.animation = `fadeInUp 0.3s ease-out ${index * 0.03}s both`;
    row.innerHTML = `
      <td><strong>${a.name}</strong></td>
      <td class="text-right">${a.quantity.toLocaleString()} <span style="font-size:10px; opacity:0.6">${unitStr}</span></td>
      <td class="text-right">¥${(a.buyPrice || 0).toLocaleString()}</td>
      <td class="text-right">¥${a.currentPrice.toLocaleString()}</td>
      <td class="text-right">¥${Math.round(value).toLocaleString()}</td>
      <td class="text-right ${profit >= 0 ? 'positive' : 'negative'}">
        ${profit >= 0 ? '+' : ''}¥${Math.round(profit).toLocaleString()}
        <span style="font-size:11px; opacity:0.7"> (${profitPct}%)</span>
      </td>
      <td class="text-right">
        <button class="btn-danger" onclick="deleteAsset(${a.id})">削除</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// ─── Chart ───
function renderChart() {
  const ctx = document.getElementById('allocationChart');
  if (!ctx) return;

  if (portfolio.length === 0) {
    if (allocationChart) {
      allocationChart.destroy();
      allocationChart = null;
    }
    // Show empty chart area
    const container = ctx.closest('.card');
    if (container) container.style.display = portfolio.length === 0 ? 'none' : '';
    return;
  }

  const container = ctx.closest('.card');
  if (container) container.style.display = '';

  const labels = portfolio.map(a => a.name);
  const data = portfolio.map(a => Math.round(getAssetValue(a)));
  const colors = portfolio.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]);

  if (allocationChart) {
    allocationChart.data.labels = labels;
    allocationChart.data.datasets[0].data = data;
    allocationChart.data.datasets[0].backgroundColor = colors;
    allocationChart.update('active');
  } else {
    allocationChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colors,
          borderColor: 'rgba(6, 6, 19, 0.8)',
          borderWidth: 3,
          hoverBorderWidth: 0,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(10, 10, 31, 0.9)',
            titleColor: '#e8f4ff',
            bodyColor: '#e8f4ff',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            cornerRadius: 12,
            padding: 12,
            titleFont: { family: "'Inter', 'Noto Sans JP', sans-serif", weight: 700 },
            bodyFont: { family: "'Inter', 'Noto Sans JP', sans-serif" },
            callbacks: {
              label: function(ctx) {
                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                const pct = ((ctx.parsed / total) * 100).toFixed(1);
                return ` ¥${ctx.parsed.toLocaleString()} (${pct}%)`;
              }
            }
          }
        },
        animation: {
          animateRotate: true,
          duration: 800,
          easing: 'easeOutQuart'
        }
      }
    });
  }

  // Render custom legend
  renderLegend(labels, data, colors);
}

function renderLegend(labels, data, colors) {
  const legendEl = document.getElementById('chartLegend');
  if (!legendEl) return;

  const total = data.reduce((a, b) => a + b, 0);

  legendEl.innerHTML = labels.map((label, i) => {
    const pct = ((data[i] / total) * 100).toFixed(1);
    return `
      <div class="legend-item">
        <span class="legend-color" style="background:${colors[i]}"></span>
        <span class="legend-name">${label}</span>
        <span class="legend-value">${pct}%</span>
      </div>
    `;
  }).join('');
}

// ─── Initialize ───
document.addEventListener('DOMContentLoaded', () => {
  initSplash();
  initParticles();
  initNavScroll();
  renderAll();
});
