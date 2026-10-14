import { MULTIPLAYER_GUIDES } from '../data/guides/multiplayer.js';
import { SOLO_GUIDES } from '../data/guides/solo.js';

const configuredSiteUrl = import.meta.env.VITE_SITE_URL || 'https://doozles.xyz';

// Page titles and meta descriptions per game guide. Keys match the ids in
// data/games.js; `route` is the one canonical URL for the guide.
export const SEO_CONFIG = {
  siteName: 'Doozles',
  baseUrl: configuredSiteUrl.replace(/\/$/, ''),
  defaultTitle: 'Doozles - Free Multiplayer, Local and Bot Games in Your Browser',
  defaultDescription:
    'Play Ludo, Tambola, Raja Mantri Chor Sipahi, Connect 4, Air Hockey and more on Doozles. Private online rooms, same-device local play, bots and solo arcade games. No download needed.',
  games: {
    ludo: {
      name: 'Ludo',
      title: 'Play Ludo Online Free: Rules, Strategy and Bots | Doozles',
      description:
        'Play Ludo online with friends, on one phone, or against bots. Learn the full rules, safe squares, capture tactics and endgame strategy.',
    },
    'tic-tac-toe': {
      name: 'Tic Tac Toe',
      title: 'Tic Tac Toe Online: Play vs Friends or Bot, Plus Strategy | Doozles',
      description:
        'Play Tic Tac Toe online, on one device or against an unbeatable bot. Learn the best openings, forks and why perfect play ends in a draw.',
    },
    'air-hockey': {
      name: 'Air Hockey',
      title: 'Air Hockey Online: 1v1, Split Screen and Bot | Doozles',
      description:
        'Play Air Hockey in your browser against a friend online, on one shared screen, or against a bot. Rules, bank shots and defence tips.',
    },
    'connect-four': {
      name: 'Connect Four',
      title: 'Connect Four Online: Play Friends or Bot, Rules and Strategy | Doozles',
      description:
        'Play Connect 4 online, locally or against a bot with three difficulty levels. Learn centre control, threats and the odd-even row strategy.',
    },
    scribble: {
      name: 'Scribble',
      title: 'Scribble: Free Draw and Guess Game With Friends | Doozles',
      description:
        'Play Scribble, a free draw-and-guess party game for up to 8 players in private rooms. How scoring and hints work, plus drawing and guessing tips.',
    },
    'snake-and-ladder': {
      name: 'Snake and Ladder',
      title: 'Snake and Ladder Online: Rules, Board and History | Doozles',
      description:
        'Play Snake and Ladder online, on one device or with bots. See every snake and ladder on the board, the exact-roll rule and the game\'s Indian origins.',
    },
    'stone-paper-scissor': {
      name: 'Rock Paper Scissors',
      title: 'Rock Paper Scissors (Stone Paper Scissor) Online | Doozles',
      description:
        'Play Stone Paper Scissor best-of-five online, on one phone or against a pattern-reading bot. Learn the psychology that wins more rounds.',
    },
    tambola: {
      name: 'Tambola',
      title: 'Tambola (Housie) Online for Up to 50 Players: Rules and Prizes | Doozles',
      description:
        'Host Tambola online for family and friends. Every prize pattern explained: Early Five, lines, corners, Ladoo and Full House, plus hosting tips.',
    },
    '2048': {
      name: '2048',
      title: 'Play 2048 Online Free: Rules and Corner Strategy | Doozles',
      description:
        'Play 2048 free in your browser with swipe or keyboard controls. Learn the corner strategy and snake pattern that reliably reach 2048.',
    },
    'block-blaster': {
      name: 'Block Blaster',
      title: 'Block Blaster: Free 8x8 Block Puzzle Online | Doozles',
      description:
        'Play Block Blaster, a relaxing 8x8 block puzzle. Learn how combos work and the space-planning tricks that keep the board open.',
    },
    dino: {
      name: 'Dino Run',
      title: 'Dino Run: Play the Dinosaur Runner Game Online | Doozles',
      description:
        'Play Dino Run, an endless runner inspired by the offline dinosaur game. Controls, timing tips and a global top-three leaderboard.',
    },
    'flappy-bird': {
      name: 'Flappy Bird',
      title: 'Play Flappy Bird Online Free: Tips for a Higher Score | Doozles',
      description:
        'Play Flappy Bird free in your browser. The history of the one-tap phenomenon and practical tips for a higher score.',
    },
    'helix-jump': {
      name: 'Helix Jump',
      title: 'Helix Jump 3D Online: Play Free in Your Browser | Doozles',
      description:
        'Play Helix Jump in real 3D in your browser. Spin the tower, drop through the gaps, avoid red and chain floors for a smash.',
    },
    'raja-mantri': {
      name: 'Raja Mantri Chor Sipahi',
      title: 'Raja Mantri Chor Sipahi Online: Rules, Points and Tips | Doozles',
      description:
        'Play Raja Mantri Chor Sipahi online with friends or bots. Roles, point table, how the Mantri\'s guess works and how to bluff as the Chor.',
    },
    imposter: {
      name: 'Word Imposter',
      title: 'Word Imposter: Social Deduction Word Game Online | Doozles',
      description:
        'Play Word Imposter online. Everyone knows the secret word except the imposter. Rules, scoring and clue strategy for detectives and imposters.',
    },
    'traffic-run': {
      name: 'Traffic Run',
      title: 'Traffic Run: Free 3-Lane Car Dodging Game | Doozles',
      description:
        'Play Traffic Run free in your browser. Swipe, tap or use the keyboard to dodge traffic across three lanes as the speed climbs.',
    },
  },
};

const GUIDES = { ...MULTIPLAYER_GUIDES, ...SOLO_GUIDES };

// Old or alternative URLs that should resolve to the canonical guide.
export const GAME_SEO_ALIASES = {
  tictactoe: 'tic-tac-toe',
  'connect-4': 'connect-four',
  'rock-paper-scissor': 'stone-paper-scissor',
  'rock-paper-scissors': 'stone-paper-scissor',
  'raja-mantri-chor-sipahi': 'raja-mantri',
  'word-imposter': 'imposter',
};

export function normalizeGameId(gameId = '') {
  return GAME_SEO_ALIASES[gameId] || gameId;
}

export const siteUrl = SEO_CONFIG.baseUrl;

export function absoluteUrl(path = '/') {
  return `${siteUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

export const defaultSeo = {
  title: SEO_CONFIG.defaultTitle,
  description: SEO_CONFIG.defaultDescription,
  image: absoluteUrl('/og-image.svg'),
};

export const gamesSeo = Object.fromEntries(
  Object.entries(SEO_CONFIG.games).map(([id, meta]) => [
    id,
    {
      id,
      catalogId: id,
      path: `/${id}`,
      playPath: `/games/${id}`,
      ...meta,
      ...GUIDES[id],
    },
  ]),
);
