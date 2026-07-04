const configuredSiteUrl = import.meta.env.VITE_SITE_URL || 'https://doozles.xyz';

export const SEO_CONFIG = {
  siteName: 'Doozles',
  baseUrl: configuredSiteUrl.replace(/\/$/, ''),
  defaultTitle: 'Doozles - Play Free Multiplayer Browser Games Online',
  defaultDescription:
    'Play free multiplayer games online on Doozles. Create private rooms, invite friends, and enjoy browser games without downloading an app.',
  defaultKeywords:
    'play free multiplayer games online, browser games without downloading, free online games with friends, multiplayer browser games, private room games, casual games online, Doozles games',
  games: {
    ludo: {
      name: 'Ludo',
      route: '/ludo',
      playPath: '/games/ludo',
      playMode: 'MultiPlayer',
      title: 'Play Ludo Online Free With Friends | Doozles',
      description:
        'Play Ludo online free with friends on Doozles. Create a private room, roll dice, race tokens home, and enjoy a browser game without downloading.',
      keywords:
        'play ludo online free, ludo game with friends, online ludo multiplayer, play free multiplayer games online, browser games without downloading, private room ludo, ludo browser game',
    },
    tictactoe: {
      name: 'Tic Tac Toe',
      route: '/tictactoe',
      playPath: '/games/tic-tac-toe',
      playMode: 'MultiPlayer',
      title: 'Play Tic Tac Toe Online With Friends | Doozles',
      description:
        'Play Tic Tac Toe online with friends for free. Start a private 1v1 room on Doozles and play instantly in your browser without downloading.',
      keywords:
        'tic tac toe online, play tic tac toe with friends, free tic tac toe multiplayer, play free multiplayer games online, browser games without downloading, noughts and crosses online',
    },
    'air-hockey': {
      name: 'Air Hockey',
      route: '/air-hockey',
      playPath: '/games/air-hockey',
      playMode: 'MultiPlayer',
      title: 'Play Air Hockey Online Free | Doozles',
      description:
        'Play Air Hockey online free on Doozles. Create a fast 1v1 browser room, strike the puck, and challenge a friend without downloading anything.',
      keywords:
        'play air hockey online, air hockey game online free, multiplayer air hockey browser game, play free multiplayer games online, browser games without downloading, 1v1 online games',
    },
    'connect-four': {
      name: 'Connect Four',
      route: '/connect-four',
      playPath: '/games/connect-four',
      playMode: 'MultiPlayer',
      title: 'Play Connect Four Online With Friends | Doozles',
      description:
        'Play Connect Four online with friends on Doozles. Drop discs, connect four in a row, and enjoy a free multiplayer browser game.',
      keywords:
        'connect four online, play connect 4 with friends, connect four multiplayer, free connect four game, play free multiplayer games online, browser games without downloading',
    },
    scribble: {
      name: 'Scribble',
      route: '/scribble',
      playPath: '/games/scribble',
      playMode: 'MultiPlayer',
      title: 'Play Scribble Online With Friends | Doozles',
      description:
        'Play Scribble online with friends on Doozles. Draw, guess, chat, and score points in a free browser drawing game without downloading.',
      keywords:
        'scribble online game, draw and guess online, drawing game with friends, skribbl alternative, play free multiplayer games online, browser games without downloading',
    },
    'snake-and-ladder': {
      name: 'Snake and Ladder',
      route: '/snake-and-ladder',
      playPath: '/games/snake-and-ladder',
      playMode: 'MultiPlayer',
      title: 'Play Snake and Ladder Online | Doozles',
      description:
        'Play Snake and Ladder online with friends. Roll dice, climb ladders, avoid snakes, and race to the finish in a free browser game.',
      keywords:
        'snake and ladder online, play snakes and ladders with friends, snake ladder multiplayer, free board games online, play free multiplayer games online, browser games without downloading',
    },
    'stone-paper-scissor': {
      name: 'Stone Paper Scissor',
      route: '/stone-paper-scissor',
      playPath: '/games/stone-paper-scissor',
      playMode: 'MultiPlayer',
      title: 'Play Stone Paper Scissor Online | Doozles',
      description:
        'Play Stone Paper Scissor online with a friend on Doozles. Choose your move, win quick rounds, and play instantly in the browser.',
      keywords:
        'stone paper scissor online, rock paper scissors online, play rock paper scissors with friends, quick 1v1 browser games, play free multiplayer games online, browser games without downloading',
    },
    tambola: {
      name: 'Tambola',
      route: '/tambola',
      playPath: '/games/tambola',
      playMode: 'MultiPlayer',
      title: 'Play Tambola Online With Friends | Doozles',
      description:
        'Play Tambola online with friends on Doozles. Create a private room, mark tickets, call numbers, and enjoy a social browser game.',
      keywords:
        'tambola online, play tambola with friends, housie online game, online tambola tickets, play free multiplayer games online, browser games without downloading',
    },
    '2048': {
      name: '2048',
      route: '/2048',
      playPath: '/games/2048',
      playMode: 'SinglePlayer',
      title: 'Play 2048 Online Free | Doozles',
      description:
        'Play 2048 online free on Doozles. Slide tiles, merge numbers, chase a high score, and enjoy a browser puzzle game without downloading.',
      keywords:
        'play 2048 online, 2048 game free, 2048 puzzle browser game, free online puzzle games, browser games without downloading, single player browser games',
    },
    'block-blaster': {
      name: 'Block Blaster',
      route: '/block-blaster',
      playPath: '/games/block-blaster',
      playMode: 'SinglePlayer',
      title: 'Play Block Blaster Online Free | Doozles',
      description:
        'Play Block Blaster online free on Doozles. Place blocks, clear lines, plan combos, and enjoy an instant browser puzzle game.',
      keywords:
        'block blaster online, block puzzle game free, play block games online, free puzzle browser games, browser games without downloading, single player games online',
    },
    dino: {
      name: 'Dino Run',
      route: '/dino',
      playPath: '/games/dino',
      playMode: 'SinglePlayer',
      title: 'Play Dino Run Online Free | Doozles',
      description:
        'Play Dino Run online free on Doozles. Jump obstacles, dodge hazards, and chase your best score in an endless browser runner.',
      keywords:
        'dino run online, dinosaur game online, chrome dino style game, endless runner browser game, browser games without downloading, free single player games online',
    },
  },
};

export const GAME_SEO_ALIASES = {
  'connect-4': 'connect-four',
  'tic-tac-toe': 'tictactoe',
  'rock-paper-scissor': 'stone-paper-scissor',
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
  keywords: SEO_CONFIG.defaultKeywords,
  image: absoluteUrl('/og-image.svg'),
};

const guideDetails = {
  ludo: {
    related: ['tictactoe', 'connect-four', 'snake-and-ladder'],
    intro:
      'Ludo is a classic race game where players roll dice, move tokens around the board, and try to bring every token home first.',
    rules: [
      'Players roll the die on their turn and move one eligible token.',
      'A token must leave base before it can travel around the board.',
      'Landing on an opponent token can send that token back to base.',
      'The first player to bring every token home wins.',
    ],
    howToPlay: [
      'Choose Ludo from the Doozles lobby.',
      'Create a room and share the invite link with friends.',
      'Wait for players to join, then start the match.',
      'Roll, move tokens, and race to the home area.',
    ],
    strategies: [
      'Move multiple tokens instead of relying on only one runner.',
      'Use safe spaces when available to reduce captures.',
      'Capture opponent tokens when it does not expose your own progress.',
      'Balance aggressive captures with steady movement toward home.',
    ],
    faq: [
      {
        question: 'Can I play Ludo online with friends?',
        answer: 'Yes. Create a private Ludo room on Doozles and invite friends with a room link.',
      },
      {
        question: 'Is Ludo free on Doozles?',
        answer: 'Yes. You can play the current Doozles Ludo experience in your browser for free.',
      },
      {
        question: 'Do I need to download an app?',
        answer: 'No. Doozles runs directly in the browser.',
      },
    ],
  },
  tictactoe: {
    related: ['connect-four', 'stone-paper-scissor', 'ludo'],
    intro:
      'Tic Tac Toe is a quick two-player game where X and O compete to claim three spaces in a row on a 3x3 grid.',
    rules: [
      'Players take turns placing their symbol in an empty square.',
      'The first player to place three symbols in a row wins.',
      'Winning rows can be horizontal, vertical, or diagonal.',
      'If every square fills without a winner, the game ends in a draw.',
    ],
    howToPlay: [
      'Open the Tic Tac Toe lobby on Doozles.',
      'Enter your name and create a room.',
      'Invite a friend with the room link or room code.',
      'Take turns until one player wins or the grid is full.',
    ],
    strategies: [
      'Start in the center or a corner to maximize future threats.',
      'Block your opponent immediately when they have two in a row.',
      'Create forks that force your opponent to defend two lines.',
      'With perfect play from both sides, expect a draw.',
    ],
    faq: [
      {
        question: 'Is Tic Tac Toe multiplayer on Doozles?',
        answer: 'Yes. Tic Tac Toe runs in a private online room you can share with a friend.',
      },
      {
        question: 'Can Tic Tac Toe end in a draw?',
        answer: 'Yes. Careful play from both players often ends in a draw.',
      },
      {
        question: 'Can I play on mobile?',
        answer: 'Yes. Doozles games are browser-based and work on mobile screens.',
      },
    ],
  },
  'air-hockey': {
    related: ['stone-paper-scissor', 'connect-four', 'tictactoe'],
    intro:
      'Air Hockey is a fast 1v1 arcade game where players strike a puck, defend their goal, and race to outscore an opponent.',
    rules: [
      'Each player controls a striker on their side of the table.',
      'Hit the puck into the opponent goal to score.',
      'Defend your own goal while keeping the puck in play.',
      'The player with the target score or highest score wins.',
    ],
    howToPlay: [
      'Open Air Hockey from the Doozles lobby.',
      'Create a private room and share it with a friend.',
      'Start the match once both players are ready.',
      'Move your striker, hit the puck, and protect your goal.',
    ],
    strategies: [
      'Stay between the puck and your goal after each shot.',
      'Use angled shots to make rebounds harder to defend.',
      'Avoid overcommitting when the puck is near your goal.',
      'Mix direct shots with bank shots to stay unpredictable.',
    ],
    faq: [
      {
        question: 'Can I play Air Hockey online with a friend?',
        answer: 'Yes. Doozles supports private Air Hockey rooms for quick 1v1 matches.',
      },
      {
        question: 'Is Air Hockey browser-based?',
        answer: 'Yes. You can play from a browser without installing an app.',
      },
      {
        question: 'How many players can join Air Hockey?',
        answer: 'Air Hockey is designed for two players.',
      },
    ],
  },
  'connect-four': {
    related: ['tictactoe', 'ludo', 'stone-paper-scissor'],
    intro:
      'Connect Four is a two-player strategy game where players drop discs into a vertical grid and race to connect four in a row.',
    rules: [
      'Players take turns dropping one disc into any available column.',
      'A disc falls to the lowest open space in that column.',
      'The first player to connect four discs horizontally, vertically, or diagonally wins.',
      'If the board fills without four connected discs, the game is a draw.',
    ],
    howToPlay: [
      'Choose Connect Four from the Doozles game lobby.',
      'Enter your name and create a private room.',
      'Share the room link or room code with a friend.',
      'Start the match and take turns dropping discs.',
    ],
    strategies: [
      'Control the center columns because they create more winning lines.',
      'Block immediate threats before building your own longer setup.',
      'Create fork threats where one move gives you multiple ways to win.',
      'Avoid filling columns that give your opponent a direct winning move.',
    ],
    faq: [
      {
        question: 'Can I play Connect Four online with a friend?',
        answer: 'Yes. Create a room on Doozles and share the invite link with your friend.',
      },
      {
        question: 'How many players can join Connect Four?',
        answer: 'Connect Four is built for two players.',
      },
      {
        question: 'Do I need an account?',
        answer: 'No. You can enter a display name and start a private room instantly.',
      },
    ],
  },
  scribble: {
    related: ['tambola', 'tictactoe', 'connect-four'],
    intro:
      'Scribble is a real-time drawing and guessing game where one player sketches a hidden word while everyone else races to guess it.',
    rules: [
      'One player draws the selected word while the others guess in chat.',
      'Correct guesses score points for the guesser and reward the drawer.',
      'The drawer should not write or reveal the answer directly.',
      'Players rotate through drawing turns until the match ends.',
    ],
    howToPlay: [
      'Open the Scribble lobby on Doozles.',
      'Create a room and invite friends with the room link or code.',
      'Start the match once players join.',
      'Draw clearly, guess quickly, and use hints when they appear.',
    ],
    strategies: [
      'Start with broad shapes before adding small details.',
      'Use simple visual clues instead of complicated scenes.',
      'Watch word length and hints to narrow down guesses.',
      'Guess common related words early before the timer runs out.',
    ],
    faq: [
      {
        question: 'How many players can join Scribble?',
        answer: 'The current Scribble room supports group play with friends.',
      },
      {
        question: 'Does Scribble include chat?',
        answer: 'Yes. Players use chat to guess the word during each drawing turn.',
      },
      {
        question: 'Can I invite friends with a link?',
        answer: 'Yes. The room lobby includes link and room code sharing.',
      },
    ],
  },
  'snake-and-ladder': {
    related: ['ludo', 'tambola', 'connect-four'],
    intro:
      'Snake and Ladder is a classic dice game where players race across the board, climb helpful ladders, and slide down snakes.',
    rules: [
      'Players take turns rolling the die.',
      'Move forward by the number shown on the die.',
      'Landing at the bottom of a ladder moves you upward.',
      'Landing on a snake head sends you down to its tail.',
    ],
    howToPlay: [
      'Choose Snake and Ladder from the Doozles hub.',
      'Enter a username and create a room.',
      'Share the room code or invite link with friends.',
      'Take turns rolling until someone reaches the final square.',
    ],
    strategies: [
      'The game is luck-heavy, so focus on quick turns and room flow.',
      'Stay patient when snakes reset your position.',
      'Use the lobby invite tools to keep everyone in the correct match.',
      'Keep turns moving so the game stays lively.',
    ],
    faq: [
      {
        question: 'Is Snake and Ladder multiplayer?',
        answer: 'Yes. Doozles runs Snake and Ladder in a shared online room.',
      },
      {
        question: 'Do I control the dice?',
        answer: 'Players roll on their turn and the game updates the board for everyone.',
      },
      {
        question: 'Can I play without downloading?',
        answer: 'Yes. Doozles runs in the browser.',
      },
    ],
  },
  'stone-paper-scissor': {
    related: ['tictactoe', 'air-hockey', 'connect-four'],
    intro:
      'Stone Paper Scissor is a quick two-player decision game where stone beats scissor, scissor beats paper, and paper beats stone.',
    rules: [
      'Each player secretly chooses stone, paper, or scissor.',
      'Stone beats scissor, scissor beats paper, and paper beats stone.',
      'Matching choices result in a tie.',
      'The game can be played across multiple rounds.',
    ],
    howToPlay: [
      'Open the Stone Paper Scissor lobby on Doozles.',
      'Create a private room and invite a friend.',
      'Start the match from the lobby.',
      'Choose your move each round and watch the result update in real time.',
    ],
    strategies: [
      'Avoid repeating the same choice too often.',
      'Notice your opponent patterns between rounds.',
      'Mix random choices with simple prediction.',
      'Stay unpredictable after winning a round.',
    ],
    faq: [
      {
        question: 'Is Stone Paper Scissor a two-player game?',
        answer: 'Yes. The current Doozles room is designed for two players.',
      },
      {
        question: 'Can I share a room code?',
        answer: 'Yes. The lobby supports room code and invite link sharing.',
      },
      {
        question: 'Is it real-time?',
        answer: 'Yes. Moves and results sync through the multiplayer backend.',
      },
    ],
  },
  tambola: {
    related: ['scribble', 'ludo', 'snake-and-ladder'],
    intro:
      'Tambola is a social number-calling game where players mark tickets and claim patterns as numbers are drawn.',
    rules: [
      'The host draws numbers during the game.',
      'Players mark matching numbers on their tickets.',
      'Players claim valid patterns when their ticket matches the requirement.',
      'The host and room state keep everyone synchronized.',
    ],
    howToPlay: [
      'Open the Tambola lobby on Doozles.',
      'Create a room and invite players.',
      'Start the game and draw numbers as the host.',
      'Mark tickets and claim patterns when eligible.',
    ],
    strategies: [
      'Keep your ticket visible and scan rows after every draw.',
      'Claim quickly once a pattern is complete.',
      'Hosts should call numbers at a steady pace.',
      'Use clear room sharing so every player joins the correct match.',
    ],
    faq: [
      {
        question: 'Can I play Tambola online?',
        answer: 'Yes. Create a Tambola room on Doozles and invite friends.',
      },
      {
        question: 'Who draws the numbers?',
        answer: 'The host controls number drawing in the Tambola room.',
      },
      {
        question: 'Can I play Tambola without installing an app?',
        answer: 'Yes. Doozles runs in the browser.',
      },
    ],
  },
  '2048': {
    related: ['block-blaster', 'dino', 'tictactoe'],
    intro:
      '2048 is a sliding tile puzzle where matching numbers merge into larger tiles until you reach 2048 or run out of moves.',
    rules: [
      'Swipe or drag to move all tiles in one direction.',
      'Tiles with the same number merge when they collide.',
      'A new tile appears after each successful move.',
      'The game ends when no moves remain.',
    ],
    howToPlay: [
      'Open 2048 from the Doozles single-player section.',
      'Swipe or drag up, down, left, or right.',
      'Merge matching tiles to build larger numbers.',
      'Keep space open so the board does not lock up.',
    ],
    strategies: [
      'Keep your largest tile in one corner.',
      'Build rows in descending order around that corner.',
      'Avoid random swipes that break your structure.',
      'Think one move ahead before filling the last open spaces.',
    ],
    faq: [
      {
        question: 'Is 2048 multiplayer?',
        answer: 'No. The current 2048 game on Doozles is single-player.',
      },
      {
        question: 'Can I play 2048 on mobile?',
        answer: 'Yes. The 2048 board supports browser-based play on mobile screens.',
      },
      {
        question: 'What is the goal of 2048?',
        answer: 'The goal is to merge tiles until you create the 2048 tile and keep going for a higher score.',
      },
    ],
  },
  'block-blaster': {
    related: ['2048', 'dino', 'tictactoe'],
    intro:
      'Block Blaster is a block puzzle game where players place shapes, clear lines, and keep the board open for the next move.',
    rules: [
      'Place each available block shape onto the board.',
      'Complete rows or columns to clear space.',
      'Plan ahead because blocks cannot overlap.',
      'The game ends when no available shape can fit.',
    ],
    howToPlay: [
      'Open Block Blaster from the Doozles single-player section.',
      'Drag or place blocks onto open board spaces.',
      'Clear rows and columns to score points.',
      'Keep enough space for large shapes.',
    ],
    strategies: [
      'Avoid creating isolated empty pockets.',
      'Keep the center flexible for larger shapes.',
      'Clear multiple lines when a combo is possible.',
      'Save open space near corners for awkward pieces.',
    ],
    faq: [
      {
        question: 'Is Block Blaster free to play?',
        answer: 'Yes. Block Blaster is available as a browser game on Doozles.',
      },
      {
        question: 'Do I need to download Block Blaster?',
        answer: 'No. You can play directly in the browser.',
      },
      {
        question: 'Is Block Blaster single-player?',
        answer: 'Yes. The current Block Blaster experience is single-player.',
      },
    ],
  },
  dino: {
    related: ['2048', 'block-blaster', 'air-hockey'],
    intro:
      'Dino Run is an endless runner where the dinosaur jumps hazards, dodges obstacles, and chases a higher score.',
    rules: [
      'Jump over obstacles before they reach the dinosaur.',
      'Avoid hazards to keep the run alive.',
      'The score increases as the run continues.',
      'The game ends when the dinosaur hits an obstacle.',
    ],
    howToPlay: [
      'Open Dino Run from the Doozles single-player section.',
      'Use the game controls to jump at the right time.',
      'Watch obstacle spacing and react quickly.',
      'Keep running as long as possible to raise your score.',
    ],
    strategies: [
      'Jump only when an obstacle is close enough.',
      'Stay calm as the pace increases.',
      'Focus on rhythm instead of tapping constantly.',
      'Use short reactions for close obstacles.',
    ],
    faq: [
      {
        question: 'Can I play Dino Run online?',
        answer: 'Yes. Dino Run is available on Doozles as a browser game.',
      },
      {
        question: 'Is Dino Run single-player?',
        answer: 'Yes. The current Dino Run experience is single-player.',
      },
      {
        question: 'Does Dino Run require a download?',
        answer: 'No. It runs directly in your browser.',
      },
    ],
  },
};

function buildGameSeo(id) {
  const seo = SEO_CONFIG.games[id];
  return {
    id,
    ...seo,
    path: seo.route,
    ...guideDetails[id],
  };
}

export const gamesSeo = Object.fromEntries(
  Object.keys(SEO_CONFIG.games).map((id) => [id, buildGameSeo(id)]),
);

Object.assign(gamesSeo, {
  'connect-4': {
    ...gamesSeo['connect-four'],
    id: 'connect-4',
    path: '/connect-4',
  },
  'tic-tac-toe': {
    ...gamesSeo.tictactoe,
    id: 'tic-tac-toe',
    path: '/tic-tac-toe',
  },
  'rock-paper-scissor': {
    ...gamesSeo['stone-paper-scissor'],
    id: 'rock-paper-scissor',
    name: 'Rock Paper Scissor',
    path: '/rock-paper-scissor',
  },
  chess: {
    id: 'chess',
    name: 'Chess',
    title: 'Play Chess Online With Friends | Doozles',
    description:
      'Learn chess basics, rules, and strategy while Doozles prepares a private online chess room experience.',
    keywords:
      'play chess online, chess with friends, browser chess game, strategy games online, browser games without downloading',
    path: '/chess',
    route: '/chess',
    playPath: '/games/chess',
    playMode: 'MultiPlayer',
    related: ['tictactoe', 'connect-four', 'ludo'],
    intro:
      'Chess is a two-player strategy game where each side tries to checkmate the opposing king through careful piece movement and planning.',
    rules: [
      'Each piece moves in its own pattern across the board.',
      'The king must never remain in check.',
      'The goal is to checkmate the opponent king.',
      'Games can also end by draw, stalemate, resignation, or timeout depending on the format.',
    ],
    howToPlay: [
      'Choose a side and learn the movement pattern of each piece.',
      'Develop pieces toward the center and protect your king.',
      'Look for checks, captures, and threats each turn.',
      'Checkmate the opponent king to win.',
    ],
    strategies: [
      'Control the center early with pawns and minor pieces.',
      'Castle to improve king safety.',
      'Avoid moving the same piece repeatedly in the opening.',
      'Before every move, check whether any piece is hanging.',
    ],
    faq: [
      {
        question: 'Is Chess playable on Doozles right now?',
        answer:
          'The SEO guide page is ready, but the live Chess room flow should be added before promoting the Play Now action widely.',
      },
      {
        question: 'How many players does Chess need?',
        answer: 'Chess is a two-player game.',
      },
      {
        question: 'What is checkmate?',
        answer:
          'Checkmate happens when a king is under attack and the defending player has no legal move to escape.',
      },
    ],
  },
});
