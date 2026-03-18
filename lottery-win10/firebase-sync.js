/**
 * 本地自动保存模块 - Science Classroom Lottery
 * 通过本地服务器自动保存积分数据到文件
 * 无需手动下载！
 */

// ==========================================
// CONFIGURATION
// ==========================================

// Dynamic API base: local server for development, relative path for deployed site
const IS_LOCAL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE = IS_LOCAL ? 'http://localhost:8080' : '';
let isServerMode = false;
let lastSaveTime = null;

// ==========================================
// INITIALIZATION
// ==========================================

function initLocalSync() {
    console.log('🚀 Initializing Local Sync...');

    // Create UI
    createSaveButtonUI();

    // Check if running on server
    checkServerMode();

    // Load saved scores
    setTimeout(() => {
        loadSavedScores();
    }, 300);
}

/**
 * Check if running on local server (for auto-save feature)
 */
function checkServerMode() {
    const currentUrl = window.location.href;
    const isLocalServer = currentUrl.includes('localhost:8080') || currentUrl.includes('127.0.0.1:8080');
    const isDeployedSite = currentUrl.startsWith('https://');

    isServerMode = isLocalServer || isDeployedSite;

    if (isServerMode) {
        console.log('✅ Server mode: Auto-save enabled');
        updateStatusText('🟢 自动保存已启用');
    } else {
        console.log('📂 File mode: Manual save only');
        updateStatusText('⚠️ 请通过服务器启动以启用自动保存');
    }
}

/**
 * Get game ID from URL path to differentiate win10/win7 data
 */
function getGameId() {
    const path = window.location.pathname;
    if (path.includes('win10') || path.includes('lottery-win10')) return 'win10';
    if (path.includes('win7') || path.includes('lottery-win7')) return 'win7';
    return 'default';
}

/**
 * Load scores from SAVED_SCORES file and cloud API
 */
function loadSavedScores() {
    // First try the pre-loaded SAVED_SCORES (for local file mode)
    if (typeof SAVED_SCORES !== 'undefined' && Object.keys(SAVED_SCORES).length > 0) {
        mergeScores(SAVED_SCORES);
        if (typeof LAST_SAVED !== 'undefined' && LAST_SAVED) {
            updateStatusText(`上次保存: ${LAST_SAVED}`);
        }
        console.log('✅ Loaded saved scores from file');
    }

    // If in server/deployed mode, also load from cloud API (takes priority)
    if (isServerMode) {
        loadFromServer();
    }
}

/**
 * Load scores from the cloud API
 */
function loadFromServer() {
    const game = getGameId();
    fetch(API_BASE + '/api/load?game=' + game)
        .then(response => response.json())
        .then(data => {
            if (data.scores && Object.keys(data.scores).length > 0) {
                mergeScores(data.scores);
                if (data.lastSaved) {
                    updateStatusText('☁️ 云端数据已加载 (' + data.lastSaved + ')');
                }
                console.log('✅ Loaded scores from cloud');
            }
        })
        .catch(err => {
            console.warn('⚠️ Could not load from server:', err.message);
        });
}

/**
 * Create unique key for student
 */
function createKey(className, name) {
    return `${className}_${name}`;
}

/**
 * Merge scores into StudentManager
 */
function mergeScores(scores) {
    if (!window.StudentManager || !window.StudentManager.students) return;

    let loadedCount = 0;

    window.StudentManager.students.forEach(student => {
        const key = createKey(student.class, student.name);
        if (scores[key] !== undefined) {
            student.score = scores[key];
            loadedCount++;
        }
    });

    if (loadedCount > 0) {
        window.StudentManager.renderLeaderboard(null);
        console.log(`📊 Loaded ${loadedCount} scores`);

        // 重新计算科学老师百宝袋剩余积分
        const totalStudentScores = window.StudentManager.students.reduce((sum, s) => sum + (s.score || 0), 0);
        if (typeof teacherCurrentScore !== 'undefined' && typeof TEACHER_TOTAL_SCORE !== 'undefined') {
            teacherCurrentScore = TEACHER_TOTAL_SCORE - totalStudentScores;
            if (typeof updateTreasureDisplay === 'function') {
                updateTreasureDisplay(0);
            }
            console.log(`🧪 Teacher treasure updated: ${teacherCurrentScore} remaining (${totalStudentScores} awarded)`);
        }
    }
}

/**
 * Get all scores as object
 */
function getAllScores() {
    if (!window.StudentManager) return {};

    const scores = {};
    window.StudentManager.students.forEach(student => {
        const key = createKey(student.class, student.name);
        scores[key] = student.score;
    });
    return scores;
}

// ==========================================
// SAVE FUNCTIONS
// ==========================================

/**
 * Save scores - auto-save if on server, otherwise download
 */
function saveScores() {
    if (isServerMode) {
        saveToServer();
    } else {
        saveAsDownload();
    }
}

/**
 * Save to server (auto-save, no download needed)
 */
function saveToServer() {
    const scores = getAllScores();
    const game = getGameId();

    updateStatusText('⏳ 保存中...');

    fetch(API_BASE + '/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scores: scores, game: game })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                lastSaveTime = data.time;
                updateStatusText(`✅ 已保存 (${data.time})`);
                showSaveSuccess('自动保存成功！');
                console.log(`💾 Auto-saved ${data.count} scores`);
            } else {
                throw new Error(data.error || 'Unknown error');
            }
        })
        .catch(err => {
            console.error('Save error:', err);
            updateStatusText('❌ 保存失败，请检查服务器');
            showSaveError();
        });
}

/**
 * Save as downloaded file (fallback for file:// mode)
 */
function saveAsDownload() {
    const scores = getAllScores();
    const timeStr = new Date().toLocaleString('zh-CN');
    const nonZeroCount = Object.values(scores).filter(s => s > 0).length;

    const fileContent = `/**
 * 积分数据文件 - Science Classroom Lottery
 * 此文件由系统自动生成
 * 最后更新: ${timeStr}
 * 有效积分记录: ${nonZeroCount} 条
 */

// 积分数据 (班级_姓名: 积分)
const SAVED_SCORES = ${JSON.stringify(scores, null, 4)};

// 最后保存时间
const LAST_SAVED = "${timeStr}";
`;

    const blob = new Blob([fileContent], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'scores-data.js';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    updateStatusText(`已下载 (${timeStr})`);
    showSaveSuccess('请将文件保存到网页文件夹');
}

// ==========================================
// UI COMPONENTS
// ==========================================

function createSaveButtonUI() {
    const style = document.createElement('style');
    style.textContent = `
        .save-container {
            position: fixed;
            bottom: 20px;
            right: 20px;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 8px;
            z-index: 1000;
        }
        
        .save-btn {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 14px 28px;
            background: linear-gradient(135deg, #10b981, #059669);
            border: none;
            border-radius: 30px;
            color: white;
            font-size: 18px;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 4px 20px rgba(16, 185, 129, 0.4);
            transition: all 0.3s ease;
            border: 2px solid rgba(255,255,255,0.3);
        }
        
        .save-btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 30px rgba(16, 185, 129, 0.5);
            background: linear-gradient(135deg, #059669, #047857);
        }
        
        .save-btn:active {
            transform: translateY(-1px);
        }
        
        .save-btn .icon {
            font-size: 22px;
        }
        
        .save-status {
            font-size: 13px;
            color: rgba(255,255,255,0.9);
            background: rgba(0,0,0,0.4);
            padding: 8px 16px;
            border-radius: 20px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
        }
        
        .save-toast {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 16px 28px;
            border-radius: 12px;
            font-size: 16px;
            font-weight: bold;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            z-index: 9999;
            opacity: 0;
            transform: translateX(100px);
            transition: all 0.4s ease;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .save-toast.show {
            opacity: 1;
            transform: translateX(0);
        }
        
        .save-toast.success {
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
        }
        
        .save-toast.error {
            background: linear-gradient(135deg, #ef4444, #dc2626);
            color: white;
        }
    `;
    document.head.appendChild(style);

    // Save button container
    const container = document.createElement('div');
    container.className = 'save-container';
    container.innerHTML = `
        <div class="save-status" id="save-status">正在初始化...</div>
        <button class="save-btn" onclick="window.LocalSync.save()">
            <span class="icon">💾</span>
            <span>保存数据</span>
        </button>
    `;
    document.body.appendChild(container);

    // Toast notification
    const toast = document.createElement('div');
    toast.className = 'save-toast';
    toast.id = 'save-toast';
    document.body.appendChild(toast);
}

function updateStatusText(text) {
    const status = document.getElementById('save-status');
    if (status) {
        status.textContent = text;
    }
}

function showSaveSuccess(message) {
    const toast = document.getElementById('save-toast');
    if (toast) {
        toast.className = 'save-toast success';
        toast.innerHTML = `<span>✅</span> ${message || '保存成功！'}`;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2500);
    }
}

function showSaveError() {
    const toast = document.getElementById('save-toast');
    if (toast) {
        toast.className = 'save-toast error';
        toast.innerHTML = '<span>❌</span> 保存失败';
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }
}

// ==========================================
// PUBLIC API
// ==========================================

window.LocalSync = {
    init: initLocalSync,
    save: saveScores,
    load: loadSavedScores,
    isServerMode: () => isServerMode
};

// Compatibility
// Compatibility
// Debounce helper
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

const debouncedSave = debounce(() => {
    window.LocalSync.save();
}, 2000); // 2 seconds debounce

window.CloudSync = {
    init: () => { console.log('☁️ Mock CloudSync initialized with LocalSync'); },
    saveScore: (className, name, score) => {
        // console.log(`☁️ Mock Save: ${className} ${name} ${score}`);
        debouncedSave();
    },
    saveAll: () => {
        debouncedSave();
    },
    isReady: () => true // Always ready for local sync
};
