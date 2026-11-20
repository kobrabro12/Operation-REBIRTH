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
    [['s', '"LET\'S PUT A SMILE ON THAT FACE!"']],
  ],
  // you can't afford it
  broke: [
    [['s', 'NOT ENOUGH MEMORIES?! FORGET SOMETHING ELSE AND COME BACK!']],
    [['h', 'COME BACK WHEN YOU\'VE LIVED A LITTLE MORE.']],
    [['s', 'YOU\'RE WASTING MY TIME!'], ['h', ' WE HAVE NOTHING BUT TIME.'], ['s', ' AND I\'M WASTING IT!']],
    [['s', '"IF YOU\'RE GOOD AT SOMETHING, NEVER DO IT FOR FREE."'], ['h', ' ...HE\'S RIGHT, FOR ONCE.']],
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
    [['h', '...'], ['s', ' "WHY SO SERIOUS?"']],
  ],
  // talking to himself when nothing's happening
  idle: [
    [['h', 'THE CLOCK WAS ON TIME ONCE.']],
    [['s', 'DON\'T LOOK AT THE WINDOW. IT LOOKS BACK.']],
    [['s', 'I\'M THE BRAINS.'], ['h', ' YOU\'RE THE MOUTH.'], ['s', ' SAME THING!']],
    [['h', 'HAVE YOU EVER WOKEN UP SOMEWHERE AND FORGOTTEN THE WAY IN?'], ['s', ' THAT\'S CALLED SHOPPING.']],
    [['s', 'WHO TOOK THE STAIRS?'], ['h', ' THE STAIRS TOOK THEMSELVES.']],
    [['h', '...'], ['s', ' SAY SOMETHING!'], ['h', ' ...'], ['s', ' UGH!']],
    [['s', 'ONE DAY I\'M GONNA OPEN A SHOP OF MY OWN.'], ['h', ' YOU\'RE STANDING IN IT.'], ['s', ' A BETTER ONE!']],
    [['h', 'THE MOON IS HALF RED TODAY.'], ['s', ' IT\'S ALWAYS HALF RED.'], ['h', ' ...SO ARE WE.']],
    [['s', 'NOBODY BUYS ANYTHING ON A THURSDAY.'], ['h', ' IT\'S NEVER THURSDAY HERE.'], ['s', ' EXACTLY!']],
    [['h', 'I HAD A DREAM I WAS AWAKE.'], ['s', ' NIGHTMARE.']],
    [['s', 'THE OTHER SHOPKEEPER IS A TELEVISION.'], ['h', ' HE\'S A GOOD LISTENER.'], ['s', ' HE\'S A TELEVISION!']],
    [['h', 'IF YOU FIND SOMETHING OF MINE OUT THERE... KEEP IT.']],
    [['s', 'TOUCH THE THINGS ON THE DESK. GO ON.'], ['h', ' THEY KNOW THINGS.']],
    [['s', 'I COUNTED THE STAIRS. THERE WERE MORE GOING DOWN THAN UP.'], ['h', ' THAT\'S HOW STAIRS WORK HERE.']],
    [['h', 'DOES IT EVER FEEL LIKE SOMEONE IS WATCHING YOU SHOP?'], ['s', ' THAT\'S ME! I\'M WATCHING!']],
    [['s', 'A SPY COAT! NOBODY CAN SEE ME IN IT!'], ['h', ' EVERYONE CAN SEE YOU.'], ['s', ' THEY\'RE PRETENDING NOT TO.']],
    [['h', 'I USED TO SLEEP. I MISS IT.'], ['s', ' I DON\'T! SLEEP IS FOR PEOPLE WITH ONE HEAD!']],
    [['s', 'I CAN HEAR THE MOON HUMMING.'], ['h', ' ...THAT\'S ME. SORRY.']],
    [['h', 'SOMETIMES I FLICKER. LIKE A BAD SIGNAL.'], ['s', ' DON\'T TELL THEM THAT!']],
    [['s', 'DO YOU THINK THE FISH IN THE BOWL KNOWS IT\'S IN A BOWL?'], ['h', ' ...DO YOU?']],
    [['h', 'THE CANDLE HAS BURNED FOR A HUNDRED YEARS. IT\'S STILL THE SAME LENGTH.'], ['s', ' CHEAP WAX!']],
    [['h', 'WHAT\'S THE PLAN?'], ['s', ' "DO I REALLY LOOK LIKE A GUY WITH A PLAN?"']],
    [['h', 'THE TV NEXT DOOR...'], ['h', ' "EVERYONE CREATES THE THING THEY DREAD."']],
    [['s', 'PARDON ME, ESTEEMED CLIENTELE! MAY I INTEREST YOU IN-'], ['h', ' NO.'], ['s', ' -IN NO! A BARGAIN!']],
    [['h', 'I FEEL LIKE A HALF-EATEN SANDWICH.'], ['s', ' DELICIOUS!'], ['h', ' ...THAT WASN\'T THE POINT.']],
    [['s', 'I LOVE THIS JOB! I LOVE THIS JOB! I LO-'], ['h', ' ...HE DOESN\'T GET PAID.']],
  ],
  // THE GLITCH: he's just come apart and pulled himself back together (then sighed)
  glitch: [
    [['h', '...SORRY. LOST THE SIGNAL FOR A SECOND.']],
    [['s', 'WHO DID THAT?! WAS IT YOU?!'], ['h', ' IT WAS US.']],
    [['h', 'EVERY TIME I THINK I\'M IN ONE PIECE...']],
    [['s', 'I\'M FINE! I\'M FINE! I\'M F- I\'M FINE!']],
    [['s', '"I\'M AN AGENT OF CHAOS!"'], ['h', ' ...YOU\'RE AN AGENT OF A BAD SIGNAL.']],
    [['h', '...THERE.'], ['h', ' "THERE ARE NO STRINGS ON ME."']],
  ],
  // THE LORE: now and then (in order, so you hear them all) he lets slip how things really are
  lore: [
    [['h', 'DO YOU KNOW WHAT YOU PAY WITH HERE? MEMORIES. REAL ONES.'], ['s', ' EVERY COIN YOU WIN OUT THERE IS SOMETHING SOMEBODY FORGOT!'], ['h', ' ...I KEEP THEM ALL.']],
    [['h', 'WE WERE ONE MAN ONCE. THE NIGHT THE PURPLE STAR FELL INTO THE WATER UNDER GRAVEMOON BRIDGE, IT SPLIT EVERYTHING IT TOUCHED IN TWO.'], ['s', ' THE WATER GOT A GENTLEMAN OUT OF IT. WE GOT EACH OTHER.']],
    [['h', 'MY HEART STOPPED AT THIRTEEN O\'CLOCK. THAT\'S WHEN THE DREAM STARTED.'], ['s', ' EVERY FIGHT YOU\'VE EVER WON HAPPENED IN HERE!'], ['h', ' ...THEY\'RE ALL ASLEEP SOMEWHERE. ALL OF THEM.']],
    [['s', 'THE MASKED KING\'S CROWN HAS TWO FACES. ONE LAUGHS, ONE WEEPS.'], ['h', ' THEY WERE OURS. WE TRADED THEM FOR THIS SHOP.'], ['s', ' THAT\'S WHY THERE\'S NOTHING UNDER THE MASK!']],
    [['h', 'THE STAR-EATER ISN\'T HUNGRY. HE\'S SCARED. HE SWALLOWS THE SKY SO NOBODY CAN FIND THE WAY OUT.'], ['s', ' BEAT HIM AND THE STARS COME BACK. AND THEN EVERYBODY WAKES UP!'], ['h', ' ...I DON\'T KNOW IF I WANT TO.']],
  ],
  // THE SNAP: he's just snapped the room into a hand-drawn one (snap_in), or back to how it was (snap_out)
  snap_in: [
    [['s', 'THERE. MUCH BETTER.'], ['h', ' ...IT\'S ONLY INK.']],
    [['s', 'TA-DA! I DREW IT MYSELF!'], ['h', ' YOU CAN\'T DRAW.'], ['s', ' AND YET!']],
    [['h', 'THIS IS HOW I REMEMBER IT. BEFORE.']],
    [['s', 'DON\'T TOUCH ANYTHING. THE INK\'S STILL WET.']],
    [['s', '"I\'M GOING TO SHOW YOU SOMETHING BEAUTIFUL."'], ['h', ' ...HE ALREADY DID IT.']],
  ],
  snap_out: [
    [['h', 'TOO FLAT. I MISSED MY CORNERS.']],
    [['s', 'BORING! ...OKAY IT WAS GETTING SMUDGY.']],
    [['h', 'THE EYE WAS STARING AT ME.'], ['s', ' THE EYE STARES AT EVERYONE!']],
  ],
  // THE CLAP: he's just clapped the room into the polygon world (clap_in), or back to how it was (clap_out)
  clap_in: [
    [['s', 'BEHOLD! FEWER POLYGONS, MORE STYLE!']],
    [['h', 'EVERYTHING HAS CORNERS HERE. EVEN THE SKY.']],
    [['s', 'THE WHALE IS FREE. DON\'T ASK ME WHERE HE GOES.'], ['h', ' NOWHERE. IT LOOPS.']],
    [['h', 'THE GEM WATCHES THE DESK SO I DON\'T HAVE TO.']],
    [['s', 'TA-DA! LOW BUDGET, HIGH DREAM.']],
  ],
  clap_out: [
    [['h', 'TOO SHINY. MY EYES HAVE EDGES NOW.']],
    [['s', 'AWW. I LIKED THE WHALE.'], ['h', ' THE WHALE WILL BE BACK.']],
    [['h', 'BACK TO THE DUSK. IT DOESN\'T HURT TO LOOK AT.']],
  ],
  // RARE: once in a long while (`RARE` in LostScene), instead of his usual chatter
  rare: [
    [['s', 'THAT STUPID TV REPLACED ME...']],
  ],
  // he puts his feet up on the desk and leans back (a fidget), then says one of these
  feet: [
    [['s', 'AHH. THIS IS THE LIFE.'], ['h', ' THIS ISN\'T A LIFE.']],
    [['s', 'CUSTOMERS COME TO ME.'], ['h', ' ...NOBODY COMES.']],
    [['h', 'MY FEET ARE TIRED. I DON\'T KNOW FROM WHAT.']],
    [['s', 'BOSS\'S ORDERS: RELAX!'], ['h', ' WE\'RE THE BOSS.'], ['s', ' AND I SAID RELAX!']],
    [['s', 'NICE SHOES, RIGHT? ONE OF EACH.'], ['h', ' ...WE COULDN\'T AGREE.']],
  ],
  // you've done nothing for half a minute: he takes his clock-heart out and checks how long, then says one of these
  wait: [
    [['h', 'THIRTY SECONDS.'], ['s', ' FEELS LIKE THIRTY YEARS!']],
    [['s', 'TICK TOCK! THE CLOCK SAYS YOU\'RE DAWDLING!']],
    [['h', 'TAKE YOUR TIME. IT\'S NOT MINE ANYMORE.']],
    [['s', 'ARE YOU ASLEEP?'], ['h', ' MAYBE WE ARE.']],
    [['h', 'STILL HERE? ...GOOD. IT GETS QUIET.']],
    [['s', 'BUY SOMETHING OR GET LOST!'], ['h', ' THEY ARE LOST.'], ['s', ' THEN BUY SOMETHING!']],
  ],
  // THE DESK: click (or tap) the things on his counter. Each answers in turn, going down its list, and some of them
  // let slip the secret codes for the TV shopkeeper next door (ring his bell 3 times, then type them in).
  desk_bell: [
    [['s', 'DING! SERVICE! ...OH WAIT, THAT\'S ME.']],
    [['h', 'THE OTHER SHOP HAS A BELL TOO. RING IT THREE TIMES.'], ['s', ' AND HE\'LL LISTEN! HE\'S A TV, HE HAS TO!']],
    [['s', 'STOP RINGING IT!'], ['h', ' ...HE LIKES IT REALLY.']],
    [['h', 'RING... RING... SOMEONE ONCE CALLED AT THIRTEEN.'], ['s', ' DON\'T ANSWER IT! DON\'T TYPE IT EITHER!']],
  ],
  desk_watch: [
    [['h', 'IT MELTED THE DAY I STOPPED LOOKING AT IT.']],
    [['s', 'IT ONLY GOES UP TO THIRTEEN!'], ['h', ' THE LAST HOUR IS THE BAD ONE.']],
    [['h', 'DO YOU REMEMBER THAT DAY?'], ['s', ' WHICH DAY?'], ['h', ' THE TV DOES. TELL HIM: R. T. D.']],
    [['s', 'IT\'S STILL RIGHT TWICE A DAY!'], ['h', ' IT\'S NOT A DAY.']],
  ],
  desk_hourglass: [
    [['s', 'THE SAND FALLS UP! HA! TAKE THAT, GRAVITY!']],
    [['h', 'EVERYTHING ON THIS DESK IS A STILL LIFE.'], ['s', ' THE TV LOVES THAT ONE. ONE WORD! STILLLIFE!']],
    [['h', 'YOU TURNED IT OVER. NOW IT FALLS DOWN.'], ['s', ' ...THAT\'S WORSE! TURN IT BACK!']],
  ],
  desk_lava: [
    [['s', 'GROOVY!']],
    [['h', 'THE PURPLE HAZE IN HERE... IT REMINDS ME OF A KING.'], ['s', ' THE MASKED ONE! HE HATES HIS NAME!']],
    [['s', 'FOUR LETTERS. N... O... L... I! DON\'T TELL HIM I TOLD YOU!'], ['h', ' TELL THE TELEVISION.']],
    [['h', 'IT\'S BEEN WARMING UP FOR A HUNDRED YEARS.'], ['s', ' ANY MINUTE NOW!']],
  ],
  desk_books: [
    [['h', 'MY OLD BOOKS. THE PAGES ARE ALL THE SAME PAGE.']],
    [['s', 'A CHEMISTRY BOOK. SOMEONE SIGNED IT: HEISENBERG.'], ['h', ' SAY HIS NAME TO THE TV. HE\'LL TAKE YOU FOR A DRIVE.']],
    [['s', 'THIS ONE\'S A PASSPORT! PAPERS, PLEASE!'], ['h', ' THE TV TAKES IT AS ONE WORD. PAPERSPLEASE.']],
    [['h', 'THERE\'S A BOOKMARK. I NEVER GOT TO THAT PART.']],
  ],
  desk_candle: [
    [['h', 'DON\'T BLOW IT OUT.'], ['s', ' BLOW IT OUT!']],
    [['s', 'IN THE TRENCHES THEY SANG FOR A FALLEN HOOD.'], ['h', ' R. I. P. ...HOOD. THE TV KNOWS THE SONG.']],
    [['h', 'IT\'S BEEN BURNING SINCE BEFORE I GOT HERE.']],
  ],
  // you blew the candle out (click it three times quickly): it's dark for a moment and he takes his face off
  candle_out: [
    [['h', '...YOU SAW THAT.'], ['s', ' NO HE DIDN\'T!']],
    [['s', 'WHO TURNED OFF THE LIGHTS?!'], ['h', ' THEY DID. IT WAS THEM.']],
  ],
  desk_till: [
    [['s', 'HANDS OFF THE TILL!']],
    [['h', 'IT\'S EMPTY. IT WAS ALWAYS EMPTY.'], ['s', ' THEN WHY DO I GUARD IT?!']],
    [['s', 'NO! THAT\'S MY RAINY DAY FUND!'], ['h', ' IT NEVER RAINS HERE.']],
  ],
  // the first time you open the till: there IS something in it (a one-time gift of MEMORIES - DESK_GIFT in LostScene)
  till_gift: [[['h', 'OH. THERE WAS SOMETHING IN THERE.'], ['h', ' TAKE IT.'], ['s', ' NO!! THOSE ARE MINE!']]],
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
    [['s', '"LET\'S PUT A SMILE ON THAT FACE."'], ['h', ' IT\'S BACK ON. IT\'S ON.']],
  ],
  // leaving
  bye: [
    [['s', 'COME BACK! OR DON\'T! I\'LL KNOW!'], ['h', ' ...MIND THE STAIRS.']],
    [['h', 'GO GENTLY.'], ['s', ' GO QUICKLY!']],
  ],
  // the shelves are still bare (stage 1: his things are still being found)
  empty: [[['h', 'THE SHELVES ARE BARE. EVERYTHING IS STILL... LOST.'], ['s', ' WE\'LL FIND IT! OR STEAL IT!']]],
};

// things he says AND does while left alone (now and then instead of a plain idle line): his animation + one line
export const LOST_ACTS = [
  // his MOOD SWINGS: THE SWITCH (manic $@L, head spins round, lands on miserable HANZ), THE PITCH (a showman's sales
  // pitch and a bow) and THE COLLAPSE (sobbing into his hands, then suddenly fine) - each said as he does it
  { anim: 'switch', line: [['s', 'WHAT A SPLENDID, MARVELLOUS, FINANCIALLY SOUND DAY!'], ['h', ' ...I WANT TO LIE DOWN.']] },
  { anim: 'switch', line: [['s', 'EVERYTHING IS FOR SALE! EVEN THE AIR! ESPECIALLY THE AIR!'], ['h', ' ...SORRY. HE GETS LIKE THIS.']] },
  { anim: 'switch', line: [['s', 'I AM HAVING THE BEST DAY OF MY ENTIRE EXISTENCE!'], ['h', ' IT\'S THE SAME DAY. IT\'S ALWAYS THE SAME DAY.']] },
  { anim: 'pitch', line: [['s', 'LADIES! GENTLEMEN! ASSORTED SHAPES! BEHOLD: MERCHANDISE!']] },
  { anim: 'pitch', line: [['s', 'STEP RIGHT UP! STEP RIGHT DOWN! STEP SIDEWAYS IF YOU MUST!'], ['h', ' PLEASE DON\'T STEP ANYWHERE.']] },
  { anim: 'pitch', line: [['s', 'A ONE-TIME OFFER! AVAILABLE EVERY TIME!'], ['h', ' THAT\'S NOT HOW TIME WORKS.'], ['s', ' IT IS HERE!']] },
  { anim: 'sob', line: [['h', 'I\'M SORRY. I\'M SO SORRY. I\'M SORRY I SAID SORRY.'], ['s', ' AND WE\'RE BACK! HOW MAY I HELP YOU?']] },
  { anim: 'sob', line: [['h', 'NOBODY EVER BUYS THE SAD THINGS...'], ['s', ' CUSTOMER! HI! HELLO! WELCOME!']] },
  { anim: 'sob', line: [['h', 'IT\'S FINE. EVERYTHING IS FINE. IT\'S-'], ['s', ' FABULOUS! IT\'S FABULOUS!']] },
  { anim: 'shrug', line: [['h', 'WHAT DO I KNOW.'], ['s', ' NOTHING!'], ['h', ' ...EXACTLY.']] },
  { anim: 'shrug', line: [['s', 'WHO CARES!'], ['h', ' I DO. A LITTLE.']] },
  { anim: 'slam', line: [['s', 'I\'M BORED!!'], ['h', ' ...WE KNOW.']] },
  { anim: 'slam', line: [['s', 'SERVICE IS SLOW TODAY!'], ['h', ' WE ARE THE SERVICE.']] },
  { anim: 'twitch', line: [['h', '...DID YOU HEAR THAT?']] },
  { anim: 'laugh', line: [['s', 'I JUST REMEMBERED SOMETHING FUNNY!'], ['h', ' PLEASE DON\'T SHARE IT.']] },
  { anim: 'greet', line: [['s', 'WELCOME! WELCOME! ...STILL WELCOME!']] },
];

// SECOND OPINION (an extra he sells): after a KO his head pops up at the edge of the screen with one of these
export const SECOND_OPINION = {
  h: ['THEY\'LL BE BACK. THEY ALWAYS COME BACK.', '...THAT LOOKED LIKE IT HURT.', 'ANOTHER ONE FOR THE LOST PILE.', 'I\'LL KEEP A LIGHT ON FOR THEM.', 'NOBODY WINS. SOME JUST LOSE LATER.'],
  s: ['HA! GET LOST!', 'SHOULDA BOUGHT SOMETHING!', 'NO REFUNDS!', 'WHAT A WASTE OF A PERFECTLY GOOD FIGHTER!', 'I BET ON THAT ONE! ...I LOST!'],
};

// Mason's recordings: line id -> true when public/assets/audio/voice/lost/<id>.ogg exists (none yet)
export const LOST_VOICE = {};
