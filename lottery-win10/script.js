/**
 * Science Classroom Lottery Script - SMOOTH CONVEYOR VERSION
 */

const PRIZE_TYPES = [
    {
        name: "20 积分",
        color: "text-blue-700",
        icon: "💎",
        bg: "bg-gradient-to-br from-blue-200 via-blue-100 to-white",
        border: "border-blue-400",
        glow: "shadow-[0_0_15px_rgba(59,130,246,0.5)]",
        tier: "common",
        tierLabel: "🌱入门",
        tierStyle: "bg-gradient-to-r from-blue-400 to-cyan-400 text-white",
        animation: "",
        scoreValue: 20
    },
    {
        name: "25 积分",
        color: "text-purple-700",
        icon: "🧪",
        bg: "bg-gradient-to-br from-purple-300 via-purple-200 to-pink-100",
        border: "border-purple-500",
        glow: "shadow-[0_0_20px_rgba(168,85,247,0.6)]",
        tier: "rare",
        tierLabel: "🚀进阶",
        tierStyle: "bg-gradient-to-r from-purple-500 to-pink-500 text-white",
        animation: "animate-pulse",
        scoreValue: 25
    },
    {
        name: "30 积分",
        color: "text-yellow-800",
        icon: "⭐",
        bg: "bg-gradient-to-br from-yellow-300 via-yellow-200 to-orange-100",
        border: "border-yellow-500",
        glow: "shadow-[0_0_25px_rgba(234,179,8,0.7)]",
        tier: "epic",
        tierLabel: "🏆精英",
        tierStyle: "bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 text-white",
        animation: "animate-bounce",
        scoreValue: 30
    },
    {
        name: "40 积分",
        color: "text-pink-800",
        icon: "🏆",
        bg: "bg-gradient-to-br from-pink-400 via-purple-400 to-blue-400",
        border: "border-4 border-pink-500",
        glow: "shadow-[0_0_40px_rgba(236,72,153,1),_0_0_60px_rgba(168,85,247,0.8)]",
        tier: "legendary",
        tierLabel: "👑神话",
        tierStyle: "bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white animate-pulse",
        animation: "animate-bounce",
        scoreValue: 40
    },
    {
        name: "神秘奖品",
        color: "text-indigo-900 drop-shadow-lg",
        icon: "🌌",
        bg: "bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900",
        border: "border-4 border-indigo-400",
        glow: "shadow-[0_0_50px_rgba(79,70,229,0.8),_inset_0_0_20px_rgba(255,255,255,0.5)]",
        tier: "mystery",
        tierLabel: "✦ 宇宙 ✦",
        tierStyle: "bg-gradient-to-r from-indigo-600 via-purple-800 to-fuchsia-600 text-yellow-300 border border-yellow-200 shadow-lg animate-pulse",
        animation: "animate-pulse",
        scoreValue: 0 // Dynamic
    }
];

// Configuration
const SLOT_COUNT = 20;
let gameState = 'IDLE';

// 科学老师百宝袋积分系统
const TEACHER_TOTAL_SCORE = 9999; // 老师的总积分池
let teacherCurrentScore = TEACHER_TOTAL_SCORE; // 当前剩余积分

function updateTreasureDisplay(deductedPoints) {
    const scoreValueEl = document.getElementById('treasure-score-value');
    const barFillEl = document.getElementById('treasure-bar-fill');
    if (!scoreValueEl || !barFillEl) return;

    // 更新数字显示
    scoreValueEl.textContent = teacherCurrentScore;

    // 更新进度条宽度
    const percent = Math.max(0, (teacherCurrentScore / TEACHER_TOTAL_SCORE) * 100);
    barFillEl.style.width = percent + '%';

    // 扣分动画效果
    if (deductedPoints && deductedPoints > 0) {
        scoreValueEl.classList.add('deducting');
        setTimeout(() => scoreValueEl.classList.remove('deducting'), 600);
    }

    // 低积分警告样式
    if (teacherCurrentScore <= TEACHER_TOTAL_SCORE * 0.2) {
        barFillEl.classList.add('low-score');
        scoreValueEl.classList.add('score-danger');
    } else {
        barFillEl.classList.remove('low-score');
        scoreValueEl.classList.remove('score-danger');
    }

    // 积分耗尽
    if (teacherCurrentScore <= 0) {
        scoreValueEl.classList.add('score-empty');
    } else {
        scoreValueEl.classList.remove('score-empty');
    }
}
let audioCtx = null;
let currentSlots = [];

// Animation State
let globalProgress = 0; // 0 to 1
let rotationSpeed = 0.0005; // Base speed for idle
let targetRotationSpeed = 0.0005;
let animationFrameId = null;

// DOM Elements
const slotsContainer = document.getElementById('slots-container');
const startBtn = document.getElementById('start-btn');
const statusText = document.getElementById('status-text');
const loadingBar = document.getElementById('loading-bar');
const modal = document.getElementById('prize-modal');
const modalText = document.getElementById('modal-text');
const modalIcon = document.getElementById('modal-icon');

// Sound Synthesizer
const SoundFX = {
    init: () => {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
    },
    playPop: () => {
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(500, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1000, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
    },
    playLock: () => {
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(200, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
    },
    playShake: () => {
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(50, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.2);
    },
    playOpen: () => {
        if (!audioCtx) return;
        const now = audioCtx.currentTime;
        [800, 1200, 1500, 2000].forEach((freq, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.05, now + i * 0.05);
            gain.gain.linearRampToValueAtTime(0, now + i * 0.05 + 0.3);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now + i * 0.05);
            osc.stop(now + i * 0.05 + 0.3);
        });
    }
};

// Utils
function generatePrizes(count) {
    // Probability Rules:
    // 25 积分: 35% (0.35 * 20 = 7 items) - 减少15%
    // 30 积分: 35% (0.35 * 20 = 7 items) - 增加15%
    // 40 积分: 10% (0.10 * 20 = 2 items) - 增加0%
    // 20 积分: 10% (0.10 * 20 = 2 items)
    // 神秘:    10% (0.10 * 20 = 2 items)

    // Map names to indices in PRIZE_TYPES based on their names
    // PRIZE_TYPES[0]: 20 积分
    // PRIZE_TYPES[1]: 25 积分
    // PRIZE_TYPES[2]: 30 积分
    // PRIZE_TYPES[3]: 40 积分
    // PRIZE_TYPES[4]: 神秘奖品

    // Define counts for 20 slots
    const distribution = [
        { id: 1, count: 7 },  // 25 积分 35%
        { id: 2, count: 7 },  // 30 积分 35%
        { id: 0, count: 2 },  // 20 积分 10%
        { id: 3, count: 2 },  // 40 积分 10%
        { id: 4, count: 2 }   // 神秘 10%
    ];

    let pool = [];
    distribution.forEach(dist => {
        const prize = PRIZE_TYPES[dist.id];
        for (let i = 0; i < dist.count; i++) {
            pool.push(prize);
        }
    });

    // If count doesn't match 20 for some reason (e.g. dynamic resize), fill randomly or truncate
    if (count !== 20) {
        // Fallback for non-standard counts: simple random weighted fill
        // Note: For this specific request, we assume count is always 20
        // But to be safe, if pool < count, fill rest with '25 积分' (most common)
        while (pool.length < count) {
            pool.push(PRIZE_TYPES[1]);
        }
        // If pool > count, slice
        if (pool.length > count) {
            pool = pool.slice(0, count);
        }
    }

    // Constraint Enforcement: Mystery Prizes must be separated by at least 2 slots
    // "隔开两个奖品" means index distance >= 3 (e.g. indices 0 and 3 have indices 1,2 between them)
    let valid = false;
    let attempts = 0;

    // Attempt to shuffle until valid configuration found
    while (!valid && attempts < 500) {
        shuffle(pool);

        const mysteryIndices = [];
        pool.forEach((p, index) => {
            if (p.name === "神秘奖品") mysteryIndices.push(index);
        });

        // If fewer than 2 mystery prizes, constraint is trivially satisfied
        if (mysteryIndices.length < 2) {
            valid = true;
        } else {
            // Check circular distance between all pairs
            let conflict = false;
            for (let i = 0; i < mysteryIndices.length; i++) {
                for (let j = i + 1; j < mysteryIndices.length; j++) {
                    const idx1 = mysteryIndices[i];
                    const idx2 = mysteryIndices[j];

                    const diff = Math.abs(idx1 - idx2);
                    const dist = Math.min(diff, count - diff); // Circular distance

                    // Distance 1 means adjacent (0 items between)
                    // Distance 2 means 1 item between
                    // Distance 3 means 2 items between -> This is the requirement
                    if (dist < 3) {
                        conflict = true;
                        break;
                    }
                }
                if (conflict) break;
            }
            if (!conflict) valid = true;
        }
        attempts++;
    }

    return pool;
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// 检测加分前后是否突破称号里程碑(50, 100, 200, 300...)
// 返回突破的里程碑数值，未突破则返回 null
function checkMilestoneCrossed(scoreBefore, scoreAfter) {
    if (scoreAfter <= scoreBefore) return null;
    
    // 获取加分前后的称号级别
    const tierBefore = getTitleForScore(scoreBefore).tier;
    const tierAfter = getTitleForScore(scoreAfter).tier;
    
    if (tierAfter > tierBefore) {
        // 找到了突破的新称号
        const newTitle = TITLE_TIERS.find(t => t.tier === tierAfter);
        if (newTitle) {
            return newTitle.min; // 返回触发该称号的最低分数（如50、100、200...）
        }
    }
    return null;
}

// Modal Control
window.closeModal = function () {
    modal.classList.add('opacity-0');
    modal.querySelector('div').classList.add('scale-90');
    setTimeout(() => {
        modal.classList.add('hidden');
        if (gameState === 'REVEALED') {
            handleRestart();
        }
    }, 300);
}

function showModal(prize, totalScore, milestoneCrossed) {
    modalIcon.innerText = prize.icon;
    modalText.innerText = prize.name;
    const textSize = prize.name.length > 15 ? 'text-2xl' : 'text-4xl';
    modalText.className = `${textSize} font-black mb-4 ${prize.color}`;

    // 显示累积积分区域
    const totalScoreDiv = document.getElementById('modal-total-score');
    const totalScoreText = document.getElementById('modal-total-score-text');
    const milestoneBadge = document.getElementById('modal-milestone-badge');

    if (totalScore !== undefined && totalScore !== null) {
        const studentName = StudentManager.currentStudent ? StudentManager.currentStudent.name : '';
        totalScoreText.textContent = `${studentName}已经累积获得 ${totalScore} 积分`;
        totalScoreDiv.classList.remove('hidden');

        // 突破100倍数提示
        if (milestoneCrossed) {
            milestoneBadge.textContent = `（突破${milestoneCrossed}！）`;
            milestoneBadge.classList.remove('hidden');
        } else {
            milestoneBadge.classList.add('hidden');
        }
    } else {
        totalScoreDiv.classList.add('hidden');
        milestoneBadge.classList.add('hidden');
    }

    modal.classList.remove('hidden');
    void modal.offsetWidth;
    modal.classList.remove('opacity-0');
    modal.querySelector('div').classList.remove('scale-90');
}

// POSITIONAL ENGINE (Discrete Slot System)
// 使用离散槽位系统，避免拐角重叠
// 轨道布局：上边7个，右边3个，下边7个，左边3个 = 20个
const EDGE_SLOTS = {
    top: 7,
    right: 3,
    bottom: 7,
    left: 3
};
const TOTAL_EDGE_SLOTS = EDGE_SLOTS.top + EDGE_SLOTS.right + EDGE_SLOTS.bottom + EDGE_SLOTS.left;

// 预计算每个槽位在0-1进度上的位置
function getSlotPositions() {
    const positions = [];
    let currentSlot = 0;

    // 上边 (从左到右)
    for (let i = 0; i < EDGE_SLOTS.top; i++) {
        positions.push({ edge: 'top', index: i, slot: currentSlot++ });
    }
    // 右边 (从上到下)
    for (let i = 0; i < EDGE_SLOTS.right; i++) {
        positions.push({ edge: 'right', index: i, slot: currentSlot++ });
    }
    // 下边 (从右到左)
    for (let i = 0; i < EDGE_SLOTS.bottom; i++) {
        positions.push({ edge: 'bottom', index: i, slot: currentSlot++ });
    }
    // 左边 (从下到上)
    for (let i = 0; i < EDGE_SLOTS.left; i++) {
        positions.push({ edge: 'left', index: i, slot: currentSlot++ });
    }

    return positions;
}

const SLOT_POSITIONS = getSlotPositions();

function getPointOnTrack(progress) {
    const w = slotsContainer.clientWidth;
    const h = slotsContainer.clientHeight;

    // 卡牌尺寸
    const slotW = 180;
    const slotH = 130;

    // 内边距 - 卡牌中心到容器边缘的距离
    const marginX = slotW / 2 + 10;  // 100px from edge
    const marginY = slotH / 2 + 10;  // 75px from edge

    // 计算可用的轨道区域
    const trackLeft = marginX;
    const trackRight = w - marginX;
    const trackTop = marginY;
    const trackBottom = h - marginY;

    const trackWidth = trackRight - trackLeft;
    const trackHeight = trackBottom - trackTop;

    // 将连续进度转换为离散槽位
    const totalProgress = (progress % 1 + 1) % 1; // 确保在 0-1 范围
    const floatSlot = totalProgress * TOTAL_EDGE_SLOTS;
    const slotIndex = Math.floor(floatSlot) % TOTAL_EDGE_SLOTS;
    const slotFrac = floatSlot - Math.floor(floatSlot); // 槽位内的插值

    // 获取当前槽位和下一个槽位
    const currentSlotInfo = SLOT_POSITIONS[slotIndex];
    const nextSlotInfo = SLOT_POSITIONS[(slotIndex + 1) % TOTAL_EDGE_SLOTS];

    // 计算槽位的实际坐标
    function getSlotCoord(info) {
        switch (info.edge) {
            case 'top': {
                // 上边：从左到右均匀分布
                const spacing = trackWidth / EDGE_SLOTS.top;
                const x = trackLeft + spacing * (info.index + 0.5);
                return { x, y: trackTop };
            }
            case 'right': {
                // 右边：从上到下均匀分布
                const spacing = trackHeight / EDGE_SLOTS.right;
                const y = trackTop + spacing * (info.index + 0.5);
                return { x: trackRight, y };
            }
            case 'bottom': {
                // 下边：从右到左均匀分布
                const spacing = trackWidth / EDGE_SLOTS.bottom;
                const x = trackRight - spacing * (info.index + 0.5);
                return { x, y: trackBottom };
            }
            case 'left': {
                // 左边：从下到上均匀分布
                const spacing = trackHeight / EDGE_SLOTS.left;
                const y = trackBottom - spacing * (info.index + 0.5);
                return { x: trackLeft, y };
            }
        }
    }

    const currentCoord = getSlotCoord(currentSlotInfo);
    const nextCoord = getSlotCoord(nextSlotInfo);

    // 平滑插值到下一个槽位
    return {
        x: currentCoord.x + (nextCoord.x - currentCoord.x) * slotFrac,
        y: currentCoord.y + (nextCoord.y - currentCoord.y) * slotFrac
    };
}

let animationRunning = false;
let lastAnimateTime = 0;
const PERF_MODE_FPS = 30; // Throttle to 30fps in perf mode
const PERF_MODE_INTERVAL = 1000 / PERF_MODE_FPS;

function animate(timestamp) {
    const isPerfMode = document.body.classList.contains('perf-mode');

    // ⚡ In perf mode, throttle to 30fps
    if (isPerfMode && timestamp - lastAnimateTime < PERF_MODE_INTERVAL) {
        animationFrameId = requestAnimationFrame(animate);
        return;
    }
    lastAnimateTime = timestamp;

    // Smooth speed transition
    rotationSpeed += (targetRotationSpeed - rotationSpeed) * 0.1;
    globalProgress += rotationSpeed;
    if (globalProgress >= 1) globalProgress -= 1;

    if (isPerfMode) {
        // ⚡ GPU-accelerated: use transform instead of left/top
        currentSlots.forEach((slot, i) => {
            const slotProgress = (globalProgress + (i / SLOT_COUNT)) % 1;
            const pos = getPointOnTrack(slotProgress);
            slot.style.transform = `translate(${pos.x - 90}px, ${pos.y - 65}px)`;
        });
    } else {
        currentSlots.forEach((slot, i) => {
            const slotProgress = (globalProgress + (i / SLOT_COUNT)) % 1;
            const pos = getPointOnTrack(slotProgress);
            slot.style.left = `${pos.x - 90}px`;
            slot.style.top = `${pos.y - 65}px`;
        });
    }

    // ⚡ Optimization: stop rAF when nearly stopped and target is 0
    if (targetRotationSpeed === 0 && Math.abs(rotationSpeed) < 0.00001) {
        rotationSpeed = 0;
        animationFrameId = null;
        animationRunning = false;
        return;
    }

    animationFrameId = requestAnimationFrame(animate);
}

function startAnimation() {
    if (!animationRunning) {
        animationRunning = true;
        animationFrameId = requestAnimationFrame(animate);
    }
}

// Initialization
function initGrid() {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);

    slotsContainer.innerHTML = '';
    currentSlots = [];
    const prizes = generatePrizes(SLOT_COUNT);

    prizes.forEach((prize, index) => {
        const slot = document.createElement('div');
        slot.className = `slot-item`;
        slot.style.transition = 'none'; // Essential for per-frame updates

        slot.dataset.prizeName = prize.name;
        slot.dataset.prizeIcon = prize.icon;
        slot.dataset.prizeColor = prize.color;

        slot.innerHTML = `
            <div class="chest-container">
                <div class="chest-wrapper">
                    <div class="prize-display absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-500">
                        <div class="${prize.bg} rounded-2xl p-3 shadow-2xl border-4 ${prize.border} ${prize.glow} w-full h-full flex flex-col items-center justify-center transform hover:scale-105 transition-transform overflow-hidden relative">
                            ${prize.tier === 'legendary' ? '<div class="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,_rgba(255,255,255,0.9)_0%,_transparent_40%)] animate-pulse"></div>' : ''}
                            <div class="${prize.tier === 'legendary' ? 'text-4xl' : 'text-3xl'} mb-1 ${prize.animation} filter drop-shadow-lg z-10">${prize.icon}</div>
                            <div class="text-sm font-black ${prize.color} bg-white/90 px-3 py-0.5 rounded-full shadow-md z-10 whitespace-nowrap text-center">${prize.name}</div>
                            <div class="absolute top-1 right-1 ${prize.tierStyle} text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-lg">${prize.tierLabel}</div>
                        </div>
                    </div>
                    <div class="locked-chest absolute inset-0 opacity-0 pointer-events-none transition-opacity duration-300">
                         <div class="relative w-full h-full flex flex-col items-center justify-center">
                            <div class="chest-box relative w-full h-full bg-gradient-to-br from-amber-600 via-yellow-700 to-amber-800 rounded-2xl shadow-2xl border-4 border-yellow-900/60 overflow-hidden">
                                <div class="absolute inset-0 opacity-20" style="background-image: repeating-linear-gradient(90deg, transparent, transparent 15px, #000 15px, #000 17px);"></div>
                                <div class="absolute inset-y-0 left-6 w-4 bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-600 border-x border-yellow-800"></div>
                                <div class="absolute inset-y-0 right-6 w-4 bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-600 border-x border-yellow-800"></div>
                                <div class="absolute inset-x-0 top-[45%] h-1.5 bg-amber-900"></div>
                            </div>
                            <div class="chest-lock absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30">
                                <div class="w-12 h-14 bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-600 rounded-lg shadow-lg border-2 border-yellow-200 flex items-center justify-center">🔒</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        slot.addEventListener('click', () => handleSlotClick(slot));
        slotsContainer.appendChild(slot);
        currentSlots.push(slot);
    });

    gameState = 'IDLE';
    targetRotationSpeed = 0.0003; // Slow continuous crawl
    animationRunning = true;
    animate();
}

// Game Logic
async function handleStart() {
    if (gameState !== 'IDLE' && gameState !== 'REVEALED') return;

    // Check if student selected
    if (!StudentManager.currentStudent) {
        openStudentModal();
        // alert("请先选择一位同学！"); // Removed alert, just open modal
        return;
    }

    SoundFX.init();
    gameState = 'SHUFFLING';
    statusText.innerText = '正在密封宝箱...';
    startBtn.disabled = true;
    startBtn.classList.add('opacity-50');

    // 1. Show Locks
    currentSlots.forEach((el, i) => {
        setTimeout(() => {
            el.querySelector('.prize-display').style.opacity = '0';
            el.querySelector('.locked-chest').style.opacity = '1';
            el.querySelector('.locked-chest').style.pointerEvents = 'auto';
            SoundFX.playLock();
        }, i * 10);
    });

    await new Promise(r => setTimeout(r, 200));

    // 2. High Speed Fly-by
    statusText.innerText = '正在随机交换位置...';
    loadingBar.style.width = '100%';
    targetRotationSpeed = 0.04; // FAST!
    startAnimation(); // Ensure animation loop is running

    // Shake effect sound
    const shakeInterval = setInterval(() => SoundFX.playShake(), 200);

    await new Promise(r => setTimeout(r, 800));
    clearInterval(shakeInterval);

    // 3. Decelerate to stop for picking
    targetRotationSpeed = 0;
    statusText.innerText = '请选择一个幸运宝箱';

    // Wait for it to settle down
    await new Promise(r => setTimeout(r, 300));

    // Shuffle actual data internally
    const newPrizes = generatePrizes(SLOT_COUNT);
    currentSlots.forEach((slot, i) => {
        const prize = newPrizes[i];
        slot.dataset.prizeName = prize.name;
        slot.dataset.prizeIcon = prize.icon;
        slot.dataset.prizeColor = prize.color;

        const display = slot.querySelector('.prize-display');
        display.innerHTML = `
            <div class="${prize.bg} rounded-2xl p-3 shadow-2xl border-4 ${prize.border} ${prize.glow} w-full h-full flex flex-col items-center justify-center transform hover:scale-105 transition-transform overflow-hidden relative">
                ${prize.tier === 'legendary' ? '<div class="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,_rgba(255,255,255,0.9)_0%,_transparent_40%)] animate-pulse"></div>' : ''}
                <div class="${prize.tier === 'legendary' ? 'text-4xl' : 'text-3xl'} mb-1 ${prize.animation} filter drop-shadow-lg z-10">${prize.icon}</div>
                <div class="text-sm font-black ${prize.color} bg-white/90 px-3 py-0.5 rounded-full shadow-md z-10 whitespace-nowrap text-center">${prize.name}</div>
                <div class="absolute top-1 right-1 ${prize.tierStyle} text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-lg">${prize.tierLabel}</div>
            </div>
        `;
    });

    gameState = 'PICKING';
    loadingBar.style.width = '0%';
    slotsContainer.classList.add('cursor-pointer');
}

function handleSlotClick(slotElement) {
    if (gameState !== 'PICKING') return;

    gameState = 'REVEALED';
    SoundFX.playOpen();

    // 1. Reveal ALL slots at once
    currentSlots.forEach(slot => {
        const lock = slot.querySelector('.chest-lock');
        const lockedChest = slot.querySelector('.locked-chest');
        const prizeDisplay = slot.querySelector('.prize-display');

        // Lock Animation
        lock.style.transition = 'transform 0.6s ease-in, opacity 0.6s';
        lock.style.transform = 'translate(-50%, 150px) rotate(45deg)';
        lock.style.opacity = '0';

        // Prize Reveal
        setTimeout(() => {
            lockedChest.style.opacity = '0';
            prizeDisplay.style.opacity = '1';
        }, 400);
    });

    // 2. Show the Modal specifically for the clicked one
    setTimeout(() => {
        let prizeName = slotElement.dataset.prizeName;
        const prizeIcon = slotElement.dataset.prizeIcon;
        const prizeColor = slotElement.dataset.prizeColor;

        // Custom Logic for Mystery Prize
        if (prizeName === "神秘奖品") {
            const index = currentSlots.indexOf(slotElement);
            const total = currentSlots.length;

            // Helper to get prize value from name
            const getVal = (name) => {
                const p = PRIZE_TYPES.find(pt => pt.name === name);
                return p ? p.scoreValue : 0;
            };

            // Helper to get prize name at relative offset (circular)
            const getPrizeAt = (offset) => {
                const targetIndex = (index + offset + total) % total;
                return currentSlots[targetIndex].dataset.prizeName;
            };

            const L1 = getPrizeAt(-1); // Left 1
            const L2 = getPrizeAt(-2); // Left 2
            const R1 = getPrizeAt(1);  // Right 1
            const R2 = getPrizeAt(2);  // Right 2

            // Random 1-4
            const outcome = Math.floor(Math.random() * 4); // 0, 1, 2, 3

            let totalWon = 0;
            let resultDetail = "";
            let resultIcon = "";

            if (outcome === 0) {
                totalWon = getVal(L1) + getVal(R1);
                resultDetail = `神秘大奖：获得左边 [${L1}] 和 右边 [${R1}] 的奖励！(共 ${totalWon} 积分)`;
            } else if (outcome === 1) {
                totalWon = getVal(L1) + getVal(L2);
                resultDetail = `神秘大奖：获得左边两个宝笱 [${L1}] + [${L2}] 的奖励！(共 ${totalWon} 积分)`;
            } else if (outcome === 2) {
                totalWon = getVal(R1) + getVal(R2);
                resultDetail = `神秘大奖：获得右边两个宝笱 [${R1}] + [${R2}] 的奖励！(共 ${totalWon} 积分)`;
            } else {
                totalWon = 20 + 40; // 20 pts + 40 pts
                resultDetail = `神秘大奖：获得 20 积分 和 40 积分！(共 ${totalWon} 积分)`;
            }

            // 加分前记录旧积分
            const scoreBefore = StudentManager.currentStudent ? StudentManager.currentStudent.score : 0;
            // Apply Score
            StudentManager.addScore(totalWon);
            const scoreAfter = StudentManager.currentStudent ? StudentManager.currentStudent.score : 0;

            // 检测是否突破100的整数倍数
            const milestone = checkMilestoneCrossed(scoreBefore, scoreAfter);

            prizeName = resultDetail;
            const prize = {
                name: prizeName,
                icon: prizeIcon,
                color: prizeColor
            };
            showModal(prize, scoreAfter, milestone);
        } else {
            // Standard Prize
            const basePrize = PRIZE_TYPES.find(p => p.name === prizeName);
            if (basePrize) {
                // 加分前记录旧积分
                const scoreBefore = StudentManager.currentStudent ? StudentManager.currentStudent.score : 0;
                StudentManager.addScore(basePrize.scoreValue);
                const scoreAfter = StudentManager.currentStudent ? StudentManager.currentStudent.score : 0;

                // 检测是否突破100的整数倍数
                const milestone = checkMilestoneCrossed(scoreBefore, scoreAfter);

                const prize = {
                    name: prizeName,
                    icon: prizeIcon,
                    color: prizeColor
                };
                showModal(prize, scoreAfter, milestone);
            } else {
                const prize = {
                    name: prizeName,
                    icon: prizeIcon,
                    color: prizeColor
                };
                showModal(prize, null, null);
            }
        }

        statusText.innerText = '揭晓所有奖品！';
    }, 450);
}

function handleRestart() {
    SoundFX.playPop();
    gameState = 'IDLE';
    startBtn.classList.remove('hidden', 'opacity-50');
    startBtn.disabled = false;
    statusText.innerText = '准备就绪';
    // Clear current student for next round if desired? 
    // User requirement: "select student... then start". 
    // Usually in class you might want to keep the same student if they get multiple spins, or force re-select.
    // For now, let's KEEP the student selected to allow multiple spins, but maybe visually indicate they can change it.
    // Actually, "Click Select Student... then Start" implies a flow. Let's not force clear, but the button is always there.

    initGrid();
}



// --- STUDENT MANAGER & LEADERBOARD SYSTEM ---

// ========================================
// 🎮 TITLE/RANK SYSTEM - 12 Tiers
// ========================================
const TITLE_TIERS = [
    { min: 0, max: 49, name: "科学小萌新", icon: "🌱", tier: 1, scoreIcon: "💧" },
    { min: 50, max: 99, name: "科学探索者", icon: "🔬", tier: 2, scoreIcon: "💎" },
    { min: 100, max: 199, name: "科学小达人", icon: "⚗️", tier: 3, scoreIcon: "💜" },
    { min: 200, max: 299, name: "科学先锋", icon: "🧬", tier: 4, scoreIcon: "🔷" },
    { min: 300, max: 399, name: "科学之星", icon: "🔭", tier: 5, scoreIcon: "⭐" },
    { min: 400, max: 499, name: "科学精英", icon: "🌟", tier: 6, scoreIcon: "🏆" },
    { min: 500, max: 599, name: "科学大师", icon: "🚀", tier: 7, scoreIcon: "💖" },
    { min: 600, max: 699, name: "科学王者", icon: "👑", tier: 8, scoreIcon: "👑" },
    { min: 700, max: 799, name: "科学传奇", icon: "🌌", tier: 9, scoreIcon: "🌟" },
    { min: 800, max: 899, name: "科学主宰", icon: "⚡", tier: 10, scoreIcon: "💫" },
    { min: 900, max: 999, name: "科学创世", icon: "🌍", tier: 11, scoreIcon: "🌈" },
    { min: 1000, max: Infinity, name: "科学之神", icon: "✨", tier: 12, scoreIcon: "🔥" }
];

/**
 * Get title info based on score
 * @param {number} score - Student's total score
 * @returns {Object} - Title object with name, icon, tier, tierClass, scoreIcon
 */
function getTitleForScore(score) {
    for (const title of TITLE_TIERS) {
        if (score >= title.min && score <= title.max) {
            return {
                name: title.name,
                icon: title.icon,
                tier: title.tier,
                tierClass: `title-tier-${title.tier}`,
                scoreIcon: title.scoreIcon
            };
        }
    }
    // Fallback to first tier
    return {
        name: TITLE_TIERS[0].name,
        icon: TITLE_TIERS[0].icon,
        tier: 1,
        tierClass: 'title-tier-1',
        scoreIcon: TITLE_TIERS[0].scoreIcon
    };
}

const CLASS_DATA = {
    "5-1": ["张心怡", "严颖", "梁睿轩", "卢信佳", "陈可家", "黄莉媛", "骆梓皓", "谢幸欣", "张煜婷", "邝诗羽", "蔡浩", "骆颖豪", "卢家亮", "郭芷妍", "龙泽兴", "邵贞雯", "叶佳欣", "卢冠钊", "卢晓筠", "何绍铭", "朱宁聖", "何孝霖", "卢俊华", "刘妍汐", "刘辰昊", "谢梓晨", "刘颖贤", "邵启星", "成浩天", "余梓琳", "黄伟轩", "钟子茵", "曾丰羽", "熊若熙", "陈嘉敏", "李浩天", "慕容昌睿", "黄梓睿", "李俊轩", "刘蕙茝", "龙明朗", "冯星诚", "李家航", "叶彦宏", "黎敏婷", "黄学骏", "姚志豪", "陈梦婕", "黄丽淇"],
    "5-2": ["钟梓莹", "黄瑾瑜", "李悦阳", "何冠全", "莫淇贵", "李振锋", "谭晓彤", "陈敬元", "卢伟彰", "任有为", "郑梓芸", "卢楚均", "陈仪琳", "黄雅婷", "谢嘉滢", "朱嘉瑶", "骆颢城", "冯思颖", "全智扬", "刘苇轩", "林静", "罗梓俊", "梁恒威", "李玟锜", "谭舒泳", "莫承森", "李铭哲", "邝子晋", "黄泽", "谢尚泽", "谭芷韵", "卢嘉谦", "欧阳雨诗", "潘耀康", "张艺彬", "沈雨辰", "李嘉俊", "黄若晗", "肖艺程", "邓婉晴", "陈建熙", "陈文杰", "张家宇", "张家浩", "慕容羽菲", "张琬欣", "曾永怡", "熊八浪", "吴思蕾"],
    "5-3": ["李睿轩", "邓辉", "卢语荞", "余振谦", "樊文悦", "唐云龙", "钱其琪", "何圳霞", "何厚轩", "曾筱瑜", "严靖", "林晓燕", "韦东航", "周佳晴", "王欣妍", "张骏豪", "刘诗颖", "李禹瑶", "魏洋羊", "王昊栩", "邓颖潼", "刘子钧", "骆俊熙", "邵嘉浩", "何厚亮", "卢宇森", "邝卓艺", "郑夏瑶", "骆子谦", "何俊豪", "冯雅鑫", "蓝徐馨", "陈依依", "黄扬杰", "谢子楠", "伍俊驰", "梁可威", "陈凯盈", "陈梓玲", "丁振强", "邵启航", "吴嘉赫", "谭依涵", "岳镇鸿", "罗凯流", "何汶镈", "王梦婷", "黎小兰", "黎嘉瑜"],
    "5-4": ["彭恋语", "钟如铭", "洪晨曦", "陈宝凯", "宋晨妍", "陈锜玮", "何家航", "邝梓楠", "徐璋", "卢永星", "黄永毅", "邝智莹", "梁泰然", "付艺纶", "陈仲琪", "何卓楠", "卢静仪", "罗佳怡", "罗卫光", "刘士琢", "阮慧婷", "谭迦瑶", "何欣怡", "张宇鑫", "庾锦盛", "卢镇鹏", "卢浩彬", "卢杰谦", "邝兆斌", "谢侑恒", "崔梓滢", "赵语欢", "张名瀚", "陈晓桐", "李梓睿", "卢可馨", "余业林", "陈思遥", "张昊轩", "李盈春", "龙舒雅", "杨家好", "徐佳睿", "卢建名", "吴明峻", "肖依玲", "周嘉俊", "郑蔓晴"],
    "5-5": ["何志泓", "何卓霖", "何冠祈", "何婉婉", "邝子淇", "岑思雅", "卢梓茵", "卢铧业", "卢正扬", "卢梓烨", "卢思甜", "卢俊辉", "黄晓洋", "黄庆鹏", "林家滔", "梁洋菲", "梁圆圆", "李国浩", "陈敏瑜", "钟晓薇", "梁鑫鸿", "何诗琪", "许豪盛", "刘汪洋", "陈仕杰", "周语芊", "陈若溪", "陈嘉锐", "田文昊", "崔天翔", "卢启颖", "李宏灞", "张奕晨", "黄俊坤", "黄乾曦", "谢欣莹", "刘思诚", "傅子珺", "刘子星", "刘少强", "刘珈铭", "王俊兵", "谭宗炜", "翁雅婷", "蒙茂轩", "吴筱慧", "叶伟锋", "吴子睿", "肖雅诗"],
    "6-3": ["邝健航", "邝欣怡", "何芯楠", "卢玟佑", "王馨艳", "卢家佑", "陈芷柔", "庾子轩", "罗政流", "叶诗柔", "卢芷琳", "陈浩成", "卢铠业", "卢颖苗", "赵黄钰芯", "余辰璐", "骆俊江", "甘睿斌", "陈春杏", "张涛伟", "邝友晴", "黄浩轩", "陈芷苇", "黄家琪", "冯茂炎", "张敏婷", "蓝远强", "范子筱", "李海婷", "余子嫣", "王昊晨", "王宇航", "郑伊海", "宋思城", "马欣茹", "梁榆涵", "梁以涵", "韦俊豪", "邓诗愉", "黄正涛", "陈子豪", "吴佳喜", "魏芷萱", "陈博宇", "张宇林", "钟如杰", "杨子宸", "梁丹丹"],
    "6-4": ["冯子铭", "何铭皓", "卢广宇", "林嘉信", "刘子瑜", "杨宇浩", "钟展帆", "卢家骏", "卢文杰", "刘君航", "卢家轩", "何雅琳", "何妍浠", "陈思琳", "杜馨逸", "卢莞渟", "邹珺妍", "张凯棋", "谢昱婷", "唐睿霞", "成浚毅", "杨伟权", "欧梓炫", "张嘉莹", "欧启怡", "李姗", "舒兰", "董诗琪", "吴镇宇", "谌浩然", "陆建勋", "欧阳智东", "蒋宗辰", "龙文轩", "李晓蓝", "刘美宜", "安钰", "罗梓菲", "凌宵", "谭梓妍", "卢芷珺", "廖韩", "刘闫闫", "卢俊宏", "余思婷", "丘俊彬", "黄梓涵", "韦周宇"]
};

const StudentManager = {
    students: [],
    currentStudent: null,

    // Initialize
    init: function () {
        this.loadAllClasses();
    },

    // Load All Classes into State
    loadAllClasses: function () {
        this.students = [];
        for (const [className, names] of Object.entries(CLASS_DATA)) {
            names.forEach((name, index) => {
                if (name && name !== "0") { // Filter out "0" placeholder
                    this.students.push({
                        id: 'stu_' + Math.random().toString(36).substr(2, 9),
                        studentNumber: index + 1,
                        name: name,
                        class: className,
                        score: 0
                    });
                }
            });
        }

        console.log(`Loaded ${this.students.length} students from ${Object.keys(CLASS_DATA).length} classes.`);
        this.renderLeaderboard(null); // Default to all
        // Don't render grid yet, wait for modal open
    },

    // Load Default CSV
    loadDefaultCSV: function () {
        fetch('students.csv')
            .then(response => {
                if (!response.ok) throw new Error("Default CSV not found");
                return response.text();
            })
            .then(text => {
                this.parseCSV(text);
                console.log("Default students loaded.");
            })
            .catch(err => console.log("No default students.csv found or fetch failed:", err));
    },

    // Helper to parse CSV text
    parseCSV: function (text) {
        const lines = text.split(/\r\n|\n/);
        this.students = [];

        lines.forEach(line => {
            const parts = line.split(',');
            const name = parts[0]?.trim();
            if (name && name !== '姓名' && name !== 'Name') {
                let score = 0;
                if (parts.length > 1) {
                    score = parseInt(parts[1]) || 0;
                }

                this.students.push({
                    id: 'stu_' + Math.random().toString(36).substr(2, 9),
                    studentNumber: this.students.length + 1,
                    name: name,
                    score: score
                });
            }
        });


        this.renderLeaderboard(null);
        this.renderStudentGrid(null);
    },

    // Load User CSV
    importCSV: function (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            this.parseCSV(e.target.result);
            alert(`成功导入 ${this.students.length} 名同学！`);
        };
        reader.readAsText(file);
    },

    // Render Sidebar List
    renderLeaderboard: function (filterClass = null) {
        this.leaderboardFilterClass = filterClass;
        const list = document.getElementById('leaderboard-list');
        const title = document.querySelector('#leaderboard-sidebar h2');
        const toggleBtn = document.getElementById('lb-toggle-view');

        list.innerHTML = '';
        const fragment = document.createDocumentFragment();

        let displayStudents = this.students;
        if (filterClass) {
            displayStudents = this.students.filter(s => s.class === filterClass);
            title.innerText = `🏆 ${filterClass}班 累积积分排行榜`;
            if (toggleBtn) toggleBtn.innerText = "显示全体榜单";
        } else {
            title.innerText = `🏆 累积积分排行榜`;
            if (toggleBtn) toggleBtn.innerText = "显示本班排行";
        }

        // Sort by score desc
        const sorted = [...displayStudents].sort((a, b) => b.score - a.score);

        if (sorted.length === 0) {
            list.innerHTML = '<div class="text-center text-gray-400 mt-10">暂无数据</div>';
            return;
        }

        sorted.forEach((stu, index) => {
            const rank = index + 1;
            const titleInfo = getTitleForScore(stu.score);
            const stuId = stu.id;

            const div = document.createElement('div');
            // Top 10 get individual rank classes; rest get 'normal'
            let rankClass;
            if (rank <= 3) {
                rankClass = `rank-${rank}`;
            } else if (rank <= 10) {
                rankClass = `rank-top10 rank-top10-${rank}`;
            } else {
                rankClass = 'rank-normal';
            }
            div.className = `rank-item ${rankClass}`;

            // Medal emojis for top 3, star-decorated for 4-10
            let rankDisplay;
            if (rank === 1) rankDisplay = '<span class="rank-medal">🥇</span>';
            else if (rank === 2) rankDisplay = '<span class="rank-medal">🥈</span>';
            else if (rank === 3) rankDisplay = '<span class="rank-medal">🥉</span>';
            else if (rank <= 10) rankDisplay = `<span class="rank-number-elite">${rank}</span>`;
            else rankDisplay = rank;

            div.innerHTML = `
                <div class="rank-info">
                    <div class="rank-number text-xl font-cute">${rankDisplay}</div>
                    <div class="rank-name-section">
                        <span class="rank-name-text">${stu.name}</span>
                        <span class="rank-class-tag">${stu.class || ''}</span>
                    </div>
                </div>
                <div class="rank-score-section">
                    <div class="score-edit-wrapper">
                        <button class="score-lock-btn" data-stu-id="${stuId}" title="点击解锁编辑积分">🔒</button>
                        <div class="score-adjust-controls" data-stu-id="${stuId}">
                            <button class="score-adjust-btn score-minus-btn" data-stu-id="${stuId}" data-action="minus">−</button>
                            <div class="score-value">
                                <span class="score-icon">${titleInfo.scoreIcon}</span>
                                <span class="score-number" data-stu-id="${stuId}">${stu.score}</span>
                            </div>
                            <button class="score-adjust-btn score-plus-btn" data-stu-id="${stuId}" data-action="plus">+</button>
                        </div>
                    </div>
                    <div class="rank-score text-neon-pink flex items-center gap-1 score-display" data-stu-id="${stuId}">
                        <span>${titleInfo.scoreIcon}</span>${stu.score}
                    </div>
                    <div class="title-badge ${titleInfo.tierClass}">
                        <span>${titleInfo.icon}</span>
                        <span>${titleInfo.name}</span>
                    </div>
                </div>
            `;
            fragment.appendChild(div);

            // Insert elite divider after rank 10
            if (rank === 10 && sorted.length > 10) {
                const divider = document.createElement('div');
                divider.className = 'rank-elite-divider';
                divider.innerHTML = '✨ 精英 TOP 10 ✨';
                fragment.appendChild(divider);
            }
        });
        list.appendChild(fragment);

        // Bind lock button events
        this.bindScoreEditEvents();
    },

    // Bind score edit button events
    bindScoreEditEvents: function () {
        // Lock/Unlock buttons
        document.querySelectorAll('.score-lock-btn').forEach(btn => {
            btn.onclick = (e) => {
                const stuId = btn.dataset.stuId;
                const controls = document.querySelector(`.score-adjust-controls[data-stu-id="${stuId}"]`);
                const scoreDisplay = document.querySelector(`.score-display[data-stu-id="${stuId}"]`);

                if (btn.classList.contains('unlocked')) {
                    // Lock it back - re-render leaderboard to update rankings
                    btn.classList.remove('unlocked');
                    btn.innerHTML = '🔒';
                    btn.title = '点击解锁编辑积分';
                    controls.classList.remove('visible');
                    scoreDisplay.style.display = 'flex';

                    // ✅ Re-render leaderboard to sort by new scores
                    this.renderLeaderboard(null);

                    // ☁️ Save to cloud/localStorage
                    if (window.CloudSync) {
                        const student = this.students.find(s => s.id === stuId);
                        if (student) {
                            if (window.CloudSync.isReady && window.CloudSync.isReady()) {
                                window.CloudSync.saveScore(student.class, student.name, student.score);
                            } else if (window.CloudSync.saveAll) {
                                // Save locally
                                window.CloudSync.saveAll();
                            }
                        }
                    }
                } else {
                    // Unlock
                    btn.classList.add('unlocked');
                    btn.innerHTML = '🔓';
                    btn.title = '点击锁定积分';
                    controls.classList.add('visible');
                    scoreDisplay.style.display = 'none';
                }
            };
        });

        // Plus/Minus buttons
        document.querySelectorAll('.score-adjust-btn').forEach(btn => {
            btn.onclick = (e) => {
                const stuId = btn.dataset.stuId;
                const action = btn.dataset.action;
                const delta = action === 'plus' ? 20 : -20;

                this.adjustScore(stuId, delta);
            };
        });
    },

    // Adjust score by delta
    adjustScore: function (stuId, delta) {
        const student = this.students.find(s => s.id === stuId);
        if (!student) return;

        student.score = Math.max(0, student.score + delta); // Prevent negative

        // Update score display in place
        const scoreNumber = document.querySelector(`.score-number[data-stu-id="${stuId}"]`);
        const scoreDisplay = document.querySelector(`.score-display[data-stu-id="${stuId}"]`);
        const titleInfo = getTitleForScore(student.score);

        if (scoreNumber) {
            scoreNumber.textContent = student.score;
        }
        if (scoreDisplay) {
            scoreDisplay.innerHTML = `<span>${titleInfo.scoreIcon}</span>${student.score}`;
        }

        // Update the icon in controls
        const scoreIcon = scoreNumber?.parentElement?.querySelector('.score-icon');
        if (scoreIcon) {
            scoreIcon.textContent = titleInfo.scoreIcon;
        }

        // Update title badge
        const rankItem = scoreNumber?.closest('.rank-item');
        if (rankItem) {
            const titleBadge = rankItem.querySelector('.title-badge');
            if (titleBadge) {
                // Remove old tier class and add new one
                titleBadge.className = `title-badge ${titleInfo.tierClass}`;
                titleBadge.innerHTML = `<span>${titleInfo.icon}</span><span>${titleInfo.name}</span>`;
            }
        }

        // Sync if current student
        if (this.currentStudent && this.currentStudent.id === stuId) {
            this.currentStudent.score = student.score;
        }

        // ☁️ Sync to cloud
        if (window.CloudSync && window.CloudSync.isReady()) {
            window.CloudSync.saveScore(student.class, student.name, student.score);
        }
    },

    // Render Selection Grid (Class View or Student View)
    renderStudentGrid: function (filterClass = null) {
        const grid = document.getElementById('student-grid');
        grid.innerHTML = '';

        // SYNC LEADERBOARD
        this.renderLeaderboard(filterClass);

        if (!filterClass) {
            // SHOW CLASS BUTTONS
            const classes = Object.keys(CLASS_DATA);
            grid.className = 'student-grid p-4 gap-4 grid grid-cols-2 lg:grid-cols-4 md:grid-cols-3';

            // Clear the back button container
            document.getElementById('modal-back-button-container').innerHTML = '';

            classes.forEach(cls => {
                const btn = document.createElement('button');
                btn.className = 'student-btn bg-white border-2 border-yellow-300 rounded-2xl text-xl font-bold py-4 px-4 text-yellow-800 shadow-[0_4px_0_rgba(253,224,71,1)] hover:bg-yellow-100 hover:-translate-y-1 active:translate-y-[4px] active:shadow-none transition-all flex flex-col items-center justify-center gap-2';
                btn.innerHTML = `<span class="text-3xl">📚</span><span>${cls}班</span>`;
                btn.onclick = () => this.renderStudentGrid(cls);
                grid.appendChild(btn);
            });
        } else {
            // SHOW STUDENTS IN CLASS

            grid.className = 'student-grid custom-scrollbar h-[60vh] min-h-[450px] border-2 border-yellow-200 rounded-2xl bg-yellow-50 p-3 md:p-4 grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-2 overflow-y-auto';

            // Configure the Back button in the top right container
            const backContainer = document.getElementById('modal-back-button-container');
            backContainer.innerHTML = '';

            const backBtn = document.createElement('button');
            backBtn.className = 'bg-yellow-100 border-2 border-yellow-300 text-yellow-800 font-bold rounded-full h-10 px-4 hover:bg-yellow-200 hover:border-yellow-400 active:scale-95 transition-all shadow-sm flex items-center justify-center text-sm mr-2 z-50';
            backBtn.innerHTML = '⬅️ 返回班级';
            backBtn.onclick = () => this.renderStudentGrid(null);

            backContainer.appendChild(backBtn);

            const classStudents = this.students.filter(s => s.class === filterClass);

            classStudents.forEach(stu => {
                const btn = document.createElement('button');
                const isSelected = this.currentStudent?.id === stu.id;
                btn.className = `student-btn ${isSelected ? 'selected bg-yellow-200 border-yellow-400' : 'bg-white border-yellow-200'} border-2 rounded-xl py-2 px-1 hover:bg-yellow-100 hover:border-yellow-300 transition-colors shadow-sm text-gray-800 font-bold flex flex-col items-center justify-center gap-1`;

                const num = stu.studentNumber ? `<span class="text-[10px] sm:text-xs text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full leading-none">学号 ${stu.studentNumber}</span>` : '';
                btn.innerHTML = `
                    ${num}
                    <span class="text-sm sm:text-base whitespace-nowrap">${stu.name}</span>
                `;

                btn.onclick = () => this.selectTemp(stu, btn);
                grid.appendChild(btn);
            });
        }
    },

    tempSelected: null,

    selectTemp: function (stu, btnElement) {
        this.tempSelected = stu;
        // Visual feedback
        document.querySelectorAll('.student-btn:not(.col-span-full)').forEach(b => {
            b.classList.remove('selected', 'bg-yellow-200', 'border-yellow-400');
            b.classList.add('bg-white', 'border-yellow-200');
        });
        btnElement.classList.remove('bg-white', 'border-yellow-200');
        btnElement.classList.add('selected', 'bg-yellow-200', 'border-yellow-400');
    },

    confirmSelection: function () {
        if (this.tempSelected) {
            this.currentStudent = this.tempSelected;
            document.getElementById('current-student-name').innerText = this.currentStudent.name;
            this.updateStudentScoreBadge();
            closeStudentModal();
            // Enable start button if it was disabled? It's redundant but safe.
            startBtn.disabled = false;
            startBtn.classList.remove('opacity-50');
        }
    },

    // Update the score badge next to the student select button
    updateStudentScoreBadge: function () {
        const badge = document.getElementById('current-student-score');
        const scoreVal = document.getElementById('current-student-score-value');
        const scoreIcon = document.getElementById('current-student-score-icon');
        if (!this.currentStudent) {
            if (badge) badge.classList.add('hidden');
            return;
        }
        const titleInfo = getTitleForScore(this.currentStudent.score);
        if (badge) {
            badge.classList.remove('hidden');
            badge.classList.add('flex');
        }
        if (scoreVal) scoreVal.textContent = this.currentStudent.score;
        if (scoreIcon) scoreIcon.textContent = titleInfo.scoreIcon;
    },

    addScore: function (points) {
        if (!this.currentStudent) return;

        // Find existing ref to ensure updates persist in the array
        const student = this.students.find(s => s.id === this.currentStudent.id);
        if (student) {
            student.score += points;
            this.currentStudent.score = student.score; // sync
            this.renderLeaderboard();
            this.updateStudentScoreBadge();

            // 🧪 扣减科学老师百宝袋积分
            teacherCurrentScore = teacherCurrentScore - points;
            updateTreasureDisplay(points);

            // ☁️ Sync to cloud
            if (window.CloudSync && window.CloudSync.isReady()) {
                window.CloudSync.saveScore(student.class, student.name, student.score);
            }
        }
    },

    // 🎉 全班加分
    addScoreToClass: function (className, points) {
        const classStudents = this.students.filter(s => s.class === className);
        if (classStudents.length === 0) return;

        const totalDeducted = points * classStudents.length;

        classStudents.forEach(student => {
            student.score += points;

            // ☁️ Sync each student to cloud
            if (window.CloudSync && window.CloudSync.isReady()) {
                window.CloudSync.saveScore(student.class, student.name, student.score);
            }
        });

        // Sync current student if they belong to this class
        if (this.currentStudent && this.currentStudent.class === className) {
            const updated = this.students.find(s => s.id === this.currentStudent.id);
            if (updated) this.currentStudent.score = updated.score;
            this.updateStudentScoreBadge();
        }

        // 🧪 Deduct from teacher treasure
        teacherCurrentScore = teacherCurrentScore - totalDeducted;
        updateTreasureDisplay(totalDeducted);

        // Re-render leaderboard
        this.renderLeaderboard(this.leaderboardFilterClass);
    }
};

// Global Exposure
window.StudentManager = StudentManager;

window.handleCSVImport = (input) => {
    if (input.files.length > 0) {
        StudentManager.importCSV(input.files[0]);
    }
};

window.toggleLeaderboard = () => {
    const sidebar = document.getElementById('leaderboard-sidebar');
    const isOpen = sidebar.classList.contains('open');

    if (!isOpen) {
        // When opening, default to current student's class if available
        if (StudentManager.currentStudent) {
            StudentManager.renderLeaderboard(StudentManager.currentStudent.class);
        } else {
            StudentManager.renderLeaderboard(null);
        }
    }
    sidebar.classList.toggle('open');
};

window.toggleLeaderboardView = () => {
    if (StudentManager.leaderboardFilterClass) {
        // Currently showing class, switch to all
        StudentManager.renderLeaderboard(null);
    } else {
        // Currently showing all, switch to class
        if (StudentManager.currentStudent) {
            StudentManager.renderLeaderboard(StudentManager.currentStudent.class);
        } else {
            alert("请先选择一位同学，才能查看本班排行哦！");
        }
    }
};

let scrollInterval = null;
const SCROLL_SPEED = 15; // pixels per frame

window.startScrolling = (direction) => {
    if (scrollInterval) return; // Already scrolling

    const list = document.getElementById('leaderboard-list');
    if (!list) return;

    const scrollStep = () => {
        list.scrollTop += direction * SCROLL_SPEED;
        scrollInterval = requestAnimationFrame(scrollStep);
    };

    scrollInterval = requestAnimationFrame(scrollStep);
};

window.stopScrolling = () => {
    if (scrollInterval) {
        cancelAnimationFrame(scrollInterval);
        scrollInterval = null;
    }
};

window.clearLeaderboard = () => {
    if (confirm('确定要清空排行榜吗？')) {
        StudentManager.students = [];
        StudentManager.currentStudent = null;
        document.getElementById('current-student-name').innerText = '选择学生';
        StudentManager.renderLeaderboard();
        StudentManager.renderStudentGrid();
    }
}

window.openStudentModal = () => {
    document.getElementById('student-modal').classList.remove('hidden');
    // If a student is already selected, stay in their class view; otherwise show class selection
    if (StudentManager.currentStudent && StudentManager.currentStudent.class) {
        StudentManager.renderStudentGrid(StudentManager.currentStudent.class);
    } else {
        StudentManager.renderStudentGrid(null);
    }
};

window.closeStudentModal = () => {
    document.getElementById('student-modal').classList.add('hidden');
};

window.confirmStudentSelection = () => {
    StudentManager.confirmSelection();
};

// remove filterStudents implementation as search bar was removed
// Bindings
startBtn.addEventListener('click', handleStart);
window.addEventListener('resize', () => {
    if (gameState === 'PICKING' || gameState === 'REVEALED') {
        // Force update once to new size but don't resume animate if it was stopped?
        // Actually animate() handles resizing automatically.
    }
});

// Boot
initGrid();
StudentManager.init(); // Auto-load CSV
document.body.addEventListener('click', () => SoundFX.init(), { once: true });

// 💾 Initialize Local File Sync
if (window.LocalSync) {
    window.LocalSync.init();
}

// ========================================
// ⚡ 流畅模式 - Performance Mode Toggle
// ========================================

window.togglePerfMode = () => {
    const body = document.body;
    const btn = document.getElementById('perf-mode-btn');
    const isActive = body.classList.toggle('perf-mode');

    if (btn) {
        if (isActive) {
            btn.classList.add('active');
            btn.textContent = '⚡ 流畅模式 ON';
        } else {
            btn.classList.remove('active');
            btn.textContent = '⚡ 流畅模式';
        }
    }

    // 立刻重新定位所有宝箱（切换 left/top ↔ transform）
    currentSlots.forEach((slot, i) => {
        const slotProgress = (globalProgress + (i / SLOT_COUNT)) % 1;
        const pos = getPointOnTrack(slotProgress);
        if (isActive) {
            // 切到 transform 模式：清除 left/top，设置 transform
            slot.style.left = '';
            slot.style.top = '';
            slot.style.transform = `translate(${pos.x - 90}px, ${pos.y - 65}px)`;
        } else {
            // 切回 left/top 模式：清除 transform，设置 left/top
            slot.style.transform = '';
            slot.style.left = `${pos.x - 90}px`;
            slot.style.top = `${pos.y - 65}px`;
        }
    });

    // 确保动画循环在运转
    startAnimation();

    // Persist preference
    try {
        localStorage.setItem('perf-mode', isActive ? '1' : '0');
    } catch (e) { }
};

// Auto-restore performance mode from localStorage
(function restorePerfMode() {
    try {
        if (localStorage.getItem('perf-mode') === '1') {
            document.body.classList.add('perf-mode');
            const btn = document.getElementById('perf-mode-btn');
            if (btn) {
                btn.classList.add('active');
                btn.textContent = '⚡ 流畅模式 ON';
            }
        }
    } catch (e) { }
})();

// ========================================
// ⭐ 群体加分 - Group Bonus System
// ========================================

// --- 群体加分主弹窗 ---
window.showGroupBonusModal = () => {
    document.getElementById('group-bonus-modal').classList.remove('hidden');
};

window.closeGroupBonusModal = () => {
    document.getElementById('group-bonus-modal').classList.add('hidden');
};

// --- 班级集体加分（原全班奖励） ---
window.showGroupClassBonus = () => {
    closeGroupBonusModal();
    showClassBonusModal();
};

window.showClassBonusModal = () => {
    const modal = document.getElementById('class-bonus-modal');
    const grid = document.getElementById('class-bonus-grid');
    grid.innerHTML = '';

    const classes = Object.keys(CLASS_DATA);
    classes.forEach(cls => {
        const btn = document.createElement('button');
        btn.className = 'class-bonus-select-btn';
        const count = CLASS_DATA[cls].length;
        btn.innerHTML = `<span style="font-size:2rem">📚</span><span>${cls}班</span><span style="font-size:0.8rem;color:#a16207">${count}人</span>`;
        btn.onclick = () => {
            closeClassBonusModal();
            triggerClassBonus(cls);
        };
        grid.appendChild(btn);
    });

    modal.classList.remove('hidden');
};

window.closeClassBonusModal = () => {
    document.getElementById('class-bonus-modal').classList.add('hidden');
};

// --- 班级个人加分 ---
let individualBonusSelectedStudents = []; // 多选的学生列表
let individualBonusCurrentClass = null;
let individualBonusPoints = 10; // 每人加分数，默认10

window.showGroupIndividualBonus = () => {
    closeGroupBonusModal();
    individualBonusSelectedStudents = [];
    individualBonusCurrentClass = null;
    individualBonusPoints = 10; // 重置为默认10分
    renderIndividualBonusClassSelection();
    // 重置分数选择器UI
    updateBonusPointsSelector();
    document.getElementById('individual-bonus-modal').classList.remove('hidden');
};

window.closeIndividualBonusModal = () => {
    document.getElementById('individual-bonus-modal').classList.add('hidden');
    individualBonusSelectedStudents = [];
    individualBonusCurrentClass = null;
};

// 设置个人加分分值
window.setIndividualBonusPoints = (points) => {
    individualBonusPoints = points;
    updateBonusPointsSelector();
};

// 更新分数选择器UI
function updateBonusPointsSelector() {
    // 更新按钮选中状态
    document.querySelectorAll('.bonus-points-btn').forEach(btn => {
        const pts = parseInt(btn.dataset.points);
        if (pts === individualBonusPoints) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });
    // 更新确认按钮文字
    const confirmText = document.getElementById('individual-bonus-confirm-text');
    if (confirmText) {
        confirmText.textContent = `确认加分 (+${individualBonusPoints}分/人)`;
    }
}

// 渲染班级选择界面
function renderIndividualBonusClassSelection() {
    const grid = document.getElementById('individual-bonus-grid');
    const titleEl = document.getElementById('individual-bonus-title');
    const countEl = document.getElementById('individual-bonus-count');
    const backContainer = document.getElementById('individual-bonus-back-container');

    grid.innerHTML = '';
    backContainer.innerHTML = '';
    titleEl.textContent = '👥 选择班级';
    countEl.textContent = '已选 0 人';

    // Switch to class selection grid layout
    grid.className = 'custom-scrollbar h-[55vh] min-h-[400px] border-2 border-green-200 rounded-2xl bg-green-50 p-4 grid grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto';

    const classes = Object.keys(CLASS_DATA);
    classes.forEach(cls => {
        const btn = document.createElement('button');
        btn.className = 'student-btn bg-white border-2 border-green-300 rounded-2xl text-xl font-bold py-4 px-4 text-green-800 shadow-[0_4px_0_rgba(34,197,94,0.6)] hover:bg-green-100 hover:-translate-y-1 active:translate-y-[4px] active:shadow-none transition-all flex flex-col items-center justify-center gap-2';
        const count = CLASS_DATA[cls].length;
        btn.innerHTML = `<span class="text-3xl">📚</span><span>${cls}班</span><span class="text-sm text-green-600">${count}人</span>`;
        btn.onclick = () => renderIndividualBonusStudentGrid(cls);
        grid.appendChild(btn);
    });
}

// 渲染学生多选界面（按学号排序）
function renderIndividualBonusStudentGrid(className) {
    individualBonusCurrentClass = className;
    individualBonusSelectedStudents = [];

    const grid = document.getElementById('individual-bonus-grid');
    const titleEl = document.getElementById('individual-bonus-title');
    const countEl = document.getElementById('individual-bonus-count');
    const backContainer = document.getElementById('individual-bonus-back-container');

    // Update title
    titleEl.textContent = `👥 ${className}班 - 选择学生`;
    countEl.textContent = '已选 0 人';

    // Add back button
    backContainer.innerHTML = '';
    const backBtn = document.createElement('button');
    backBtn.className = 'bg-green-100 border-2 border-green-300 text-green-800 font-bold rounded-full h-10 px-4 hover:bg-green-200 hover:border-green-400 active:scale-95 transition-all shadow-sm flex items-center justify-center text-sm mr-2 z-50';
    backBtn.innerHTML = '⬅️ 返回班级';
    backBtn.onclick = () => renderIndividualBonusClassSelection();
    backContainer.appendChild(backBtn);

    // Switch to student grid layout
    grid.className = 'custom-scrollbar h-[55vh] min-h-[400px] border-2 border-green-200 rounded-2xl bg-green-50 p-3 md:p-4 grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-2 overflow-y-auto';
    grid.innerHTML = '';

    // Get students of this class sorted by studentNumber (学号由低到高)
    const classStudents = StudentManager.students
        .filter(s => s.class === className)
        .sort((a, b) => (a.studentNumber || 0) - (b.studentNumber || 0));

    classStudents.forEach(stu => {
        const btn = document.createElement('button');
        btn.className = 'individual-student-btn';
        const num = stu.studentNumber ? `<span class="text-[10px] sm:text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full leading-none">学号 ${stu.studentNumber}</span>` : '';
        btn.innerHTML = `${num}<span class="text-sm sm:text-base whitespace-nowrap">${stu.name}</span>`;

        btn.onclick = () => {
            toggleIndividualStudentSelection(stu, btn);
        };
        grid.appendChild(btn);
    });
}

// 切换学生选中状态（支持多选）
function toggleIndividualStudentSelection(stu, btnElement) {
    const idx = individualBonusSelectedStudents.findIndex(s => s.id === stu.id);
    if (idx >= 0) {
        // 取消选中
        individualBonusSelectedStudents.splice(idx, 1);
        btnElement.classList.remove('selected');
    } else {
        // 选中
        individualBonusSelectedStudents.push(stu);
        btnElement.classList.add('selected');
    }

    // 更新已选人数
    const countEl = document.getElementById('individual-bonus-count');
    countEl.textContent = `已选 ${individualBonusSelectedStudents.length} 人`;
}

// 确认个人加分
window.confirmIndividualBonus = () => {
    if (individualBonusSelectedStudents.length === 0) {
        return; // 没有选中任何学生
    }

    const selectedStudents = [...individualBonusSelectedStudents];
    const className = individualBonusCurrentClass;

    // Close the modal
    closeIndividualBonusModal();

    // Add points to each selected student
    const totalDeducted = individualBonusPoints * selectedStudents.length;

    selectedStudents.forEach(selectedStu => {
        const student = StudentManager.students.find(s => s.id === selectedStu.id);
        if (student) {
            student.score += individualBonusPoints;

            // ☁️ Sync to cloud
            if (window.CloudSync && window.CloudSync.isReady()) {
                window.CloudSync.saveScore(student.class, student.name, student.score);
            }
        }
    });

    // Sync current student if affected
    if (StudentManager.currentStudent) {
        const updated = StudentManager.students.find(s => s.id === StudentManager.currentStudent.id);
        if (updated) {
            StudentManager.currentStudent.score = updated.score;
            StudentManager.updateStudentScoreBadge();
        }
    }

    // 🧪 Deduct from teacher treasure
    teacherCurrentScore = teacherCurrentScore - totalDeducted;
    updateTreasureDisplay(totalDeducted);

    // Re-render leaderboard
    StudentManager.renderLeaderboard(StudentManager.leaderboardFilterClass);

    // Show coin rain celebration
    triggerIndividualBonusCelebration(className, selectedStudents.length, individualBonusPoints);
};

// 个人加分庆祝动画
function triggerIndividualBonusCelebration(className, count, points) {
    const overlay = document.getElementById('coin-rain-overlay');
    const container = document.getElementById('coin-rain-container');
    const titleEl = document.getElementById('coin-rain-title');
    const classEl = document.getElementById('coin-rain-class');

    // Reset
    container.innerHTML = '';
    titleEl.className = 'text-6xl font-cute text-white drop-shadow-[0_4px_20px_rgba(255,200,0,0.8)] opacity-0';
    classEl.className = 'text-3xl font-bold text-yellow-200 mt-4 opacity-0';

    // Set text
    titleEl.textContent = `${count} 人 各+${points} 分！`;
    classEl.textContent = `🏫 ${className}班 选中同学`;

    // Show overlay
    overlay.classList.remove('hidden');

    // Play celebration sound
    SoundFX.init();
    playCelebrationSound();

    // Create coin rain
    createCoinRain(container);

    // Animate text in
    setTimeout(() => {
        titleEl.classList.add('coin-rain-text-show');
    }, 300);
    setTimeout(() => {
        classEl.classList.add('coin-rain-text-show');
    }, 600);

    // Fade out and cleanup
    setTimeout(() => {
        titleEl.classList.remove('coin-rain-text-show');
        titleEl.classList.add('coin-rain-text-hide');
        classEl.classList.remove('coin-rain-text-show');
        classEl.classList.add('coin-rain-text-hide');
    }, 3000);

    setTimeout(() => {
        overlay.classList.add('hidden');
        container.innerHTML = '';
        titleEl.className = 'text-6xl font-cute text-white drop-shadow-[0_4px_20px_rgba(255,200,0,0.8)] opacity-0';
        classEl.className = 'text-3xl font-bold text-yellow-200 mt-4 opacity-0';
    }, 3500);
}

function triggerClassBonus(className) {
    const overlay = document.getElementById('coin-rain-overlay');
    const container = document.getElementById('coin-rain-container');
    const titleEl = document.getElementById('coin-rain-title');
    const classEl = document.getElementById('coin-rain-class');

    // Reset
    container.innerHTML = '';
    titleEl.className = 'text-6xl font-cute text-white drop-shadow-[0_4px_20px_rgba(255,200,0,0.8)] opacity-0';
    classEl.className = 'text-3xl font-bold text-yellow-200 mt-4 opacity-0';

    // Set text
    titleEl.textContent = '全班 +10 分！';
    classEl.textContent = `🏫 ${className}班 全体同学`;

    // Show overlay
    overlay.classList.remove('hidden');

    // Play celebration sound
    SoundFX.init();
    playCelebrationSound();

    // Create coin rain
    createCoinRain(container);

    // Animate text in after a short delay
    setTimeout(() => {
        titleEl.classList.add('coin-rain-text-show');
    }, 300);
    setTimeout(() => {
        classEl.classList.add('coin-rain-text-show');
    }, 600);

    // Apply scores after 1.5s
    setTimeout(() => {
        StudentManager.addScoreToClass(className, 10);
    }, 1500);

    // Fade out and cleanup at 3.5s
    setTimeout(() => {
        titleEl.classList.remove('coin-rain-text-show');
        titleEl.classList.add('coin-rain-text-hide');
        classEl.classList.remove('coin-rain-text-show');
        classEl.classList.add('coin-rain-text-hide');
    }, 3000);

    setTimeout(() => {
        overlay.classList.add('hidden');
        container.innerHTML = '';
        titleEl.className = 'text-6xl font-cute text-white drop-shadow-[0_4px_20px_rgba(255,200,0,0.8)] opacity-0';
        classEl.className = 'text-3xl font-bold text-yellow-200 mt-4 opacity-0';
    }, 3500);
}

function createCoinRain(container) {
    const emojis = ['💰', '⭐', '🌟', '✨', '💎', '🪙', '🎯', '🏆'];
    const isPerfMode = document.body.classList.contains('perf-mode');
    const totalCoins = isPerfMode ? 15 : 50;

    for (let i = 0; i < totalCoins; i++) {
        setTimeout(() => {
            const coin = document.createElement('div');
            coin.className = 'coin-rain-item';
            coin.textContent = emojis[Math.floor(Math.random() * emojis.length)];

            // Random horizontal position
            coin.style.left = Math.random() * 100 + 'vw';

            // Random size
            const size = 1.2 + Math.random() * 1.8;
            coin.style.fontSize = size + 'rem';

            // Random animation duration (spread feel)
            const duration = 2 + Math.random() * 2;
            coin.style.animationDuration = duration + 's';

            // Random delay for staggering
            coin.style.animationDelay = (Math.random() * 0.3) + 's';

            container.appendChild(coin);

            // Auto cleanup after animation finishes
            setTimeout(() => {
                if (coin.parentNode) coin.parentNode.removeChild(coin);
            }, (duration + 0.5) * 1000);
        }, i * 50); // Spawn 1 coin every 50ms
    }
}

function playCelebrationSound() {
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const now = audioCtx.currentTime;

        // Ascending arpeggio: C5 E5 G5 C6
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.type = 'triangle';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.15, now + i * 0.12);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.12 + 0.4);
            osc.start(now + i * 0.12);
            osc.stop(now + i * 0.12 + 0.5);
        });
    } catch (e) { }
}
