// 外圈：16 格
const OUTER_TRACK = [
    [0,0],[0,1],[0,2],[0,3],[0,4],
    [1,4],[2,4],[3,4],[4,4],
    [4,3],[4,2],[4,1],[4,0],
    [3,0],[2,0],[1,0]
];

// 內圈：8 格
const INNER_TRACK = [
    [1,1],[1,2],[1,3],
    [2,3],
    [3,3],[3,2],[3,1],
    [2,1]
];

const ARROW_MAP = new Map();

function initializeArrows() {
    // 外圈箭頭 (逆時針)
    const outerArrows = ['→','→','→','→','↓','↓','↓','↓','←','←','←','←','↑','↑','↑','↑'];
    OUTER_TRACK.forEach((coord, index) => {
        ARROW_MAP.set(`${coord[0]},${coord[1]}`, outerArrows[index]);
    });

    // 內圈箭頭 (逆時針)
    const innerArrows = ['→','→','↓','↓','←','←','↑','↑'];
    INNER_TRACK.forEach((coord, index) => {
        ARROW_MAP.set(`${coord[0]},${coord[1]}`, innerArrows[index]);
    });
}

function getArrowDirection(r, c) {
    return ARROW_MAP.get(`${r},${c}`) || '';
}

function isOnTrack(r, c) {
    return OUTER_TRACK.some(([x,y]) => x === r && y === c) ||
           INNER_TRACK.some(([x,y]) => x === r && y === c);
}


// Get track information for a cell
function getTrackInfo(row, col) {
    const outerIndex = OUTER_TRACK.findIndex(([r, c]) => r === row && c === col);
    if (outerIndex !== -1) {
        return { track: 'outer', index: outerIndex, size: OUTER_TRACK.length };
    }
    
    const innerIndex = INNER_TRACK.findIndex(([r, c]) => r === row && c === col);
    if (innerIndex !== -1) {
        return { track: 'inner', index: innerIndex, size: INNER_TRACK.length };
    }
    
    return null;
}

// Get the next position after rotation for a cell
function getNextPosition(row, col) {
    const outerIndex = OUTER_TRACK.findIndex(([r, c]) => r === row && c === col);
    if (outerIndex !== -1) {
        const nextIndex = (outerIndex + 1) % OUTER_TRACK.length;
        return OUTER_TRACK[nextIndex];
    }
    
    const innerIndex = INNER_TRACK.findIndex(([r, c]) => r === row && c === col);
    if (innerIndex !== -1) {
        const nextIndex = (innerIndex + 1) % INNER_TRACK.length;
        return INNER_TRACK[nextIndex];
    }
    
    return [row, col]; // No movement for center or non-track cells
}

