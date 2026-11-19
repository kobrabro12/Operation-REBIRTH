// What HANZ / $@L says in LOST (src/scenes/LostScene.js). One man, two sides:
//   h = HANZ   (his right half, pale grey): tired, sad, smart. Says little, says it quietly.
//   s = $@L    (his left half, blood red, the horn): sneaky, quick to anger, foolish. Loud.
// A line is a list of pieces [who, text]; when the speaker changes mid-line his head swings round to that side, and
// a quick back-and-forth plays as him arguing with himself. Each key holds a few lines - one is picked at random.
// Every line has an id (`<key>_<n>`): Mason's recordings for a line go in public/assets/audio/voice/lost/<id>.ogg and
// are listed in LOST_VOICE (LostScene plays the clip if it's there, else the text just types out).
export const LOST_COLORS = { h: '#dedcd8', s: '#ff4a4a' };

export const LOST_LINES = {
  // the room is dark: someone typed nothing yet
  dark: [[['s', '...']]],
  // the first time, after HANZ was typed
  greet_h: [[['h', '...YOU SAID MY NAME.'], ['h', ' NOBODY SAYS MY NAME.'], ['s', ' OUR NAME!'], ['h', ' NO.']]],
  // the first time, after $@L was typed
  greet_s: [[['s', 'HA! $@L! THAT\'S ME! WELCOME TO THE ONLY REAL SHOP!'], ['h', ' ...HE SPELLS IT WITH A DOLLAR SIGN. I\'M SORRY.']]],
  // coming back
  hello: [
    [['h', 'YOU CAME BACK. THEY USUALLY DON\'T.']],
    [['s', 'WALLET OUT. MEMORIES ON THE COUNTER.'], ['h', ' ...HELLO.']],
    [['s', 'OH, IT\'S YOU.'], ['h', ' IT\'S ALWAYS YOU.']],
    [['h', 'WELCOME BACK TO WHERE THINGS GO.'], ['s', ' AND NEVER COME BACK! UNLESS YOU PAY!']],
  ],
  // looking at something
  look: [
    [['s', 'OOH. GOOD EYE. TERRIBLE TASTE, GOOD EYE.']],
    [['h', 'THAT ONE... I REMEMBER WHO IT BELONGED TO.']],
    [['s', 'IT\'S A STEAL!'], ['h', ' IT IS STOLEN.']],
    [['h', 'SOMEONE LOST THAT ON A TUESDAY.'], ['s', ' WEDNESDAY!'], ['h', ' ...TUESDAY.']],
    [['s', 'DON\'T TOUCH IT UNLESS YOU\'RE BUYING IT.'], ['s', ' TOUCH IT.']],
  ],
  // you bought something
  bought: [
    [['s', 'SOLD! NO REFUNDS! NO MEMORIES BACK!']],
    [['h', 'TAKE CARE OF IT. PLEASE.'], ['s', ' OR DON\'T! WE GOT PAID!']],
    [['s', 'PLEASURE DOING BUSINESS!'], ['h', ' IT WASN\'T.']],
  ],
  // you can't afford it
  broke: [
    [['s', 'NOT ENOUGH MEMORIES?! FORGET SOMETHING ELSE AND COME BACK!']],
    [['h', 'COME BACK WHEN YOU\'VE LIVED A LITTLE MORE.']],
    [['s', 'YOU\'RE WASTING MY TIME!'], ['h', ' WE HAVE NOTHING BUT TIME.'], ['s', ' AND I\'M WASTING IT!']],
  ],
  // you already have it
  owned: [
    [['h', 'YOU ALREADY HAVE IT. YOU ALWAYS HAD IT.']],
    [['s', 'IT\'S YOURS ALREADY, GENIUS.']],
  ],
  // switching something you own on / off
  equip: [[['s', 'THERE. NOW IT\'S EVERYWHERE.']], [['h', 'IT GOES WITH YOU NOW.']]],
  unequip: [[['h', 'PUT AWAY. FOR NOW.']], [['s', 'BORING!']]],
  // clicking on him
  poke: [
    [['s', 'HANDS OFF THE MERCHANDISE!'], ['h', ' WE ARE NOT THE MERCHANDISE.'], ['s', ' EVERYTHING\'S THE MERCHANDISE!']],
    [['h', 'PLEASE DON\'T.']],
    [['s', 'DO THAT AGAIN. I DARE YOU.']],
  ],
  // talking to himself when nothing's happening
  idle: [
    [['h', 'THE CLOCK WAS ON TIME ONCE.']],
    [['s', 'DON\'T LOOK AT THE WINDOW. IT LOOKS BACK.']],
    [['s', 'I\'M THE BRAINS.'], ['h', ' YOU\'RE THE MOUTH.'], ['s', ' SAME THING!']],
    [['h', 'HAVE YOU EVER WOKEN UP SOMEWHERE AND FORGOTTEN THE WAY IN?'], ['s', ' THAT\'S CALLED SHOPPING.']],
    [['s', 'WHO TOOK THE STAIRS?'], ['h', ' THE STAIRS TOOK THEMSELVES.']],
    [['h', '...'], ['s', ' SAY SOMETHING!'], ['h', ' ...'], ['s', ' UGH!']],
  ],
  // after he's checked the time on his clock-heart
  heart: [
    [['h', '...STILL TICKING.']],
    [['s', 'RIGHT ON TIME!'], ['h', ' FOR WHAT?'], ['s', ' ...SHUT UP.']],
    [['h', 'IT\'S LATER THAN IT WAS.']],
    [['s', 'WHO WOUND THIS THING?!'], ['h', ' YOU DID.']],
  ],
  // after he's taken his face off and put it back
  unmask: [
    [['s', 'YOU DIDN\'T SEE ANYTHING.']],
    [['h', '...SORRY. IT ITCHES.']],
    [['s', 'WHAT? EVERYONE\'S GOT ONE.'], ['h', ' NOT EVERYONE.']],
    [['h', 'THERE USED TO BE SOMEONE UNDER THERE.'], ['s', ' THERE STILL IS! ...ISN\'T THERE?']],
  ],
  // leaving
  bye: [
    [['s', 'COME BACK! OR DON\'T! I\'LL KNOW!'], ['h', ' ...MIND THE STAIRS.']],
    [['h', 'GO GENTLY.'], ['s', ' GO QUICKLY!']],
  ],
  // the shelves are still bare (stage 1: his things are still being found)
  empty: [[['h', 'THE SHELVES ARE BARE. EVERYTHING IS STILL... LOST.'], ['s', ' WE\'LL FIND IT! OR STEAL IT!']]],
};

// SECOND OPINION (an extra he sells): after a KO his head pops up at the edge of the screen with one of these
export const SECOND_OPINION = {
  h: ['THEY\'LL BE BACK. THEY ALWAYS COME BACK.', '...THAT LOOKED LIKE IT HURT.', 'ANOTHER ONE FOR THE LOST PILE.', 'I\'LL KEEP A LIGHT ON FOR THEM.', 'NOBODY WINS. SOME JUST LOSE LATER.'],
  s: ['HA! GET LOST!', 'SHOULDA BOUGHT SOMETHING!', 'NO REFUNDS!', 'WHAT A WASTE OF A PERFECTLY GOOD FIGHTER!', 'I BET ON THAT ONE! ...I LOST!'],
};

// Mason's recordings: line id -> true when public/assets/audio/voice/lost/<id>.ogg exists (none yet)
export const LOST_VOICE = {};
