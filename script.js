/**
 * ============================================================================
 * Token Bucket & Leaky Bucket Interactive Simulation Engine
 * Computer Networks Traffic Shaping Laboratory Simulator
 * ============================================================================
 */

// Global State
const appState = {
  activeTab: 'overview',
  
  // Token Bucket State
  tb: {
    capacity: 10,
    initialTokens: 5,
    rate: 3,
    currentTokens: 5,
    currentTime: 0,
    packets: [],
    history: [],
    stats: {
      total: 0,
      transmitted: 0,
      dropped: 0,
      generated: 0,
      consumed: 0
    },
    isRunning: false,
    timer: null,
    speed: 800, // ms
    isFinished: false
  },

  // Leaky Bucket State
  lb: {
    capacity: 10,
    leakRate: 3,
    currentQueue: 0,
    currentTime: 0,
    packets: [],
    history: [],
    stats: {
      total: 0,
      accepted: 0,
      dropped: 0,
      received: 0,
      sent: 0,
      queueSum: 0
    },
    isRunning: false,
    timer: null,
    speed: 800,
    isFinished: false
  },

  // Dual Comparison State
  cmp: {
    tb: { cap: 10, rate: 3, currentTokens: 5, trans: 0, drop: 0 },
    lb: { cap: 10, leakRate: 3, currentQueue: 0, trans: 0, drop: 0 },
    packets: [],
    currentTime: 0,
    history: [],
    isRunning: false,
    timer: null,
    speed: 700,
    isFinished: false
  }
};

// Default Packets Presets
const PRESET_PACKETS = {
  tb: {
    normal: [
      { id: 'P1', arrival: 1, size: 4 },
      { id: 'P2', arrival: 2, size: 3 },
      { id: 'P3', arrival: 3, size: 6 },
      { id: 'P4', arrival: 4, size: 2 },
      { id: 'P5', arrival: 5, size: 8 }
    ],
    burst: [
      { id: 'P1', arrival: 1, size: 8 },
      { id: 'P2', arrival: 1, size: 5 },
      { id: 'P3', arrival: 2, size: 7 },
      { id: 'P4', arrival: 3, size: 9 },
      { id: 'P5', arrival: 4, size: 4 }
    ],
    overflow: [
      { id: 'P1', arrival: 1, size: 2 },
      { id: 'P2', arrival: 3, size: 2 },
      { id: 'P3', arrival: 6, size: 4 },
      { id: 'P4', arrival: 7, size: 3 }
    ],
    'low-rate': [
      { id: 'P1', arrival: 1, size: 6 },
      { id: 'P2', arrival: 2, size: 6 },
      { id: 'P3', arrival: 3, size: 6 },
      { id: 'P4', arrival: 4, size: 6 }
    ]
  },
  lb: {
    normal: [
      { id: 'P1', arrival: 1, size: 4 },
      { id: 'P2', arrival: 2, size: 3 },
      { id: 'P3', arrival: 3, size: 6 },
      { id: 'P4', arrival: 4, size: 2 },
      { id: 'P5', arrival: 5, size: 8 }
    ],
    burst: [
      { id: 'P1', arrival: 1, size: 6 },
      { id: 'P2', arrival: 1, size: 6 },
      { id: 'P3', arrival: 2, size: 5 },
      { id: 'P4', arrival: 3, size: 8 },
      { id: 'P5', arrival: 4, size: 4 }
    ],
    'high-leak': [
      { id: 'P1', arrival: 1, size: 5 },
      { id: 'P2', arrival: 2, size: 5 },
      { id: 'P3', arrival: 3, size: 5 },
      { id: 'P4', arrival: 4, size: 5 }
    ],
    'slow-leak': [
      { id: 'P1', arrival: 1, size: 4 },
      { id: 'P2', arrival: 2, size: 5 },
      { id: 'P3', arrival: 3, size: 4 },
      { id: 'P4', arrival: 4, size: 3 }
    ]
  },
  cmp: {
    burst: [
      { id: 'P1', arrival: 1, size: 8 },
      { id: 'P2', arrival: 2, size: 6 },
      { id: 'P3', arrival: 4, size: 7 },
      { id: 'P4', arrival: 6, size: 5 },
      { id: 'P5', arrival: 8, size: 4 }
    ],
    normal: [
      { id: 'P1', arrival: 1, size: 4 },
      { id: 'P2', arrival: 2, size: 3 },
      { id: 'P3', arrival: 3, size: 6 },
      { id: 'P4', arrival: 5, size: 2 },
      { id: 'P5', arrival: 6, size: 5 }
    ],
    heavy: [
      { id: 'P1', arrival: 1, size: 10 },
      { id: 'P2', arrival: 2, size: 8 },
      { id: 'P3', arrival: 3, size: 9 },
      { id: 'P4', arrival: 4, size: 6 }
    ]
  }
};

/* ============================================================================
   INITIALIZATION & TAB NAVIGATION
   ============================================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initializeTabs();
  initializeTokenBucket();
  initializeLeakyBucket();
  initializeComparisonMode();
});

function initializeTabs() {
  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.getAttribute('data-tab');
      switchTab(target);
    });
  });
}

function switchTab(tabId) {
  appState.activeTab = tabId;
  
  document.querySelectorAll('.nav-tab').forEach(t => {
    if (t.getAttribute('data-tab') === tabId) {
      t.classList.add('active');
    } else {
      t.classList.remove('active');
    }
  });

  document.querySelectorAll('.tab-pane').forEach(p => {
    if (p.id === `tab-${tabId}`) {
      p.classList.add('active');
    } else {
      p.classList.remove('active');
    }
  });

  // Redraw trajectory if comparison tab is selected
  if (tabId === 'compare') {
    drawComparisonTrajectoryChart();
  }
}

/* ============================================================================
   SPEED CONTROLS & PRESET LOADERS
   ============================================================================ */
function setSpeed(algo, speedMs, btnElem) {
  if (algo === 'tb') appState.tb.speed = speedMs;
  if (algo === 'lb') appState.lb.speed = speedMs;
  if (algo === 'cmp') appState.cmp.speed = speedMs;

  const container = btnElem.parentElement;
  container.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
  btnElem.classList.add('active');
}

function loadPreset(algo, presetKey) {
  if (presetKey === 'custom') return;

  if (algo === 'tb') {
    if (presetKey === 'low-rate') {
      document.getElementById('tb-cap').value = 10;
      document.getElementById('tb-init').value = 2;
      document.getElementById('tb-rate').value = 1;
    } else if (presetKey === 'overflow') {
      document.getElementById('tb-cap').value = 8;
      document.getElementById('tb-init').value = 4;
      document.getElementById('tb-rate').value = 4;
    } else if (presetKey === 'burst') {
      document.getElementById('tb-cap').value = 12;
      document.getElementById('tb-init').value = 8;
      document.getElementById('tb-rate').value = 2;
    } else {
      document.getElementById('tb-cap').value = 10;
      document.getElementById('tb-init').value = 5;
      document.getElementById('tb-rate').value = 3;
    }
    renderPacketInputTable('tb', PRESET_PACKETS.tb[presetKey] || PRESET_PACKETS.tb.normal);
    resetTokenBucket();
  } else if (algo === 'lb') {
    if (presetKey === 'high-leak') {
      document.getElementById('lb-cap').value = 10;
      document.getElementById('lb-leak').value = 6;
    } else if (presetKey === 'slow-leak') {
      document.getElementById('lb-cap').value = 10;
      document.getElementById('lb-leak').value = 1;
    } else if (presetKey === 'burst') {
      document.getElementById('lb-cap').value = 8;
      document.getElementById('lb-leak').value = 2;
    } else {
      document.getElementById('lb-cap').value = 10;
      document.getElementById('lb-leak').value = 3;
    }
    renderPacketInputTable('lb', PRESET_PACKETS.lb[presetKey] || PRESET_PACKETS.lb.normal);
    resetLeakyBucket();
  } else if (algo === 'cmp') {
    if (presetKey === 'burst') {
      document.getElementById('cmp-tb-cap').value = 10;
      document.getElementById('cmp-tb-rate').value = 3;
      document.getElementById('cmp-lb-cap').value = 10;
      document.getElementById('cmp-lb-rate').value = 3;
    } else if (presetKey === 'heavy') {
      document.getElementById('cmp-tb-cap').value = 12;
      document.getElementById('cmp-tb-rate').value = 2;
      document.getElementById('cmp-lb-cap').value = 10;
      document.getElementById('cmp-lb-rate').value = 2;
    } else {
      document.getElementById('cmp-tb-cap').value = 10;
      document.getElementById('cmp-tb-rate').value = 3;
      document.getElementById('cmp-lb-cap').value = 10;
      document.getElementById('cmp-lb-rate').value = 3;
    }
    renderPacketInputTable('cmp', PRESET_PACKETS.cmp[presetKey] || PRESET_PACKETS.cmp.burst);
    resetDualSimulation();
  }
}

function renderPacketInputTable(algo, packets) {
  const tbody = document.getElementById(`${algo}-packet-tbody`);
  if (!tbody) return;
  tbody.innerHTML = '';

  packets.forEach((p, index) => {
    const tr = document.createElement('tr');
    tr.id = `${algo}-packet-row-${index}`;
    tr.innerHTML = `
      <td><strong>${p.id || 'P' + (index + 1)}</strong></td>
      <td><input type="number" min="1" max="50" value="${p.arrival}" class="form-input pkt-arrival" onchange="syncPacketInputs('${algo}')"></td>
      <td><input type="number" min="1" max="50" value="${p.size}" class="form-input pkt-size" onchange="syncPacketInputs('${algo}')"></td>
      <td><button class="btn btn-xs btn-outline text-danger" onclick="deletePacketRow('${algo}', ${index})">✕</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function addPacketRow(algo) {
  const tbody = document.getElementById(`${algo}-packet-tbody`);
  if (!tbody) return;
  const count = tbody.querySelectorAll('tr').length;
  const newIndex = count;
  const prevArrival = count > 0 ? parseInt(tbody.querySelectorAll('.pkt-arrival')[count - 1].value) || count : 0;
  
  const tr = document.createElement('tr');
  tr.id = `${algo}-packet-row-${newIndex}`;
  tr.innerHTML = `
    <td><strong>P${newIndex + 1}</strong></td>
    <td><input type="number" min="1" max="50" value="${prevArrival + 1}" class="form-input pkt-arrival" onchange="syncPacketInputs('${algo}')"></td>
    <td><input type="number" min="1" max="50" value="4" class="form-input pkt-size" onchange="syncPacketInputs('${algo}')"></td>
    <td><button class="btn btn-xs btn-outline text-danger" onclick="deletePacketRow('${algo}', ${newIndex})">✕</button></td>
  `;
  tbody.appendChild(tr);
  syncPacketInputs(algo);
}

function deletePacketRow(algo, index) {
  const tbody = document.getElementById(`${algo}-packet-tbody`);
  const rows = tbody.querySelectorAll('tr');
  if (rows.length <= 1) {
    alert('At least one packet is required in the schedule.');
    return;
  }
  if (rows[index]) {
    rows[index].remove();
    // Re-index remaining rows
    const updatedRows = tbody.querySelectorAll('tr');
    updatedRows.forEach((r, i) => {
      r.id = `${algo}-packet-row-${i}`;
      r.querySelector('td strong').textContent = `P${i + 1}`;
      r.querySelector('button').setAttribute('onclick', `deletePacketRow('${algo}', ${i})`);
    });
    syncPacketInputs(algo);
  }
}

function syncPacketInputs(algo) {
  const tbody = document.getElementById(`${algo}-packet-tbody`);
  const rows = tbody.querySelectorAll('tr');
  const packets = [];
  rows.forEach((r, idx) => {
    const arrival = parseInt(r.querySelector('.pkt-arrival').value) || (idx + 1);
    const size = parseInt(r.querySelector('.pkt-size').value) || 1;
    packets.push({ id: `P${idx + 1}`, arrival, size });
  });

  if (algo === 'tb') {
    appState.tb.packets = packets;
    resetTokenBucket();
  } else if (algo === 'lb') {
    appState.lb.packets = packets;
    resetLeakyBucket();
  } else if (algo === 'cmp') {
    appState.cmp.packets = packets;
    resetDualSimulation();
  }
}

function readPacketInputs(algo) {
  const tbody = document.getElementById(`${algo}-packet-tbody`);
  if (!tbody) return [];
  const rows = tbody.querySelectorAll('tr');
  const packets = [];
  rows.forEach((r, idx) => {
    const arrival = parseInt(r.querySelector('.pkt-arrival').value) || (idx + 1);
    const size = parseInt(r.querySelector('.pkt-size').value) || 1;
    packets.push({ id: `P${idx + 1}`, arrival, size });
  });
  return packets;
}

/* ============================================================================
   TOKEN BUCKET ALGORITHM ENGINE
   ============================================================================ */
function initializeTokenBucket() {
  renderPacketInputTable('tb', PRESET_PACKETS.tb.normal);
  resetTokenBucket();
}

function resetTokenBucket() {
  pauseTokenBucket();
  
  const cap = parseInt(document.getElementById('tb-cap').value) || 10;
  const init = parseInt(document.getElementById('tb-init').value) || 0;
  const rate = parseInt(document.getElementById('tb-rate').value) || 3;

  appState.tb.capacity = cap;
  appState.tb.initialTokens = Math.min(init, cap);
  appState.tb.rate = rate;
  appState.tb.currentTokens = appState.tb.initialTokens;
  appState.tb.currentTime = 0;
  appState.tb.packets = readPacketInputs('tb');
  appState.tb.history = [];
  appState.tb.isFinished = false;
  appState.tb.stats = {
    total: 0,
    transmitted: 0,
    dropped: 0,
    generated: 0,
    consumed: 0
  };

  // Reset UI components
  document.getElementById('tb-output-tbody').innerHTML = '';
  const tbBadge = document.getElementById('tb-table-step-count');
  if (tbBadge) tbBadge.textContent = '0 Steps';
  document.getElementById('tb-step-tag').textContent = 'Step 0';
  document.getElementById('tb-explanation-body').innerHTML = `
    <div class="empty-state">
      <p>Click <strong>"Next Step"</strong> or <strong>"Run All"</strong> to begin. Detailed token generation formulas, capacity bounding, and transmission checks will appear here for every single step.</p>
    </div>
  `;
  document.getElementById('tb-summary-banner').classList.add('hidden');
  
  updateTokenBucketRibbon(0, 'None', `${appState.tb.currentTokens} / ${appState.tb.capacity}`, 'Ready', appState.tb.currentTokens);
  updateTokenBucketVisualizer(appState.tb.currentTokens, appState.tb.capacity);
  updateTokenBucketStats();
  
  document.getElementById('tb-source-status').textContent = 'Idle (Ready)';
  document.getElementById('tb-network-status').textContent = 'Listening...';
  document.getElementById('tb-stat-transmitted-badge').textContent = '0';
  document.getElementById('tb-stat-dropped-badge').textContent = '0';

  // Log reset
  clearEventLog('tb');
  addEventLog('tb', 'log-info', `Token Bucket Simulator initialized. Capacity: ${cap}, Initial: ${appState.tb.initialTokens}, Rate: ${rate} tokens/step.`);
  
  // Enable buttons
  document.getElementById('tb-btn-next').disabled = false;
  document.getElementById('tb-btn-run').disabled = false;
  document.getElementById('tb-btn-pause').disabled = true;
}

function stepTokenBucket() {
  const tb = appState.tb;
  if (tb.isFinished) return;

  tb.currentTime += 1;
  const time = tb.currentTime;
  const prevTokens = tb.currentTokens;
  const genTokens = tb.rate;
  
  // Mathematical token accumulation with bound
  const tokensAvailable = Math.min(tb.capacity, prevTokens + genTokens);
  tb.stats.generated += genTokens;

  // Check if any packet arrived at current time
  const arrivedPackets = tb.packets.filter(p => p.arrival === time);
  
  let packet = null;
  let action = 'No Packet';
  let tokensConsumed = 0;
  let tokensAfter = tokensAvailable;
  let reason = 'No packet arrived this time unit. Tokens accumulated in bucket.';
  let isTransmitted = false;
  let isDropped = false;

  if (arrivedPackets.length > 0) {
    // Process first packet arriving at this time (standard model)
    packet = arrivedPackets[0];
    tb.stats.total += 1;

    if (tokensAvailable >= packet.size) {
      // Transmitted
      isTransmitted = true;
      action = 'Transmitted';
      tokensConsumed = packet.size;
      tokensAfter = tokensAvailable - packet.size;
      tb.stats.transmitted += 1;
      tb.stats.consumed += tokensConsumed;
      reason = `Sufficient tokens (${tokensAvailable} ≥ ${packet.size}). Packet ${packet.id} transmitted; ${packet.size} tokens deducted.`;
    } else {
      // Dropped / Insufficient tokens
      isDropped = true;
      action = 'Dropped';
      tokensConsumed = 0;
      tokensAfter = tokensAvailable;
      tb.stats.dropped += 1;
      reason = `Insufficient tokens (${tokensAvailable} < ${packet.size}). Packet ${packet.id} dropped.`;
    }
  }

  // Update State
  tb.currentTokens = tokensAfter;

  const stepRecord = {
    time,
    packet: packet ? packet.id : '—',
    arrival: packet ? packet.arrival : '—',
    size: packet ? packet.size : '—',
    tokensBefore: prevTokens,
    tokensGenerated: genTokens,
    tokensAvailable,
    action,
    tokensConsumed,
    tokensAfter,
    reason,
    isTransmitted,
    isDropped
  };

  tb.history.push(stepRecord);

  // Update UI & Visuals
  updateTokenBucketVisualizer(tokensAfter, tb.capacity, stepRecord);
  updateTokenBucketRibbon(
    time, 
    packet ? `${packet.id} [${packet.size}T]` : 'None', 
    `${prevTokens} + ${genTokens} = ${tokensAvailable}`, 
    action, 
    tokensAfter
  );
  renderTokenBucketStepExplanation(stepRecord);
  appendTokenBucketTableRow(stepRecord);
  updateTokenBucketStats();

  // Event log entries
  addEventLog('tb', 'log-info', `[Time ${time}] 🚰 Generated ${genTokens} tokens. Available in bucket: ${tokensAvailable}/${tb.capacity}`);
  if (packet) {
    addEventLog('tb', 'log-warning', `[Time ${time}] 📦 Packet ${packet.id} arrived (Size: ${packet.size} tokens).`);
    if (isTransmitted) {
      addEventLog('tb', 'log-success', `[Time ${time}] ✓ Packet ${packet.id} TRANSMITTED. Consumed ${packet.size} tokens. Remaining: ${tokensAfter}`);
    } else {
      addEventLog('tb', 'log-danger', `[Time ${time}] ✕ Packet ${packet.id} DROPPED. Required ${packet.size} tokens, only ${tokensAvailable} available.`);
    }
  }

  // Check completion
  const maxArrival = Math.max(...tb.packets.map(p => p.arrival), 0);
  if (time >= maxArrival && (time >= tb.packets.length || time >= 5)) {
    finishTokenBucketSimulation();
  }
}

function runTokenBucket() {
  const tb = appState.tb;
  if (tb.isFinished) resetTokenBucket();

  tb.isRunning = true;
  document.getElementById('tb-btn-run').disabled = true;
  document.getElementById('tb-btn-next').disabled = true;
  document.getElementById('tb-btn-pause').disabled = false;

  tb.timer = setInterval(() => {
    if (!tb.isFinished) {
      stepTokenBucket();
    } else {
      pauseTokenBucket();
    }
  }, tb.speed);
}

function pauseTokenBucket() {
  const tb = appState.tb;
  tb.isRunning = false;
  if (tb.timer) {
    clearInterval(tb.timer);
    tb.timer = null;
  }
  document.getElementById('tb-btn-run').disabled = tb.isFinished;
  document.getElementById('tb-btn-next').disabled = tb.isFinished;
  document.getElementById('tb-btn-pause').disabled = true;
}

function finishTokenBucketSimulation() {
  const tb = appState.tb;
  tb.isFinished = true;
  pauseTokenBucket();

  const banner = document.getElementById('tb-summary-banner');
  banner.classList.remove('hidden');

  const dropRate = tb.stats.total > 0 ? ((tb.stats.dropped / tb.stats.total) * 100).toFixed(1) : '0.0';
  const throughput = tb.currentTime > 0 ? (tb.stats.transmitted / tb.currentTime).toFixed(2) : '0.00';

  banner.innerHTML = `
    <div class="summary-banner-title">
      <span>🎉</span> Token Bucket Simulation Completed
    </div>
    <p class="summary-banner-desc">
      A total of <strong>${tb.stats.total} packets</strong> were processed over <strong>${tb.currentTime} time units</strong>. 
      <strong>${tb.stats.transmitted} packets</strong> were successfully transmitted and <strong>${tb.stats.dropped} packets</strong> were dropped (Drop Rate: <strong>${dropRate}%</strong>). 
      Throughput averaged <strong>${throughput} packets/time unit</strong> with <strong>${tb.stats.consumed} tokens consumed</strong> out of <strong>${tb.stats.generated + tb.initialTokens} total available tokens</strong>.
    </p>
    <div class="takeaways-box">
      <div class="takeaways-title">Key Algorithmic Takeaways</div>
      <ul class="takeaways-list">
        <li>✓ <strong>Burst Handling:</strong> When tokens accumulate during idle periods, packets can transmit instantly without queuing delay.</li>
        <li>✓ <strong>Token Conservation:</strong> Excess tokens above capacity (\(C = ${tb.capacity}\)) are discarded, enforcing a long-term average transmission rate.</li>
        <li>✓ <strong>Credit-Based Policing:</strong> Packets require tokens proportional to size before entering the network.</li>
      </ul>
    </div>
  `;

  addEventLog('tb', 'log-info', `[System] Simulation run completed successfully.`);
}

function updateTokenBucketVisualizer(currentTokens, capacity, stepRecord = null) {
  // Update token pills grid
  const grid = document.getElementById('tb-tokens-grid');
  grid.innerHTML = '';
  for (let i = 0; i < currentTokens; i++) {
    const pill = document.createElement('div');
    pill.className = 'token-pill';
    pill.textContent = '●';
    grid.appendChild(pill);
  }

  // Update occupancy bar & label
  const pct = Math.min(100, Math.round((currentTokens / capacity) * 100));
  document.getElementById('tb-occupancy-bar').style.width = `${pct}%`;
  document.getElementById('tb-occupancy-text').textContent = `Tokens: ${currentTokens} / ${capacity}`;
  document.getElementById('tb-tap-rate').textContent = `+${appState.tb.rate} tokens/t`;

  // Animate packet movement
  const flying = document.getElementById('tb-flying-packet');
  if (stepRecord && stepRecord.packet !== '—') {
    flying.classList.remove('hidden');
    flying.textContent = `${stepRecord.packet} [${stepRecord.size}T]`;
    
    if (stepRecord.isTransmitted) {
      flying.style.background = '#10b981';
      document.getElementById('tb-network-status').textContent = `Transmitting ${stepRecord.packet} ✓`;
      document.getElementById('tb-source-status').textContent = `Sent ${stepRecord.packet}`;
    } else {
      flying.style.background = '#ef4444';
      document.getElementById('tb-network-status').textContent = `Packet ${stepRecord.packet} Dropped ✕`;
      document.getElementById('tb-source-status').textContent = `Dropped ${stepRecord.packet}`;
    }
  } else {
    flying.classList.add('hidden');
    document.getElementById('tb-source-status').textContent = 'No arrival';
    document.getElementById('tb-network-status').textContent = 'Listening...';
  }

  document.getElementById('tb-stat-transmitted-badge').textContent = appState.tb.stats.transmitted;
  document.getElementById('tb-stat-dropped-badge').textContent = appState.tb.stats.dropped;
}

function updateTokenBucketRibbon(time, pkt, tokensAvail, action, after) {
  document.getElementById('tb-ribbon-time').textContent = `T = ${time}`;
  document.getElementById('tb-ribbon-packet').textContent = pkt;
  document.getElementById('tb-ribbon-tokens').textContent = tokensAvail;
  
  const actionBadge = document.getElementById('tb-ribbon-action');
  actionBadge.textContent = action;
  actionBadge.className = 'ribbon-value status-badge';
  if (action === 'Transmitted') actionBadge.classList.add('status-transmitted');
  else if (action === 'Dropped') actionBadge.classList.add('status-dropped');
  else actionBadge.classList.add('status-waiting');

  document.getElementById('tb-ribbon-after').textContent = `${after} tokens`;
}

function renderTokenBucketStepExplanation(step) {
  document.getElementById('tb-step-tag').textContent = `Time = ${step.time}`;
  
  let html = `
    <div class="explanation-step-block">
      <div class="step-num-title">1. Token Generation & Capacity Bounding</div>
      <div class="step-plain-text">Previous tokens in bucket = <strong>${step.tokensBefore}</strong>. Token generation rate <em>R</em> = <strong>${step.tokensGenerated}</strong> tokens/step.</div>
      <div class="step-math-box">
        <code>Tokens<sub>available</sub> = min(Capacity, Tokens<sub>prev</sub> + Rate) = min(${appState.tb.capacity}, ${step.tokensBefore} + ${step.tokensGenerated}) = <strong>${step.tokensAvailable}</strong> tokens</code>
      </div>
      <div class="step-plain-text">${step.tokensBefore + step.tokensGenerated > appState.tb.capacity ? `⚠️ Bucket capacity limit reached! Excess ${(step.tokensBefore + step.tokensGenerated) - appState.tb.capacity} generated token(s) overflowed and were discarded.` : `✓ Tokens generated and stored into bucket.`}</div>
    </div>
  `;

  if (step.packet !== '—') {
    html += `
      <div class="explanation-step-block">
        <div class="step-num-title">2. Packet Arrival & Credit Check</div>
        <div class="step-plain-text">Packet <strong>${step.packet}</strong> arrived at Time ${step.time} requiring <strong>${step.size} tokens</strong>. Available tokens in bucket = <strong>${step.tokensAvailable}</strong>.</div>
        <div class="step-math-box">
          <code>Transmission Condition: Tokens<sub>available</sub> &ge; Packet Size &rarr; ${step.tokensAvailable} ${step.isTransmitted ? '≥' : '<'} ${step.size}</code>
        </div>
      </div>

      <div class="explanation-step-block">
        <div class="step-num-title">3. Decision & State Update</div>
        <div class="step-plain-text">
          ${step.isTransmitted ? 
            `<strong class="text-success">Action: TRANSMITTED ✓</strong>. The bucket had sufficient tokens (${step.tokensAvailable} &ge; ${step.size}), so packet was transmitted and ${step.size} tokens were deducted.` : 
            `<strong class="text-danger">Action: DROPPED ✕</strong>. Insufficient tokens available (${step.tokensAvailable} &lt; ${step.size}). Packet could not be transmitted.`}
        </div>
        <div class="step-math-box">
          <code>Tokens<sub>remaining</sub> = ${step.isTransmitted ? `${step.tokensAvailable} - ${step.size} = <strong>${step.tokensAfter}</strong> tokens` : `${step.tokensAvailable} (no tokens consumed) = <strong>${step.tokensAfter}</strong> tokens`}</code>
        </div>
      </div>
    `;
  } else {
    html += `
      <div class="explanation-step-block">
        <div class="step-num-title">2. Packet Arrival</div>
        <div class="step-plain-text">No packets arrived during Time unit ${step.time}. The bucket retains its accumulated tokens for future bursts.</div>
      </div>
    `;
  }

  html += `
    <div class="result-summary-box">
      <div class="result-summary-title">Time ${step.time} Summary</div>
      <ul class="result-bullets">
        <li><span>•</span> Tokens Generated: <strong>+${step.tokensGenerated} tokens</strong></li>
        <li><span>•</span> Incoming Packet: <strong>${step.packet !== '—' ? `${step.packet} (${step.size} tokens)` : 'None'}</strong></li>
        <li><span>•</span> Decision: <strong class="${step.isTransmitted ? 'text-success' : (step.isDropped ? 'text-danger' : '')}">${step.action}</strong></li>
        <li><span>•</span> Bucket State After Step: <strong>${step.tokensAfter} / ${appState.tb.capacity} tokens</strong></li>
      </ul>
    </div>
  `;

  document.getElementById('tb-explanation-body').innerHTML = html;
}

function appendTokenBucketTableRow(step) {
  const tbody = document.getElementById('tb-output-tbody');
  
  // Clear active row from before
  tbody.querySelectorAll('tr').forEach(r => r.classList.remove('row-active'));

  const tr = document.createElement('tr');
  tr.className = 'row-active';
  tr.innerHTML = `
    <td><strong>${step.time}</strong></td>
    <td><strong>${step.packet}</strong></td>
    <td>${step.arrival}</td>
    <td>${step.size}</td>
    <td>${step.tokensBefore}</td>
    <td>+${step.tokensGenerated}</td>
    <td><strong>${step.tokensAvailable}</strong></td>
    <td><span class="status-badge ${step.isTransmitted ? 'status-transmitted' : (step.isDropped ? 'status-dropped' : 'status-waiting')}">${step.action}</span></td>
    <td><strong>${step.tokensAfter}</strong></td>
    <td><small>${step.reason}</small></td>
  `;
  tbody.appendChild(tr);
  
  const tbBadge = document.getElementById('tb-table-step-count');
  if (tbBadge) tbBadge.textContent = `${appState.tb.history.length} Steps`;

  const scrollWrap = tbody.closest('.sim-table-scroll');
  if (scrollWrap) {
    scrollWrap.scrollTop = scrollWrap.scrollHeight;
  }
}

function updateTokenBucketStats() {
  const tb = appState.tb;
  document.getElementById('tb-stat-total').textContent = tb.stats.total;
  document.getElementById('tb-stat-trans').textContent = tb.stats.transmitted;
  document.getElementById('tb-stat-drop').textContent = tb.stats.dropped;
  document.getElementById('tb-stat-gen').textContent = tb.stats.generated;
  document.getElementById('tb-stat-cons').textContent = tb.stats.consumed;
  
  const dropRate = tb.stats.total > 0 ? ((tb.stats.dropped / tb.stats.total) * 100).toFixed(1) + '%' : '0.0%';
  document.getElementById('tb-stat-droprate').textContent = dropRate;

  const throughput = tb.currentTime > 0 ? (tb.stats.transmitted / tb.currentTime).toFixed(2) + ' pkts/t' : '0.00 pkts/t';
  document.getElementById('tb-stat-throughput').textContent = throughput;

  const totalPossible = tb.stats.generated + tb.initialTokens;
  const util = totalPossible > 0 ? ((tb.stats.consumed / totalPossible) * 100).toFixed(1) + '%' : '0.0%';
  document.getElementById('tb-stat-util').textContent = util;
}

/* ============================================================================
   LEAKY BUCKET ALGORITHM ENGINE
   ============================================================================ */
function initializeLeakyBucket() {
  renderPacketInputTable('lb', PRESET_PACKETS.lb.normal);
  resetLeakyBucket();
}

function resetLeakyBucket() {
  pauseLeakyBucket();

  const cap = parseInt(document.getElementById('lb-cap').value) || 10;
  const leak = parseInt(document.getElementById('lb-leak').value) || 3;

  appState.lb.capacity = cap;
  appState.lb.leakRate = leak;
  appState.lb.currentQueue = 0;
  appState.lb.currentTime = 0;
  appState.lb.packets = readPacketInputs('lb');
  appState.lb.history = [];
  appState.lb.isFinished = false;
  appState.lb.stats = {
    total: 0,
    accepted: 0,
    dropped: 0,
    received: 0,
    sent: 0,
    queueSum: 0
  };

  document.getElementById('lb-output-tbody').innerHTML = '';
  const lbBadge = document.getElementById('lb-table-step-count');
  if (lbBadge) lbBadge.textContent = '0 Steps';
  document.getElementById('lb-step-tag').textContent = 'Step 0';
  document.getElementById('lb-explanation-body').innerHTML = `
    <div class="empty-state">
      <p>Click <strong>"Next Step"</strong> or <strong>"Run All"</strong> to simulate. Detailed buffer overflow checks (\\(Q_{\\text{prev}} + \\text{Size} \\le B\\)), queuing math, and fixed leak rate transmissions will be displayed here.</p>
    </div>
  `;
  document.getElementById('lb-summary-banner').classList.add('hidden');

  updateLeakyBucketRibbon(0, 'None', `0 / ${cap}`, 'Ready', '0 sent (Q: 0)');
  updateLeakyBucketVisualizer(0, cap);
  updateLeakyBucketStats();

  document.getElementById('lb-network-status').textContent = 'Listening...';
  document.getElementById('lb-stat-sent-units').textContent = '0';
  document.getElementById('lb-stat-drop-units').textContent = '0';
  document.getElementById('lb-leak-rate-text').textContent = `${leak} units/t`;

  clearEventLog('lb');
  addEventLog('lb', 'log-info', `Leaky Bucket Simulator initialized. Queue Capacity: ${cap}, Output Rate: ${leak} units/step.`);

  document.getElementById('lb-btn-next').disabled = false;
  document.getElementById('lb-btn-run').disabled = false;
  document.getElementById('lb-btn-pause').disabled = true;
}

function stepLeakyBucket() {
  const lb = appState.lb;
  if (lb.isFinished) return;

  lb.currentTime += 1;
  const time = lb.currentTime;
  const queueBefore = lb.currentQueue;
  const capacity = lb.capacity;
  const leakRate = lb.leakRate;

  // Check incoming packet at current time
  const arrivedPackets = lb.packets.filter(p => p.arrival === time);
  let packet = null;
  let incomingSize = 0;
  let isAccepted = false;
  let isDropped = false;
  let action = 'No Packet';
  let queueAfterArrival = queueBefore;
  let explanation = '';

  if (arrivedPackets.length > 0) {
    packet = arrivedPackets[0];
    incomingSize = packet.size;
    lb.stats.total += 1;

    // Buffer Admission Condition
    if (queueBefore + incomingSize <= capacity) {
      // Packet Accepted
      isAccepted = true;
      action = 'Accepted';
      queueAfterArrival = queueBefore + incomingSize;
      lb.stats.accepted += 1;
      lb.stats.received += incomingSize;
      explanation = `Packet ${packet.id} accepted (Buffer space available: ${capacity - queueBefore} ≥ ${incomingSize}).`;
    } else {
      // Buffer Overflow -> Packet Dropped
      isDropped = true;
      action = 'Dropped';
      queueAfterArrival = queueBefore;
      lb.stats.dropped += 1;
      explanation = `Packet ${packet.id} dropped! Required ${incomingSize} units, only ${capacity - queueBefore} units space available in buffer.`;
    }
  } else {
    explanation = 'No incoming packet at this time step.';
  }

  // Leakage / Transmission phase (Fixed rate L)
  const dataSent = Math.min(queueAfterArrival, leakRate);
  const queueAfterLeak = queueAfterArrival - dataSent;
  lb.stats.sent += dataSent;
  lb.stats.queueSum += queueAfterLeak;

  // Update State
  lb.currentQueue = queueAfterLeak;

  const stepRecord = {
    time,
    packet: packet ? packet.id : '—',
    size: packet ? incomingSize : '—',
    queueBefore,
    incoming: incomingSize,
    capacity,
    action,
    dataSent,
    queueAfterArrival,
    queueAfter: queueAfterLeak,
    explanation,
    isAccepted,
    isDropped
  };

  lb.history.push(stepRecord);

  // Update Visuals & DOM
  updateLeakyBucketVisualizer(queueAfterLeak, capacity, stepRecord);
  updateLeakyBucketRibbon(
    time,
    packet ? `${packet.id} [${incomingSize}U]` : 'None',
    `${queueBefore} / ${capacity}`,
    action,
    `${dataSent} sent (Q: ${queueAfterLeak})`
  );
  renderLeakyBucketStepExplanation(stepRecord);
  appendLeakyBucketTableRow(stepRecord);
  updateLeakyBucketStats();

  // Event Log
  if (packet) {
    addEventLog('lb', 'log-warning', `[Time ${time}] 📦 Packet ${packet.id} arrived (Size: ${incomingSize} units).`);
    if (isAccepted) {
      addEventLog('lb', 'log-success', `[Time ${time}] ✓ Packet ${packet.id} ACCEPTED into buffer. Queue grew to ${queueAfterArrival}/${capacity}.`);
    } else {
      addEventLog('lb', 'log-danger', `[Time ${time}] ✕ Packet ${packet.id} DROPPED due to buffer overflow (${queueBefore} + ${incomingSize} > ${capacity}).`);
    }
  }
  addEventLog('lb', 'log-info', `[Time ${time}] 💧 Leaked ${dataSent} data units to network at fixed rate. Remaining in buffer: ${queueAfterLeak}/${capacity}.`);

  // Check completion: finished when all packets arrived and queue has leaked empty
  const maxArrival = Math.max(...lb.packets.map(p => p.arrival), 0);
  if (time >= maxArrival && queueAfterLeak === 0) {
    finishLeakyBucketSimulation();
  }
}

function runLeakyBucket() {
  const lb = appState.lb;
  if (lb.isFinished) resetLeakyBucket();

  lb.isRunning = true;
  document.getElementById('lb-btn-run').disabled = true;
  document.getElementById('lb-btn-next').disabled = true;
  document.getElementById('lb-btn-pause').disabled = false;

  lb.timer = setInterval(() => {
    if (!lb.isFinished) {
      stepLeakyBucket();
    } else {
      pauseLeakyBucket();
    }
  }, lb.speed);
}

function pauseLeakyBucket() {
  const lb = appState.lb;
  lb.isRunning = false;
  if (lb.timer) {
    clearInterval(lb.timer);
    lb.timer = null;
  }
  document.getElementById('lb-btn-run').disabled = lb.isFinished;
  document.getElementById('lb-btn-next').disabled = lb.isFinished;
  document.getElementById('lb-btn-pause').disabled = true;
}

function finishLeakyBucketSimulation() {
  const lb = appState.lb;
  lb.isFinished = true;
  pauseLeakyBucket();

  const banner = document.getElementById('lb-summary-banner');
  banner.classList.remove('hidden');

  const dropRate = lb.stats.total > 0 ? ((lb.stats.dropped / lb.stats.total) * 100).toFixed(1) : '0.0';
  const avgQueue = lb.currentTime > 0 ? (lb.stats.queueSum / lb.currentTime).toFixed(1) : '0.0';

  banner.innerHTML = `
    <div class="summary-banner-title">
      <span>🎉</span> Leaky Bucket Simulation Completed
    </div>
    <p class="summary-banner-desc">
      A total of <strong>${lb.stats.total} packets (${lb.stats.received} data units)</strong> were processed. 
      <strong>${lb.stats.accepted} packets</strong> were accepted into the queue buffer and <strong>${lb.stats.dropped} packets</strong> were dropped (Drop Rate: <strong>${dropRate}%</strong>). 
      A total of <strong>${lb.stats.sent} units</strong> were transmitted at a smooth, constant rate of <strong>${lb.leakRate} units/time unit</strong>. Average buffer occupancy was <strong>${avgQueue} units</strong>.
    </p>
    <div class="takeaways-box">
      <div class="takeaways-title">Key Algorithmic Takeaways</div>
      <ul class="takeaways-list">
        <li>✓ <strong>Strictly Constant Output:</strong> Regardless of incoming packet bursts, data always exits at exactly \(\\le L = ${lb.leakRate}\) units per step.</li>
        <li>✓ <strong>Queue Buffering & Latency:</strong> Packets wait inside the finite buffer, introducing queuing delay in exchange for traffic smoothness.</li>
        <li>✓ <strong>Buffer Overflow Drops:</strong> Excess packets arriving when \(\\text{Queue} + \\text{Size} > B\) are permanently dropped.</li>
      </ul>
    </div>
  `;

  addEventLog('lb', 'log-info', `[System] Leaky Bucket simulation run concluded.`);
}

function updateLeakyBucketVisualizer(currentQueue, capacity, stepRecord = null) {
  // Update packet blocks in queue stack
  const stack = document.getElementById('lb-queue-stack');
  stack.innerHTML = '';

  if (currentQueue > 0) {
    const block = document.createElement('div');
    block.className = 'queue-packet-block';
    block.innerHTML = `<span>Buffered Data</span><span>${currentQueue} U</span>`;
    stack.appendChild(block);
  }

  // Update water level fill
  const pct = Math.min(100, Math.round((currentQueue / capacity) * 100));
  document.getElementById('lb-water-fill').style.height = `${pct}%`;
  document.getElementById('lb-occupancy-bar').style.width = `${pct}%`;
  document.getElementById('lb-occupancy-text').textContent = `Queue: ${currentQueue} / ${capacity} units`;

  document.getElementById('lb-stat-sent-units').textContent = appState.lb.stats.sent;
  document.getElementById('lb-stat-drop-units').textContent = appState.lb.stats.dropped;

  if (stepRecord && stepRecord.dataSent > 0) {
    document.getElementById('lb-network-status').textContent = `Transmitting ${stepRecord.dataSent} units smoothly ✓`;
  } else {
    document.getElementById('lb-network-status').textContent = `Queue empty / idle.`;
  }
}

function updateLeakyBucketRibbon(time, pkt, queueBefore, action, leakInfo) {
  document.getElementById('lb-ribbon-time').textContent = `T = ${time}`;
  document.getElementById('lb-ribbon-packet').textContent = pkt;
  document.getElementById('lb-ribbon-queue').textContent = queueBefore;

  const actionBadge = document.getElementById('lb-ribbon-action');
  actionBadge.textContent = action;
  actionBadge.className = 'ribbon-value status-badge';
  if (action === 'Accepted') actionBadge.classList.add('status-accepted');
  else if (action === 'Dropped') actionBadge.classList.add('status-dropped');
  else actionBadge.classList.add('status-waiting');

  document.getElementById('lb-ribbon-leaked').textContent = leakInfo;
}

function renderLeakyBucketStepExplanation(step) {
  document.getElementById('lb-step-tag').textContent = `Time = ${step.time}`;

  let html = ``;

  if (step.packet !== '—') {
    html += `
      <div class="explanation-step-block">
        <div class="step-num-title">1. Packet Arrival & Capacity Check</div>
        <div class="step-plain-text">Packet <strong>${step.packet}</strong> arrived with size <strong>${step.incoming} units</strong>. Current queue buffer before arrival = <strong>${step.queueBefore} units</strong>. Bucket capacity <em>B</em> = <strong>${step.capacity}</strong>.</div>
        <div class="step-math-box">
          <code>Admission Condition: Queue<sub>prev</sub> + Packet Size &le; Capacity &rarr; ${step.queueBefore} + ${step.incoming} = ${step.queueBefore + step.incoming} ${step.isAccepted ? '≤' : '>'} ${step.capacity}</code>
        </div>
        <div class="step-plain-text">
          ${step.isAccepted ? 
            `<strong class="text-success">Result: ACCEPTED ✓</strong>. ${step.incoming} units admitted into queue buffer. Queue after arrival = <strong>${step.queueAfterArrival}</strong> units.` : 
            `<strong class="text-danger">Result: DROPPED ✕</strong>. Buffer overflow! Available space is only ${step.capacity - step.queueBefore} units, while incoming packet requires ${step.incoming} units.`}
        </div>
      </div>
    `;
  } else {
    html += `
      <div class="explanation-step-block">
        <div class="step-num-title">1. Packet Arrival</div>
        <div class="step-plain-text">No packets arrived at Time ${step.time}. Queue buffer remains at ${step.queueBefore} units.</div>
      </div>
    `;
  }

  html += `
    <div class="explanation-step-block">
      <div class="step-num-title">2. Constant-Rate Leakage Phase</div>
      <div class="step-plain-text">Configured fixed output leak rate <em>L</em> = <strong>${appState.lb.leakRate} units/step</strong>. Data waiting in queue = <strong>${step.queueAfterArrival} units</strong>.</div>
      <div class="step-math-box">
        <code>Data Transmitted = min(Queue<sub>admitted</sub>, Leak Rate L) = min(${step.queueAfterArrival}, ${appState.lb.leakRate}) = <strong>${step.dataSent}</strong> units</code>
      </div>
      <div class="step-math-box">
        <code>Queue<sub>after</sub> = Queue<sub>admitted</sub> - Data Transmitted = ${step.queueAfterArrival} - ${step.dataSent} = <strong>${step.queueAfter}</strong> units</code>
      </div>
    </div>

    <div class="result-summary-box">
      <div class="result-summary-title">Time ${step.time} Summary</div>
      <ul class="result-bullets">
        <li><span>•</span> Incoming Packet: <strong>${step.packet !== '—' ? `${step.packet} (${step.incoming} units)` : 'None'}</strong></li>
        <li><span>•</span> Admission Decision: <strong class="${step.isAccepted ? 'text-success' : (step.isDropped ? 'text-danger' : '')}">${step.action}</strong></li>
        <li><span>•</span> Data Transmitted to Network: <strong>${step.dataSent} units</strong></li>
        <li><span>•</span> Queue Occupancy After Step: <strong>${step.queueAfter} / ${step.capacity} units</strong></li>
      </ul>
    </div>
  `;

  document.getElementById('lb-explanation-body').innerHTML = html;
}

function appendLeakyBucketTableRow(step) {
  const tbody = document.getElementById('lb-output-tbody');
  tbody.querySelectorAll('tr').forEach(r => r.classList.remove('row-active'));

  const tr = document.createElement('tr');
  tr.className = 'row-active';
  tr.innerHTML = `
    <td><strong>${step.time}</strong></td>
    <td><strong>${step.packet}</strong></td>
    <td>${step.size}</td>
    <td>${step.queueBefore}</td>
    <td>+${step.incoming}</td>
    <td>${step.capacity}</td>
    <td><span class="status-badge ${step.isAccepted ? 'status-accepted' : (step.isDropped ? 'status-dropped' : 'status-waiting')}">${step.action}</span></td>
    <td><strong>${step.dataSent} units</strong></td>
    <td><strong>${step.queueAfter}</strong></td>
    <td><small>${step.explanation}</small></td>
  `;
  tbody.appendChild(tr);

  const lbBadge = document.getElementById('lb-table-step-count');
  if (lbBadge) lbBadge.textContent = `${appState.lb.history.length} Steps`;

  const scrollWrap = tbody.closest('.sim-table-scroll');
  if (scrollWrap) {
    scrollWrap.scrollTop = scrollWrap.scrollHeight;
  }
}

function updateLeakyBucketStats() {
  const lb = appState.lb;
  document.getElementById('lb-stat-total').textContent = lb.stats.total;
  document.getElementById('lb-stat-acc').textContent = lb.stats.accepted;
  document.getElementById('lb-stat-drop').textContent = lb.stats.dropped;
  document.getElementById('lb-stat-rec').textContent = `${lb.stats.received} units`;
  document.getElementById('lb-stat-sent').textContent = `${lb.stats.sent} units`;

  const dropRate = lb.stats.total > 0 ? ((lb.stats.dropped / lb.stats.total) * 100).toFixed(1) + '%' : '0.0%';
  document.getElementById('lb-stat-droprate').textContent = dropRate;

  const avgQ = lb.currentTime > 0 ? (lb.stats.queueSum / lb.currentTime).toFixed(1) + ' units' : '0.0 units';
  document.getElementById('lb-stat-avgqueue').textContent = avgQ;

  const avgDelay = lb.stats.sent > 0 ? (lb.stats.queueSum / lb.stats.sent).toFixed(2) + ' steps' : '0.0 steps';
  document.getElementById('lb-stat-avgdelay').textContent = avgDelay;
}

/* ============================================================================
   EVENT LOG UTILITIES
   ============================================================================ */
function addEventLog(algo, cssClass, message) {
  const container = document.getElementById(`${algo}-event-log`);
  if (!container) return;

  const div = document.createElement('div');
  div.className = `log-entry ${cssClass}`;
  div.innerHTML = `<span class="log-time">[${new Date().toLocaleTimeString().split(' ')[0]}]</span> <span class="log-msg">${message}</span>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function clearEventLog(algo) {
  const container = document.getElementById(`${algo}-event-log`);
  if (container) container.innerHTML = '';
}

/* ============================================================================
   COMPARISON MODE (REVAMPED SYNCHRONIZED TRAFFIC SHAPING ENGINE)
   ============================================================================ */
function initializeComparisonMode() {
  renderPacketInputTable('cmp', PRESET_PACKETS.cmp.burst);
  resetDualSimulation();
}

function resetDualSimulation() {
  const cmp = appState.cmp;
  if (cmp.timer) {
    clearInterval(cmp.timer);
    cmp.timer = null;
  }
  cmp.isRunning = false;
  cmp.isFinished = false;
  cmp.currentTime = 0;
  cmp.packets = readPacketInputs('cmp');
  cmp.history = [];

  const tbCap = parseInt(document.getElementById('cmp-tb-cap').value) || 10;
  const tbRate = parseInt(document.getElementById('cmp-tb-rate').value) || 3;
  const lbCap = parseInt(document.getElementById('cmp-lb-cap').value) || 10;
  const lbRate = parseInt(document.getElementById('cmp-lb-rate').value) || 3;

  cmp.tb = {
    cap: tbCap,
    rate: tbRate,
    currentTokens: Math.min(5, tbCap),
    trans: 0,
    drop: 0
  };

  cmp.lb = {
    cap: lbCap,
    rate: lbRate,
    currentQueue: 0,
    trans: 0,
    drop: 0
  };

  // Reset UI components
  document.getElementById('cmp-output-tbody').innerHTML = '';
  const cmpBadge = document.getElementById('cmp-table-step-count');
  if (cmpBadge) cmpBadge.textContent = '0 Steps';

  document.getElementById('cmp-tb-status').textContent = 'Ready';
  document.getElementById('cmp-lb-status').textContent = 'Ready';
  
  updateComparisonRibbon(0, 'None', '0 units (Idle)', '0 units (Idle)', 'Ready');
  updateComparisonGauges();

  const insight = document.getElementById('cmp-insight-text');
  if (insight) {
    insight.innerHTML = `Click <strong>"Next Step"</strong> or <strong>"Run All"</strong> to generate the live traffic shaping trajectory and compare burst responsiveness.`;
  }

  // Buttons state
  document.getElementById('cmp-btn-next').disabled = false;
  document.getElementById('cmp-btn-run').disabled = false;
  document.getElementById('cmp-btn-pause').disabled = true;

  drawComparisonTrajectoryChart();
}

function stepDualSimulation() {
  const cmp = appState.cmp;
  if (cmp.isFinished) return;

  cmp.currentTime += 1;
  const t = cmp.currentTime;

  // Check incoming traffic packet at time t
  const pkt = cmp.packets.find(p => p.arrival === t);
  const pktId = pkt ? pkt.id : '—';
  const incomingSize = pkt ? pkt.size : 0;

  // 1. STEP TOKEN BUCKET
  const tbAvail = Math.min(cmp.tb.cap, cmp.tb.currentTokens + cmp.tb.rate);
  let tbSent = 0;
  let tbAction = 'Idle';

  if (incomingSize > 0) {
    if (tbAvail >= incomingSize) {
      tbSent = incomingSize;
      cmp.tb.currentTokens = tbAvail - incomingSize;
      cmp.tb.trans += 1;
      tbAction = 'Transmitted';
    } else {
      tbSent = 0;
      cmp.tb.currentTokens = tbAvail;
      cmp.tb.drop += 1;
      tbAction = 'Dropped';
    }
  } else {
    cmp.tb.currentTokens = tbAvail;
    tbAction = 'Idle';
  }

  // 2. STEP LEAKY BUCKET
  const lbQueueBefore = cmp.lb.currentQueue;
  let queueAdmitted = lbQueueBefore;
  let lbAction = 'Idle';

  if (incomingSize > 0) {
    if (lbQueueBefore + incomingSize <= cmp.lb.cap) {
      queueAdmitted = lbQueueBefore + incomingSize;
      cmp.lb.trans += 1;
      lbAction = 'Accepted';
    } else {
      queueAdmitted = lbQueueBefore;
      cmp.lb.drop += 1;
      lbAction = 'Dropped';
    }
  } else {
    lbAction = lbQueueBefore > 0 ? 'Draining' : 'Idle';
  }

  const lbSent = Math.min(queueAdmitted, cmp.lb.rate);
  cmp.lb.currentQueue = queueAdmitted - lbSent;

  // 3. SYNTHESIZE COMPARATIVE TRAFFIC SHAPING INSIGHT
  let note = '';
  let statusVerdict = 'Running';

  if (incomingSize > 0) {
    if (tbAction === 'Transmitted' && lbAction === 'Accepted') {
      if (tbSent > lbSent) {
        note = `Burst spike of ${incomingSize}U handled differently: Token Bucket transmitted all ${incomingSize} units instantly at full line speed (0 delay). Leaky Bucket absorbed the burst into its queue and capped output to ${lbSent} units/t (smoothing the rate, ${cmp.lb.currentQueue}U remaining).`;
        statusVerdict = 'Burst vs Smooth';
      } else {
        note = `Packet ${pktId} (${incomingSize}U) arrived within rate limits: Token Bucket transmitted using tokens; Leaky Bucket transmitted directly within leak rate limit.`;
        statusVerdict = 'Smooth Stream';
      }
    } else if (tbAction === 'Transmitted' && lbAction === 'Dropped') {
      note = `Token Bucket had enough stored tokens (${tbAvail} tokens) to transmit the entire burst immediately! Leaky Bucket dropped packet ${pktId} due to queue buffer overflow (${lbQueueBefore} + ${incomingSize} > ${cmp.lb.cap}).`;
      statusVerdict = 'TB Handled Burst';
    } else if (tbAction === 'Dropped' && lbAction === 'Accepted') {
      note = `Token Bucket lacked tokens (${tbAvail} < ${incomingSize}), so packet dropped. Leaky Bucket had available buffer room and admitted the packet to smooth it out.`;
      statusVerdict = 'LB Buffered';
    } else {
      note = `Packet ${pktId} dropped by both algorithms: Token Bucket had insufficient tokens; Leaky Bucket buffer overflowed.`;
      statusVerdict = 'Both Dropped';
    }
  } else if (lbSent > 0) {
    note = `No new packet arrival: Token Bucket idled and regenerated tokens (+${cmp.tb.rate} tok). Leaky Bucket continued steadily leaking previously queued backlog (${lbSent} units sent, ${cmp.lb.currentQueue} units left).`;
    statusVerdict = 'LB Draining';
  } else {
    note = `Network idle: Token Bucket accumulated tokens to ${cmp.tb.currentTokens}/${cmp.tb.cap}. Leaky Bucket queue is completely empty.`;
    statusVerdict = 'Idle';
  }

  const record = {
    time: t,
    pkt: pktId,
    size: incomingSize,
    tbAvail,
    tbSent,
    tbTokensAfter: cmp.tb.currentTokens,
    tbAction,
    lbQueueBefore,
    lbSent,
    lbQueueAfter: cmp.lb.currentQueue,
    lbAction,
    note
  };

  cmp.history.push(record);

  // Update Ribbon
  const incomingLabel = incomingSize > 0 ? `${pktId} (${incomingSize} units)` : 'None';
  const tbOutputLabel = tbSent > 0 ? `${tbSent} units (${tbAction})` : '0 units (Idle)';
  const lbOutputLabel = lbSent > 0 ? `${lbSent} units (${lbAction})` : '0 units (Idle)';
  updateComparisonRibbon(t, incomingLabel, tbOutputLabel, lbOutputLabel, statusVerdict);

  // Update Gauges & Table & Chart
  updateComparisonGauges();
  appendComparisonTableRow(record);
  drawComparisonTrajectoryChart();

  // Update Insight Text
  const insight = document.getElementById('cmp-insight-text');
  if (insight) {
    insight.innerHTML = `<strong>Time ${t}:</strong> ${note}`;
  }

  // Check completion: all packets processed and leaky queue empty
  const maxArrival = Math.max(...cmp.packets.map(p => p.arrival), 0);
  if (t >= maxArrival && cmp.lb.currentQueue === 0) {
    finishDualSimulation();
  }
}

function runDualSimulation() {
  const cmp = appState.cmp;
  if (cmp.isFinished) resetDualSimulation();

  cmp.isRunning = true;
  document.getElementById('cmp-btn-run').disabled = true;
  document.getElementById('cmp-btn-next').disabled = true;
  document.getElementById('cmp-btn-pause').disabled = false;

  cmp.timer = setInterval(() => {
    if (!cmp.isFinished) {
      stepDualSimulation();
    } else {
      pauseDualSimulation();
    }
  }, cmp.speed);
}

function pauseDualSimulation() {
  const cmp = appState.cmp;
  cmp.isRunning = false;
  if (cmp.timer) {
    clearInterval(cmp.timer);
    cmp.timer = null;
  }
  document.getElementById('cmp-btn-run').disabled = cmp.isFinished;
  document.getElementById('cmp-btn-next').disabled = cmp.isFinished;
  document.getElementById('cmp-btn-pause').disabled = true;
}

function finishDualSimulation() {
  const cmp = appState.cmp;
  cmp.isFinished = true;
  pauseDualSimulation();

  document.getElementById('cmp-tb-status').textContent = 'Completed ✓';
  document.getElementById('cmp-lb-status').textContent = 'Completed ✓';

  const ribbonVerdict = document.getElementById('cmp-ribbon-status');
  if (ribbonVerdict) {
    ribbonVerdict.textContent = 'Simulation Finished';
    ribbonVerdict.className = 'ribbon-value status-badge status-transmitted';
  }
}

function updateComparisonRibbon(time, pkt, tbInfo, lbInfo, verdict) {
  document.getElementById('cmp-ribbon-time').textContent = `T = ${time}`;
  document.getElementById('cmp-ribbon-packet').textContent = pkt;
  document.getElementById('cmp-ribbon-tb').textContent = tbInfo;
  document.getElementById('cmp-ribbon-lb').textContent = lbInfo;

  const verdictBadge = document.getElementById('cmp-ribbon-status');
  if (verdictBadge) {
    verdictBadge.textContent = verdict;
    verdictBadge.className = 'ribbon-value status-badge';
    if (verdict === 'Burst vs Smooth' || verdict === 'TB Handled Burst') {
      verdictBadge.classList.add('status-transmitted');
    } else if (verdict === 'Both Dropped') {
      verdictBadge.classList.add('status-dropped');
    } else {
      verdictBadge.classList.add('status-waiting');
    }
  }
}

function updateComparisonGauges() {
  const cmp = appState.cmp;
  // Token Bucket Gauge
  const tbPct = Math.min(100, Math.round((cmp.tb.currentTokens / cmp.tb.cap) * 100));
  document.getElementById('cmp-tb-tokens-val').textContent = `${cmp.tb.currentTokens} / ${cmp.tb.cap}`;
  document.getElementById('cmp-tb-gauge-bar').style.width = `${tbPct}%`;
  document.getElementById('cmp-tb-trans-val').textContent = cmp.tb.trans;
  document.getElementById('cmp-tb-drop-val').textContent = cmp.tb.drop;

  // Leaky Bucket Gauge
  const lbPct = Math.min(100, Math.round((cmp.lb.currentQueue / cmp.lb.cap) * 100));
  document.getElementById('cmp-lb-queue-val').textContent = `${cmp.lb.currentQueue} / ${cmp.lb.cap} units`;
  document.getElementById('cmp-lb-gauge-bar').style.width = `${lbPct}%`;
  document.getElementById('cmp-lb-trans-val').textContent = cmp.lb.trans;
  document.getElementById('cmp-lb-drop-val').textContent = cmp.lb.drop;
}

function appendComparisonTableRow(record) {
  const tbody = document.getElementById('cmp-output-tbody');
  tbody.querySelectorAll('tr').forEach(r => r.classList.remove('row-active'));

  const tr = document.createElement('tr');
  tr.className = 'row-active';

  const tbBadgeClass = record.tbAction === 'Transmitted' ? 'status-transmitted' : (record.tbAction === 'Dropped' ? 'status-dropped' : 'status-waiting');
  const lbBadgeClass = record.lbAction === 'Accepted' || record.lbSent > 0 ? 'status-transmitted' : (record.lbAction === 'Dropped' ? 'status-dropped' : 'status-waiting');

  tr.innerHTML = `
    <td><strong>T = ${record.time}</strong></td>
    <td>${record.size > 0 ? `<strong>${record.pkt}</strong> (${record.size} units)` : '—'}</td>
    <td>
      <span class="status-badge ${tbBadgeClass}">${record.tbSent > 0 ? `+${record.tbSent} sent` : '0 sent'}</span>
      <small>${record.tbTokensAfter}/${appState.cmp.tb.cap} tokens</small>
    </td>
    <td>
      <span class="status-badge ${lbBadgeClass}">${record.lbSent > 0 ? `+${record.lbSent} sent` : '0 sent'}</span>
      <small>Q: ${record.lbQueueAfter}/${appState.cmp.lb.cap} units</small>
    </td>
    <td><small>${record.note}</small></td>
  `;

  tbody.appendChild(tr);

  const cmpBadge = document.getElementById('cmp-table-step-count');
  if (cmpBadge) cmpBadge.textContent = `${appState.cmp.history.length} Steps`;

  const scrollWrap = tbody.closest('.sim-table-scroll');
  if (scrollWrap) {
    scrollWrap.scrollTop = scrollWrap.scrollHeight;
  }
}

function drawComparisonTrajectoryChart() {
  const canvas = document.getElementById('cmp-trajectory-chart');
  if (!canvas) return;

  const dpr = window.devicePixelRatio || 1;
  const w = canvas.parentElement.clientWidth || 650;
  const h = 230;

  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, w, h);

  const cmp = appState.cmp;
  const history = cmp.history;

  // Chart Margins
  const padLeft = 45;
  const padRight = 30;
  const padTop = 30;
  const padBottom = 35;
  const plotW = w - padLeft - padRight;
  const plotH = h - padTop - padBottom;

  // Determine scale parameters
  const maxArrival = Math.max(...cmp.packets.map(p => p.arrival), 0);
  const totalSteps = Math.max(history.length, maxArrival + 2, 7);
  const maxTrafficVal = Math.max(
    10,
    ...cmp.packets.map(p => p.size),
    cmp.tb.cap,
    cmp.lb.cap
  );

  const stepX = plotW / Math.max(totalSteps - 1, 1);

  // Background Grid Lines
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#64748b';
  ctx.font = '10px Inter, sans-serif';
  ctx.textAlign = 'right';

  const gridLevels = 4;
  for (let i = 0; i <= gridLevels; i++) {
    const val = Math.round((maxTrafficVal / gridLevels) * i);
    const y = padTop + plotH - (val / maxTrafficVal) * plotH;

    ctx.beginPath();
    ctx.moveTo(padLeft, y);
    ctx.lineTo(w - padRight, y);
    ctx.stroke();

    ctx.fillText(`${val} U`, padLeft - 6, y + 3);
  }

  // X-Axis Time Ticks
  ctx.textAlign = 'center';
  for (let s = 1; s <= totalSteps; s++) {
    const x = padLeft + (s - 1) * stepX;
    ctx.beginPath();
    ctx.moveTo(x, padTop + plotH);
    ctx.lineTo(x, padTop + plotH + 4);
    ctx.stroke();

    ctx.fillText(`T=${s}`, x, padTop + plotH + 16);
  }

  // Y-axis and X-axis main lines
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(padLeft, padTop);
  ctx.lineTo(padLeft, padTop + plotH);
  ctx.lineTo(w - padRight, padTop + plotH);
  ctx.stroke();

  // If no history yet: show instructional guide
  if (history.length === 0) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Live Traffic Shaping Trajectory will plot here as simulation runs', padLeft + plotW / 2, padTop + plotH / 2);
    ctx.font = '11px Inter, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Shows Ingress Bursts vs. Instant Token Bucket Out vs. Constant Leaky Bucket Stream', padLeft + plotW / 2, padTop + plotH / 2 + 20);
    return;
  }

  // LAYER 1: Ingress Traffic Burst Bars (Light Purple Pillars)
  history.forEach(h => {
    if (h.size > 0) {
      const x = padLeft + (h.time - 1) * stepX;
      const barH = (h.size / maxTrafficVal) * plotH;
      const y = padTop + plotH - barH;
      const barW = Math.max(16, stepX * 0.4);

      ctx.fillStyle = 'rgba(192, 132, 252, 0.35)';
      ctx.fillRect(x - barW / 2, y, barW, barH);

      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x - barW / 2, y, barW, barH);

      // Packet label above bar
      ctx.fillStyle = '#e9d5ff';
      ctx.font = 'bold 9px Fira Code, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${h.pkt}:${h.size}`, x, y - 5);
    }
  });

  // LAYER 2: Token Bucket Transmission Line (Emerald Green)
  if (history.length > 0) {
    ctx.beginPath();
    history.forEach((h, idx) => {
      const x = padLeft + (h.time - 1) * stepX;
      const y = padTop + plotH - (h.tbSent / maxTrafficVal) * plotH;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Subtle area gradient under TB line
    const lastX = padLeft + (history[history.length - 1].time - 1) * stepX;
    const firstX = padLeft + (history[0].time - 1) * stepX;
    ctx.lineTo(lastX, padTop + plotH);
    ctx.lineTo(firstX, padTop + plotH);
    ctx.closePath();

    const tbGrad = ctx.createLinearGradient(0, padTop, 0, padTop + plotH);
    tbGrad.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
    tbGrad.addColorStop(1, 'rgba(16, 185, 129, 0.0)');
    ctx.fillStyle = tbGrad;
    ctx.fill();

    // Data points
    history.forEach(h => {
      const x = padLeft + (h.time - 1) * stepX;
      const y = padTop + plotH - (h.tbSent / maxTrafficVal) * plotH;
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(x, y, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
  }

  // LAYER 3: Leaky Bucket Transmission Line (Sky Blue Plateau)
  if (history.length > 0) {
    ctx.beginPath();
    history.forEach((h, idx) => {
      const x = padLeft + (h.time - 1) * stepX;
      const y = padTop + plotH - (h.lbSent / maxTrafficVal) * plotH;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Subtle area gradient under LB line
    const lastX = padLeft + (history[history.length - 1].time - 1) * stepX;
    const firstX = padLeft + (history[0].time - 1) * stepX;
    ctx.lineTo(lastX, padTop + plotH);
    ctx.lineTo(firstX, padTop + plotH);
    ctx.closePath();

    const lbGrad = ctx.createLinearGradient(0, padTop, 0, padTop + plotH);
    lbGrad.addColorStop(0, 'rgba(56, 189, 248, 0.25)');
    lbGrad.addColorStop(1, 'rgba(56, 189, 248, 0.0)');
    ctx.fillStyle = lbGrad;
    ctx.fill();

    // Data points
    history.forEach(h => {
      const x = padLeft + (h.time - 1) * stepX;
      const y = padTop + plotH - (h.lbSent / maxTrafficVal) * plotH;
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
  }
}
