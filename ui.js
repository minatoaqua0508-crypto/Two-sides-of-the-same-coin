// DOM elements
let modeModal, pvpBtn, pveBtn;
let gameMode = 'pvp'; // 'pvp' 或 'pve'
// === 新增 ===
let gameBoard, playerIndicator, playerText, moveCount, gameStatus;
let coinModal, coin, coinResult, gameOverModal, gameOverTitle, gameOverMessage;
let restartBtn, playAgainBtn, boardOverlay;

// === SFX 音效設定（新增） ===
const SFX = {
  enabled: true,
  volume: 0.7,
  place: null,
  rotate: null,
  win: null,
  ghost: null 
};

function loadSfx() {
  SFX.place  = new Audio('sounds/sound1.mp3');
  SFX.rotate = new Audio('sounds/sound2.mp3');
  SFX.win    = new Audio('sounds/sound4.mp3'); // 可選
  SFX.ghost  = new Audio('sounds/sound1.mp3'); 

  [SFX.place, SFX.rotate, SFX.win].forEach(a => {
    if (!a) return;
    a.preload = 'auto';
    a.volume = SFX.volume;
  });
}

function playSfx(aud) {
  if (!SFX.enabled || !aud) return;
  try {
    aud.currentTime = 0;
    aud.play().catch(() => {});
  } catch(_) {}
}
// === SFX 設定（新增） ===


// Initialize UI elements
function initializeGame() {
    // Get DOM elements
    gameBoard = document.getElementById('gameBoard');
    playerIndicator = document.getElementById('playerIndicator');
    playerText = document.getElementById('playerText');
    moveCount = document.getElementById('moveCount');
    gameStatus = document.getElementById('gameStatus');
    
    coinModal = document.getElementById('coinModal');
    coin = document.getElementById('coin');
    coinResult = document.getElementById('coinResult');
    
    gameOverModal = document.getElementById('gameOverModal');
    gameOverTitle = document.getElementById('gameOverTitle');
    gameOverMessage = document.getElementById('gameOverMessage');
    
    restartBtn = document.getElementById('restartBtn');
    playAgainBtn = document.getElementById('playAgainBtn');
    boardOverlay = document.getElementById('boardOverlay');
        // === 新增 DOM ===
    modeModal = document.getElementById('modeModal');
    pvpBtn = document.getElementById('pvpBtn');
    pveBtn = document.getElementById('pveBtn');

    // === 修改事件監聽 ===
    restartBtn.addEventListener('click', showModeSelect);
    playAgainBtn.addEventListener('click', () => {
        hideModal(gameOverModal);
        showModeSelect();
    });
    
    coin.addEventListener('click', handleCoinToss);
    
    // Keyboard navigation
    document.addEventListener('keydown', handleKeyboard);

    // Start with showModeSelect
loadSfx();          // ★ 放這裡

    // Start with showModeSelect
    showModeSelect();
}

// === 模式選擇畫面 ===
function showModeSelect() {
    resetGame();
    showModal(modeModal);

    pvpBtn.onclick = () => {
        gameMode = 'pvp';
        hideModal(modeModal);
        showCoinToss();
    };

    pveBtn.onclick = () => {
        gameMode = 'pve';
        hideModal(modeModal);
        showCoinToss();
    };
}
// Show coin toss modal
function showCoinToss() {
    resetGame();
    coinResult.textContent = '';
    coin.classList.remove('flipping');
    coin.style.transform = 'rotateY(0deg)'; // Reset to white face
    showModal(coinModal);
}

// Handle coin toss
function handleCoinToss() {
    if (coin.classList.contains('flipping')) return;
    
    coin.classList.add('flipping');
    coinResult.textContent = '擲硬幣中...';
    
    // Generate random result and set final rotation
    const randomResult = Math.random() < 0.5 ? 'white' : 'black';
    const finalRotation = randomResult === 'white' ? 0 : 180; // 0 = white face, 180 = black face
    
    // Apply the final rotation to show correct face
    setTimeout(() => {
        coin.style.transform = `rotateY(${finalRotation}deg)`;
    }, 900); // Apply just before animation ends
    
    // Show result after animation completes
    setTimeout(() => {
        const winner = randomResult === 'white' ? '白子' : '黑子';
        coinResult.textContent = `${winner}先手！`;
        
        // Set starting player based on coin result
        gameState.currentPlayer = randomResult === 'white' ? WHITE : BLACK;
        
        // Start game after showing result
        setTimeout(() => {
            hideModal(coinModal);
            setupBoard();
            updateUI();
            // === 新增：PvE 且黑子先手，AI 開局 ===
    if (gameMode === 'pve' && gameState.currentPlayer === BLACK) {
        setTimeout(() => aiMove(), 600);
    }
        }, 1500);
    }, 1000); // Wait for flip animation to complete
}

// Setup game board
function setupBoard() {
    gameBoard.innerHTML = '';
    
    for (let r = 0; r < CONFIG.BOARD_SIZE; r++) {
        for (let c = 0; c < CONFIG.BOARD_SIZE; c++) {
            const cell = document.createElement('div');
            cell.className = 'board-cell';
            cell.dataset.row = r;
            cell.dataset.col = c;
            
            // Center cell special handling
            if (r === 2 && c === 2) {
                cell.classList.add('center-cell');
                cell.setAttribute('role', 'button');
                cell.setAttribute('aria-label', '旋轉棋盤');
                cell.setAttribute('tabindex', '0');
            } else {
                cell.setAttribute('aria-label', `第${r+1}列第${c+1}行`);
                cell.setAttribute('tabindex', '0');
            }
            
            // Add click handler
            cell.addEventListener('click', (e) => handleCellClick(r, c, e));
            
            gameBoard.appendChild(cell);
        }
    }
}

// Handle cell click
function handleCellClick(row, col, event) {
    if (gameState.phase === 'animating' || gameState.status !== 'playing') {
        
        return;
    }

    // 玩家不得在 AI 回合操作
if (gameMode === 'pve' && gameState.currentPlayer === BLACK) {
    return;
}

    // Center cell click (rotation trigger)
    if (row === 2 && col === 2) {
        handleRotationClick();
        return;
    }
    
    // Regular cell click (ghost piece placement)
    if (canPreview(gameState, row, col)) {
        setPending(gameState, row, col);
         playSfx(SFX.ghost || SFX.place);
        updateUI();
    }
}

// Handle rotation (center cell) click
function handleRotationClick() {
    if (!gameState.pending) return;

  
    const immediateWin = onCenterClick(gameState);
    
    if (immediateWin) {
        // Game ended immediately
        updateUI();
        setTimeout(() => showGameOver(), 500);
        return;
    }
    
    // Start rotation animation
    updateUI();
    animateRotation(() => {
        rotateBoard(gameState);
        handlePostRotation(gameState);
        updateUI();
        
        // === 新增：若換手後輪到電腦（PvE & 黑子），讓 AI 接手 ===
    if (gameMode === 'pve' && gameState.phase !== 'ended' && gameState.currentPlayer === BLACK) {
        setTimeout(() => aiMove(), 600);
    }
        if (gameState.phase === 'ended') {
            setTimeout(() => showGameOver(), 500);
        }
    });
}

// ===========================
// PvE：AI 出手（黑子）
// 放在 ui.js
// ===========================
function aiMove() {
    // 只在 PvE、輪到黑子、可下狀態才動作
    if (gameMode !== 'pve') return;
    if (gameState.status !== 'playing') return;
    if (gameState.phase !== 'place') return;
    if (gameState.currentPlayer !== BLACK) return;
    if (gameState.pending) return;

    const move = chooseAiMove(gameState, BLACK); // 由 game.js 提供
    if (!move) return;

    // 1) 放 ghost
    setPending(gameState, move.r, move.c);
     playSfx(SFX.ghost || SFX.place);
    updateUI();

    // 2) 模擬「按中心旋轉」
    setTimeout(() => {
        handleRotationClick(); // 裡面會 onCenterClick -> 動畫 -> rotateBoard -> handlePostRotation
    }, 400);
}


// Animate board rotation
function animateRotation(callback) {
     
    // ★ 新增：旋轉聲
    playSfx(SFX.rotate);

    boardOverlay.classList.add('show');
    boardOverlay.innerHTML = '<div class="rotation-indicator">⟲</div>';
    gameBoard.classList.add('rotating');
    
    setTimeout(() => {
        gameBoard.classList.remove('rotating');
        boardOverlay.classList.remove('show');
        callback();
    }, CONFIG.ANIM_MS);
}

// Update UI elements
function updateUI() {
    updatePlayerDisplay();
    updateMoveCount();
    updateBoard();
    updateGameStatus();
}

// Update player display
function updatePlayerDisplay() {
    const isWhiteTurn = gameState.currentPlayer === WHITE;
    playerIndicator.className = `player-indicator ${isWhiteTurn ? 'white' : 'black'}`;
    playerText.textContent = `輪到${getPlayerName(gameState.currentPlayer)}`;
}

// Update move counter
function updateMoveCount() {
    moveCount.textContent = gameState.moveCount;
}

// Update board display
function updateBoard() {
    const cells = gameBoard.querySelectorAll('.board-cell');
    
    cells.forEach((cell, index) => {
        const row = Math.floor(index / CONFIG.BOARD_SIZE);
        const col = index % CONFIG.BOARD_SIZE;
        
        // Clear previous content (except center cell)
        if (!(row === 2 && col === 2)) {
            cell.innerHTML = '';
            cell.classList.remove('has-piece', 'disabled');
        }
        
        // Handle center cell state
        if (row === 2 && col === 2) {
            const canRotate = gameState.pending && gameState.phase === 'place';
            cell.classList.toggle('can-rotate', canRotate);
            cell.classList.toggle('disabled', !canRotate);
            return;
        }
        
        // Handle regular cells
        const cellValue = gameState.board[row][col];
        const isPending = gameState.pending && 
                         gameState.pending.r === row && 
                         gameState.pending.c === col;
        
        if (cellValue !== EMPTY) {
            // Regular piece
            const piece = document.createElement('div');
            piece.className = `piece ${cellValue === WHITE ? 'white' : 'black'}`;
            piece.textContent = cellValue === WHITE ? '白' : '黑';
            cell.appendChild(piece);
            cell.classList.add('has-piece');
        } else if (isPending) {
            // Ghost piece
            const piece = document.createElement('div');
            piece.className = `piece ghost ${gameState.pending.player === WHITE ? 'white' : 'black'}`;
            piece.textContent = gameState.pending.player === WHITE ? '白' : '黑';
            cell.appendChild(piece);
        } 
        else if (gameState.phase === 'place' && isOnTrack(row, col)) {
            // Show arrow for empty cells on tracks
            const arrow = document.createElement('div');
            arrow.className = 'arrow';
            arrow.textContent = getArrowDirection(row, col);
            cell.appendChild(arrow);
        }
        
        // Disable cell during animation
        if (gameState.phase === 'animating') {
            cell.classList.add('disabled');
        }
    });
}

// Update game status
function updateGameStatus() {
    switch (gameState.status) {
        case 'playing':
            gameStatus.textContent = gameState.phase === 'animating' ? '旋轉中...' : '';
            break;
        case 'whiteWin':
            gameStatus.textContent = '白子獲勝！';
            break;
        case 'blackWin':
            gameStatus.textContent = '黑子獲勝！';
            break;
        case 'draw':
            gameStatus.textContent = '平局！';
            break;
    }
}

// Show game over modal
function showGameOver() {
    let title, message;
    
    switch (gameState.status) {
        case 'whiteWin':
            title = '白子獲勝！';
            message = `恭喜白子在第 ${gameState.moveCount} 手獲得勝利！`;
            break;
        case 'blackWin':
            title = '黑子獲勝！';
            message = `恭喜黑子在第 ${gameState.moveCount} 手獲得勝利！`;
            break;
        case 'draw':
            title = '平局！';
            message = '棋盤已滿，雙方戰成平手！';
            break;
    }
    
    gameOverTitle.textContent = title;
    gameOverMessage.textContent = message;
    playSfx(SFX.win); 
    showModal(gameOverModal);
}

// Show modal
function showModal(modal) {
    modal.classList.remove('hidden');
}

// Hide modal
function hideModal(modal) {
    modal.classList.add('hidden');
}

// Keyboard navigation
function handleKeyboard(event) {
    if (gameState.phase === 'animating') return;
    
    const focusedElement = document.activeElement;
    if (!focusedElement.classList.contains('board-cell')) return;
    
    const row = parseInt(focusedElement.dataset.row);
    const col = parseInt(focusedElement.dataset.col);
    
    if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        handleCellClick(row, col);
        return;
    }
    
    // Arrow key navigation
    let newRow = row;
    let newCol = col;
    
    switch (event.key) {
        case 'ArrowUp':
            newRow = Math.max(0, row - 1);
            break;
        case 'ArrowDown':
            newRow = Math.min(CONFIG.BOARD_SIZE - 1, row + 1);
            break;
        case 'ArrowLeft':
            newCol = Math.max(0, col - 1);
            break;
        case 'ArrowRight':
            newCol = Math.min(CONFIG.BOARD_SIZE - 1, col + 1);
            break;
        default:
            return;
    }
    
    if (newRow !== row || newCol !== col) {
        event.preventDefault();
        const newIndex = newRow * CONFIG.BOARD_SIZE + newCol;
        const cells = gameBoard.querySelectorAll('.board-cell');
        cells[newIndex].focus();
    }
}