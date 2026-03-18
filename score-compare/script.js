/** ==============================================
 * 核心逻辑区域
 * ============================================== */

// 初始化数据解析
let parsedData = {};

function initData() {
    parsedData = {
        5: { base: parseData(data5_Base), final: parseData(data5_Final) },
        6: { base: parseData(data6_Base), final: parseData(data6_Final) }
    };
}

// 事件监听
document.addEventListener('click', function (e) {
    if (!e.target.closest('.grade-wrapper')) {
        document.querySelectorAll('.class-menu').forEach(m => m.classList.remove('active'));
    }
});

// 页面加载完成后初始化
window.addEventListener('DOMContentLoaded', () => {
    initData();
    createParticles();
});

function toggleMenu(menuId, event) {
    document.querySelectorAll('.class-menu').forEach(m => {
        if (m.id !== menuId) m.classList.remove('active');
    });
    document.getElementById(menuId).classList.toggle('active');
}

function parseData(rawData) {
    const classes = [[], [], [], [], []];
    const lines = rawData.trim().split('\n');
    lines.forEach(line => {
        const parts = line.includes('\t') ? line.split('\t') : (line.includes(',') ? line.split(',') : line.trim().split(/[\s,，|]+/));
        const cols = parts.map(p => p.trim());
        // 不过滤空字符串，保持列结构

        for (let i = 0; i < 5; i++) {
            const id = cols[i * 3];
            const name = cols[i * 3 + 1];
            const scoreStr = cols[i * 3 + 2];
            const scoreFloat = parseFloat(scoreStr);
            // 只有当id、name都存在，且scoreStr不为空且是有效数字时才添加
            if (id && name && scoreStr !== '' && !isNaN(scoreFloat)) {
                classes[i].push({ id, name, score: scoreFloat });
            }
        }
    });
    return classes;
}

function assignRanks(arr) {
    arr.sort((a, b) => b.score - a.score);
    let currentRank = 1;
    for (let i = 0; i < arr.length; i++) {
        if (i > 0 && arr[i].score < arr[i - 1].score) {
            currentRank = i + 1;
        }
        arr[i].rank = currentRank;
    }
}

function getMedalInfo(delta) {
    if (delta >= 20) return { cls: 'medal-20', icon: '🌌', text: '创世大爆炸章' };
    if (delta >= 19) return { cls: 'medal-19', icon: '🌟', text: '宇宙核心勋章' };
    if (delta >= 18) return { cls: 'medal-18', icon: '🌠', text: '超新星爆发章' };
    if (delta >= 17) return { cls: 'medal-17', icon: '☄️', text: '流星尾迹章' };
    if (delta >= 16) return { cls: 'medal-16', icon: '🚀', text: '星际折跃章' };
    if (delta >= 15) return { cls: 'medal-15', icon: '🌀', text: '量子漩涡章' };
    if (delta >= 14) return { cls: 'medal-14', icon: '🧬', text: '基因螺旋章' };
    if (delta >= 13) return { cls: 'medal-13', icon: '🛰️', text: '深空探测章' };
    if (delta >= 12) return { cls: 'medal-12', icon: '⚡', text: '脉冲星耀章' };
    if (delta >= 11) return { cls: 'medal-11', icon: '⚡', text: '高频电离章' };
    if (delta >= 10) return { cls: 'medal-10', icon: '📡', text: '引力波段章' };
    if (delta >= 9) return { cls: 'medal-9', icon: '🪐', text: '星尘轨道章' };
    if (delta >= 8) return { cls: 'medal-8', icon: '🌕', text: '月幔探秘章' };
    if (delta >= 7) return { cls: 'medal-7', icon: '✨', text: '等离子体章' };
    if (delta >= 6) return { cls: 'medal-6', icon: '💎', text: '能量晶簇章' };
    if (delta >= 5) return { cls: 'medal-5', icon: '💿', text: '质子对撞章' };
    if (delta >= 4) return { cls: 'medal-4', icon: '💡', text: '光电效应章' };
    if (delta >= 3) return { cls: 'medal-3', icon: '🔬', text: '原子萌芽章' };
    if (delta >= 2) return { cls: 'medal-2', icon: '🌿', text: '细胞分裂章' };
    return { cls: 'medal-1', icon: '💧', text: '分子结构章' };
}

function showBoard(grade, classIdx, className) {
    document.querySelectorAll('.class-menu').forEach(m => m.classList.remove('active'));

    const listContainer = document.getElementById('listContainer');
    const statsBar = document.getElementById('statsBar');
    listContainer.innerHTML = '';

    const baseClass = parsedData[grade].base[classIdx];
    const finalClass = parsedData[grade].final[classIdx];

    if (!baseClass || !finalClass || finalClass.length === 0) {
        listContainer.innerHTML = `<div class="empty-state">未检测到有效数据，请检查 data.js 是否填写正确。</div>`;
        statsBar.classList.remove('show');
        return;
    }

    // 先构建基准成绩学生名单
    const baseNameSet = new Set(baseClass.map(s => s.name));

    // 只保留在基准成绩中存在的学生（在排名前过滤）
    const filteredFinalClass = finalClass.filter(s => baseNameSet.has(s.name));

    // 分别对基准和过滤后的期末成绩分配排名
    assignRanks(baseClass);
    assignRanks(filteredFinalClass);

    const baseRankMap = {};
    baseClass.forEach(s => { baseRankMap[s.name] = s.rank; });

    const finalRankMap = {};
    filteredFinalClass.forEach(s => { finalRankMap[s.name] = s.rank; });

    const progressList = [];
    filteredFinalClass.forEach(s => {
        const br = baseRankMap[s.name];
        const fr = finalRankMap[s.name];
        const delta = br - fr;
        if (delta > 0) {
            progressList.push({ ...s, baseRank: br, finalRank: fr, delta: delta });
        }
    });

    progressList.sort((a, b) => b.delta - a.delta);

    const validCount = filteredFinalClass.length;
    let statsHTML = `当前：${className} | 期末考试人数：<span>${finalClass.length}</span>人 | 无基准成绩：<span>${finalClass.length - validCount}</span>人 | 有效对比人数：<span>${validCount}</span>人 | 进步荣获勋章：<span>${progressList.length}</span>人`;
    statsBar.innerHTML = statsHTML;
    statsBar.classList.add('show');

    if (progressList.length === 0) {
        listContainer.innerHTML = `<div class="empty-state">该班级暂无符合进步条件的学生。</div>`;
        return;
    }

    progressList.forEach((stu, index) => {
        const medal = getMedalInfo(stu.delta);
        const delay = index * 0.05;

        const cardHTML = `
            <div class="student-card ${medal.cls}" style="animation-delay: ${delay}s">
                <div class="stu-base">
                    <span class="stu-id">${stu.id}</span>
                    <span class="stu-name">${stu.name}</span>
                </div>
                <div class="stu-ranks">
                    <div class="rank-box">初始班级排名: <span class="rank-num">${stu.baseRank}</span></div>
                    <div class="rank-arrow">➔</div>
                    <div class="rank-box">本次班级排名: <span class="rank-num">${stu.finalRank}</span></div>
                </div>
                <div class="stu-progress">
                    进步：<span>${stu.delta}</span>名
                </div>
                <div class="stu-medal">
                    <div class="icon-wrapper"><div class="medal-icon">${medal.icon}</div></div>
                    <div class="medal-text">${medal.text}</div>
                </div>
            </div>
        `;
        listContainer.insertAdjacentHTML('beforeend', cardHTML);
    });

    setTimeout(() => { statsBar.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
}

function createParticles() {
    const bg = document.querySelector('.bg-deco');
    // 1. 光点粒子
    for (let i = 0; i < 25; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        particle.style.left = Math.random() * 100 + 'vw';
        particle.style.top = Math.random() * 100 + 'vh';
        particle.style.animationDuration = (Math.random() * 15 + 10) + 's';
        particle.style.animationDelay = (Math.random() * 5) + 's';
        bg.appendChild(particle);
    }

    // 2. 科学标志动态漂浮
    const symbols = ['⚛️', '🔭', '🧬', '🧪', '🪐', '💡', '🔬', '☄️', '📡', '🛰️'];
    for (let i = 0; i < 18; i++) {
        const sym = document.createElement('div');
        sym.classList.add('sci-symbol');
        sym.innerText = symbols[Math.floor(Math.random() * symbols.length)];
        sym.style.left = Math.random() * 100 + 'vw';
        sym.style.top = Math.random() * 100 + 'vh';
        sym.style.fontSize = (Math.random() * 2.5 + 1.5) + 'vw';
        sym.style.animationDuration = (Math.random() * 40 + 20) + 's';
        sym.style.animationDelay = (Math.random() * 10) + 's';
        bg.appendChild(sym);
    }
}
