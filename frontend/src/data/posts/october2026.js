const TEAM = {
  name: 'Doozles Team',
  role: 'The people who build and play Doozles',
};

export const OCTOBER_2026_POSTS = [
  {
    slug: 'how-we-fixed-air-hockey-lag',
    title: 'Why Our Air Hockey Felt Laggy, and How We Rebuilt It',
    excerpt:
      'A behind-the-scenes look at networked physics: why the puck seemed to pass through your striker, and the changes that made every hit feel instant.',
    category: 'Engineering & Tech',
    author: TEAM,
    publishedAt: 'October 14, 2026',
    date: '2026-10-14',
    readTime: '8 min read',
    content: `
Air Hockey was one of the first real-time games we added to Doozles, and for a while it was also the one we got the most complaints about. Players described it in different ways, such as "laggy", "the puck goes through me" or "it stutters", but they were all describing the same few problems. This post explains what was going wrong and what we changed. If you have ever wondered why online action games are so much harder to build than turn-based ones, this is a good example.

## How the first version worked

The original design was the textbook one for keeping a game fair: **the server is the boss**.

1. Your phone sends the position of your finger to our server.
2. The server runs the physics: it moves the puck, checks collisions with both strikers and the walls, and detects goals.
3. Sixty times a second, it sends the full game state back to both players.
4. Each phone draws what the server says.

This is fair, because nobody can cheat by editing their own puck. It is also great for turn-based games like Ludo or Connect Four, where a delay of a tenth of a second is invisible. For a fast physics game it has one big weakness: **every hit has to travel to the server and back before you see it**.

## Problem 1: the round trip

Imagine the puck coming at your striker. You flick your finger and your striker moves instantly, because we draw your own striker locally. But the puck only reacts once the server has received your new position, run the collision and sent back the result. If that round trip takes 150 milliseconds, the puck visibly slides *into* your striker, keeps going for a few frames and then suddenly flies off. Your brain reads that as "lag", or "the puck went through me".

Distance makes it worse. A server on another continent can easily add 200 milliseconds or more.

## Problem 2: bunched-up updates

We sent sixty updates a second, but the internet does not deliver packets at perfectly even intervals. Some arrive early, some late, some in pairs. Our drawing code animated the puck from the previous update to the latest one and then **stopped**. Whenever an update was late, the puck froze for a moment, then jumped. That is the stutter people saw.

## Problem 3: too much data

Sixty full-state messages a second to every player is a lot, especially on mobile data. When the connection could not keep up, messages queued behind each other, so players saw the game further and further in the past until the queue drained.

## Problem 4: inconsistent hits

The server calculated how fast your striker was moving from how far it jumped between two network messages. Because messages arrive unevenly, the same swipe could be measured as very slow or extremely fast. Sometimes a fast swipe moved the striker straight *past* the puck between two physics steps, and no collision happened at all.

## What we changed

### One physics engine, shared everywhere

We moved the table physics into a single module that runs identically on the server and in your browser. It uses a fixed time step and moves strikers smoothly across each step, which we call a *swept* collision, so a fast flick can no longer skip over the puck. We also removed a couple of old hacks that forced the puck in a particular direction after certain hits, which made some rebounds feel unnatural.

### The player closest to the puck runs it

The biggest change is who simulates the puck. Now, **whichever player has the puck on their half of the table runs the physics for it on their own device**. Your hits react on the very next frame, with no round trip. When the puck crosses the centre line, control passes to the other player.

The server still keeps score and checks every update: the puck cannot move impossibly fast or teleport, and goals are decided on the server. We kept fairness while removing the delay from the moment that matters most, your hit.

### Fewer, smarter updates

The server now sends a compact update thirty times a second instead of a full state sixty times a second. Updates are marked as *volatile*, so if your connection hiccups, stale messages are dropped instead of piling up.

### A small buffer for smoothness

Your opponent's striker, and the puck while it is on their side, are drawn about a tenth of a second in the past using a small buffer of recent updates. That sounds strange, but it means we always have two real positions to animate between, so movement stays smooth even when packets arrive unevenly. You never notice the delay, because it only applies to things you are not touching.

### Cheaper drawing

We now draw the static table once and reuse it, and we draw the canvas at your screen's real pixel density, so it looks sharp on phones without extra work every frame.

## Two new ways to play with no network at all

Because the physics now runs in the browser, we could add two modes that do not need a server:

- **Local split screen**: put a phone or tablet flat between two people and play face to face, each using their own half of the screen.
- **vs Bot**: a computer opponent with easy, medium and hard levels.

Both have zero lag by definition, which makes them a great way to learn the angles before challenging a friend online.

## What we learned

Turn-based games forgive a lot. Real-time games do not, and "make the server authoritative" is only half the answer. The other half is deciding which moments must feel instant, and designing the networking around them. If you find a rebound that still feels wrong, tell us at support@doozles.xyz. We read every message.
`,
  },
  {
    slug: 'how-doozles-bots-think',
    title: 'How Our Bots Think: Minimax, Pattern Spotting and Fair Opponents',
    excerpt:
      'Why the hard Tic Tac Toe bot can never lose, how the Connect Four bot looks ahead, and why the Rock Paper Scissors bot watches your habits.',
    category: 'Game Strategy',
    author: TEAM,
    publishedAt: 'October 14, 2026',
    date: '2026-10-14',
    readTime: '7 min read',
    content: `
Every board game on Doozles now has a **vs Bot** mode. Building a bot that is fun is a different problem from building a bot that is strong. A perfect opponent is boring for most people, and a random one is pointless. Here is how each of our bots works, and how the difficulty levels change it.

## Tic Tac Toe: the game a computer can solve completely

Tic Tac Toe has fewer than 6,000 distinct positions, so a computer can look at **every possible future** of the game from any position. Our hard bot uses an algorithm called **minimax**:

1. For each empty square, imagine playing there.
2. Then imagine the opponent playing their *best* reply, then the bot's best reply to that, and so on until the game ends.
3. Score each ending: a win is good, a loss is bad and a draw is neutral.
4. Pick the move whose worst case is the best.

Because it explores everything, the hard bot never loses. The best you can do is draw. The medium bot wins when it can and blocks your immediate threats, but does not plan forks. The easy bot plays a random square most of the time, which leaves plenty of chances to practise your own forks.

## Connect Four: looking ahead without looking at everything

Connect Four has around 4.5 trillion positions, far too many to search completely in a browser. So the Connect Four bot uses minimax with two upgrades:

- **A depth limit.** Easy looks 2 moves ahead, medium 4 and hard 6. When it reaches the limit, it estimates how good the position is instead of playing it out.
- **Alpha-beta pruning.** If one line of play is already clearly worse than an option found earlier, the bot stops exploring it. This lets it search much deeper in the same time.

The position estimate rewards discs in the centre column and open lines of two and three, and penalises the same patterns for the opponent. That is why the bot loves the middle column, just like strong human players.

## Ludo: simple rules of thumb

Ludo involves dice, so you cannot plan a fixed sequence of moves. Instead, the Ludo bot scores every legal move with a few priorities that good players also use:

1. Finish a token if possible.
2. Capture an opponent, especially one that has travelled far.
3. Move a threatened token to safety.
4. Release a new token on a six.
5. Otherwise, advance the token that is furthest ahead without stepping into danger.

It is not unbeatable, and it should not be. Ludo is meant to be a lively family game.

## Rock Paper Scissors: reading your habits

In theory Rock Paper Scissors cannot be won reliably: a purely random player wins exactly a third of the time. But people are not random, and our bot uses that:

- **Easy** really is random.
- **Medium** counts which hand you throw most often and plays what beats it.
- **Hard** remembers what you threw after each pair of your previous throws. If you tend to play scissors after rock-then-paper, it notices and counters.

If you feel the hard bot is reading your mind, it is reading your habits. Mixing up your choices on purpose is the only defence.

## Air Hockey: a bot with hands

The Air Hockey bot works differently because it has to move a physical striker:

- When the puck is far away or heading to the other side, it returns to a defensive spot in front of its goal.
- When the puck is slow and on its side, it moves behind the puck and strikes towards your goal.
- Difficulty controls **how fast** the striker can move and **how quickly** it reacts. The hard bot is not smarter so much as quicker.

## Fair, not frustrating

None of our bots peek at hidden information or bend the rules. The dice are the same dice and the physics are the same physics. If a bot wins, it won fairly. Pick the level that gives you close games. That is where you improve the fastest.
`,
  },
  {
    slug: 'best-pass-and-play-games-one-phone',
    title: 'The Best Games to Play on One Phone: A Guide to Pass-and-Play',
    excerpt:
      'No Wi-Fi, one phone and a group of friends? Here is how local play works on Doozles and which games suit each situation, from long car rides to family dinners.',
    category: 'Party Games',
    author: TEAM,
    publishedAt: 'October 14, 2026',
    date: '2026-10-14',
    readTime: '6 min read',
    content: `
Not every game night has a phone for everyone. Sometimes you are on a train with patchy signal, sometimes a younger cousin does not have a device, and sometimes it is just more fun to crowd around one screen. That is why Doozles has a **Local** mode: everybody plays on the same device, either by passing it around or by sharing the screen.

## How local play works

Pick **Multiplayer**, then **Local**, on the Doozles home page and choose a game. You will be asked how many players there are and their names. After that:

- **Turn-based games** show a clear banner with whose turn it is. Make your move and hand the device to the next person.
- **Games with secret choices**, like Rock Paper Scissors, show a "pass the device" screen between turns, so the next player cannot see what the last player picked.
- **Air Hockey** splits the screen. Lay the phone or tablet flat between two players and each person uses their own half. Both can touch at the same time.

Once a local game has loaded, it does not need the internet. Everything runs on the device.

## Which game for which moment?

### Quick breaks (under five minutes)

- **Tic Tac Toe**: perfect for two people waiting for food. Switch who goes first every game.
- **Rock Paper Scissors**: best of five, done in a minute, great for settling who picks the movie.
- **Air Hockey**: two players, a tablet on the table, and a surprising amount of shouting.

### Longer sessions (15 minutes or more)

- **Ludo**: two to four players, the classic. Passing one phone around actually makes it more social, because everyone watches every move.
- **Snake and Ladder**: ideal for younger children, since nobody needs strategy and anyone can win.

### Thinking games

- **Connect Four**: deeper than it looks. Read our [Connect Four guide](/connect-four) for the odd-even row trick that wins more games.

## Tips for a smooth game

- **Pick a "table phone".** Use the device with the biggest screen and the most battery, and put it in the middle so everyone can see.
- **Turn up the brightness** and lock the rotation, so the board does not flip when the phone is passed around.
- **Agree on house rules first.** Want sixes to give an extra turn in Snake and Ladder? Decide before the first roll.
- **Rotate who starts.** Doozles alternates the first player in two-player games, but in bigger groups let the youngest go first.

## Local, online or bot?

- Use **Local** when everyone is in the same room and you want the social feel of a board game.
- Use **Online rooms** when friends are in different places, or when each person wants their own screen.
- Use **vs Bot** to practise alone.

All three use the same rules, so a strategy you learn against the bot works just as well against your family.
`,
  },
  {
    slug: 'host-online-tambola-night',
    title: 'How to Host an Online Tambola Night for Family and Friends',
    excerpt:
      'A step-by-step plan for a fun Tambola evening on a video call: setting up the room, choosing prizes, calling numbers with style and keeping everyone involved.',
    category: 'Game History & Culture',
    author: TEAM,
    publishedAt: 'October 14, 2026',
    date: '2026-10-14',
    readTime: '6 min read',
    content: `
Tambola, also called Housie, has been the centrepiece of Indian family gatherings for generations: kitty parties, Diwali evenings, New Year's Eve and long weddings. When family is spread across cities and countries, an online Tambola night keeps the tradition alive. Here is a practical plan for hosting one on Doozles.

## Before the game

### 1. Pick a time that works across time zones

If relatives are abroad, an evening in India is often morning in North America and afternoon in Europe. Weekends work best. Plan for about 45 minutes, including chatting time.

### 2. Set up a video call

Doozles has built-in voice chat in rooms, but for big family groups a video call on another device lets everyone see each other's reactions when someone shouts "Full House!".

### 3. Decide the prizes

On Doozles each prize can be won once, by the first valid claim. A typical family set:

- **Early Five**: the first player to have any five numbers called.
- **Top, Middle and Bottom Line**: a full row of five numbers.
- **Four Corners**: the first and last numbers of the top and bottom rows.
- **Full House**: all fifteen numbers, which ends the game.

For a longer game, add **Ladoo** (the middle number of the middle row), **King Corner**, **Queen Corner**, **Smallest Three** and **Largest Three**. The [Tambola guide](/tambola) explains every pattern.

Doozles is for fun only and has no payment features. If your family plays for small treats, agree on them separately. Chocolates and bragging rights work well.

## Starting the room

1. Open [Tambola](/tambola) and press **Play Online**.
2. Enter your name and **Create Room**.
3. Share the six-letter room code or the QR code in your family group chat.
4. Wait for everyone to join. Up to 50 players can fit in one room, and each gets their own random ticket.
5. Press **Start** when everyone is in.

## Calling numbers like a pro

Only the host can draw numbers, so you are the star of the show. A few tips:

- **Use the traditional calls.** "Kelly's eye, number one." "Two little ducks, twenty-two." "Top of the house, ninety." Older relatives love them, and kids pick them up quickly.
- **Pace yourself.** Wait a few seconds between numbers so slower players can find them. Speed up once the first lines are claimed.
- **Announce the claims.** When Doozles confirms a winner, say it out loud on the call and give them a moment of glory.

## Keeping everyone involved

- **Help the youngest and oldest players.** Sit a child next to a grandparent so they can mark tickets together.
- **Play two or three short games** rather than one very long one. Fresh tickets keep the excitement up.
- **Rotate the host.** Let someone else draw the numbers in the second game.

## After the game

Take a screenshot of the winners and post it in the family group. Next time, try [Raja Mantri Chor Sipahi](/raja-mantri) or [Ludo](/ludo) for a change of pace. Both work well on a call.

Tambola is not about skill. It is about everyone leaning towards their screens together waiting for one last number. That feeling travels perfectly well over the internet.
`,
  },
];
