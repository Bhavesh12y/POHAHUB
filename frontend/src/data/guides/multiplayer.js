// Long-form guides for the multiplayer games. Rules here describe how each game
// actually works on Doozles (see backend/src/games/*) - keep them in sync.

export const MULTIPLAYER_GUIDES = {
  ludo: {
    related: ['snake-and-ladder', 'raja-mantri', 'connect-four'],
    intro:
      'Ludo is a dice race for two to four players: get all four of your tokens from the yard, around the board and into home before anyone else.',
    facts: [
      { label: 'Players', value: '2-4 (online, local or vs bots)' },
      { label: 'Game length', value: '15-40 minutes' },
      { label: 'Skills', value: 'Risk management, timing' },
    ],
    body: `
## Where Ludo comes from

Ludo is the modern, simplified descendant of **Pachisi**, a cross-and-circle race game that has been played in India for centuries. Mughal emperor Akbar is said to have played Pachisi on a giant courtyard board at Fatehpur Sikri, using people as the pieces. British players brought a version home in the late 1800s, swapped the cowrie shells for a cubic die and patented it as "Ludo", Latin for "I play".

The rules you learned as a child probably came with a few family tweaks. Doozles uses the most common Indian house rules, listed below so that nobody argues mid-game.

## The board

Each player owns a coloured corner (red, green, yellow or blue) with a **yard** that holds four tokens. A shared track of 52 squares loops around the board. Every colour also has a private **home column** of coloured squares leading to the centre triangle.

Eight squares are **safe**: each colour's starting square plus the four star squares. A token standing on a safe square can never be captured.

## Rules on Doozles

1. **Roll a 6 to leave the yard.** A token can only move onto your starting square with a 6.
2. **A 6 earns another roll.** After moving with a 6 you roll again.
3. **Three 6s in a row forfeits the turn.** The third 6 ends your turn immediately with no move.
4. **Capturing.** Land exactly on a single opponent token outside a safe square and it goes back to its yard. Capturing also gives you an extra roll.
5. **Doubles are protected.** If two tokens of the same colour share a square, neither can be captured.
6. **No blockades.** Tokens can pass over any square, including squares holding two opponent tokens.
7. **Exact roll to finish.** A token has 56 steps from start to home, and you need the exact number to land in the centre. If no move fits, the turn passes.
8. **Home earns a bonus.** Getting a token home gives you another roll.
9. **Winning.** The first player with all four tokens home wins.

If your roll gives no legal move, Doozles skips your turn automatically, so you never get stuck waiting.

## How to play on Doozles

- **Online:** Create a room, share the six-letter code or the QR code, and start once everyone has joined. Each player rolls on their own phone.
- **Local:** Pick two to four players and pass the device around. The board highlights whose turn it is.
- **vs Bot:** Play red against one to three computer players. Bots capture when they can, run for safe squares when they are threatened, and otherwise push their leading token.

## Strategy that wins more games

### Early game: get two tokens out

A single token on the track is an easy target. Use your first few sixes to open **two** tokens so that every later roll gives you a choice. Having options is the biggest advantage in Ludo.

### Count the danger zone

An opponent can only capture you if they land on your square exactly, which means they must be **1-6 squares behind you**. Before moving, look at which of your tokens are inside that range of an opponent and fix the worst one first. Moving to a safe square, or more than six squares away from a chaser, is often better than racing ahead.

### Capture with purpose

Sending a token that has travelled 40 squares back to the yard is enormous. Sending one that left the yard two turns ago barely matters. Prioritise captures by how far the victim has travelled, and remember that a capture also gives you an extra roll.

### Keep a spare six

Late in the game it is tempting to bring a fourth token out with every six. Often it is better to use the six to move a token deep into your home column, where nothing can reach it. A token in your home column is completely safe.

### Endgame maths

When a token needs an exact number to finish, keep other tokens movable so that unhelpful rolls are not wasted. Four tokens waiting on one exact number is the most common way to lose a won game.

## Common mistakes

- Running one token all the way home while the other three sit in the yard.
- Stopping right in front of an opponent's starting square, where freshly released tokens appear.
- Forgetting that two of your tokens on one square protect each other.
`,
    faq: [
      {
        question: 'Do I need a 6 to start in Doozles Ludo?',
        answer: 'Yes. A token can only leave the yard on a roll of 6, and the 6 also gives you another roll.',
      },
      {
        question: 'What happens if I roll three sixes in a row?',
        answer: 'Your turn ends immediately and the third six is not played. This stops one lucky streak from deciding the game.',
      },
      {
        question: 'Can two tokens form a blockade?',
        answer:
          'No. Tokens can pass any square. Two tokens of the same colour on one square cannot be captured, but they do not block movement.',
      },
      {
        question: 'Can I play Ludo on one phone with family?',
        answer: 'Yes. Choose Local mode, pick two to four players and pass the phone on each turn. Nothing needs to be installed.',
      },
      {
        question: 'Is there a Ludo bot to practise against?',
        answer: 'Yes. vs Bot mode lets you play against one to three computer opponents that follow the same rules.',
      },
    ],
  },

  'tic-tac-toe': {
    related: ['connect-four', 'stone-paper-scissor', 'ludo'],
    intro:
      'Tic Tac Toe is the two-player grid duel everyone knows: take turns marking X or O and be first to claim three squares in a row.',
    facts: [
      { label: 'Players', value: '2 (online, local or vs bot)' },
      { label: 'Game length', value: 'Under a minute' },
      { label: 'Skills', value: 'Pattern spotting, forks' },
    ],
    body: `
## A very old game

Three-in-a-row games have been scratched into stone for thousands of years. Boards resembling Tic Tac Toe have been found carved into the roofing tiles of ancient Egyptian and Roman buildings. In Britain it is still called **noughts and crosses**. It was also one of the first games ever played by a computer: *OXO* ran on the EDSAC machine at Cambridge in 1952.

## Rules

1. The board is a 3 x 3 grid. One player is **X**, the other is **O**.
2. Players take turns placing their mark in an empty square.
3. Three of your marks in a row horizontally, vertically or diagonally wins.
4. If all nine squares fill up without a line, the game is a draw.

On Doozles the starting player alternates every rematch, so neither side keeps the first-move advantage.

## How to play on Doozles

- **Online:** Create a room and send the code or QR to a friend. The board updates on both phones instantly.
- **Local:** Two players share one screen. The turn banner shows whose move it is.
- **vs Bot:** Choose easy (makes mistakes), medium (blocks your threats) or hard (plays perfectly and can never be beaten).

## Strategy

### The first move

There are only three kinds of opening squares: **centre**, **corner** and **edge**.

- The **centre** touches four lines, more than any other square, and is the safest start.
- A **corner** touches three lines and sets the most traps against beginners. If your opponent answers anywhere except the centre, you can force a win.
- An **edge** touches only two lines. It is the weakest opening.

### Answering

If your opponent opens in a corner, **take the centre**. Any other reply loses against good play. If they open in the centre, take a corner, never an edge.

### Forks win games

A **fork** is a move that creates two threats at once. Your opponent can block only one, so you win on the next move. The classic fork: take two opposite corners while your opponent holds the centre, then take a third corner.

### Always check for blocks first

Before planning anything clever, look for a line where your opponent has two marks and the third square is empty. Missing a block is how most games are lost.

## Why the hard bot cannot lose

Tic Tac Toe is a **solved game**. There are only 255,168 possible games, so a computer can look at every one of them. The hard bot uses the *minimax* algorithm: it assumes you will play your best move and chooses the reply that gives you the worst possible result. With perfect play from both sides the game is always a draw. If you draw against the hard bot, you played perfectly.

## Practice ideas

- Play the corner opening ten times against the medium bot and look for the fork.
- Try to draw the hard bot while moving second. It is harder than it sounds.
`,
    faq: [
      {
        question: 'Who moves first in Doozles Tic Tac Toe?',
        answer: 'The first player alternates every rematch, so both players get the first move equally often.',
      },
      {
        question: 'Can you beat the hard bot?',
        answer: 'No. The hard bot plays perfectly, so the best possible result against it is a draw.',
      },
      {
        question: 'What is the best first move in Tic Tac Toe?',
        answer:
          'The centre is the safest. A corner sets more traps for an opponent who does not answer in the centre.',
      },
      {
        question: 'Can two people play on one phone?',
        answer: 'Yes. Local mode lets two players share one device and take turns on the same board.',
      },
    ],
  },

  'connect-four': {
    related: ['tic-tac-toe', 'ludo', 'stone-paper-scissor'],
    intro:
      'Connect Four is a two-player strategy game where you drop discs into a seven-column grid and try to line up four in a row before your opponent.',
    facts: [
      { label: 'Players', value: '2 (online, local or vs bot)' },
      { label: 'Game length', value: '3-10 minutes' },
      { label: 'Skills', value: 'Planning ahead, threats' },
    ],
    body: `
## About the game

Connect Four was published by Milton Bradley in 1974, though very similar gravity games existed long before. The board stands upright with **6 rows and 7 columns**, and gravity does half the thinking for you: a disc always falls to the lowest empty slot in its column. In 1988 computer scientists James Allen and Victor Allis independently proved that the first player can always win with perfect play by starting in the middle column.

## Rules

1. Players take turns dropping one disc of their colour into any column that is not full.
2. The disc falls to the lowest free space.
3. Four of your discs in a row horizontally, vertically or diagonally wins.
4. If the board fills with no line of four, the game is a draw.

On Doozles a random player starts the first game, and the starting player alternates in every rematch.

## How to play on Doozles

- **Online:** Create a room, share the code and take turns from your own devices. The last disc played is highlighted.
- **Local:** Two players share one screen.
- **vs Bot:** The bot searches several moves ahead. Easy looks two moves ahead, medium four and hard six, and hard punishes loose play.

## Strategy

### Own the centre column

The middle column is part of more possible lines of four than any other column. Discs in the centre support horizontal and both diagonal lines. Most strong players open in the centre and keep adding to it.

### Think in threats, not lines

A **threat** is a space that would complete four for you. The goal is not to make a line immediately but to build several threats that your opponent cannot all block.

### Odd and even rows

This is the idea that separates good players from great ones. Number the rows 1 (bottom) to 6 (top). As the board fills, the **first player** naturally gets to play into odd rows and the **second player** into even rows. So:

- If you moved first, threats on **odd rows** (1, 3, 5) are the most valuable.
- If you moved second, threats on **even rows** (2, 4, 6) are the ones that eventually come true.

### Do not set up your opponent

Before dropping a disc, look at the space **directly above** where it will land. If that space completes a line for your opponent, your move hands them the win next turn.

### Trap with double threats

Two threats stacked one above the other in the same column are deadly. Your opponent must block the lower one, which lets you play the upper one.

## Common mistakes

- Ignoring diagonals. Most surprise losses come from diagonal lines.
- Filling the edge columns early. Edge discs are part of very few lines.
- Blocking every two-in-a-row instead of building your own threats.
`,
    faq: [
      {
        question: 'How big is the Connect Four board on Doozles?',
        answer: 'It is the standard 6 rows by 7 columns.',
      },
      {
        question: 'Is there a winning strategy for Connect Four?',
        answer:
          'Yes. With perfect play the first player can force a win by starting in the centre column, but it requires very deep calculation.',
      },
      {
        question: 'Who starts the game?',
        answer: 'A random player starts the first game and the starting player alternates in every rematch.',
      },
      {
        question: 'Can I practise Connect Four alone?',
        answer: 'Yes. vs Bot mode has easy, medium and hard opponents that search further ahead at each level.',
      },
    ],
  },

  scribble: {
    related: ['imposter', 'tambola', 'raja-mantri'],
    intro:
      'Scribble is a draw-and-guess party game for up to eight players: one person sketches a secret word while everyone else races to guess it in the chat.',
    facts: [
      { label: 'Players', value: '2-8 in an online room' },
      { label: 'Game length', value: '3 rounds, 60 seconds per drawing' },
      { label: 'Skills', value: 'Quick sketching, lateral thinking' },
    ],
    body: `
## A party classic, in the browser

Draw-and-guess games became famous with *Pictionary* in 1985, but the idea is much older: charades, drawing riddles and blackboard games at school all work the same way. Scribble keeps the fun part, watching someone try to draw "astronaut" in sixty seconds, and handles the timing and scoring automatically.

## How a game works

1. Everyone joins a private room. The host starts the game when at least two players are in.
2. Each turn, one player is the **drawer**. They choose one of **three words** to draw.
3. The drawer has **60 seconds**. Everyone else types guesses in the chat.
4. A correct guess is hidden from the others and scores points. The turn ends early once everyone has guessed.
5. Every player takes a turn as drawer. After **three rounds**, the highest score wins.

## Scoring

- A correct guess is worth **100 points plus a speed bonus of up to 100**, depending on how much time is left.
- The drawer earns a share of each guesser's points, so a clear drawing benefits everyone.
- If the drawer types the word, or a player who already guessed tries to give it away, the message is blocked.

## Hints

Halfway through the timer, one letter of the word is revealed. At three quarters, a second letter appears. The blanks always show the word's length, so count them before guessing.

## Drawing tips

- **Start with the outline.** Big shapes first, details later. Guessers decide quickly.
- **Use context.** For "lighthouse", draw the sea and a beam of light, not just a tower.
- **Arrows and symbols are fair.** An arrow pointing at the important part helps a lot.
- **Split long words.** For "butterfly", a stick of butter plus a fly can work faster than the insect.
- **Use the fill tool** for large areas so you do not waste seconds colouring.

## Guessing tips

- **Guess early and often.** Wrong guesses cost nothing and sometimes jog the drawer into adding a detail.
- **Think in categories.** Animal? Food? Place? Narrow it down before trying exact words.
- **Watch the letter count.** A seven-letter animal with an E in the third position is a short list.

## Hosting a good game

Four to six players is the sweet spot: enough guessers for a race, short enough that everyone draws often. Voice chat in the room makes it much more fun. Stick to the word list, and keep custom rules friendly for younger players.
`,
    faq: [
      {
        question: 'How many people can play Scribble on Doozles?',
        answer: 'A room holds up to eight players. Two is enough to start, and four to six is the most fun.',
      },
      {
        question: 'How long does each drawing turn last?',
        answer: 'Each drawer has 60 seconds. The turn ends early if every guesser gets the word.',
      },
      {
        question: 'How are points calculated?',
        answer:
          'A correct guess scores 100 points plus a speed bonus of up to 100. The drawer earns a share of every correct guess.',
      },
      {
        question: 'Is Scribble a free alternative to skribbl.io?',
        answer:
          'Yes. Scribble on Doozles is free, runs in the browser, and uses private rooms so you only play with people you invite.',
      },
    ],
  },

  'snake-and-ladder': {
    related: ['ludo', 'tambola', 'raja-mantri'],
    intro:
      'Snake and Ladder is a pure dice race to square 100. Ladders shoot you upward, snakes drag you back, and luck can change on every roll.',
    facts: [
      { label: 'Players', value: '2 online, 2-4 local or vs bots' },
      { label: 'Game length', value: '10-20 minutes' },
      { label: 'Skills', value: 'None needed, great for kids' },
    ],
    body: `
## From Gyan Chaupar to every Indian home

Snakes and Ladders began in India as **Gyan Chaupar**, sometimes called *Moksha Patam*, a game of moral teaching. Ladders stood for virtues like generosity and faith, and snakes for vices like anger and greed. Reaching the final square represented liberation. The game reached Victorian England in the 1890s, lost its moral labels, and became the family race game played worldwide today.

## The Doozles board

The board is a classic 10 x 10 grid numbered 1 to 100, snaking left to right and then right to left.

| Ladders (climb) | Snakes (slide) |
| :--- | :--- |
| 1 to 38 | 16 to 6 |
| 4 to 14 | 47 to 26 |
| 9 to 31 | 56 to 53 |
| 21 to 42 | 62 to 19 |
| 28 to 84 | 87 to 24 |
| 36 to 44 | 98 to 78 |
| 51 to 67 | |
| 71 to 91 | |

The ladder from 28 to 84 is the biggest jump on the board, and the snake on 87 is the cruellest drop.

## Rules

1. Everyone starts off the board, on square 0.
2. On your turn, roll one die and move that many squares.
3. Land at the **bottom of a ladder** and climb to its top. Land on a **snake's head** and slide to its tail.
4. You need the **exact roll** to land on 100. If the roll would take you past 100, you stay where you are.
5. Turns pass in order, and rolling a 6 does not give an extra turn on Doozles. That keeps games quick and fair.
6. The first player to reach exactly 100 wins.

## How to play on Doozles

- **Online:** A two-player private room. Each player rolls from their own device.
- **Local:** Two to four players share one device and roll in turn.
- **vs Bot:** Race against one to three bots. With no choices to make, bots are just there to keep you company.

## Is there any strategy?

Honestly, no, and that is the point. Snake and Ladder is completely random, which makes it one of the best games for young children and mixed-age groups. Nobody is better at it than anyone else.

It is still a great way to practise:

- **Counting and number recognition** for children learning numbers up to 100.
- **Probability.** A single die gives each number from 1 to 6 an equal 1-in-6 chance, so a snake six squares ahead is just as likely to hit as one two squares ahead.
- **Losing gracefully.** Sliding from 87 to 24 is a lesson in patience.

## Fun house rules to try locally

- **Sixes roll again**, a common variant at home.
- **Bounce back** from 100: overshoot by two and move back two squares from 100.
- **Snake bites send you to the start**, for players who enjoy chaos.

(These variants are not built into Doozles. Agree on them at the table if you want to try them while playing locally.)
`,
    faq: [
      {
        question: 'Do you need an exact roll to win?',
        answer: 'Yes. On Doozles you must land exactly on square 100. If your roll overshoots, your token stays put.',
      },
      {
        question: 'Does rolling a 6 give an extra turn?',
        answer: 'No. Turns always pass to the next player, which keeps multiplayer games quick.',
      },
      {
        question: 'How many players can play?',
        answer: 'Online rooms are for two players. Local and vs Bot modes support two to four players.',
      },
      {
        question: 'Where did Snakes and Ladders come from?',
        answer:
          'It comes from Gyan Chaupar, an Indian game in which ladders represented virtues and snakes represented vices.',
      },
    ],
  },

  'stone-paper-scissor': {
    related: ['tic-tac-toe', 'air-hockey', 'connect-four'],
    intro:
      'Rock Paper Scissors (Stone Paper Scissor in India) is a quick best-of-five hand game: rock crushes scissors, scissors cut paper, and paper covers rock.',
    facts: [
      { label: 'Players', value: '2 (online, local or vs bot)' },
      { label: 'Game length', value: '1-2 minutes' },
      { label: 'Skills', value: 'Reading patterns, bluffing' },
    ],
    body: `
## A game for settling things

Hand games like this go back at least to China's Han dynasty, where a version called *shoushiling* was played. The modern rock-paper-scissors form became popular in Japan as *jan-ken* before spreading worldwide in the 20th century. People still use it to decide who goes first, who pays, or who gets the last samosa.

## Rules

1. Both players secretly pick **rock**, **paper** or **scissors**.
2. Rock beats scissors, scissors beat paper, paper beats rock.
3. The same pick is a tie for that round.
4. On Doozles a match is **best of five**: the first player to **three** round wins takes the match. If five rounds pass without anyone reaching three, the higher score wins, or it is a draw if scores are level.

Picks stay hidden until both players have chosen, so nobody can wait and react.

## How to play on Doozles

- **Online:** Both players pick on their own phones, and the result is revealed at the same moment.
- **Local:** Pass the phone between turns. The screen hides player one's pick behind a hand-off screen so player two cannot peek.
- **vs Bot:** The bot remembers your recent picks and looks for patterns. Easy is random, medium tracks your favourite hand, and hard predicts your next move from your last two.

## Is it really random?

If both players picked randomly, every pick would win exactly a third of the time. But **humans are bad at being random**, and that is where strategy comes in. Studies of large numbers of real games have found patterns like these:

- **Winners tend to repeat** the hand that just won.
- **Losers tend to switch**, often to the hand that would have beaten what they just lost to.
- **Rock is the most common opening**, especially among beginners.
- People avoid picking the same hand three times in a row, because it "feels" wrong.

## Practical strategy

### Opening

Against a beginner, open with **paper**, since rock is the most common first throw. Against someone who knows that, scissors is the counter-pick.

### After a win

Your opponent probably expects you to repeat. Consider switching to the hand that beats what they would throw to beat your winning hand.

### After a loss

Your opponent may repeat their winning hand. Throw what beats it.

### Mix it up

Any pattern you follow can be read, especially by the hard bot. Once in a while, throw something deliberately "wrong" to break your own habits.

## A note on luck

Even perfect reading only gives a small edge. Over five rounds luck still matters a lot. That is what makes it great for quick decisions and rematches.
`,
    faq: [
      {
        question: 'How many rounds is a match?',
        answer:
          'A match is best of five. The first player to win three rounds wins. If five rounds pass with no one on three, the higher score wins.',
      },
      {
        question: 'Can my opponent see my choice before choosing?',
        answer: 'No. Choices stay hidden until both players have picked, then both are revealed together.',
      },
      {
        question: 'How does the bot decide its move?',
        answer:
          'Easy picks randomly. Medium counters your most frequent hand. Hard predicts your next hand from your last two picks.',
      },
      {
        question: 'Is it Stone Paper Scissor or Rock Paper Scissors?',
        answer: 'Both names describe the same game. Stone Paper Scissor is the common name in India.',
      },
    ],
  },

  tambola: {
    related: ['raja-mantri', 'scribble', 'snake-and-ladder'],
    intro:
      'Tambola, also called Housie or Indian bingo, gives every player a ticket of 15 numbers. The host calls numbers from 1 to 90, and the first to complete each pattern claims the prize.',
    facts: [
      { label: 'Players', value: '2-50 in an online room' },
      { label: 'Game length', value: '20-40 minutes' },
      { label: 'Skills', value: 'Attention, quick claims' },
    ],
    body: `
## The kitty-party favourite

Tambola is the Indian cousin of British **housie** and American **bingo**. It is a fixture at kitty parties, Diwali gatherings, New Year's Eve and long train journeys, and it works with any crowd, from grandparents to toddlers on someone's lap. Doozles takes care of printing tickets and checking claims, so the host can enjoy the game too.

## The ticket

Every ticket has **3 rows and 9 columns**. Each row holds **5 numbers**, for 15 in total. Columns are grouped by tens: the first column holds 1-9, the second 10-19, and so on up to 80-90. Every player gets a different random ticket.

## How a game runs

1. The host creates a room and shares the code. Up to **50 players** can join.
2. Before starting, the host **chooses the prizes** for the game: pick a preset (Classic, Kitty Party, Quick Game or Everything) or search the list and switch individual prizes on and off. Everyone in the lobby sees the chosen prizes.
3. Only the **host** can draw numbers. Each draw picks a random unused number from 1 to 90 and shows it to everyone.
4. Tap numbers on your ticket to mark them as they are called.
5. When your ticket completes a pattern, press its **claim** button. Doozles checks the claim against the numbers actually called.
6. Each prize can be won **once**, by the first valid claim. A wrong claim is simply rejected.
7. A **Prize Tally** shows how many prizes each player has won. The game ends when the last Full House in play is claimed, and the results screen shows the winner of every prize plus the overall champion.

## Prizes and patterns

| Prize | What you need |
| :--- | :--- |
| Early 5 / 7 / 10 | Any 5, 7 or 10 numbers on your ticket called |
| Top, Middle, Bottom Line | All 5 numbers of that row |
| Any Two Lines | Any two complete rows |
| Four Corners | First and last numbers of the top and bottom rows |
| Star | The four corners plus the centre of the middle row |
| King / Queen Corner | Top-left + bottom-right, or top-right + bottom-left |
| Inner Box | 2nd and 4th numbers of the top and bottom rows |
| Pyramid | Centre of the top row, 2nd and 4th of the middle row, 1st, 3rd and 5th of the bottom row |
| Ladoo | The centre number of the middle row |
| Smallest & Largest | The lowest and highest number on your ticket (Temperature) |
| Smallest 3 / Largest 3 | The three lowest or three highest numbers |
| BP High / BP Low | The highest (or lowest) number of each row |
| Devrani / Jethani | Every number from 1-45, or every number from 46-90 |
| All Odd / All Even | Every odd, or every even, number on your ticket |
| Breakfast / Lunch / Dinner | Every number in columns 1-3, 4-6 or 7-9 |
| Full House (1st, 2nd, 3rd) | All 15 numbers. Later Full Houses go to different players, in order |

Prizes that need several tickets per player, such as Early 23 or Nok-Jhok, are not offered because every player gets one ticket.

## Tips for players

- **Claim fast.** The prize goes to the first valid claim, not to whoever completed the pattern first.
- **Watch the small prizes.** Ladoo and the corner prizes need only one or two numbers and are often missed.
- **Know your extremes.** Look up your smallest and largest three numbers at the start so you notice them being called.

## Tips for hosts

- Use voice chat and call numbers out loud with the traditional nicknames: *"Kelly's eye, number one"*, *"Two little ducks, 22"*, *"Top of the house, 90"*.
- Leave a few seconds between draws so slower players can keep up.
- Decide prizes in advance if you are playing for treats. Doozles is for fun only and has no money features.

## Why it never gets old

Tambola has no skill gap, so everyone has an equal chance. The tension builds as the board fills and someone needs just one more number for Full House. It is the perfect group game for any occasion.
`,
    faq: [
      {
        question: 'How many people can play Tambola online on Doozles?',
        answer: 'A Tambola room supports up to 50 players, which is plenty for family events and office parties.',
      },
      {
        question: 'Who calls the numbers?',
        answer: 'The host who created the room draws each number. Doozles picks it at random from the numbers not yet called.',
      },
      {
        question: 'Can the host choose which prizes are played?',
        answer:
          'Yes. In the lobby the host can pick a preset or switch on any of 29 prizes, including Star, Pyramid, BP High, Devrani, Jethani, Breakfast, Lunch, Dinner and up to three Full Houses.',
      },
      {
        question: 'How is the winner decided?',
        answer:
          'Every prize goes to the first valid claim. The Prize Tally counts how many prizes each player wins, and the results screen names the winner of every prize and the overall champion.',
      },
      {
        question: 'What happens if I claim by mistake?',
        answer: 'Doozles checks every claim against the numbers called. An invalid claim is rejected, and the prize stays open.',
      },
      {
        question: 'Is Tambola the same as Housie?',
        answer: 'Yes. Tambola and Housie are two names for the same 90-number game, closely related to bingo.',
      },
    ],
  },

  'air-hockey': {
    related: ['stone-paper-scissor', 'connect-four', 'tic-tac-toe'],
    intro:
      'Air Hockey is a fast one-on-one arcade duel: slide your striker, smash the puck into your opponent\'s goal and defend your own. First to five goals wins.',
    facts: [
      { label: 'Players', value: '2 (online, split screen or vs bot)' },
      { label: 'Game length', value: '2-5 minutes' },
      { label: 'Skills', value: 'Reflexes, angles, positioning' },
    ],
    body: `
## From the arcade to your phone

Air hockey was invented in 1969 by engineers at Brunswick Billiards who were trying to build a frictionless table. A cushion of air from thousands of tiny holes lets the puck glide almost without slowing down. It became an arcade staple in the 1970s. Doozles recreates the table with real-time physics, so rebounds and angles behave as you would expect.

## Rules on Doozles

1. Each player controls a **striker** (mallet) and can move it anywhere in **their own half** of the table.
2. Hit the puck into the opponent's goal at the far end to score.
3. The puck bounces off the side walls and off the end walls on either side of the goal.
4. After each goal, the puck is placed on the side of the player who conceded, and play restarts after a short countdown.
5. The first player to **5 goals** wins.

You always see your own goal at the **bottom of the screen**, even when you are player two.

## How to play on Doozles

- **Online:** Drag your striker with a finger or mouse. Your own hits react instantly on your screen, and the server keeps the score fair.
- **Local split screen:** Put a phone or tablet flat between two players. Each player uses the half nearest to them, and both can touch at the same time. On a laptop, player two can also use the W, A, S and D keys.
- **vs Bot:** Easy is slow and defensive, medium attacks loose pucks, and hard reacts fast and aims for the corners.

## Technique

### Stay home

The most important habit: after every shot, bring your striker back to a spot **just in front of your goal**. Most goals happen while the defender is out of position.

### Hit through the puck

Striker speed transfers to the puck. A quick, short flick through the centre of the puck is far more powerful than a slow push. Aim to move your striker *through* the spot where the puck will be.

### Use the walls

Straight shots are easy to block. A **bank shot** off a side wall arrives from an angle your opponent is not covering. The angle in equals the angle out, so aim at the point on the wall halfway between the puck and the goal.

### Defend the triangle

When defending, imagine a triangle from the puck to the two goal posts. Keep your striker inside that triangle, close to the goal, and move sideways rather than charging forward.

### Control before attacking

If the puck is drifting slowly in your half, you do not have to hit it immediately. Settle it, line up your angle, then strike.

## Common mistakes

- Chasing the puck into the far corners of your half and leaving the goal open.
- Hitting the puck straight back up the middle every time.
- Swinging wildly. Short, controlled movements win more points.
`,
    faq: [
      {
        question: 'How many goals win an Air Hockey match?',
        answer: 'The first player to score five goals wins the match.',
      },
      {
        question: 'Can two people play Air Hockey on one phone?',
        answer:
          'Yes. Local mode splits the table so each player controls the half nearest to them, with multi-touch support.',
      },
      {
        question: 'Why is my goal always at the bottom?',
        answer: 'Doozles flips the view for player two so both players see their own goal at the bottom of the screen.',
      },
      {
        question: 'Is there an Air Hockey bot?',
        answer: 'Yes. vs Bot mode has easy, medium and hard opponents, and it runs entirely on your device with no lag.',
      },
    ],
  },

  'raja-mantri': {
    related: ['imposter', 'ludo', 'tambola'],
    intro:
      'Raja Mantri Chor Sipahi is the four-player chit game from Indian childhoods: secret roles are dealt, the Mantri must find the Chor, and points pile up over five rounds.',
    facts: [
      { label: 'Players', value: '4 per game (bots fill empty seats)' },
      { label: 'Game length', value: '5 rounds, about 5 minutes' },
      { label: 'Skills', value: 'Deduction, poker face' },
    ],
    body: `
## The game of paper chits

Before phones, all Raja Mantri Chor Sipahi needed was four scraps of paper. Each chit had a role written on it and was folded and shuffled. Every player grabbed one, and the whole table watched the Mantri's face as they tried to work out who the thief was. It is still played in classrooms and on long train rides across India. Doozles handles the shuffling and scoring, so nobody can peek at a chit.

## The four roles

| Role | Meaning | Points |
| :--- | :--- | :--- |
| Raja | King | 1000, every round |
| Mantri | Minister | 800 if they catch the Chor, otherwise 0 |
| Sipahi | Soldier | 500, every round |
| Chor | Thief | 0, or 800 if the Mantri guesses wrong |

## How a round works

1. **Reveal.** Roles are shuffled and each player privately sees their own chit.
2. **Raja calls.** The Raja reveals themselves and asks, *"Mera Mantri kaun?"* ("Who is my Minister?").
3. **Mantri steps up.** The Mantri reveals themselves.
4. **The guess.** Two players remain hidden: the Sipahi and the Chor. The Mantri gets **one guess** to name the Chor.
5. **Scoring.** If the Mantri is right, they keep 800 and the Chor gets 0. If wrong, the Chor **steals** the 800 and the Mantri gets nothing. The Raja and Sipahi always score.

After **five rounds**, the player with the highest total wins.

## Playing on Doozles

Create a room and invite up to three friends. If you have fewer than four people, Doozles fills the empty seats with bots named after famous advisers: **Birbal**, **Tenali** and **Chanakya**. Bots play their roles automatically, so even a solo player can enjoy a full game.

## Strategy

### As the Mantri

The guess is a coin flip unless you read people. Watch the two hidden players:

- Who was **too quick** to look relaxed?
- Who reacted when the roles were dealt?
- On voice chat, who went quiet?

Over many rounds, people develop habits. Remember them.

### As the Chor

Your job is to look exactly like the Sipahi. The Sipahi has nothing to hide and is usually relaxed, maybe a little bored. Copy that energy. Do not over-act, joke nervously, or go silent.

### As the Sipahi

You score 500 either way, but you can help or hurt the Chor. Acting slightly suspicious is a fun bluff that can lure the Mantri into a wrong guess. Use it to keep a leading Mantri from running away with the game.

### Score maths

A Mantri who guesses right every time earns 800 per round, but the Raja earns 1000 with no risk. Since roles are random, luck matters, but the Chor-versus-Mantri battle decides most close games.

## Why it works

There is only one real decision per round, so the game is instant to learn. It still produces great moments: the wrong guess, the triumphant Chor, the Raja smug on 5,000 points.
`,
    faq: [
      {
        question: 'Can I play Raja Mantri Chor Sipahi with fewer than four people?',
        answer: 'Yes. Doozles fills any empty seats with bots called Birbal, Tenali and Chanakya, so you can even play alone.',
      },
      {
        question: 'How many rounds are there?',
        answer: 'A game has five rounds, and the highest total score at the end wins.',
      },
      {
        question: 'What happens if the Mantri guesses wrong?',
        answer: 'The Chor steals the Mantri\'s 800 points for that round, and the Mantri scores 0.',
      },
      {
        question: 'How many points does each role get?',
        answer: 'Raja 1000, Sipahi 500, Mantri 800 for a correct guess, and Chor 0, or 800 if the Mantri guesses wrong.',
      },
    ],
  },

  imposter: {
    related: ['raja-mantri', 'scribble', 'tic-tac-toe'],
    intro:
      'Word Imposter is a social deduction party game: everyone gets the same secret word except one player, the imposter. Give one-word clues, discuss, and vote out the faker.',
    facts: [
      { label: 'Players', value: '3-8 (bots fill to three)' },
      { label: 'Game length', value: '5-10 minutes' },
      { label: 'Skills', value: 'Word association, bluffing' },
    ],
    body: `
## A modern party favourite

Word Imposter belongs to the same family as *Mafia*, *Werewolf* and *Spyfall*: games where most players share information and one hidden player does not. It is the perfect game for a group chat or a video call because it is entirely about words.

## How a game works

1. **Word reveal.** Every player sees the secret word except the imposter, who sees only that they are the imposter.
2. **Clue rounds.** There are **two rounds** of clues. In each round, every player gives a **single word** related to the secret word.
3. **Voting.** Everyone votes for the player they think is the imposter.
4. **Result.** If the majority votes for the imposter, the detectives win. If the vote is tied or picks an innocent player, the imposter wins.

### The imposter's escape hatch

At any time, the imposter can try to **guess the secret word**, with up to **three attempts**. A correct guess wins the game instantly for the imposter. Using all three attempts without success hands the win to the detectives.

## Scoring

- **Detectives catch the imposter:** each detective scores 300.
- **Imposter survives the vote:** the imposter scores 400.
- **Imposter guesses the word:** the imposter scores 500.

## Playing on Doozles

Create a room and invite two to seven friends. If fewer than three people join, bots fill the remaining seats so the game always works.

## Strategy for detectives

- **Be specific, but not too specific.** If the word is "mango", "fruit" is too vague and lets the imposter blend in, while "Alphonso" gives the word away. "Summer" or "pickle" is just right.
- **Watch the first round.** The imposter has no information yet, so their first clue is often generic, like "nice" or "big".
- **Listen for echoes.** A careful imposter repeats ideas from earlier clues. Notice who is building on others rather than contributing something new.

## Strategy for the imposter

- **Speak late if you can.** The more clues you hear first, the better your guess about the word.
- **Choose flexible clues.** Words like "sweet", "home" or "red" fit many possible words.
- **Gather information, then guess.** If the clues clearly point to one word, a guess can win outright and is worth more than surviving the vote.
- **Do not panic in discussion.** Calmly defending a reasonable clue is more convincing than accusing someone else.

## Why it is so replayable

Every word creates a new puzzle, and the imposter role rotates. The best moments come when two detectives give clues so clever that half the table suspects them instead.
`,
    faq: [
      {
        question: 'How many players do I need for Word Imposter?',
        answer: 'At least three. Doozles fills missing seats with bots, and a room holds up to eight players.',
      },
      {
        question: 'How many clue rounds are there?',
        answer: 'There are two rounds of one-word clues before the group votes.',
      },
      {
        question: 'Can the imposter win without surviving the vote?',
        answer: 'Yes. The imposter can guess the secret word, with up to three attempts. A correct guess wins instantly.',
      },
      {
        question: 'How are points scored?',
        answer:
          'Detectives score 300 each for catching the imposter. The imposter scores 400 for surviving the vote, or 500 for guessing the word.',
      },
    ],
  },
};
