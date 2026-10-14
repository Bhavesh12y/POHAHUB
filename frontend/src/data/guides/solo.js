// Long-form guides for the single-player arcade games.

export const SOLO_GUIDES = {
  '2048': {
    related: ['block-blaster', 'helix-jump', 'tic-tac-toe'],
    intro:
      '2048 is a sliding-tile puzzle on a 4 x 4 grid. Swipe to move every tile at once, merge matching numbers and try to build the 2048 tile.',
    facts: [
      { label: 'Players', value: '1' },
      { label: 'Controls', value: 'Swipe, arrow keys or W A S D' },
      { label: 'Skills', value: 'Planning, pattern discipline' },
    ],
    body: `
## A weekend project that went viral

2048 was created in March 2014 by Gabriele Cirulli, a 19-year-old developer in Italy, as a weekend experiment inspired by the games *1024* and *Threes!*. He released it free and open source, and within weeks millions of people were swiping tiles on their phones. Its appeal is simple: one rule, endless decisions.

## Rules

1. The board is a 4 x 4 grid that starts with two tiles.
2. Swipe up, down, left or right. **Every tile slides** as far as it can in that direction.
3. Two tiles with the **same number** that collide merge into one tile worth their sum: 2 + 2 = 4, 4 + 4 = 8, and so on.
4. After every move, a new **2** (or occasionally a **4**) appears in a random empty cell.
5. Your score increases by the value of every merged tile.
6. The game ends when the board is full and no merge is possible.

Reaching 2048 is the classic goal, but you can keep going for 4096 and beyond.

## Controls on Doozles

- **Phone:** swipe anywhere on the board.
- **Keyboard:** arrow keys or W, A, S, D.
- Your best score is saved on this device, and the global top three is shown below the game.

## The corner strategy

Almost every strong player uses the same core idea: **keep your biggest tile in one corner and never move it out**.

1. Pick a corner, for example bottom-left.
2. Mostly use only **two directions** that keep tiles packed towards that corner (down and left).
3. Use the third direction (right) only when you have to, and **avoid the fourth** (up) unless nothing else is possible.

### Build a snake

Arrange tiles along the bottom row in decreasing order away from the corner, for example 512, 256, 128, 64. Then continue on the row above in the opposite direction. When the chain lines up, one swipe can cascade several merges in a row.

### Keep the bottom row full

If the row holding your big tile has a gap, a new 2 can spawn in it and knock your corner tile out of position. Fill that row before making other moves.

## Thinking a move ahead

Before each swipe, ask:

- Which tiles will merge?
- Where could the new tile spawn, and would that hurt?
- Does this move force me to use my forbidden direction next turn?

## Common mistakes

- Swiping randomly when stuck. Pause and look for the move that keeps the corner safe.
- Chasing small merges in the middle of the board instead of feeding the snake.
- Letting a small tile get trapped in the corner row behind big tiles.

## Why it is good for your brain

2048 trains short-term planning and spatial reasoning. You constantly simulate a move before making it. It is calm enough to play on a commute and deep enough that improving takes real practice.
`,
    faq: [
      {
        question: 'What happens after I reach 2048?',
        answer: 'You can keep playing and chase 4096, 8192 and a higher score.',
      },
      {
        question: 'What is the best strategy for 2048?',
        answer:
          'Keep your largest tile locked in one corner, use mostly two directions, and build a descending chain of tiles along the edge.',
      },
      {
        question: 'Can I play 2048 with a keyboard?',
        answer: 'Yes. Use the arrow keys or W, A, S and D. On phones, swipe on the board.',
      },
      {
        question: 'Is my high score saved?',
        answer: 'Your best score is saved on your device, and the global top three is shown below the game.',
      },
    ],
  },

  'block-blaster': {
    related: ['2048', 'helix-jump', 'traffic-run'],
    intro:
      'Block Blaster is a calm but clever puzzle: place blocks of different shapes on an 8 x 8 grid and clear full rows and columns. Chain clears for combo multipliers.',
    facts: [
      { label: 'Players', value: '1' },
      { label: 'Controls', value: 'Drag and drop' },
      { label: 'Skills', value: 'Spatial planning' },
    ],
    body: `
## Tetris without the falling

Block Blaster belongs to the block puzzle family that grew out of *Tetris* (1984) but removes the time pressure. Nothing falls. You choose where every piece goes, so the challenge is planning space, not reacting quickly. Games like *1010!* and *Block Blast* made the style huge on phones.

## Rules

1. The board is an **8 x 8** grid.
2. You are given a set of block shapes: lines, squares, L-shapes, T-shapes and single cells.
3. Drag each shape onto the board. Pieces cannot be rotated and cannot overlap other blocks.
4. Completely fill any **row or column** and it clears, giving you points and freeing space.
5. Clearing lines on consecutive placements builds a **combo multiplier**: 2x, 3x and up. Placing a piece without a clear resets the combo.
6. The game ends when none of your remaining pieces fits anywhere on the board.

## Controls on Doozles

Drag a piece from the tray and drop it on the grid. A preview shows where it will land. Your personal best is saved, and the global top three appears below the game.

## Strategy

### Keep big spaces open

The most dangerous pieces are the **3 x 3 square** and the long **1 x 5 line**. Always ask, "if I get the big square next, can I place it?" Keep at least one 3 x 3 area clear whenever possible.

### Fill edges and corners first

Pieces placed in the middle split the board into awkward pockets. Building from the edges inward keeps open space connected.

### Look at all your pieces before placing

You often get several pieces at once. Place them in the order that keeps the most options open. Sometimes the small piece should go first to complete a line that makes room for the big one.

### Set up double clears

Placing one piece that completes a row and a column at the same time scores far more than two separate clears, and it keeps your combo alive.

### Avoid lonely holes

A single empty cell surrounded by blocks can only be filled by a 1 x 1 piece. Every lonely hole makes the board harder.

## When you are in trouble

If the board is crowded, focus purely on survival. Clear any line you can, even without a combo. Space matters more than points when you are nearly out of moves.
`,
    faq: [
      {
        question: 'How big is the Block Blaster grid?',
        answer: 'The board is an 8 x 8 grid.',
      },
      {
        question: 'Can I rotate the pieces?',
        answer: 'No. Pieces are placed as given, which is why planning space is the key skill.',
      },
      {
        question: 'How do combos work?',
        answer:
          'Clearing lines on consecutive placements raises a combo multiplier. A placement with no clear resets it to 1x.',
      },
      {
        question: 'When does the game end?',
        answer: 'When none of your available pieces can fit anywhere on the board.',
      },
    ],
  },

  dino: {
    related: ['flappy-bird', 'traffic-run', 'helix-jump'],
    intro:
      'Dino Run is an endless runner inspired by the famous offline dinosaur game: jump over cacti, keep running and beat your best distance as the speed climbs.',
    facts: [
      { label: 'Players', value: '1' },
      { label: 'Controls', value: 'Tap, Space, W or Up arrow' },
      { label: 'Skills', value: 'Timing, rhythm' },
    ],
    body: `
## The game that made losing internet fun

In 2014 Google added a tiny pixel T-Rex to Chrome's "no internet" page. Press space and it starts running across the desert, jumping cacti. It became one of the most-played games in the world simply because everyone loses Wi-Fi sometimes. Dino Run on Doozles keeps that one-button idea and draws it in our notebook style.

## How it works

1. The dinosaur runs automatically from left to right.
2. **Tap the screen**, press **Space**, **W** or the **Up arrow** to jump.
3. Clear the obstacles. Touching one ends the run.
4. The game **speeds up** the longer you survive, so jumps that felt easy at the start get tight later.
5. Your score grows with distance. Your best is saved, and the global top three is shown on the page.

## Tips for longer runs

### Jump late, not early

Beginners jump as soon as they see an obstacle. That often lands them right on top of it. Wait until the obstacle is close, about a dinosaur's length away, then jump. As the game speeds up, the right moment comes slightly earlier.

### Find the rhythm

Obstacles come in patterns. Instead of reacting to each one separately, listen to the rhythm of your taps. Many good runs feel like tapping along to music.

### Watch groups of cacti

A cluster of cacti needs a jump that starts a little earlier so you clear the whole group.

### Use the big button on mobile

On phones, the large jump button below the game is easier to hit than tapping the game area, especially in a moving vehicle.

## Why endless runners are addictive

Every run is short, the controls are instant, and you can always see how close you came to your record. That "one more go" loop is the heart of arcade design.
`,
    faq: [
      {
        question: 'How do I jump in Dino Run?',
        answer: 'Tap the game or the jump button on mobile. On a keyboard, press Space, W or the Up arrow.',
      },
      {
        question: 'Does the game get faster?',
        answer: 'Yes. The speed increases the longer you survive.',
      },
      {
        question: 'Is this the Chrome dinosaur game?',
        answer:
          'It is inspired by the Chrome offline game and plays the same way, redrawn in the Doozles notebook style with a global leaderboard.',
      },
    ],
  },

  'flappy-bird': {
    related: ['dino', 'helix-jump', 'traffic-run'],
    intro:
      'Flappy Bird is the famously tricky one-tap game: each tap gives your bird a small flap, and you have to steer it through gaps between pipes without touching anything.',
    facts: [
      { label: 'Players', value: '1' },
      { label: 'Controls', value: 'Tap or Space' },
      { label: 'Skills', value: 'Fine timing, patience' },
    ],
    body: `
## A tiny game with a huge story

The original Flappy Bird was made by Vietnamese developer Dong Nguyen and released in 2013. Early in 2014 it suddenly became the most downloaded free game in the world, then its creator removed it from app stores, saying it had become too addictive. Flappy-style games have been a genre of their own ever since.

## Rules

1. Your bird falls constantly because of gravity.
2. **Tap** (or press **Space**) to flap upward a little.
3. Pipes scroll in from the right with a gap between the top and bottom pipe.
4. Fly through the gap to score one point.
5. Touching a pipe, the ground or the top of the screen ends the run.

## Controls on Doozles

Tap the game area or press Space to start and to flap. Your best score is saved on your device, and the global top three is shown below the game.

## How to get better

### Small taps, often

Each tap is a short hop, not a big jump. Most crashes come from tapping twice in panic and shooting into the top pipe. Aim for calm, even taps.

### Aim for the middle

As soon as a new pipe appears, look at its gap and steer towards the **centre** of it. The centre gives you the most room for error.

### Learn the fall

Watch how far the bird drops between taps. Once you have a feel for it, you can predict exactly when the next tap is needed. Think of it as a heartbeat rhythm.

### Use the bottom of the gap

After passing a pipe, the next gap may be higher or lower. It is easier to tap upward quickly than to fall quickly, so drifting to the lower part of a gap often sets you up better for the next one.

### Breathe

Flappy Bird is as much about staying calm as about reflexes. When you pass your old best, players often tense up and crash. Keep the same rhythm.

## Why it is so hard

The bird never stops falling, every pipe is a new decision and one mistake ends everything. That is why a score of 20 feels like an achievement and a score of 100 feels heroic.
`,
    faq: [
      {
        question: 'How do I control the bird?',
        answer: 'Tap the game area or press Space. Each tap gives a small upward flap.',
      },
      {
        question: 'Why is Flappy Bird so hard?',
        answer:
          'The bird falls constantly, every gap needs precise timing, and a single touch ends the run. Calm, regular taps work best.',
      },
      {
        question: 'Is my best score saved?',
        answer: 'Yes. It is saved on your device, and the global top three appears on the game page.',
      },
    ],
  },

  'helix-jump': {
    related: ['flappy-bird', 'dino', 'block-blaster'],
    intro:
      'Helix Jump is a 3D arcade drop: spin the tower so the bouncing ball falls through the gaps, avoid the red danger zones and smash through floors with combos.',
    facts: [
      { label: 'Players', value: '1' },
      { label: 'Controls', value: 'Drag left and right to spin' },
      { label: 'Skills', value: 'Timing, quick decisions' },
    ],
    body: `
## The one-finger 3D hit

Helix Jump became one of the biggest mobile games of 2018 because you can play it with one finger. The Doozles version is built in real 3D with three.js and styled to look hand-inked, like the rest of our notebook arcade.

## How it works

1. A ball keeps bouncing on the platform below it. You do not control the ball, you control the **tower**.
2. **Drag left or right** to spin the tower so that a **gap** is under the ball.
3. When the ball falls through a gap, you pass that floor and score points.
4. **Red segments are deadly.** If the ball lands on red, the run is over.
5. Falling through **three or more floors in a row** without bouncing powers up the ball. The next floor it hits is **smashed**, even if the ball lands on red.

### Scoring

Each floor you pass scores more than the last one in the same fall, so dropping through several floors in one go is worth much more than one floor at a time. Smashing a floor adds a bonus.

## Controls on Doozles

Press and drag anywhere on the game. The tower keeps a little momentum after you let go, like a real spinning toy. Your best score is saved, and the global top three is shown below.

## Strategy

### Spin early

The ball needs time to fall. Start rotating as soon as it bounces so the gap is in place before it comes down again.

### Small adjustments

Big, fast swipes overshoot and can swing red right under the ball. Short, controlled drags are safer.

### Chase the smash

When you are two floors into a drop, look for the next gap straight away. A third floor in a row powers up the ball and gives you a free smash through whatever comes next, a great way past a floor that is mostly red.

### Watch the next floor, not this one

Once the ball is falling through a gap, the current floor no longer matters. Experienced players are already lining up the floor below.

## Difficulty

Every new floor is generated a little harder: gaps shrink, more red segments appear and later floors can have two gaps. The early floors are a warm-up.
`,
    faq: [
      {
        question: 'How do I play Helix Jump?',
        answer: 'Drag left or right to spin the tower so the bouncing ball drops through the gaps. Avoid red segments.',
      },
      {
        question: 'What is a smash in Helix Jump?',
        answer:
          'Falling through three or more floors in a row powers up the ball, and the next floor it touches is smashed, even if it is red.',
      },
      {
        question: 'Is Helix Jump on Doozles really 3D?',
        answer: 'Yes. It is rendered in WebGL with three.js, with a hand-drawn outline style to match the rest of the site.',
      },
    ],
  },

  'traffic-run': {
    related: ['dino', 'flappy-bird', 'helix-jump'],
    intro:
      'Traffic Run is a three-lane highway dodger: switch lanes to avoid oncoming cars while the speed keeps climbing. How far can you drive?',
    facts: [
      { label: 'Players', value: '1' },
      { label: 'Controls', value: 'Swipe, tap a lane or arrow keys' },
      { label: 'Skills', value: 'Reaction speed, reading ahead' },
    ],
    body: `
## Arcade driving, simplified

Lane-dodging games go back to classic arcade racers like *Spy Hunter* and the endless highway games on early mobile phones. Traffic Run strips the idea down: three lanes, oncoming traffic and a car that keeps getting faster.

## How it works

1. Your car drives forward automatically in one of **three lanes**.
2. Other vehicles appear ahead. Move into a free lane to avoid them.
3. Your score climbs with every car you pass and the distance you cover.
4. The speed increases as you go, and traffic gets denser.
5. Any collision ends the run.

## Controls on Doozles

- **Swipe** left or right to change lanes.
- **Tap** directly on a lane to jump straight to it, which is the fastest option at high speed.
- **Keyboard:** use the left and right arrow keys (or A and D).

Your best score is saved on this device, and the global top three is shown below the game.

## Strategy

### Read two cars ahead

Do not just react to the car in front of you. Look further up the road and plan where you will need to be after the next obstacle.

### The middle lane is your home

From the centre lane you can escape in either direction with one move. From an outside lane, you only have one escape. Return to the middle when the road is clear.

### Use tap-to-lane at speed

At high speeds, two swipes to cross from one side to the other can be too slow. Tapping the target lane moves you there immediately.

### Do not over-steer

Changing lanes when you do not need to is how many runs end. If your lane is clear, stay in it.

## Why it is satisfying

The difficulty ramps smoothly, so every run starts relaxed and ends in a frantic weave through traffic. Each attempt takes only a minute, which makes it perfect for a quick break.
`,
    faq: [
      {
        question: 'How do I change lanes in Traffic Run?',
        answer: 'Swipe left or right, tap directly on a lane, or use the arrow keys on a keyboard.',
      },
      {
        question: 'Does Traffic Run get harder?',
        answer: 'Yes. The speed and the amount of traffic increase the longer you survive.',
      },
      {
        question: 'Is Traffic Run free?',
        answer: 'Yes. It runs free in your browser on phones, tablets and computers.',
      },
    ],
  },
};
