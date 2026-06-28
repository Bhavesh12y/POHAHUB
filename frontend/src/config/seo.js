export const siteUrl = import.meta.env.VITE_SITE_URL || 'https://pohahub.vercel.app';

export const defaultSeo = {
  title: 'POHAHUB - Multiplayer Gaming Hub',
  description:
    'Create private rooms and play quick multiplayer games like Tic Tac Toe, Connect 4, Ludo, Scribble, Tambola, and more with friends.',
  image: `${siteUrl}/og-image.svg`,
};

export const gamesSeo = {
  'connect-4': {
    name: 'Connect 4',
    title: 'Play Connect 4 Online With Friends | POHAHUB',
    description:
      'Learn Connect 4 rules, winning strategies, and start a private multiplayer room with friends on POHAHUB.',
    path: '/connect-4',
    playPath: '/games/connect-four',
    related: ['tic-tac-toe', 'ludo', 'chess'],
    intro:
      'Connect 4 is a fast two-player strategy game where players drop discs into a vertical grid and race to connect four in a row.',
    rules: [
      'Players take turns dropping one disc into any available column.',
      'A disc falls to the lowest open space in that column.',
      'The first player to connect four discs horizontally, vertically, or diagonally wins.',
      'If the board fills without four connected discs, the game is a draw.',
    ],
    howToPlay: [
      'Choose Connect 4 from the POHAHUB game lobby.',
      'Enter your username and create a private room.',
      'Share the room link or room code with a friend.',
      'Start the match from the lobby and take turns dropping discs.',
    ],
    strategies: [
      'Control the center columns because they create more winning lines.',
      'Block immediate threats before building your own longer setup.',
      'Create fork threats where one move gives you multiple ways to win.',
      'Avoid filling columns that give your opponent a direct winning move.',
    ],
    faq: [
      {
        question: 'Can I play Connect 4 online with a friend?',
        answer:
          'Yes. Create a room on POHAHUB, share the room link, and your friend can join from another device.',
      },
      {
        question: 'How many players can join Connect 4?',
        answer: 'Connect 4 is built for two players.',
      },
      {
        question: 'Do I need an account?',
        answer: 'No. You can enter a display name and start a private room instantly.',
      },
    ],
  },
  'tic-tac-toe': {
    name: 'Tic Tac Toe',
    title: 'Play Tic Tac Toe Online With Friends | POHAHUB',
    description:
      'Play Tic Tac Toe in a private online room, learn the rules, and use simple strategies to force wins or draws.',
    path: '/tic-tac-toe',
    playPath: '/games/tic-tac-toe',
    related: ['connect-4', 'ludo', 'chess'],
    intro:
      'Tic Tac Toe is a classic two-player game where X and O compete to claim three spaces in a row on a 3x3 grid.',
    rules: [
      'Players take turns placing their symbol in an empty square.',
      'The first player to place three symbols in a row wins.',
      'Winning rows can be horizontal, vertical, or diagonal.',
      'If every square is filled without a winner, the game ends in a draw.',
    ],
    howToPlay: [
      'Open the Tic Tac Toe lobby on POHAHUB.',
      'Enter your username and create a room.',
      'Invite a friend with the room link or room code.',
      'Take turns until one player wins or the grid is full.',
    ],
    strategies: [
      'Start in the center or a corner to maximize future threats.',
      'Block your opponent immediately when they have two in a row.',
      'Create forks that force your opponent to defend two lines.',
      'If both players play perfectly, expect a draw.',
    ],
    faq: [
      {
        question: 'Is Tic Tac Toe multiplayer on POHAHUB?',
        answer: 'Yes. The game runs in a private room that you can share with a friend.',
      },
      {
        question: 'Can Tic Tac Toe end in a draw?',
        answer: 'Yes. With careful play from both players, Tic Tac Toe often ends in a draw.',
      },
      {
        question: 'Do I have to install anything?',
        answer: 'No. POHAHUB runs in the browser.',
      },
    ],
  },
  ludo: {
    name: 'Ludo',
    title: 'Play Ludo Online With Friends | POHAHUB',
    description:
      'Learn Ludo rules and start a private online room to race tokens home with friends on POHAHUB.',
    path: '/ludo',
    playPath: '/games/ludo',
    related: ['connect-4', 'tic-tac-toe', 'chess'],
    intro:
      'Ludo is a board game where players roll dice, move tokens around the board, and race to bring every token home.',
    rules: [
      'Players roll the die on their turn and move one eligible token.',
      'A token must usually leave base before it can travel around the board.',
      'Landing on an opponent token can send that token back to base.',
      'The winner is the first player to bring all tokens home.',
    ],
    howToPlay: [
      'Choose Ludo from the POHAHUB lobby.',
      'Create a room and share the invite link with friends.',
      'Wait for players to join, then start the match.',
      'Roll, move tokens, and race to the home area.',
    ],
    strategies: [
      'Move multiple tokens instead of relying on only one runner.',
      'Use safe spaces when available to avoid being captured.',
      'Capture opponent tokens when it does not expose your own progress.',
      'Balance aggressive captures with steady movement toward home.',
    ],
    faq: [
      {
        question: 'How many people can play Ludo on POHAHUB?',
        answer: 'The current Ludo room supports up to four players.',
      },
      {
        question: 'Can I invite friends with a room code?',
        answer: 'Yes. You can share the room link, QR code, or room code.',
      },
      {
        question: 'Is Ludo free to play?',
        answer: 'Yes. The current POHAHUB experience is free to play.',
      },
    ],
  },
  chess: {
    name: 'Chess',
    title: 'Play Chess Online With Friends | POHAHUB',
    description:
      'Learn chess basics, rules, and strategy while POHAHUB prepares a private online chess room experience.',
    path: '/chess',
    playPath: '/games/chess',
    related: ['tic-tac-toe', 'connect-4', 'ludo'],
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
        question: 'Is Chess playable on POHAHUB right now?',
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
  scribble: {
    name: 'Scribble',
    title: 'Play Scribble Online With Friends | POHAHUB',
    description:
      'Draw, guess, chat, and score points with friends in a private online Scribble room on POHAHUB.',
    path: '/scribble',
    playPath: '/games/scribble',
    related: ['tic-tac-toe', 'connect-4', 'tambola'],
    intro:
      'Scribble is a real-time drawing and guessing game where one player sketches a hidden word while everyone else races to guess it.',
    rules: [
      'One player draws the selected word while the others guess in chat.',
      'Correct guesses score points for the guesser and reward the drawer.',
      'The drawer should not write or reveal the answer directly.',
      'Players rotate through drawing turns until the match ends.',
    ],
    howToPlay: [
      'Open the Scribble lobby on POHAHUB.',
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
        answer: 'The current Scribble room supports up to eight players.',
      },
      {
        question: 'Does Scribble include chat?',
        answer: 'Yes. Players use chat to guess the word during each drawing turn.',
      },
      {
        question: 'Can I invite friends with a link?',
        answer: 'Yes. The room lobby includes link sharing and QR code options.',
      },
    ],
  },
  'snake-and-ladder': {
    name: 'Snake & Ladder',
    title: 'Play Snake & Ladder Online With Friends | POHAHUB',
    description:
      'Roll dice, climb ladders, avoid snakes, and race friends to the finish in an online Snake & Ladder room.',
    path: '/snake-and-ladder',
    playPath: '/games/snake-and-ladder',
    related: ['ludo', 'tambola', 'connect-4'],
    intro:
      'Snake & Ladder is a classic dice game where players race across the board, climb helpful ladders, and slide down dangerous snakes.',
    rules: [
      'Players take turns rolling the die.',
      'Move forward by the number shown on the die.',
      'Landing at the bottom of a ladder moves you upward.',
      'Landing on a snake head sends you down to its tail.',
    ],
    howToPlay: [
      'Choose Snake & Ladder from the POHAHUB hub.',
      'Enter a username and create a room.',
      'Share the room code or invite link with friends.',
      'Take turns rolling until someone reaches the final square.',
    ],
    strategies: [
      'The game is luck-heavy, so focus on quick turns and room flow.',
      'Stay patient when snakes reset your position.',
      'Use the lobby invite tools to keep players moving into the game quickly.',
      'If house rules are added later, document them clearly on this page.',
    ],
    faq: [
      {
        question: 'Is Snake & Ladder multiplayer?',
        answer: 'Yes. POHAHUB runs Snake & Ladder in a shared online room.',
      },
      {
        question: 'Do I control the dice?',
        answer: 'Players roll on their turn and the game updates the board for everyone.',
      },
      {
        question: 'Can I play on mobile?',
        answer: 'Yes. The game is browser-based and works on mobile screens.',
      },
    ],
  },
  tambola: {
    name: 'Tambola',
    title: 'Play Tambola Online With Friends | POHAHUB',
    description:
      'Create a private Tambola room, mark tickets, draw numbers, and claim patterns with friends online.',
    path: '/tambola',
    playPath: '/games/tambola',
    related: ['ludo', 'scribble', 'snake-and-ladder'],
    intro:
      'Tambola is a social number-calling game where players mark tickets and claim patterns as numbers are drawn.',
    rules: [
      'The host draws numbers during the game.',
      'Players mark matching numbers on their tickets.',
      'Players claim valid patterns when their ticket matches the requirement.',
      'The host and room state keep everyone synchronized.',
    ],
    howToPlay: [
      'Open the Tambola lobby on POHAHUB.',
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
        question: 'How many players can join Tambola?',
        answer: 'The current Tambola room can support larger groups than the two-player games.',
      },
      {
        question: 'Who draws the numbers?',
        answer: 'The host controls number drawing in the Tambola room.',
      },
      {
        question: 'Can I play Tambola without installing an app?',
        answer: 'Yes. POHAHUB runs in the browser.',
      },
    ],
  },
  'rock-paper-scissor': {
    name: 'Rock Paper Scissor',
    title: 'Play Rock Paper Scissor Online With Friends | POHAHUB',
    description:
      'Challenge a friend to Rock Paper Scissor in a private online room with fast browser-based multiplayer.',
    path: '/rock-paper-scissor',
    playPath: '/games/stone-paper-scissor',
    related: ['tic-tac-toe', 'connect-4', 'scribble'],
    intro:
      'Rock Paper Scissor is a quick two-player decision game where rock beats scissors, scissors beats paper, and paper beats rock.',
    rules: [
      'Each player secretly chooses rock, paper, or scissor.',
      'Rock beats scissor, scissor beats paper, and paper beats rock.',
      'Matching choices result in a tie.',
      'The game can be played across multiple rounds.',
    ],
    howToPlay: [
      'Open the Rock Paper Scissor lobby on POHAHUB.',
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
        question: 'Is Rock Paper Scissor a two-player game?',
        answer: 'Yes. The current POHAHUB room is designed for two players.',
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
  '2048': {
    name: '2048',
    title: 'Play 2048 Online | POHAHUB',
    description:
      'Play 2048 in your browser, merge numbered tiles, and chase a higher score on POHAHUB.',
    path: '/2048',
    playPath: '/games/2048',
    related: ['tic-tac-toe', 'connect-4', 'ludo'],
    playMode: 'SinglePlayer',
    intro:
      '2048 is a sliding tile puzzle where matching numbers merge into larger tiles until you reach 2048 or run out of moves.',
    rules: [
      'Swipe or drag to move all tiles in one direction.',
      'Tiles with the same number merge when they collide.',
      'A new tile appears after each successful move.',
      'The game ends when no moves remain.',
    ],
    howToPlay: [
      'Open 2048 from the POHAHUB single-player section.',
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
        answer: 'No. The current 2048 game on POHAHUB is single-player.',
      },
      {
        question: 'Can I play 2048 on mobile?',
        answer: 'Yes. The 2048 board supports swipe-style controls.',
      },
      {
        question: 'What is the goal of 2048?',
        answer: 'The goal is to merge tiles until you create the 2048 tile and continue for a higher score if possible.',
      },
    ],
  },
};

export function absoluteUrl(path = '/') {
  return `${siteUrl}${path.startsWith('/') ? path : `/${path}`}`;
}
