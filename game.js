
// Game configuration
const CONFIG = {
    WIN_LENGTH: 5,
    BOARD_SIZE: 5,
    ANIM_MS: 320,
    NEUTRAL_CENTER: true,
    LOCK_ON_CENTER_CLICK: true,
    WIN_ON_PLACE: true
};

// Cell states
const EMPTY = 0;
const WHITE = 1;
const BLACK = 2;

// Game state
let gameState = {
    board: [],
    currentPlayer: WHITE,
    pending: null,
    moveCount: 0,
    status: 'playing', // 'playing', 'whiteWin', 'blackWin', 'draw'
    phase: 'place', // 'place', 'animating', 'ended'
    history: []
};

// Initialize empty board
function initializeBoard() {
    const board = [];
    for (let r = 0; r < CONFIG.BOARD_SIZE; r++) {
        board[r] = [];
        for (let c = 0; c < CONFIG.BOARD_SIZE; c++) {
            board[r][c] = EMPTY;
        }
    }
    return board;
}

// Reset game state
function resetGame() {
    gameState = {
        board: initializeBoard(),
        currentPlayer: WHITE,
        pending: null,
        moveCount: 0,
        status: 'playing',
        phase: 'place',
        history: []
    };
}

// Coin toss functionality
function tossCoin(callback) {
    const result = Math.random() < 0.5 ? 'white' : 'black';
    setTimeout(() => callback(result), 1000);
}

// Check if a position is valid for preview placement
function canPreview(state, row, col) {
    return state.phase === 'place' && 
           state.status === 'playing' && 
           state.board[row][col] === EMPTY && 
           !(row === 2 && col === 2); // Center cell cannot have pieces
}

// Set pending move (ghost piece)
function setPending(state, row, col) {
    state.pending = { r: row, c: col, player: state.currentPlayer };
}

// Clear pending move
function clearPending(state) {
    state.pending = null;
}

// Handle center cell click (rotation trigger)
function onCenterClick(state) {
    if (state.phase !== 'place' || state.status !== 'playing' || !state.pending) {
        return false;
    }

    // 1) Lock the pending move
    const { r, c, player } = state.pending;
    state.board[r][c] = player;
    state.moveCount++;
    clearPending(state);

    // 2) Check for immediate win (including neutral center)
    if (CONFIG.WIN_ON_PLACE && checkWinForColor(state, player)) {
        state.status = player === WHITE ? 'whiteWin' : 'blackWin';
        state.phase = 'ended';
        return true;
    }

    // 3) Check for draw after placement
    if (isDraw(state)) {
        state.status = 'draw';
        state.phase = 'ended';
        return true;
    }

    // 4) No immediate win - proceed with rotation
    state.phase = 'animating';
    return false; // Indicates rotation should happen
}

// Rotate the board (both tracks move counterclockwise)
function rotateBoard(state) {
    rotateByTrack(state, OUTER_TRACK);
    rotateByTrack(state, INNER_TRACK);
}

// Rotate pieces along a specific track
function rotateByTrack(state, coords) {
    const vals = coords.map(([r, c]) => state.board[r][c]);
    const rotated = vals.slice(1).concat(vals[0]); // Left shift = counterclockwise
    coords.forEach(([r, c], i) => {
        state.board[r][c] = rotated[i];
    });
}

// Check if center cell should be treated as neutral
function isNeutral(row, col) {
    return CONFIG.NEUTRAL_CENTER && row === 2 && col === 2;
}

// Check winner for a line of cells (with neutral center support)
function lineWinner(cells, board) {
    let color = EMPTY;
    
    for (const [r, c] of cells) {
        if (isNeutral(r, c)) continue; // Neutral cells match any color
        
        const cellValue = board[r][c];
        if (cellValue === EMPTY) return EMPTY; // Empty non-center cell breaks the line
        
        if (color === EMPTY) {
            color = cellValue; // First non-neutral color found
        } else if (color !== cellValue) {
            return EMPTY; // Different colors found
        }
    }
    
    return color; // Return the consistent color (or EMPTY if all were neutral)
}

// Generate all possible 5-cell line segments
function allFiveSegments() {
    const segments = [];
    
    // All directions: right, down, diagonal-right, diagonal-left
    const directions = [
        [0, 1],   // →
        [1, 0],   // ↓
        [1, 1],   // ↘
        [-1, 1]   // ↗
    ];
    
    for (let startRow = 0; startRow < CONFIG.BOARD_SIZE; startRow++) {
        for (let startCol = 0; startCol < CONFIG.BOARD_SIZE; startCol++) {
            for (const [dr, dc] of directions) {
                const segment = [];
                let valid = true;
                
                for (let i = 0; i < CONFIG.WIN_LENGTH; i++) {
                    const r = startRow + i * dr;
                    const c = startCol + i * dc;
                    
                    if (r < 0 || r >= CONFIG.BOARD_SIZE || c < 0 || c >= CONFIG.BOARD_SIZE) {
                        valid = false;
                        break;
                    }
                    
                    segment.push([r, c]);
                }
                
                if (valid) {
                    segments.push(segment);
                }
            }
        }
    }
    
    return segments;
}

// Check for win condition (returns winner color or EMPTY)
function checkWin(state) {
    let whiteWins = false;
    let blackWins = false;
    
    for (const cells of allFiveSegments()) {
        const winner = lineWinner(cells, state.board);
        if (winner === WHITE) whiteWins = true;
        if (winner === BLACK) blackWins = true;
    }
    
    // Tie-break: if both players have winning lines simultaneously (only possible after rotation)
    // the current player wins
    if (whiteWins && blackWins) {
        return state.currentPlayer;
    }
    
    if (whiteWins) return WHITE;
    if (blackWins) return BLACK;
    return EMPTY;
}

// Check if a specific color has won
function checkWinForColor(state, color) {
    for (const cells of allFiveSegments()) {
        if (lineWinner(cells, state.board) === color) {
            return true;
        }
    }
    return false;
}

// Check for draw condition
function isDraw(state) {
    if (state.status !== 'playing') return false;
    
    // Count empty cells (excluding center)
    let emptyCells = 0;
    for (let r = 0; r < CONFIG.BOARD_SIZE; r++) {
        for (let c = 0; c < CONFIG.BOARD_SIZE; c++) {
            if (state.board[r][c] === EMPTY && !(r === 2 && c === 2)) {
                emptyCells++;
            }
        }
    }
    
    return emptyCells === 0; // All 24 playable cells are filled
}

// Switch to next player
function nextTurn(state) {
    state.currentPlayer = state.currentPlayer === WHITE ? BLACK : WHITE;
}

// Handle post-rotation game state
function handlePostRotation(state) {
    const winner = checkWin(state);
    if (winner !== EMPTY) {
        state.status = winner === WHITE ? 'whiteWin' : 'blackWin';
        state.phase = 'ended';
        return;
    }
    
    if (isDraw(state)) {
        state.status = 'draw';
        state.phase = 'ended';
        return;
    }
    
    nextTurn(state);
    state.phase = 'place';
}

// Get player name
function getPlayerName(player) {
    return player === WHITE ? '白子' : '黑子';
}

// Get current game state (for external access)
function getCurrentGameState() {
    return gameState;
}



/* ===========================
   PvE AI helpers (放在 game.js 末尾)
   =========================== */

function getLegalMoves(state) {
  const moves = [];
  for (let r = 0; r < CONFIG.BOARD_SIZE; r++) {
    for (let c = 0; c < CONFIG.BOARD_SIZE; c++) {
      if (state.board[r][c] === EMPTY && !(r === 2 && c === 2)) {
        moves.push({ r, c });
      }
    }
  }
  return moves;
}

function cloneBoard(board) {
  return board.map(row => row.slice());
}

function wouldWinIfPlace(state, r, c, color) {
  const tmp = cloneBoard(state.board);
  tmp[r][c] = color;
  for (const cells of allFiveSegments()) {
    if (lineWinner(cells, tmp) === color) return true;
  }
  return false;
}

function adjacencyScore(state, r, c, color) {
  let score = 0;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const rr = r + dr, cc = c + dc;
      if (rr < 0 || cc < 0 || rr >= CONFIG.BOARD_SIZE || cc >= CONFIG.BOARD_SIZE) continue;
      if (state.board[rr][cc] === color) score++;
    }
  }
  return score;
}

function chooseAiMove(state, aiColor = BLACK) {
  const humanColor = (aiColor === WHITE) ? BLACK : WHITE;
  const moves = getLegalMoves(state);
  if (moves.length === 0) return null;

  // 搶勝
  for (const m of moves) if (wouldWinIfPlace(state, m.r, m.c, aiColor)) return m;
  // 擋對手
  for (const m of moves) if (wouldWinIfPlace(state, m.r, m.c, humanColor)) return m;
  // 鄰接分
  let best = null, bestScore = -1;
  for (const m of moves) {
    const s = adjacencyScore(state, m.r, m.c, aiColor);
    if (s > bestScore) { bestScore = s; best = m; }
  }
  if (best) return best;

  // 隨機
  return moves[Math.floor(Math.random() * moves.length)];
}

// ★ 建議把關鍵符號掛到全域，避免作用域問題
window.chooseAiMove = chooseAiMove;
window.BLACK = BLACK;
window.WHITE = WHITE;
