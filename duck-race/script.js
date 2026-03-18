
// --- 游戏状态 ---
let students = [];
let classDataCache = null;

function initClassDataCache() {
    if (typeof allClassesCSV === 'undefined' || !allClassesCSV || allClassesCSV.trim() === "姓名,成绩,班级") return;

    classDataCache = {};
    const lines = allClassesCSV.trim().split('\n');

    // 从第二行开始遍历（跳过表头）
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = line.split(',');
        if (parts.length >= 3) {
            const name = parts[0].trim();
            const science = parseFloat(parts[1]) || 0;
            const className = parts[2].trim();

            if (name && className) {
                if (!classDataCache[className]) {
                    classDataCache[className] = [];
                }
                classDataCache[className].push({ name, science });
            }
        }
    }
}

function importClassData(className) {
    playClickSound();
    if (!classDataCache) {
        initClassDataCache();
        if (!classDataCache) {
            alert(`❌ 暂无数据！\n\n请先在代码中 allClassesCSV 位置粘贴您的 CSV 数据。`);
            return;
        }
    }

    const rawData = classDataCache[className];
    if (rawData && rawData.length > 0) {
        const studentData = rawData.map(item => ({
            name: item.name,
            science: item.science,
            total: item.science,
            color: getRandomColor(),
            id: Math.random().toString(36).substr(2, 9)
        }));

        // 限制 50 人
        const finalData = studentData.slice(0, 50);
        loadStudents(finalData);
        if (settingsOpen) toggleSettings();
        alert(`✅ 成功从纵向数据中筛选出 ${className} ${finalData.length} 名学生！`);
    } else {
        alert(`❌ 未在数据中找到 ${className} 的学生。\n\n请确保 CSV 第三列的班级名称是 "${className}"`);
    }
}

let isRacing = false;
let raceStartTime = 0;
let raceDuration = 30000;
let animationFrameId;
let settingsOpen = false;
let currentSkin = 'duck'; // 默认皮肤
let currentBg = 'sky';    // 默认背景
let raceMode = 'sameTime'; // 默认运动模式: sameSpeed(相同速度) or sameTime(相同时间)
let audioCtx; // 音频上下文
let leaderboardSize = 0; // 0:正常, 1:大, 2:超大
let smoothMode = false; // 流畅模式：关闭耗性能的特效

// 音频元素
let bgmAudio = new Audio('audio/bgm.mp3');
let raceAudio = new Audio('audio/1.mp3');
let finishAudio = new Audio('audio/2.mp3');

// 初始化音频
bgmAudio.loop = true;
bgmAudio.volume = 0.3;
raceAudio.volume = 0.5;
finishAudio.volume = 0.5;

// 音频开关状态
let audioEnabled = true;

// 调色板
const COLORS = ['#FFD700', '#FF6347', '#40E0D0', '#EE82EE', '#32CD32', '#FF69B4', '#FFA500', '#87CEFA'];

// DOM 元素
// 注意：确保脚本在DOM加载后运行，或者将这些放在window.onload中
let trackEl, durationInput, durationDisplay, particlesContainer, bodyEl;

// --- 防伪保护 ---
(function () {
    const copyright = '本游戏由抖音@李翔在湘西制作，无偿分享，禁止商业使用';
    console.log('%c' + copyright, 'color: #ff0000; font-size: 16px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);');
    console.log('%c违者追究法律责任', 'color: #ff0000; font-size: 14px; font-weight: bold;');

    // 在页面标题中添加标识
    // check if document is ready
    if (document.title) document.title = document.title + ' - 抖音@李翔在湘西';

    // 添加元数据 - waiting for DOM might be better but this is usually fine in head or body
})();

// --- 初始化 ---
window.onload = function () {
    // Initialize DOM elements here
    trackEl = document.getElementById('race-track');
    durationInput = document.getElementById('durationRange');
    durationDisplay = document.getElementById('durationValue');
    particlesContainer = document.getElementById('particles-container');
    bodyEl = document.getElementById('main-body');

    initClassDataCache(); // 预解析班级数据
    changeBg('sky'); // 初始化背景
    generateDemoData();
    initSkinPreviews();
    renderScoreLines(); // 渲染分数线

    if (durationInput) {
        durationInput.addEventListener('input', (e) => {
            durationDisplay.innerText = e.target.value + 's';
            raceDuration = e.target.value * 1000;
        });
        // 初始化时设置默认值为30秒
        durationInput.value = 30;
        durationDisplay.innerText = '30s';
    }

    let resizeTimer;
    window.addEventListener('resize', () => {
        if (!isRacing) {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                renderDucks();
                renderScoreLines(); // 重新渲染分数线
            }, 200);
        }
    });

    // === 防止页面缩放（防止学生乱点导致排行榜放大/缩小） ===

    // 1. 阻止 Ctrl + 鼠标滚轮 缩放
    document.addEventListener('wheel', function (e) {
        if (e.ctrlKey) {
            e.preventDefault();
        }
    }, { passive: false });

    // 2. 阻止 Ctrl + 加号/减号/0 键盘快捷键缩放
    document.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '0' || e.keyCode === 187 || e.keyCode === 189 || e.keyCode === 48)) {
            e.preventDefault();
        }
    });

    // 3. 阻止触摸屏上的双指捏合缩放
    document.addEventListener('touchstart', function (e) {
        if (e.touches.length > 1) {
            e.preventDefault();
        }
    }, { passive: false });

    document.addEventListener('touchmove', function (e) {
        if (e.touches.length > 1) {
            e.preventDefault();
        }
    }, { passive: false });

    // 4. 阻止双击缩放（触摸屏）
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function (e) {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
            e.preventDefault();
        }
        lastTouchEnd = now;
    }, { passive: false });

    document.body.addEventListener('click', initAudio, { once: true });

    // 尝试自动播放背景音乐（某些浏览器需要用户交互）
    document.body.addEventListener('click', function playBgm() {
        if (audioEnabled) {
            bgmAudio.play().catch(e => console.log('背景音乐需要用户交互才能播放'));
        }
        document.body.removeEventListener('click', playBgm);
    }, { once: true });
};

// 音频控制
function toggleAudio() {
    playClickSound();
    audioEnabled = !audioEnabled;
    const icon = document.getElementById('icon-audio');
    if (audioEnabled) {
        icon.classList.replace('fa-volume-mute', 'fa-volume-up');
        bgmAudio.play().catch(e => console.log('背景音乐播放失败'));
    } else {
        icon.classList.replace('fa-volume-up', 'fa-volume-mute');
        bgmAudio.pause();
        raceAudio.pause();
        finishAudio.pause();
    }
}

// --- 音效系统 ---
function initAudio() {
    if (!audioCtx) {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AudioContext();
            // 恢复音频上下文（某些浏览器需要）
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
        } catch (e) {
            console.log('音频上下文初始化失败:', e);
        }
    }
}

function playTone(freq, type, duration, vol = 0.1) {
    if (!audioCtx || !audioEnabled) return;
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(vol, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
        console.log('音效播放失败:', e);
    }
}
function playClickSound() { playTone(600, 'sine', 0.1, 0.05); }
function playWinSound() {
    if (!audioCtx || !audioEnabled) return;
    try {
        let now = audioCtx.currentTime;
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'triangle';
            osc.frequency.value = freq;
            gain.gain.value = 0.1;
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.5);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now + i * 0.1);
            osc.stop(now + i * 0.1 + 0.5);
        });
    } catch (e) {
        console.log('胜利音效播放失败:', e);
    }
}

// --- 视觉绘制系统 ---
function getRandomColor() { return COLORS[Math.floor(Math.random() * COLORS.length)]; }

// 全身版动物绘制
function getAnimalSVG(type, color, rank = 0) {
    let content = '';
    let hasWheels = rank >= 6 && rank <= 10; // 6-10名有轮子
    let isTopFive = rank >= 1 && rank <= 5; // 前5名有炫酷装备

    switch (type) {
        case 'boat':
            // 纸船 + 帆 + 阴影
            content = `
            <filter id="shadow"><feDropShadow dx="1" dy="2" stdDeviation="1" flood-opacity="0.3"/></filter>
            <g filter="url(#shadow)">
                <path d="M 15 65 L 85 65 L 70 85 L 30 85 Z" fill="${color}" stroke="#333" stroke-width="1.5"/>
                <path d="M 50 65 L 50 20 L 80 55 Z" fill="#f8fafc" stroke="#333" stroke-width="1.5"/>
                <path d="M 50 65 L 50 25 L 25 55 Z" fill="#e2e8f0" stroke="#333" stroke-width="1.5"/>
                <path d="M 50 65 L 50 20" stroke="#333" stroke-width="1.5"/>
            </g>
            <!-- 吃水线 -->
            <path d="M 25 80 Q 50 85 75 80" fill="none" stroke="rgba(0,0,0,0.2)" stroke-width="1"/>
        `;
            break;
        case 'snowman':
            // 雪人：两球 + 围巾 + 帽子
            content = `
            <circle cx="50" cy="70" r="20" fill="white" stroke="#333" stroke-width="2"/>
            <circle cx="50" cy="40" r="15" fill="white" stroke="#333" stroke-width="2"/>
            <circle cx="45" cy="38" r="2" fill="black"/><circle cx="55" cy="38" r="2" fill="black"/>
            <path d="M 48 42 L 52 42 L 50 48 Z" fill="orange"/>
            <!-- 围巾 -->
            <path d="M 35 52 Q 50 60 65 52" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round"/>
            <path d="M 60 52 L 65 65" stroke="${color}" stroke-width="5" stroke-linecap="round"/>
            <!-- 帽子 -->
            <rect x="35" y="25" width="30" height="5" fill="#333"/>
            <rect x="40" y="10" width="20" height="15" fill="#333"/>
            <!-- 手 -->
            <path d="M 30 65 L 15 55 M 70 65 L 85 55" stroke="#5d4037" stroke-width="2"/>
        `;
            break;
        case 'fish':
            content = `<path d="M 75 50 Q 50 20 20 50 Q 50 80 75 50 Z" fill="${color}" stroke="#333" stroke-width="2"/>
                 <path d="M 20 50 L 5 35 L 5 65 Z" fill="${color}" stroke="#333" stroke-width="2"/>
                 <circle cx="65" cy="45" r="3" fill="black"/><circle cx="66" cy="44" r="1" fill="white"/>
                 <path d="M 55 50 Q 45 55 55 60" fill="none" stroke="#333" stroke-width="1.5" opacity="0.5"/>
                 <circle cx="85" cy="45" r="2" fill="rgba(255,255,255,0.6)"/><circle cx="92" cy="40" r="3" fill="rgba(255,255,255,0.6)"/>`;
            break;
        case 'dino':
            content = `<path d="M 30 70 Q 20 60 20 50 Q 20 20 50 15 Q 70 15 80 25 Q 70 50 70 60 L 75 70 L 30 70" fill="${color}" stroke="#333" stroke-width="2"/>
                 <path d="M 75 70 Q 90 65 95 50" fill="none" stroke="${color}" stroke-width="8" stroke-linecap="round"/>
                 <path d="M 75 70 Q 90 65 95 50" fill="none" stroke="#333" stroke-width="3" stroke-linecap="round"/>
                 <circle cx="60" cy="25" r="3" fill="black"/><circle cx="61" cy="24" r="1" fill="white"/>
                 <path d="M 35 70 L 35 80 M 65 70 L 65 80" stroke="#333" stroke-width="3" stroke-linecap="round"/>`;
            break;
        case 'dragon':
            content = `<path d="M 30 65 Q 25 30 55 35 Q 75 35 70 50 Q 65 75 30 65" fill="${color}" stroke="#333" stroke-width="2"/>
                 <path d="M 45 45 L 20 30 L 50 40" fill="orange" stroke="#333" stroke-width="2"/>
                 <path d="M 30 65 L 10 70 L 25 60" fill="${color}" stroke="#333" stroke-width="2"/>
                 <circle cx="60" cy="40" r="3" fill="black"/>
                 <path d="M 35 35 L 40 25 L 45 35 L 50 25 L 55 35" fill="none" stroke="#333" stroke-width="1.5"/>`;
            break;
        case 'rabbit':
            content = `<ellipse cx="50" cy="65" rx="25" ry="18" fill="${color}" stroke="#333" stroke-width="2"/>
                 <ellipse cx="65" cy="45" rx="5" ry="15" fill="${color}" stroke="#333" stroke-width="2" transform="rotate(-10 65 45)"/>
                 <ellipse cx="55" cy="45" rx="5" ry="15" fill="${color}" stroke="#333" stroke-width="2" transform="rotate(-20 55 45)"/>
                 <circle cx="65" cy="60" r="2.5" fill="black"/>
                 <circle cx="25" cy="65" r="6" fill="white" stroke="#333" stroke-width="2"/>`;
            break;
        case 'cat':
            content = `<rect x="25" y="50" width="50" height="20" rx="10" fill="${color}" stroke="#333" stroke-width="2"/>
                 <polygon points="65,52 70,35 80,52" fill="${color}" stroke="#333" stroke-width="2"/>
                 <polygon points="45,52 50,35 60,52" fill="${color}" stroke="#333" stroke-width="2"/>
                 <circle cx="70" cy="60" r="2.5" fill="black"/> <circle cx="50" cy="60" r="2.5" fill="black"/>
                 <path d="M 25 60 Q 15 50 25 40" fill="none" stroke="#333" stroke-width="2.5" stroke-linecap="round"/>`;
            break;
        case 'duck':
        default:
            content = `<path d="M 20 60 Q 10 90 50 90 Q 90 90 95 60 Q 90 40 70 40 Q 50 40 40 50 L 20 60" fill="${color}" stroke="#333" stroke-width="2"/>
                <circle cx="70" cy="30" r="20" fill="${color}" stroke="#333" stroke-width="2"/>
                <circle cx="76" cy="24" r="3" fill="black"/><circle cx="78" cy="22" r="1" fill="white"/>
                <path d="M 88 32 L 100 28 L 98 38 L 86 40 Z" fill="#FF8C00" stroke="#333" stroke-width="1.5" stroke-linejoin="round"/>
                <path d="M 35 65 Q 45 80 65 70" fill="none" stroke="#333" stroke-width="2" opacity="0.4" stroke-linecap="round"/>`;
            break;
    }

    // 前3名添加墨镜
    if (rank >= 1 && rank <= 3) {
        content += `
        <!-- 炫酷墨镜 -->
        <ellipse cx="72" cy="24" rx="9" ry="5" fill="rgba(0,0,0,0.8)" stroke="#333" stroke-width="1.5"/>
        <ellipse cx="85" cy="24" rx="9" ry="5" fill="rgba(0,0,0,0.8)" stroke="#333" stroke-width="1.5"/>
        <path d="M 81 24 L 76 24" stroke="#333" stroke-width="1.5" fill="none"/>
        <!-- 墨镜反光效果 -->
        <ellipse cx="74" cy="22" rx="3" ry="2" fill="rgba(255,255,255,0.6)"/>
        <ellipse cx="87" cy="22" rx="3" ry="2" fill="rgba(255,255,255,0.6)"/>
    `;
    }

    return `<svg viewBox="0 0 100 100" class="duck-svg" xmlns="http://www.w3.org/2000/svg"><g transform="translate(0, 5)">${content}</g></svg>`;
}

// 根据排名获取奖杯图标（1-10名显示不同奖杯）
function getTrophyIcon(rank) {
    switch (rank) {
        case 1:
            // 第1名：超级金色奖杯，带光芒效果
            return `
            <div style="position: relative; display: inline-block;">
                <div style="position: absolute; top: -8px; left: -8px; width: 44px; height: 44px; background: radial-gradient(circle, rgba(255,215,0,0.3) 0%, transparent 70%); border-radius: 50%; animation: pulse 2s infinite;"></div>
                <i class="fas fa-trophy" style="color: #FFD700; font-size: 28px; filter: drop-shadow(0 0 8px #FFD700);"></i>
            </div>
        `;
        case 2:
            // 第2名：银色奖杯
            return '<i class="fas fa-trophy" style="color: #C0C0C0; font-size: 26px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));"></i>';
        case 3:
            // 第3名：铜色奖杯
            return '<i class="fas fa-trophy" style="color: #CD7F32; font-size: 24px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));"></i>';
        case 4:
            // 第4名：蓝宝石奖杯
            return '<i class="fas fa-award" style="color: #4169E1; font-size: 22px; filter: drop-shadow(0 2px 3px rgba(0,0,0,0.2));"></i>';
        case 5:
            // 第5名：紫水晶奖杯
            return '<i class="fas fa-award" style="color: #9370DB; font-size: 22px; filter: drop-shadow(0 2px 3px rgba(0,0,0,0.2));"></i>';
        case 6:
            // 第6名：翡翠奖杯
            return '<i class="fas fa-medal" style="color: #50C878; font-size: 20px; filter: drop-shadow(0 2px 3px rgba(0,0,0,0.2));"></i>';
        case 7:
            // 第7名：红宝石奖章
            return '<i class="fas fa-medal" style="color: #E0115F; font-size: 20px; filter: drop-shadow(0 2px 3px rgba(0,0,0,0.2));"></i>';
        case 8:
            // 第8名：橙色奖章
            return '<i class="fas fa-medal" style="color: #FF8C00; font-size: 18px; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.2));"></i>';
        case 9:
            // 第9名：青铜奖章
            return '<i class="fas fa-certificate" style="color: #B87333; font-size: 18px; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.2));"></i>';
        case 10:
            // 第10名：铁质奖章
            return '<i class="fas fa-certificate" style="color: #708090; font-size: 18px; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.2));"></i>';
        default:
            // 10名以后：普通排名数字
            return `<span style="font-weight: bold; color: #9ca3af;">${rank}</span>`;
    }
}

// initSkinPreviews
function initSkinPreviews() {
    document.querySelectorAll('.skin-preview').forEach(el => {
        el.innerHTML = getAnimalSVG(el.dataset.type, '#FFD700');
    });
}

// 渲染分数线（20、40、60、80）
function renderScoreLines() {
    const container = document.getElementById('score-lines-container');
    if (!container) return;

    container.innerHTML = '';
    const trackH = trackEl.clientHeight;
    const finishY = 120;  // 更新终点线位置与CSS保持一致
    const runDist = trackH - finishY - 60;

    // 分数线位置
    const scorePositions = [
        { score: 20, ratio: 0.97 },
        { score: 40, ratio: 0.93 },
        { score: 60, ratio: 0.89 },
        { score: 70, ratio: 0.80 },
        { score: 75, ratio: 0.70 },
        { score: 80, ratio: 0.55 },
        { score: 85, ratio: 0.40 },
        { score: 90, ratio: 0.25 },
        { score: 95, ratio: 0.10 },
    ];

    scorePositions.forEach(item => {
        const line = document.createElement('div');
        line.className = 'score-line';
        line.setAttribute('data-score', item.score);
        const position = finishY + (runDist * item.ratio);
        line.style.top = position + 'px';
        container.appendChild(line);
    });
}

// --- 背景与皮肤与模式切换 ---
function changeSkin(type) {
    playClickSound();
    currentSkin = type;
    document.querySelectorAll('[id^="skin-btn-"]').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`skin-btn-${type}`).classList.add('active');
    renderDucks();
}

function changeBg(type) {
    playClickSound();
    currentBg = type;
    document.querySelectorAll('[id^="bg-btn-"]').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`bg-btn-${type}`).classList.add('active');
    bodyEl.className = `h-screen w-screen relative select-none overflow-hidden bg-${type}`;
    generateParticles(type);
}

function changeRaceMode(mode) {
    playClickSound();
    raceMode = mode;
    document.querySelectorAll('[id^="mode-btn-"]').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`mode-btn-${mode}`).classList.add('active');
}

function generateParticles(type) {
    particlesContainer.innerHTML = '';
    // 流畅模式下不生成任何粒子
    if (smoothMode) return;

    let count = 0;
    let createFn = null;

    switch (type) {
        case 'sky': count = 6; createFn = createCloud; break;
        case 'water': count = 15; createFn = createBubble; break;
        case 'space': count = 30; createFn = createStar; break;
        case 'snow': count = 40; createFn = createSnowflake; break;
        case 'autumn': count = 15; createFn = createLeaf; break;
        case 'forest': count = 20; createFn = createFirefly; break;
    }

    if (createFn) {
        for (let i = 0; i < count; i++) particlesContainer.appendChild(createFn());
    }
}

// 粒子生成工厂
function createCloud() {
    const div = document.createElement('div');
    div.className = 'particle bg-white/80 rounded-full';
    const w = Math.random() * 100 + 60;
    div.style.width = w + 'px'; div.style.height = w * 0.6 + 'px';
    div.style.top = Math.random() * 80 + '%';
    div.style.animation = `floatLeft ${Math.random() * 20 + 20}s linear infinite`;
    div.style.left = Math.random() * 100 + '%';
    div.style.opacity = Math.random() * 0.5 + 0.3;
    return div;
}
function createBubble() {
    const div = document.createElement('div');
    div.className = 'particle rounded-full border border-white/40 bg-white/10';
    const s = Math.random() * 20 + 5;
    div.style.width = s + 'px'; div.style.height = s + 'px';
    div.style.left = Math.random() * 100 + '%';
    div.style.animation = `floatUp ${Math.random() * 10 + 5}s linear infinite`;
    div.style.animationDelay = Math.random() * 5 + 's';
    return div;
}
function createStar() {
    const div = document.createElement('div');
    div.className = 'particle bg-white rounded-full';
    div.style.width = Math.random() * 3 + 'px'; div.style.height = div.style.width;
    div.style.top = Math.random() * 100 + '%'; div.style.left = Math.random() * 100 + '%';
    div.style.animation = `twinkle ${Math.random() * 3 + 1}s ease-in-out infinite`;
    return div;
}
function createSnowflake() {
    const div = document.createElement('div');
    div.className = 'particle text-white/80';
    div.innerHTML = '❄';
    div.style.fontSize = Math.random() * 15 + 10 + 'px';
    div.style.left = Math.random() * 100 + '%';
    div.style.top = -20 + 'px';
    div.style.animation = `fall ${Math.random() * 10 + 5}s linear infinite`;
    return div;
}
function createLeaf() {
    const div = document.createElement('div');
    div.className = 'particle text-red-500/80';
    div.innerHTML = Math.random() > 0.5 ? '🍂' : '🍁';
    div.style.fontSize = Math.random() * 20 + 10 + 'px';
    div.style.left = Math.random() * 100 + '%';
    div.style.top = -20 + 'px';
    div.style.animation = `fall ${Math.random() * 15 + 8}s linear infinite`;
    return div;
}
function createFirefly() {
    const div = document.createElement('div');
    div.className = 'particle bg-yellow-300 rounded-full shadow-[0_0_10px_yellow]';
    div.style.width = '4px'; div.style.height = '4px';
    div.style.top = Math.random() * 100 + '%'; div.style.left = Math.random() * 100 + '%';
    div.style.animation = `floatRandom ${Math.random() * 10 + 10}s ease-in-out infinite`;
    return div;
}

// --- 界面控制 ---
function toggleSettings() { playClickSound(); settingsOpen = !settingsOpen; updateMenuClass('settings-menu', settingsOpen); }

function toggleAccordion(id) {
    playClickSound();
    const el = document.getElementById(id);
    const icon = document.getElementById(id + '-icon');
    const isHidden = el.classList.contains('hidden');

    if (isHidden) {
        el.classList.remove('hidden');
        icon.style.transform = 'rotate(180deg)';
    } else {
        el.classList.add('hidden');
        icon.style.transform = 'rotate(0deg)';
    }
}
function toggleSmoothMode() {
    playClickSound();
    smoothMode = !smoothMode;
    const btn = document.getElementById('btn-smooth');
    const icon = document.getElementById('icon-smooth');
    if (smoothMode) {
        // 开启流畅模式
        document.body.classList.add('smooth-mode');
        btn.classList.remove('text-green-600', 'bg-white/90');
        btn.classList.add('text-white', 'bg-green-500');
        // 清空背景粒子
        if (particlesContainer) particlesContainer.innerHTML = '';
        // 重新渲染鸭子（不带特效）
        renderDucks();
    } else {
        // 关闭流畅模式
        document.body.classList.remove('smooth-mode');
        btn.classList.remove('text-white', 'bg-green-500');
        btn.classList.add('text-green-600', 'bg-white/90');
        // 恢复背景粒子
        generateParticles(currentBg);
        // 重新渲染鸭子（带特效）
        renderDucks();
    }
}
function updateMenuClass(id, visible) { const el = document.getElementById(id); if (visible) { el.classList.remove('menu-hidden'); el.classList.add('menu-visible'); } else { el.classList.remove('menu-visible'); el.classList.add('menu-hidden'); } }

// 显示大字体排行榜
function showLeaderboard() {
    playClickSound();

    // 如果已有排行榜，则先删除
    const existingBoard = document.getElementById('leaderboard-fullscreen');
    if (existingBoard) existingBoard.remove();

    // 创建全屏排行榜容器
    const boardContainer = document.createElement('div');
    boardContainer.id = 'leaderboard-fullscreen';
    boardContainer.className = 'leaderboard-container';
    boardContainer.innerHTML = `
    <div class="leaderboard-content">
        <h2 class="leaderboard-title">🏆 学生科学成绩排行榜</h2>
        <button class="close-leaderboard" onclick="hideLeaderboard()">×</button>
        <div id="leaderboard-items"></div>
    </div>
`;
    document.body.appendChild(boardContainer);

    // 更新排行榜内容
    updateLeaderboard(true);
}

// 隐藏大字体排行榜
function hideLeaderboard() {
    playClickSound();
    const board = document.getElementById('leaderboard-fullscreen');
    if (board) {
        board.remove();
    }
}

// ====== 年级排行榜功能 ======

// 显示年级选择弹窗
function showGradeLeaderboardSelector() {
    playClickSound();

    // 如果已有选择器或排行榜，先删除
    const existingSelector = document.getElementById('grade-selector-modal');
    if (existingSelector) existingSelector.remove();
    const existingBoard = document.getElementById('grade-leaderboard-fullscreen');
    if (existingBoard) existingBoard.remove();

    const modal = document.createElement('div');
    modal.id = 'grade-selector-modal';
    modal.className = 'grade-selector-overlay';
    modal.onclick = function (e) { if (e.target === modal) { hideGradeSelector(); } };
    modal.innerHTML = `
        <div class="grade-selector-content animate-modal-in">
            <button class="close-leaderboard" onclick="hideGradeSelector()">×</button>
            <div class="grade-selector-title">🏫 选择年级</div>
            <div class="grade-selector-subtitle">请选择要查看排行的年级</div>
            <div class="grade-selector-buttons">
                <div class="grade-card grade-card-5" onclick="showGradeLeaderboard(5)">
                    <div class="grade-card-icon">🎒</div>
                    <div class="grade-card-label">五年级</div>
                    <div class="grade-card-desc">51班 ~ 55班</div>
                </div>
                <div class="grade-card grade-card-6" onclick="showGradeLeaderboard(6)">
                    <div class="grade-card-icon">🎓</div>
                    <div class="grade-card-label">六年级</div>
                    <div class="grade-card-desc">61班 ~ 65班</div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// 隐藏年级选择弹窗
function hideGradeSelector() {
    playClickSound();
    const modal = document.getElementById('grade-selector-modal');
    if (modal) modal.remove();
}

// 显示年级排行榜
function showGradeLeaderboard(grade) {
    playClickSound();

    // 先关闭选择器
    hideGradeSelector();

    // 确保 classDataCache 已初始化
    if (!classDataCache) {
        initClassDataCache();
        if (!classDataCache) {
            alert('❌ 暂无数据！\n\n请先确保 class_data.js 中有学生数据。');
            return;
        }
    }

    // 收集该年级所有班级的学生
    const gradePrefix = grade.toString(); // "5" 或 "6"
    let allGradeStudents = [];

    for (const className in classDataCache) {
        // 班级名称格式: "51班", "52班" ... "55班", "61班" ...
        if (className.startsWith(gradePrefix)) {
            classDataCache[className].forEach(item => {
                allGradeStudents.push({
                    name: item.name,
                    science: item.science,
                    total: item.science,
                    className: className
                });
            });
        }
    }

    if (allGradeStudents.length === 0) {
        alert(`❌ 未找到${grade}年级的学生数据！`);
        return;
    }

    // 按成绩排序
    allGradeStudents.sort((a, b) => b.total - a.total);

    // 如果已有排行榜，先删除
    const existingBoard = document.getElementById('grade-leaderboard-fullscreen');
    if (existingBoard) existingBoard.remove();

    // 构建排行榜 HTML
    let itemsHtml = '';
    let currentRank = 0;
    let lastScore = -1;

    allGradeStudents.forEach((s, i) => {
        if (s.total !== lastScore) {
            currentRank = i + 1;
            lastScore = s.total;
        }
        const rank = currentRank;

        let rankClass = 'rank-other';
        if (rank === 1) rankClass = 'rank-1';
        else if (rank === 2) rankClass = 'rank-2';
        else if (rank === 3) rankClass = 'rank-3';
        else if (rank === 4) rankClass = 'rank-4';
        else if (rank === 5) rankClass = 'rank-5';

        let rankIcon = '';
        if (rank <= 50) {
            const icons = [
                '',     // 0 (占位)
                // ★ 第1-3名: 王者级 (皇冠/奖杯/金牌，带发光特效)
                '👑', '🏆', '🥇',
                // ★ 第4-10名: 宝石级 (钻石/星辰/闪电)
                '🌟', '💎', '✨', '⭐', '⚡', '🎯', '🌈',
                // ★ 第11-20名: 荣耀级 (火箭/水晶/花朵)
                '🚀', '🔮', '🎪', '🌺', '🎀', '🍀', '🦋', '🌸', '🎵', '🎈',
                // ★ 第21-30名: 勇士级 (动物/力量)
                '🦁', '🦅', '🐉', '🦄', '🐬', '🦊', '🐧', '🦉', '🐝', '🐞',
                // ★ 第31-40名: 新星级 (自然/运动)
                '🌻', '🌴', '🏀', '⚽', '🎾', '🎸', '🎨', '📚', '🧩', '🎲',
                // ★ 第41-50名: 种子级 (温馨小图标)
                '🌱', '🍂', '☘️', '🫧', '🪽', '🧸', '🎐', '🪄', '🌙', '💫'
            ];
            if (icons[rank]) {
                // 根据排名层级设置不同样式
                let iconClass = '';
                if (rank <= 3) iconClass = `rank-${rank}-icon`;        // 专属发光
                else if (rank <= 10) iconClass = `rank-${rank}-icon`;  // 带颜色
                else if (rank <= 20) iconClass = `rank-${rank}-icon`;  // 标准
                else if (rank <= 30) iconClass = 'grade-rank-tier-4';  // 勇士级
                else if (rank <= 40) iconClass = 'grade-rank-tier-5';  // 新星级
                else iconClass = 'grade-rank-tier-6';                  // 种子级

                rankIcon = `<span class="rank-icon ${iconClass}">${icons[rank]}</span>`;
            }
        }

        // 班级标签颜色
        const classColors = {
            '51班': '#3b82f6', '52班': '#8b5cf6', '53班': '#ec4899',
            '54班': '#f59e0b', '55班': '#10b981',
            '61班': '#6366f1', '62班': '#14b8a6', '63班': '#f43f5e',
            '64班': '#f97316', '65班': '#06b6d4'
        };
        const classColor = classColors[s.className] || '#6b7280';

        itemsHtml += `
        <div class="leaderboard-item ${rankClass}">
            <div class="student-rank">${rank}</div>
            <div class="student-name">${rankIcon}${s.name}</div>
            <div class="grade-class-tag" style="background: ${classColor};">${s.className}</div>
            <div class="student-score">${s.total.toFixed(1)}分</div>
        </div>
        `;
    });

    // 创建全屏排行榜
    const boardContainer = document.createElement('div');
    boardContainer.id = 'grade-leaderboard-fullscreen';
    boardContainer.className = 'leaderboard-container';
    boardContainer.innerHTML = `
    <div class="leaderboard-content grade-leaderboard-wide">
        <h2 class="leaderboard-title">🏫 ${grade === 5 ? '五' : '六'}年级科学成绩排行榜</h2>
        <div class="grade-leaderboard-info">共 ${allGradeStudents.length} 名学生参与排名</div>
        <button class="close-leaderboard" onclick="hideGradeLeaderboard()">×</button>
        <div id="grade-leaderboard-items">${itemsHtml}</div>
    </div>
    `;
    document.body.appendChild(boardContainer);
}

// 隐藏年级排行榜
function hideGradeLeaderboard() {
    playClickSound();
    const board = document.getElementById('grade-leaderboard-fullscreen');
    if (board) board.remove();
}


// 点赞存储对象（按学生姓名存储点赞数）
let likeCounts = {};

// 点赞处理函数
function handleLike(button, studentName) {
    playLikeSound();

    // 获取当前点赞数
    const currentLikes = parseInt(button.getAttribute('data-likes')) + 1;

    // 更新点赞数
    button.setAttribute('data-likes', currentLikes);
    button.querySelector('.like-count').textContent = currentLikes;

    // 存储点赞数
    if (!likeCounts[studentName]) {
        likeCounts[studentName] = 0;
    }
    likeCounts[studentName] = currentLikes;

    // 改变心形颜色和大小
    const heartIcon = button.querySelector('.heart-icon');
    heartIcon.style.color = '#ff4757';
    heartIcon.style.transform = 'scale(1.3)';

    // 添加点赞动画效果
    button.classList.add('liked');

    // 添加粒子效果
    createLikeParticles(button);

    // 恢复原始状态（动画结束后）
    setTimeout(() => {
        button.classList.remove('liked');
    }, 500);
}

// 创建点赞粒子效果
function createLikeParticles(button) {
    // 流畅模式下跳过粒子效果
    if (smoothMode) return;

    const rect = button.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    for (let i = 0; i < 15; i++) {
        const particle = document.createElement('div');
        particle.className = 'like-particle';
        particle.innerHTML = '❤️';
        particle.style.position = 'fixed';
        particle.style.left = centerX + 'px';
        particle.style.top = centerY + 'px';
        particle.style.fontSize = '12px';
        particle.style.pointerEvents = 'none';
        particle.style.zIndex = '9999';
        particle.style.opacity = '0';

        // 随机角度和距离
        const angle = Math.random() * Math.PI * 2;
        const distance = 30 + Math.random() * 50;
        const duration = 0.8 + Math.random() * 0.4;

        particle.style.transform = `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px) scale(0)`;
        particle.style.transition = `all ${duration}s ease-out`;

        document.body.appendChild(particle);

        // Trigger animation
        setTimeout(() => {
            particle.style.opacity = '1';
            particle.style.transform = `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px) scale(1.5)`;

            // Clear particles
            setTimeout(() => {
                particle.style.opacity = '0';
                setTimeout(() => {
                    if (particle.parentNode) {
                        particle.parentNode.removeChild(particle);
                    }
                }, 500);
            }, duration * 700);
        }, 10);
    }
}

// 点赞音效
function playLikeSound() {
    if (!audioEnabled) return;

    // 获取全局音频上下文
    if (!audioCtx) initAudio();
    if (!audioCtx) return;

    try {
        // 创建点赞音效
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        osc.frequency.exponentialRampToValueAtTime(659.25, audioCtx.currentTime + 0.1); // E5

        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
        console.log('点赞音效播放失败:', e);
    }
}

// 更新排行榜内容（支持全屏模式）- 添加点赞功能
function updateLeaderboard(isFullscreen = false) {
    const sorted = [...students].sort((a, b) => b.total - a.total);

    let html = '';
    let currentRank = 0;
    let lastScore = -1;

    sorted.forEach((s, i) => {
        if (s.total !== lastScore) {
            currentRank = i + 1;
            lastScore = s.total;
        }
        const rank = currentRank;

        // 确定排名类别
        let rankClass = 'rank-other';
        if (rank === 1) rankClass = 'rank-1';
        else if (rank === 2) rankClass = 'rank-2';
        else if (rank === 3) rankClass = 'rank-3';
        else if (rank === 4) rankClass = 'rank-4';
        else if (rank === 5) rankClass = 'rank-5';

        // 添加排名图标
        let rankIcon = '';
        if (rank <= 20) {
            switch (rank) {
                case 1: rankIcon = '👑'; break;  // 国王/女王皇冠
                case 2: rankIcon = '🏆'; break;  // 奖杯
                case 3: rankIcon = '🥇'; break;  // 金牌
                case 4: rankIcon = '🌟'; break;  // 星星
                case 5: rankIcon = '💎'; break;  // 钻石
                case 6: rankIcon = '✨'; break;  // 闪光
                case 7: rankIcon = '⭐'; break;  // 星星
                case 8: rankIcon = '⚡'; break;  // 闪电
                case 9: rankIcon = '🎯'; break;  // 飞镖
                case 10: rankIcon = '🌈'; break; // 彩虹
                case 11: rankIcon = '🚀'; break; // 火箭
                case 12: rankIcon = '🔮'; break; // 水晶球
                case 13: rankIcon = '🔔'; break; // 铃铛
                case 14: rankIcon = '🌺'; break; // 花朵
                case 15: rankIcon = '🎀'; break; // 缎带
                case 16: rankIcon = '🍀'; break; // 四叶草
                case 17: rankIcon = '🍃'; break; // 叶子
                case 18: rankIcon = '🍎'; break; // 苹果
                case 19: rankIcon = '🍓'; break; // 草莓
                case 20: rankIcon = '🎈'; break; // 气球
                default: rankIcon = ''; break;
            }

            // 添加对应的颜色类
            let iconClass = `rank-${rank}-icon`;
            rankIcon = `<span class="rank-icon ${iconClass}">${rankIcon}</span>`;
        }

        // 获取该学生的点赞数
        const likes = likeCounts[s.name] || 0;

        html += `
        <div class="leaderboard-item ${rankClass}">
            <div class="student-rank">${rank}</div>
            <div class="student-name">${rankIcon}${s.name}</div>
            <div class="student-score">${s.total.toFixed(1)}分</div>
            <div class="like-container">
                <button class="like-btn" data-likes="${likes}" onclick="handleLike(this, '${s.name.replace(/'/g, "\\'")}')">
                    <span class="heart-icon">❤️</span>
                    <span class="like-count">${likes}</span>
                </button>
            </div>
        </div>
    `;
    });

    if (isFullscreen) {
        // 全屏模式
        const itemsContainer = document.getElementById('leaderboard-items');
        if (itemsContainer) {
            itemsContainer.innerHTML = html;
        }
    } else {
        // 其他情况更新原有内容（如果需要兼容）
        const leaderboardContent = document.getElementById('leaderboard-content');
        if (leaderboardContent) {
            leaderboardContent.innerHTML = html;
        }
    }
}

function downloadTemplate() {
    playClickSound();

    // 创建Excel工作簿
    const wb = XLSX.utils.book_new();

    // 创建示例数据（只包含姓名和科学成绩）
    const data = [
        ["姓名", "科学"],
        ["张三", 85.0],
        ["李四", 92.5],
        ["王五", 78.8]
    ];

    // 将数据转换为工作表
    const ws = XLSX.utils.aoa_to_sheet(data);

    // 设置列宽
    ws['!cols'] = [
        { wch: 12 },  // 姓名列
        { wch: 10 }   // 科学成绩列
    ];

    // 添加工作表到工作簿
    XLSX.utils.book_append_sheet(wb, ws, "科学成绩表");

    // 导出Excel文件
    XLSX.writeFile(wb, "科学成绩模板.xlsx");
}

// --- 数据逻辑 ---
function generateDemoData() {
    playClickSound();
    const names = [
        "张吉惟", "林国瑞", "林玟书", "林雅南", "江奕云",
        "丁真", "王源", "王鹤棣", "赵露思", "周杰伦", "白鹿", "赵丽颖", "蔡徐坤", "杨幂", "白敬亭", "贾玲", "王一博",
        "刘亦菲", "杨紫", "虞书欣", "肖战", "迪丽热巴", "鹿晗", "范丞丞", "关晓彤", "成毅", "檀健次",
        "吴磊", "周深", "鞠婧祎", "张艺兴", "章若楠", "张颂文", "易烊千玺", "林更新", "黄子韬", "王俊凯",
        "东雨姐"
    ];

    const data = [];
    let highTierCount = 0;

    names.forEach(name => {
        let science, total;
        if (name === "张吉惟") { science = 100; total = 100; }
        else if (name === "林国瑞") { science = 99; total = 99; }
        else if (name === "林玟书") { science = 99; total = 99; }
        else if (name === "林雅南" || name === "江奕云") { science = 96; total = 96; }
        else if (name === "东雨姐") { science = 33; total = 33; }
        else {
            if (highTierCount < 5) { science = 90 + Math.floor(Math.random() * 10); highTierCount++; }
            else { science = 60 + Math.floor(Math.random() * 30); }
            total = science;
        }
        data.push({
            name: name,
            science: science,
            total: total,
            color: getRandomColor(),
            id: Math.random().toString(36).substr(2, 9)
        });
    });
    loadStudents(data);
}

function handleFileUpload(input) {
    if (!input.files[0]) return;

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = function (e) {
        try {
            // 使用SheetJS读取Excel文件
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            // 获取第一个工作表
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];

            // 将工作表转换为JSON数组
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            const studentData = [];
            let hasHeader = false;

            for (let i = 0; i < jsonData.length; i++) {
                const row = jsonData[i];

                // 跳过空行
                if (!row || row.length === 0) continue;

                // 跳过表头（如果第二列不是数字）
                if (i === 0 && row.length >= 2 && isNaN(parseInt(row[1]))) {
                    hasHeader = true;
                    continue;
                }

                // 至少需要姓名和科学成绩
                if (row.length >= 2) {
                    const name = String(row[0] || '').trim();

                    // 跳过空行或无效行
                    if (!name || name === '') continue;

                    // 科学成绩（使用parseFloat保留小数）
                    const science = parseFloat(row[1]) || 0;

                    // 验证科学成绩有效
                    if (science >= 0) {
                        studentData.push({
                            name: name,
                            science: science,
                            total: science,
                            color: getRandomColor(),
                            id: Math.random().toString(36).substr(2, 9)
                        });
                    }
                }
            }

            if (studentData.length > 0) {
                loadStudents(studentData);
                if (settingsOpen) toggleSettings();
                alert(`✅ 成功导入 ${studentData.length} 名学生的科学成绩数据！`);
            } else {
                alert('❌ 未能解析到有效数据！\n\n请确保Excel格式正确：\n第一列：姓名\n第二列：科学成绩');
            }
        } catch (err) {
            alert('❌ 文件解析失败：' + err.message + '\n\n请检查文件格式是否正确');
            console.error('Excel解析错误:', err);
        }

        // 清空input，允许重复上传同一文件
        input.value = '';
    };

    // 使用ArrayBuffer读取文件
    reader.readAsArrayBuffer(file);
}

function loadStudents(data) {
    if (!data || data.length === 0) {
        alert('❌ 没有有效的学生数据！');
        return;
    }

    // 1. 计算排名
    const sortedForRank = [...data].sort((a, b) => b.total - a.total);
    let currentRank = 0;
    let lastScore = -1;
    sortedForRank.forEach((s, i) => {
        if (s.total !== lastScore) {
            currentRank = i + 1;
            lastScore = s.total;
        }
        const student = data.find(std => std.id === s.id);
        if (student) student.finalRank = currentRank;
    });

    // 2. 核心修改：重新排列鸭子水平顺序，防止分数相近的鸭子靠在一起
    // 将排序后的学生分成三部分，交错排列，确保相邻鸭子分数差异最大化
    const n = sortedForRank.length;
    const reordered = new Array(n);
    const groupSize = Math.ceil(n / 3);

    let targetIdx = 0;
    for (let i = 0; i < groupSize; i++) {
        // 从高分段、中分段、低分段各取一个，交错放入
        if (i < n) {
            if (i < sortedForRank.length) reordered[targetIdx++] = sortedForRank[i];
            if (i + groupSize < sortedForRank.length) reordered[targetIdx++] = sortedForRank[i + groupSize];
            if (i + groupSize * 2 < sortedForRank.length) reordered[targetIdx++] = sortedForRank[i + groupSize * 2];
        }
    }

    // 过滤掉可能的空位（如果n不是3的倍数）
    students = reordered.filter(s => s !== undefined);

    // 渲染鸭子
    renderDucks();

    // 重置比赛状态
    resetRaceState();

    console.log(`✅ 已加载 ${students.length} 名学生数据，并进行了分数间距优化排列`);
}

function renderDucks() {
    trackEl.innerHTML = '';
    if (students.length === 0) {
        trackEl.innerHTML = '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;color:#999;font-size:18px;"><i class="fas fa-inbox" style="font-size:48px;margin-bottom:10px;display:block;"></i>暂无数据<br><span style="font-size:14px;">请上传Excel文件或生成模拟数据</span></div>';
        return;
    }

    // 平均分配屏幕宽度，让所有鸭子都能显示在一个屏幕内
    const w = trackEl.clientWidth - 80;
    const colW = w / students.length;

    // 按成绩排序找出前五名
    const topFive = [...students].sort((a, b) => b.total - a.total).slice(0, 5).map(s => s.id);

    // 计算排名（用于显示轮子）
    const sortedStudents = [...students].sort((a, b) => b.total - a.total);
    const rankMap = {};
    let currentRank = 0;
    let lastScore = -1;
    sortedStudents.forEach((s, idx) => {
        if (s.total !== lastScore) {
            currentRank = idx + 1;
            lastScore = s.total;
        }
        rankMap[s.id] = currentRank;
    });

    students.forEach((s, i) => {
        const lane = document.createElement('div');
        lane.className = 'duck-lane';
        lane.style.left = (i * colW + 40) + 'px';
        lane.style.width = '0px';
        lane.style.zIndex = i + 10;

        // 获取当前学生的排名
        const currentRank = rankMap[s.id];

        // 根据排名生成特效（流畅模式下跳过）
        let necklace = '';
        let rankGlow = '';

        if (!smoothMode && currentRank >= 1 && currentRank <= 10) {
            let crownHtml = '';
            if (currentRank <= 3) {
                const crowns = ['', '👑', '🥈', '🥉']; // 1:金皇冠, 2:银皇冠, 3:铜皇冠 (或者用emoji代指)
                // 这里的 🥈 🥉 也可以换成自定义阴影颜色的 👑
                const crownEmojis = ['', '👑', '👑', '👑'];
                const crownClasses = ['', 'crown-gold', 'crown-silver', 'crown-bronze'];
                crownHtml = `<div class="rank-crown ${crownClasses[currentRank]}">${crownEmojis[currentRank]}</div>`;
            }

            // 生成粒子
            let particlesHtml = '';
            for (let p = 0; p < 8; p++) {
                particlesHtml += `<div class="rank-particle p${p}"></div>`;
            }

            rankGlow = `
                <div class="rank-effect rank-effect-${currentRank}">
                    ${crownHtml}
                    <div class="rank-glow-aura"></div>
                    <div class="rank-particles">
                        ${particlesHtml}
                    </div>
                </div>
            `;
        }

        // 仅前3名保留金项链（流畅模式下跳过）
        if (!smoothMode && currentRank >= 1 && currentRank <= 3) {
            necklace = `
            <div class="gold-necklace">
                <svg viewBox="0 0 45 25" style="width: 100%; height: 100%;">
                    <defs>
                        <linearGradient id="gold-grad-${s.id}" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" style="stop-color:#FFD700;stop-opacity:1" />
                            <stop offset="50%" style="stop-color:#FFA500;stop-opacity:1" />
                            <stop offset="100%" style="stop-color:#FFD700;stop-opacity:1" />
                        </linearGradient>
                    </defs>
                    <path d="M 5 8 Q 10 5 15 8 Q 20 5 25 8 Q 30 5 35 8 Q 40 5 45 8" 
                          stroke="url(#gold-grad-${s.id})" 
                          stroke-width="2.5" 
                          fill="none" 
                          stroke-linecap="round"/>
                    <circle cx="22.5" cy="15" r="6" fill="url(#gold-grad-${s.id})" stroke="#FF8C00" stroke-width="1.5"/>
                    <text x="22.5" y="18" font-size="8" font-weight="bold" fill="#FF8C00" text-anchor="middle">★</text>
                </svg>
            </div>
        `;
        }

        lane.innerHTML = `<div class="duck-wrapper" id="duck-${s.id}" onclick="showStudentDetails('${s.id}')">
        ${rankGlow}
        <div class="duck-inner">
            ${necklace}
            <div class="duck-name">${s.name}</div>
            ${getAnimalSVG(currentSkin, s.color, currentRank)}
        </div>
    </div>`;
        trackEl.appendChild(lane);
    });
}
// --- 赛跑逻辑（带超车系统）---
function toggleRace() { playClickSound(); isRacing ? resetRaceState() : startRace(); }

function startRace() {
    if (isRacing) return;
    if (students.length === 0) {
        alert('请先导入数据或生成模拟数据！');
        return;
    }

    // 显示倒数动画
    showCountdown();
}

function showCountdown() {
    isRacing = true;

    // 播放比赛音频
    if (audioEnabled) {
        raceAudio.currentTime = 0;
        raceAudio.play().catch(e => console.log('音频播放失败:', e));
    }

    // UI 更新
    const btnIcon = document.getElementById('icon-play');
    btnIcon.classList.replace('fa-play', 'fa-undo');
    document.getElementById('btn-start').className = document.getElementById('btn-start').className.replace('from-yellow-400', 'from-gray-400').replace('to-orange-500', 'to-gray-500');
    hideLeaderboard();

    // 给所有鸭子添加racing类，名字变半透明
    document.querySelectorAll('.duck-wrapper').forEach(el => {
        el.classList.add('racing');
    });

    // 激活前五名的大火箭火焰
    const topFive = [...students].sort((a, b) => b.total - a.total).slice(0, 5);
    topFive.forEach(s => {
        const flame = document.getElementById(`flame-${s.id}`);
        if (flame) {
            flame.classList.add('active');
        }
    });

    // 激活6-10名的小火箭火焰
    const sixToTen = [...students].sort((a, b) => b.total - a.total).slice(5, 10);
    sixToTen.forEach(s => {
        const smallFlame = document.getElementById(`small-flame-${s.id}`);
        if (smallFlame) {
            smallFlame.classList.add('active');
        }
    });

    // 显示倒数3
    const countdown3 = document.getElementById('countdown-3');
    countdown3.classList.add('show', 'zoom');

    // 播放倒数声音
    if (audioEnabled) playCountdownSound(3);

    setTimeout(() => {
        // 隐藏倒数3，显示倒数2
        countdown3.classList.remove('show', 'zoom');

        const countdown2 = document.getElementById('countdown-2');
        countdown2.classList.add('show', 'zoom');

        // 播放倒数声音
        if (audioEnabled) playCountdownSound(2);

        setTimeout(() => {
            // 隐藏倒数2，显示倒数1
            countdown2.classList.remove('show', 'zoom');

            const countdown1 = document.getElementById('countdown-1');
            countdown1.classList.add('show', 'zoom');

            // 播放倒数声音
            if (audioEnabled) playCountdownSound(1);

            setTimeout(() => {
                // 隐藏倒数1，显示GO!
                countdown1.classList.remove('show', 'zoom');

                const countdownGo = document.getElementById('countdown-go');
                countdownGo.classList.add('show', 'zoom');

                // 播放GO声音
                if (audioEnabled) playGoSound();

                setTimeout(() => {
                    // 隐藏GO!，开始比赛
                    countdownGo.classList.remove('show', 'zoom');

                    // 开始比赛逻辑
                    startActualRace();
                }, 800); // GO显示时间
            }, 1000); // 倒数1显示时间
        }, 1000); // 倒数2显示时间
    }, 1000); // 倒数3显示时间
}

function startActualRace() {
    raceStartTime = Date.now();
    // 动态计算最高分
    const maxScore = Math.max(...students.map(s => s.total));
    const trackH = trackEl.clientHeight;
    const finishY = 120;  // 与CSS中的终点线位置保持一致
    const runDist = trackH - finishY - 60; // 考虑起始偏移

    // 缓存鸭子DOM元素，避免每帧查询
    const duckElements = {};

    // 给每个学生生成一个随机的"运动"参数
    students.forEach(s => {
        s.speedVariation = Math.random() * 0.3 + 0.85; // 速度变化系数 (0.85-1.15)
        s.accelerationDelay = Math.random() * 0.15; // 启动延迟 (0-15%)
        s.lastY = 0; // 记录上一帧位置，防止后退

        // 缓存DOM
        duckElements[s.id] = document.getElementById(`duck-${s.id}`);
    });

    function animate() {
        if (!isRacing) return;
        const now = Date.now();
        let p = (now - raceStartTime) / raceDuration;
        if (p > 1) p = 1;

        students.forEach(s => {
            const el = duckElements[s.id];
            if (!el) return;

            // 使用非线性映射，进一步压缩0-60分区间，将空间分配给60-100分区间
            // 特别注意拉大70-75和75-80分区间，使其与80-85区间具有相同宽度
            let normalizedScore = s.total / maxScore * 100; // 转换为百分制
            let distanceRatio;

            if (normalizedScore <= 20) {
                // 0-20分区间，进一步压缩
                distanceRatio = (normalizedScore / 20) * 0.05;
            } else if (normalizedScore <= 40) {
                // 20-40分区间，进一步压缩
                distanceRatio = 0.05 + ((normalizedScore - 20) / 20) * 0.05;
            } else if (normalizedScore <= 60) {
                // 40-60分区间，进一步压缩
                distanceRatio = 0.10 + ((normalizedScore - 40) / 20) * 0.10;  // 进一步压缩
            } else if (normalizedScore <= 70) {
                // 60-70分区间，扩大此区间以增加区分度
                distanceRatio = 0.20 + ((normalizedScore - 60) / 10) * 0.15;
            } else if (normalizedScore <= 75) {
                // 70-75分区间，与80-85区间长度一致
                distanceRatio = 0.35 + ((normalizedScore - 70) / 5) * 0.12;
            } else if (normalizedScore <= 80) {
                // 75-80分区间，与80-85区间长度一致
                distanceRatio = 0.47 + ((normalizedScore - 75) / 5) * 0.13;
            } else if (normalizedScore <= 85) {
                // 80-85分区间，设定基准长度
                distanceRatio = 0.60 + ((normalizedScore - 80) / 5) * 0.12;
            } else {
                // 85-100分区间，扩展以提供更好的区分度
                distanceRatio = 0.72 + ((normalizedScore - 85) / 15) * 0.28;
            }

            const target = runDist * distanceRatio;
            let currentY = 0;

            if (raceMode === 'sameSpeed') {
                // 相同速度模式：每只鸭子到达自己终点的速度相同
                // 成绩好的距离短，用时少；成绩差的距离长，用时多
                // 使用线性速度，让每只鸭子以恒定速度跑到自己的终点
                const individualProgress = target > 0 ? (runDist * p) / target : 1;

                if (individualProgress >= 1) {
                    // 已到达终点，停在终点位置
                    currentY = target;
                } else {
                    // 还在跑，使用缓动曲线
                    const easedP = individualProgress < 0.5
                        ? 2 * individualProgress * individualProgress
                        : 1 - Math.pow(-2 * individualProgress + 2, 2) / 2;
                    currentY = target * easedP;
                }

            } else {
                // 相同时间模式：所有鸭子同时到达各自终点，有自然的超车
                // 给每只鸭子添加轻微的速度变化，产生超车效果
                let adjustedP = p;

                // 添加轻微的个性化加速（减小幅度，避免太夸张）
                if (p < s.accelerationDelay * 0.3) {
                    // 启动延迟很小
                    adjustedP = p / (1 + s.accelerationDelay * 0.3);
                } else {
                    adjustedP = p;
                }

                // 使用统一的缓动曲线，但添加轻微波动
                const easedP = adjustedP < 0.5
                    ? 2 * adjustedP * adjustedP
                    : 1 - Math.pow(-2 * adjustedP + 2, 2) / 2;

                // 添加轻微的速度波动（幅度很小，产生自然的超车）
                const speedWave = Math.sin(adjustedP * Math.PI * 3 + s.speedVariation) * 0.03 * adjustedP * (1 - adjustedP);
                const finalP = Math.max(0, Math.min(1, easedP + speedWave));

                currentY = target * finalP;
            }

            el.style.transform = `translateY(-${currentY}px)`;
        });

        if (p < 1) animationFrameId = requestAnimationFrame(animate);
        else finishRace();
    }
    animationFrameId = requestAnimationFrame(animate);
}

// 添加倒数声音函数 - 欢快铃声版
function playCountdownSound(number) {
    if (!audioCtx) return;

    try {
        const now = audioCtx.currentTime;

        // 欢快递进音调（C大调音阶，越来越高越兴奋）
        let baseFreq;
        switch (number) {
            case 3: baseFreq = 523; break;  // C5 - 明亮起步
            case 2: baseFreq = 659; break;  // E5 - 上升
            case 1: baseFreq = 784; break;  // G5 - 高潮前奏
            default: baseFreq = 523;
        }

        const duration = 0.45;

        // 主音 - 纯净明亮的正弦波（像木琴/竖琴）
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.type = 'sine';
        osc1.frequency.value = baseFreq;
        gain1.gain.setValueAtTime(0, now);
        gain1.gain.linearRampToValueAtTime(0.35, now + 0.01);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + duration);
        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);
        osc1.start(now);
        osc1.stop(now + duration + 0.05);

        // 八度泛音 - 增加亮度（像铃铛）
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.type = 'sine';
        osc2.frequency.value = baseFreq * 2;
        gain2.gain.setValueAtTime(0, now);
        gain2.gain.linearRampToValueAtTime(0.18, now + 0.01);
        gain2.gain.exponentialRampToValueAtTime(0.005, now + duration * 0.7);
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.start(now);
        osc2.stop(now + duration);

        // 三倍泛音 - 增加清脆感
        const osc3 = audioCtx.createOscillator();
        const gain3 = audioCtx.createGain();
        osc3.type = 'sine';
        osc3.frequency.value = baseFreq * 3;
        gain3.gain.setValueAtTime(0, now);
        gain3.gain.linearRampToValueAtTime(0.08, now + 0.01);
        gain3.gain.exponentialRampToValueAtTime(0.005, now + duration * 0.4);
        osc3.connect(gain3);
        gain3.connect(audioCtx.destination);
        osc3.start(now);
        osc3.stop(now + duration * 0.5);

        // 柔和的低音衬底（温暖的"boop"感）
        const bassOsc = audioCtx.createOscillator();
        const bassGain = audioCtx.createGain();
        bassOsc.type = 'sine';
        bassOsc.frequency.value = baseFreq / 2;
        bassGain.gain.setValueAtTime(0, now);
        bassGain.gain.linearRampToValueAtTime(0.15, now + 0.01);
        bassGain.gain.exponentialRampToValueAtTime(0.005, now + 0.25);
        bassOsc.connect(bassGain);
        bassGain.connect(audioCtx.destination);
        bassOsc.start(now);
        bassOsc.stop(now + 0.3);

    } catch (e) {
        console.log('倒数音效播放失败:', e);
    }
}

// 添加GO声音函数 - 欢快琶音版
function playGoSound() {
    if (!audioCtx) return;

    try {
        const now = audioCtx.currentTime;

        // 欢快的C大调琶音上行：C-E-G-C（像游戏开始的欢乐音效）
        const notes = [
            { freq: 523, delay: 0, dur: 0.2 },  // C5
            { freq: 659, delay: 0.07, dur: 0.2 },  // E5
            { freq: 784, delay: 0.14, dur: 0.2 },  // G5
            { freq: 1047, delay: 0.21, dur: 0.45 },  // C6 - 最高音，持续更长
        ];

        notes.forEach(note => {
            // 主音 - 明亮正弦波
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.value = note.freq;
            gain.gain.setValueAtTime(0, now + note.delay);
            gain.gain.linearRampToValueAtTime(0.3, now + note.delay + 0.01);
            gain.gain.setValueAtTime(0.3, now + note.delay + note.dur * 0.5);
            gain.gain.exponentialRampToValueAtTime(0.005, now + note.delay + note.dur);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now + note.delay);
            osc.stop(now + note.delay + note.dur + 0.05);

            // 八度泛音 - 增加闪亮感
            const osc2 = audioCtx.createOscillator();
            const gain2 = audioCtx.createGain();
            osc2.type = 'sine';
            osc2.frequency.value = note.freq * 2;
            gain2.gain.setValueAtTime(0, now + note.delay);
            gain2.gain.linearRampToValueAtTime(0.12, now + note.delay + 0.01);
            gain2.gain.exponentialRampToValueAtTime(0.005, now + note.delay + note.dur * 0.6);
            osc2.connect(gain2);
            gain2.connect(audioCtx.destination);
            osc2.start(now + note.delay);
            osc2.stop(now + note.delay + note.dur);
        });

        // 最后加一个高音闪烁（像星星闪烁的"叮"）
        const shimmer = audioCtx.createOscillator();
        const shimmerGain = audioCtx.createGain();
        shimmer.type = 'sine';
        shimmer.frequency.value = 2093; // C7
        shimmerGain.gain.setValueAtTime(0, now + 0.3);
        shimmerGain.gain.linearRampToValueAtTime(0.15, now + 0.31);
        shimmerGain.gain.exponentialRampToValueAtTime(0.005, now + 0.7);
        shimmer.connect(shimmerGain);
        shimmerGain.connect(audioCtx.destination);
        shimmer.start(now + 0.3);
        shimmer.stop(now + 0.75);

    } catch (e) {
        console.log('GO音效播放失败:', e);
    }
}

function finishRace() {
    isRacing = false;
    playWinSound();

    // 移除所有鸭子的racing类，名字恢复正常
    document.querySelectorAll('.duck-wrapper').forEach(el => {
        el.classList.remove('racing');
    });

    // 关闭所有火箭加速器火焰（大火箭+小火箭）
    document.querySelectorAll('.rocket-flame.active, .small-rocket-flame.active').forEach(flame => {
        flame.classList.remove('active');
    });

    // 停止比赛音频，播放终点音频
    raceAudio.pause();
    raceAudio.currentTime = 0;
    if (audioEnabled) {
        finishAudio.currentTime = 0;
        finishAudio.play().catch(e => console.log('终点音频播放失败:', e));
    }

    // 为学生设置最终排名并更新排行榜数据
    const sorted = [...students].sort((a, b) => b.total - a.total);
    let currentRank = 0;
    let lastScore = -1;
    sorted.forEach((s, i) => {
        if (s.total !== lastScore) {
            currentRank = i + 1;
            lastScore = s.total;
        }
        s.finalRank = currentRank;  // 设置最终排名
    });
    updateLeaderboard();

    // 按钮复原
    const btnIcon = document.getElementById('icon-play');
    btnIcon.classList.replace('fa-undo', 'fa-play');
    document.getElementById('btn-start').className = document.getElementById('btn-start').className.replace('from-gray-400', 'from-yellow-400').replace('to-gray-500', 'to-orange-500');
}

function resetRaceState() {
    playClickSound();
    cancelAnimationFrame(animationFrameId);
    isRacing = false;

    // 关闭所有火箭加速器火焰（大火箭+小火箭）
    document.querySelectorAll('.rocket-flame.active, .small-rocket-flame.active').forEach(flame => {
        flame.classList.remove('active');
    });

    // 移除所有鸭子的racing类
    document.querySelectorAll('.duck-wrapper').forEach(el => {
        el.classList.remove('racing');
    });

    // 停止所有比赛相关音频
    raceAudio.pause();
    raceAudio.currentTime = 0;
    finishAudio.pause();
    finishAudio.currentTime = 0;

    const btnIcon = document.getElementById('icon-play');
    btnIcon.classList.replace('fa-undo', 'fa-play');
    document.getElementById('btn-start').className = document.getElementById('btn-start').className.replace('from-gray-400', 'from-yellow-400').replace('to-gray-500', 'to-orange-500');

    document.querySelectorAll('.duck-wrapper').forEach(el => el.style.transform = `translateX(0px)`);
    hideLeaderboard();
}

function showStudentDetails(id) {
    playClickSound();
    const s = students.find(std => std.id === id);
    if (!s) return;
    document.getElementById('modal-name').innerText = s.name;
    document.getElementById('modal-total').innerText = s.total.toFixed(1);
    document.getElementById('modal-score-science').innerText = s.science.toFixed(1);
    document.getElementById('modal-rank').innerText = `第 ${s.finalRank} 名`;
    document.getElementById('modal-duck-icon').innerHTML = getAnimalSVG(currentSkin, s.color, s.finalRank || 0);
    document.getElementById('student-modal').classList.remove('hidden');
    document.getElementById('student-modal').classList.add('flex');
}

function closeModal() {
    playClickSound();
    document.getElementById('student-modal').classList.add('hidden');
    document.getElementById('student-modal').classList.remove('flex');
}
