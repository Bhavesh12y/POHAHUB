// In-browser stand-in for the Doozles game server, used by local (pass-and-play)
// and vs-bot modes. It speaks the same socket events as backend/src/server.js
// and runs the exact same engines, so the multiplayer boards work unchanged.
import { createTicTacToeState, playMove, serializeTicTacToeState } from '@engines/tictactoe.js';
import { createConnectFourState, dropDisc, serializeConnectFourState } from '@engines/connectFour.js';
import {
  createStonePaperScissorState,
  playSpsMove,
  nextSpsRound,
  serializeSpsState,
} from '@engines/stonePaperScissor.js';
import { createSnakeAndLadderState, rollDice, serializeSnakeAndLadderState } from '@engines/snakeAndLadder.js';
import { createLudoState, rollLudoDice, moveLudoToken, serializeLudoState } from '@engines/ludo.js';
import { ticTacToeBotMove, connectFourBotMove, stonePaperScissorBotMove, ludoBotMove } from './bots.js';

export const LOCAL_ROOM_CODE = 'LOCAL';

const SYMBOLS = ['X', 'O'];
const COLORS = ['red', 'yellow'];
const BOT_THINK_MS = { 'tic-tac-toe': 550, 'connect-four': 650, 'stone-paper-scissor': 450, 'snake-and-ladder': 900, ludo: 900 };

const ENGINES = {
  'tic-tac-toe': {
    create: (players, prev) =>
      createTicTacToeState(players.map((p, i) => ({ ...p, symbol: SYMBOLS[i] })), prev?.startingIndex ?? null),
    serialize: serializeTicTacToeState,
    move: (state, playerId, payload) => playMove(state, payload.index, playerId),
    currentPlayerId: (state) => (state.status === 'playing' ? state.players[state.currentTurnIndex]?.id : null),
  },
  'connect-four': {
    create: (players, prev) =>
      createConnectFourState(players.map((p, i) => ({ ...p, color: COLORS[i] })), prev?.startingIndex ?? null),
    serialize: serializeConnectFourState,
    move: (state, playerId, payload) => dropDisc(state, payload.column, playerId),
    currentPlayerId: (state) => (state.status === 'playing' ? state.players[state.currentTurnIndex]?.id : null),
  },
  'stone-paper-scissor': {
    create: (players) => createStonePaperScissorState(players.map((p) => ({ id: p.id, name: p.name }))),
    serialize: serializeSpsState,
    move: (state, playerId, payload) => {
      if (payload.action === 'play') return playSpsMove(state, playerId, payload.choice);
      if (payload.action === 'nextRound') return nextSpsRound(state);
      return { ok: false, error: 'Unknown action' };
    },
    // Whoever still has to pick acts next; nobody while a result is showing.
    currentPlayerId: (state) =>
      state.status === 'playing' ? state.players.find((p) => p.currentChoice === null)?.id ?? null : null,
  },
  'snake-and-ladder': {
    create: (players, prev) => createSnakeAndLadderState(players, prev?.startingIndex ?? null),
    serialize: serializeSnakeAndLadderState,
    move: (state, playerId, payload) =>
      payload.action === 'roll' ? rollDice(state, playerId) : { ok: false, error: 'Unknown action' },
    currentPlayerId: (state) => (state.status === 'playing' ? state.players[state.currentPlayerIndex]?.id : null),
  },
  ludo: {
    create: (players) => createLudoState(players.map((p) => ({ id: p.id, name: p.name }))),
    serialize: serializeLudoState,
    move: (state, playerId, payload) => {
      if (payload.action === 'roll') return rollLudoDice(state, playerId);
      if (payload.action === 'move') return moveLudoToken(state, playerId, payload.tokenId);
      return { ok: false, error: 'Unknown action' };
    },
    currentPlayerId: (state) => (state.status === 'playing' ? state.players[state.currentPlayerIndex]?.id : null),
  },
};

export const LOCAL_GAME_TYPES = Object.keys(ENGINES);

const clone = (value) => (typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value)));

/**
 * @param {object} options
 * @param {string} options.gameType
 * @param {'local'|'bot'} options.mode
 * @param {{id: string, name: string, isBot?: boolean}[]} options.players  Humans first.
 * @param {'easy'|'medium'|'hard'} [options.difficulty]
 * @param {(info: {viewerId: string, previousViewerId: string}) => void} [options.onViewerChange]
 */
export function createLocalSocket({ gameType, mode, players, difficulty = 'medium', onViewerChange }) {
  const engine = ENGINES[gameType];
  if (!engine) throw new Error(`Local play is not available for ${gameType}`);

  const listeners = new Map();
  const timers = new Set();
  const humanId = players.find((p) => !p.isBot)?.id;
  const spsHistory = [];
  let destroyed = false;
  let gameState = engine.create(players, null);
  let viewerId = humanId;

  const room = {
    code: LOCAL_ROOM_CODE,
    gameType,
    hostId: players[0].id,
    maxPlayers: players.length,
    players: players.map(({ id, name }) => ({ id, name })),
    status: 'playing',
    chat: [],
  };

  const isBot = (id) => players.some((p) => p.id === id && p.isBot);

  function later(fn, ms) {
    const handle = setTimeout(() => {
      timers.delete(handle);
      if (!destroyed) fn();
    }, ms);
    timers.add(handle);
  }

  function serialize() {
    return clone({ ...room, viewerId, gameState: engine.serialize(gameState) });
  }

  function dispatch(event, payload) {
    (listeners.get(event) || []).forEach((fn) => fn(payload));
  }

  function updateViewer() {
    if (mode !== 'local') return;
    const next = engine.currentPlayerId(gameState);
    if (next && next !== viewerId) {
      const previousViewerId = viewerId;
      viewerId = next;
      onViewerChange?.({ viewerId, previousViewerId });
    }
  }

  function broadcast() {
    updateViewer();
    const snapshot = serialize();
    // Async like a real network message, so React never updates mid-render.
    later(() => dispatch('room:update', snapshot), 0);
    scheduleBot();
  }

  function scheduleBot() {
    if (mode !== 'bot' || gameState.status !== 'playing') return;
    const actor = engine.currentPlayerId(gameState);
    if (!actor || !isBot(actor)) return;
    later(() => runBotTurn(actor), BOT_THINK_MS[gameType] ?? 600);
  }

  function runBotTurn(botId) {
    if (gameState.status !== 'playing' || engine.currentPlayerId(gameState) !== botId) return;
    const me = gameState.players.find((p) => p.id === botId);
    const opponent = gameState.players.find((p) => p.id !== botId);
    let payload = null;

    if (gameType === 'tic-tac-toe') {
      payload = { index: ticTacToeBotMove(gameState.board, me.symbol, opponent.symbol, difficulty) };
    } else if (gameType === 'connect-four') {
      payload = { column: connectFourBotMove(gameState.board, me.color, opponent.color, difficulty) };
    } else if (gameType === 'stone-paper-scissor') {
      payload = { action: 'play', choice: stonePaperScissorBotMove(spsHistory, difficulty) };
    } else if (gameType === 'snake-and-ladder') {
      payload = { action: 'roll' };
    } else if (gameType === 'ludo') {
      payload = gameState.hasRolled
        ? { action: 'move', tokenId: ludoBotMove(gameState, botId, difficulty) }
        : { action: 'roll' };
    }

    if (payload && engine.move(gameState, botId, payload).ok) broadcast();
  }

  function restart() {
    gameState = engine.create(players, gameState);
    viewerId = mode === 'local' ? engine.currentPlayerId(gameState) ?? humanId : humanId;
    broadcast();
    return { ok: true };
  }

  function handle(event, payload = {}) {
    switch (event) {
      case 'room:join':
        updateViewer();
        scheduleBot();
        return { ok: true, room: serialize() };
      case 'room:start':
      case 'game:reset':
        return restart();
      case 'game:move': {
        const actor = mode === 'local' ? engine.currentPlayerId(gameState) ?? viewerId : humanId;
        if (gameType === 'stone-paper-scissor' && payload.action === 'play' && actor === humanId) {
          spsHistory.push(payload.choice);
        }
        const result = engine.move(gameState, actor, payload);
        if (!result.ok) return { ok: false, error: result.error || 'Invalid move' };
        broadcast();
        return { ok: true };
      }
      default:
        // chat, voice, stickers and proximity features are online-only.
        return { ok: true };
    }
  }

  const fakeSocket = {
    id: 'local-socket',
    connected: true,
    on(event, fn) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event).add(fn);
      return fakeSocket;
    },
    off(event, fn) {
      if (!fn) listeners.delete(event);
      else listeners.get(event)?.delete(fn);
      return fakeSocket;
    },
    emit(event, payload, callback) {
      const response = handle(event, payload);
      if (typeof callback === 'function') later(() => callback(response), 0);
      return fakeSocket;
    },
    timeout() {
      return {
        emit: (event, payload, callback) => {
          const response = handle(event, payload);
          if (typeof callback === 'function') later(() => callback(null, response), 0);
        },
      };
    },
    connect() {
      return fakeSocket;
    },
    disconnect() {
      return fakeSocket;
    },
    destroy() {
      destroyed = true;
      timers.forEach(clearTimeout);
      timers.clear();
      listeners.clear();
    },
    getViewerId: () => viewerId,
  };

  return fakeSocket;
}
