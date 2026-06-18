# Snake & Ladder - Production Quality Refactor

## Overview

The Snake & Ladder implementation has been completely refactored to be production-quality with:

1. **Single Source of Truth for Board Coordinates** - All rendering, tokens, snakes, and ladders use the same coordinate conversion function
2. **Backend-Driven Movement Paths** - Backend sends exact path data: `{ playerId, roll, path: [21,22,23,24,25,47], event: "ladder" }`
3. **Client-Side Animation Only** - Frontend ONLY animates what backend sends, never calculates intermediate positions
4. **Complete Validation System** - Board configuration is validated on join with detailed error reporting
5. **Debug Mode** - Toggle debug overlay to see square numbers, coordinates, and move details
6. **Comprehensive Move Logging** - Console and UI logging for every move with full path information
7. **Edge Case Handling** - Exact 100 win rule, overshoot prevention, snake/ladder chains, reconnection recovery

## Architecture

### Backend Files

#### `/backend/src/utils/boardCoordinates.js` (NEW)
Shared coordinate system used by all components.

**Key Functions:**
- `squareToCoordinates(squareNumber)` → `{ row, col }`
- `getVisualCoordinates(squareNumber)` → `{ x, y, squareNumber }` (percentage-based for SVG/CSS)
- `coordinatesToSquare(row, col)` → squareNumber
- `validateSnake(head, tail)` → boolean (head > tail)
- `validateLadder(bottom, top)` → boolean (bottom < top)

**Board Layout:**
```
Row 9 (90-100): 100 99 98 97 96 95 94 93 92 91
Row 8 (81-90):  81 82 83 84 85 86 87 88 89 90
Row 7 (71-80):  80 79 78 77 76 75 74 73 72 71
... (alternating left-to-right pattern)
Row 0 (1-10):    1  2  3  4  5  6  7  8  9 10
```

#### `/backend/src/games/snakeAndLadder.js` (UPDATED)
Complete refactor with path calculation.

**Key Changes:**
- `calculateMovementPath(startPosition, roll, snakes, ladders)` → Returns `{ path, finalPosition, event, message }`
  - Tracks exact movement path step-by-step
  - Handles overshooting (landing > 100)
  - Detects snake/ladder events
  - Returns complete move metadata

- `rollDice(state, playerId)` → Now stores `lastMove` with full path data
  - `lastMove.path` - Array of squares traversed
  - `lastMove.event` - "move", "snake", "ladder", "overshoot", or "win"
  - `lastMove.message` - Human-readable description

### Frontend Files

#### `/frontend/src/games/snake-and-ladder/boardUtils.js` (NEW)
Frontend version of coordinate system (mirrors backend).

**Usage:**
```javascript
import { getVisualCoordinates, squareToCoordinates } from './boardUtils.js';

const coords = getVisualCoordinates(47); // { x: 75, y: 55, squareNumber: 47 }
const grid = squareToCoordinates(47);    // { row: 4, col: 6, squareNumber: 47 }
```

#### `/frontend/src/games/snake-and-ladder/boardValidation.js` (NEW)
Board configuration validation and logging.

**Key Functions:**
- `validateBoardConfiguration(snakes, ladders)` → `{ valid, issues }`
  - Checks all snake heads > tails
  - Checks all ladder bottoms < tops
  - Verifies all coordinates are valid (1-100)
  - Detects overlaps and conflicts

- `logBoardConfiguration(snakes, ladders)` → Detailed console output
  - Shows all snakes with their visual coordinates
  - Shows all ladders with their visual coordinates
  - Lists any configuration issues

**Example Output:**
```
🐍 BOARD CONFIGURATION VALIDATION
✅ Board configuration is valid

📍 Snakes:
  16 → 6 (head: row 1, col 5) → (tail: row 0, col 5)
  47 → 26 (head: row 4, col 6) → (tail: row 2, col 5)
  ...

🪜 Ladders:
  1 → 38 (bottom: row 0, col 0) → (top: row 3, col 7)
  4 → 14 (bottom: row 0, col 3) → (top: row 1, col 3)
  ...
```

#### `/frontend/src/games/snake-and-ladder/board.jsx` (REFACTORED)
Complete refactor with new components and features.

**New Components:**
- `DebugOverlay` - Toggle with button, shows:
  - Current square for each player with row/col coordinates
  - Last move details (roll, path, event type)
  - Real-time debug information

- `MoveLog` - UI panel showing:
  - Recent move history
  - Roll value and final position for each move
  - Event type with emoji (🐍 snake, 🪜 ladder, 🎉 win)
  - Scrollable history

- Updated `ChatPanel` - Now receives `chat:message` socket events properly

**Features:**
1. **Debug Mode Toggle** - Click "Debug" button in top status bar
   - Overlay shows square numbers on board
   - Shows player coordinates (row, col)
   - Shows last move details in popup

2. **Visual Logging** - Console output for every move:
   ```
   🎲 PlayerName's Move
   Rolled: 5
   Path: 21 → 22 → 23 → 24 → 25 → 47
   Result: 21 → 47
   Event: ladder
   Message: Rolled a 5 and climbed a ladder! 🪜 25 → 47
   ```

3. **Move History Panel** - Shows last 10 moves with:
   - Player name
   - Roll value
   - Movement (from → to)
   - Event type indicator

4. **Board Initialization Logging** - On room join:
   - Validates board configuration
   - Logs all snakes and ladders with coordinates
   - Reports any validation issues

5. **Chat Message Support** - Fixed socket listener for real-time chat

## Edge Cases Handled

### 1. Exact 100 Win Rule
- Must roll exact number to reach 100
- Overshooting bounces back (position doesn't change)
- Event type: "overshoot"
- Example: At 95, roll 6 → Stay at 95

### 2. Snake/Ladder Chains
- If landing on snake/ladder, immediately trigger
- Path shows intermediate squares
- Event type correctly identifies snake vs ladder

### 3. Multiple Players Same Square
- No collision detection (allowed in classic rules)
- Each token renders independently
- Display order may overlap but no issues

### 4. Reconnection
- Player rejoins → `room:join` called automatically
- Board state synchronized from server
- Move history preserved
- Chat history preserved

### 5. Overshoot Beyond 100
- Position stays at current square
- Message indicates bounce-back
- Turn passes to next player
- Event type: "overshoot"

## How to Use

### Playing the Game

1. **Create or Join a Room**
   - Create New Game: Enter name, click "Create New Game"
   - Join Existing: Enter name and room code, click "Join"

2. **Start Game** (Host only)
   - Click "Start Game" button when 2+ players ready

3. **Make Moves**
   - On your turn, click the 🎲 dice emoji
   - Watch token animate along path
   - Snakes and ladders trigger automatically

4. **Chat**
   - Send messages in lobby chat
   - Messages show in real-time for all players

### Debug Mode

1. **Enable Debug**
   - Click "Debug" button in top status bar

2. **View Debug Overlay**
   - Square numbers appear on board (0-99 grid)
   - Player positions show with row/col coordinates
   - Last move details in green popup

3. **Check Console Logs**
   - Open browser DevTools (F12)
   - Console tab shows:
     - Board validation on join
     - Detailed move logs for each dice roll
     - Any validation warnings or errors

## Testing Checklist

- [ ] Board loads with correct square layout (1-100)
- [ ] All snakes render on correct squares
- [ ] All ladders render on correct squares
- [ ] Debug mode shows accurate square numbers
- [ ] Debug mode shows accurate player coordinates (row, col)
- [ ] Move log shows correct roll values
- [ ] Move log shows correct movement paths
- [ ] Chat messages appear in real-time
- [ ] Multiple players on same square works
- [ ] Overshoot rule prevents going > 100
- [ ] Snake event shows correct final position
- [ ] Ladder event shows correct final position
- [ ] Win at 100 triggers game over
- [ ] Reconnecting player gets synchronized state
- [ ] Board validation reports no issues on startup

## Configuration

### Board Layout (snakeAndLadder.js)

```javascript
const SNAKES = { 
  16: 6, 47: 26, 49: 11, 56: 53, 62: 19, 
  64: 60, 87: 24, 93: 73, 95: 75, 98: 78 
};

const LADDERS = { 
  1: 38, 4: 14, 9: 31, 21: 42, 28: 84, 
  36: 44, 51: 67, 71: 91, 80: 100 
};
```

To customize:
1. Edit `SNAKES` object (head: tail, where head > tail)
2. Edit `LADDERS` object (bottom: top, where bottom < top)
3. Backend validation will catch any errors

## Future Improvements

- Persist move history to database
- Replay game moves
- Statistics (average rolls, most snakes hit, etc.)
- Custom board themes
- Mobile-optimized board
- WebGL rendering for large multiplayer games
- Anti-cheat validation

## Troubleshooting

### Board doesn't load
- Check console for validation errors
- Verify snakes and ladders are valid (snake head > tail, ladder bottom < top)
- Ensure squares are between 1-100

### Tokens don't animate
- Check that backend is sending `lastMove` with full path
- Verify `game:move` action is "roll"
- Check console for socket errors

### Debug mode shows wrong coordinates
- Verify board coordinate function in both frontend and backend
- Check that row/col calculation matches grid layout

### Chat messages not appearing
- Verify socket listener is attached in board.jsx
- Check that `room:update` sends updated chat array
- See if backend `chat:message` event is firing

## Files Created/Modified

### Created:
- `/backend/src/utils/boardCoordinates.js` - Shared coordinate system
- `/frontend/src/games/snake-and-ladder/boardUtils.js` - Frontend coordinates
- `/frontend/src/games/snake-and-ladder/boardValidation.js` - Validation utilities

### Modified:
- `/backend/src/games/snakeAndLadder.js` - Path-based movement tracking
- `/frontend/src/games/snake-and-ladder/board.jsx` - Complete refactor with debug/logging

### No changes needed:
- `/backend/src/server.js` - Already handles `game:move` correctly
- `/backend/src/rooms/roomManager.js` - Already compatible
- `/frontend/src/App.jsx` - Route already correct
- `/frontend/src/games/snake-and-ladder/Landing.jsx` - Already correct
