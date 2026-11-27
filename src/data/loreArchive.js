// THE LORE ARCHIVE (TRINKETS > LORE): everything the game knows about its world, beyond the one-page dossiers in
// lore.js. Two parts:
// - BACKSTORY: two long pages for every fighter - BACKGROUND (who they were before) and WHY THEY'RE HERE (what pulled
//   them into the floating arenas) - shown as the second and third pages of their file in LoreScene (FilesScene.js).
// - ARCHIVE: the loose documents in the ARCHIVE (ArchiveScene.js) - the Archivist's notes on the world, letters and
//   scraps from the fighters, a file on every boss, the HAPPY HILLS tapes, notes on the stages. A document with a `lock`
//   stays CLASSIFIED until that boss has been beaten at least once (on any difficulty).
// The thread through all of it: THE STARFALL - the night a purple star broke over every world at once, and everything
// its shards touched got a second life. Write in the same voice: plain, a little sad, a little funny, never gory in words.

/** Two long pages per fighter: their life before, and why they fight in the sky now. */
export const BACKSTORY = {
  'soul-summoner': {
    background: `Before the crown and the blue fire, he was nobody: the youngest guard on the lowest gate of the Sky Sanctum, the one they gave the night shift because nothing ever happened on the night shift.

He kept a list. Every guard on the gate wrote their name in a book on their first day, and he was the one who kept the book - patched the spine, re-inked the names when the rain got at them. Forty-one names. He knew every one of them. He knew who snored on watch and who sang, who sent half their pay home, who was afraid of heights in a city that floats.

Then came the night of the Starfall. The sky split purple, the Sanctum shook on its chains, and things that were not birds came up over the walls. The gate held until dawn. When the sun came up there was one name left in the book that could still answer to it - and he had a spear through him and the book in his hand.

They buried the forty-one together below the Sanctum. They buried him with them, still holding the book. Something that had fallen out of the sky that night found him there, in the dark, and asked him a question in a voice like a struck bell: do you want to stop?

He said no. He said it for all forty-one of them.`,
    why: `The fire in his palm is not his. It is a shard of the fallen star, and inside it, packed tight as seeds, are the forty-one. When he summons a soul he is not casting a spell - he is opening his hand and letting a friend out for a moment, to stretch, to swing a sword one more time.

He feels the Pull like everyone else who was reborn that night: a hook behind the ribs that drags him toward the floating arenas whenever the shards ring. He goes willingly. The Archivist told him what she believes - that when enough of the reborn have fought, the star will knit itself back together, and whoever stands closest when it does will be able to ask it for one thing.

He knows exactly what he will ask. Not for himself. He wants forty-one people to wake up warm, in their own beds, on the morning after the Starfall, with no idea how close they came.

He does not know if it is possible. He fights anyway. It is, as far as he can tell, the only thing the dead are good at - keeping a promise long after everyone else has stopped expecting them to.`,
  },
  'mr-wake': {
    background: `Nobody knows what Mr Wake was before he was Mr Wake, and the most unsettling part is that neither does he.

The first thing he remembers is cold water and a light. He was at the bottom of the black river under Gravemoon Bridge, and a purple star was falling through the water toward him, slow as a leaf. It touched him - or he touched it - and the river poured into the shape of a man because the star seemed to want one. He walked up the bank in the morning wearing the river like a coat. A fisherman dropped his rod. A lamplighter lent him a hat. Somebody's grandmother, recovering from the shock, gave him a cup of tea and told him he looked like a gentleman, and he decided on the spot that he would be one.

He chose the name from the sound the river made as it closed behind him: a wake.

He has been, since then, unfailingly polite. He bows before every fight. He thanks his opponents afterwards, sincerely, whether they won or lost. He collects hats, teacups and words, in roughly that order. He has learned to make a face for himself - the cracked white mask - because people found it upsetting when he had none.

Underneath it, if you are unlucky enough to see, there is only the river: dark, deep, and full of eyes that are not his.`,
    why: `Mr Wake is in the arenas because he is looking for the rest of himself.

When the star fell into the river, it did not fall alone. He is certain - with the certainty of water, which always knows where it came from - that some of what he was went somewhere else that night. Pieces of a person who drowned under that bridge, long before. A name. A face. A reason.

Every shard he comes close to in a fight hums a little, like a glass rubbed at the rim, and in the hum he sometimes hears a voice he almost recognises. So he fights, politely, to stand near as many shards as he can.

He has a theory, which he shared over tea with the Archivist: that the reborn are not new people at all, only very old ones who were given the wrong shape. If that is true, he would like to find out whose shape he was meant to have.

He has also admitted, once, that he is afraid of what he might remember. The thing in the deep that answers when he calls the Undertow is not a stranger. It knows his name. It says it often. He simply cannot hear it over the sound of the water.`,
  },
  'hero-knight': {
    background: `Lacy was twelve when she swore the oath, alone in an empty chapel, in armour three sizes too big. That part is in her milestone file. What isn't is what came after.

She grew up in Aldmere, a small kingdom on the edge of the map, famous for exactly two things: apples, and the Order of the Lantern, the knights who kept the roads safe. Her mother was a knight of the Order. Her father kept the orchard. Her childhood was apples and swordplay and a big dog called Turnip.

When the Order rode out against a raiders' army and never came back, she took up the oath. For six years she kept it - held a bridge, broke a siege, carried the order's last sword across three borders and never once let anyone take it from her.

Then came the night of the Starfall. A purple light came down out of the sky directly onto Castle Aldmere. Nobody knows why there. It did not explode. It simply landed - in the great hall, on the night of the harvest feast - and the castle caught fire from the inside out, burning in colours fire is not supposed to have.

She went back in for people nine times. On the tenth trip the roof came down. When they pulled her out, her hair had gone white, and she was holding a shard of purple glass so tightly it had cut her palm to the bone. She has never put it down.`,
    why: `Lacy is the only fighter who will tell you plainly why she is here: she wants to know who dropped the star on her home, and she wants to make sure they never do it again.

She does not believe it was an accident. Stars do not choose where they land, she says - so either something threw it, or something called it down. She has a list of suspects, and she has crossed off more names than you would think. (The giant eclipse in the sky behind the Last Observatory is very high on it. She has not been able to get close enough to ask him.)

She also carries the shard. It has never once been comfortable. In fights it burns like a held breath, and when her Limit rises it shows her things - her mother on a horse, the orchard in blossom, Turnip running down the road - and the faces of every person she failed to pull out of the hall.

The Archivist offered to take the shard from her. Lacy said no. Somebody has to remember them properly, she said, and she would rather it hurt than fade.

She is the youngest knight in the arenas by about four hundred years, and the only one who still keeps the oath every single day. Nobody has ever beaten her twice.`,
  },
  nu: {
    background: `NU was born Nathaniel Ulrich Okafor-Bell in a city with too many car parks and not enough music, and he fixed that personally.

He started in a basement under a laundrette with a borrowed amp, a bass player called Dee, a drummer who was also called Dee (they were not related; it was confusing), and a guitarist who never spoke. They called themselves NULL SET. The neighbours called the police, which became the band's most reliable form of promotion.

He was never the best singer in the city. He was, without question, the loudest. He played every show like it was the last one on Earth, and the crowd learned that if they came to see NULL SET they would leave with ringing ears and a story. The basement got bigger venues. The bigger venues got a tour. The tour got a law passed about decibel limits that the city still calls the Okafor-Bell Act.

Then came the night of the Starfall. NULL SET were playing a homecoming show back in the original basement - two hundred people in a room built for forty, the walls sweating - when a purple light came down through the street, through the laundrette, through the ceiling, and landed in the middle of the pit.

It did not hurt anyone. It did something stranger. It took the noise.`,
    why: `When the star landed in the pit, every sound in the room went into it - the guitars, the drums, the two hundred voices screaming his lyrics back at him - and the crowd went with the sound. One second the room was full. The next it was NU, alone, holding a microphone, in a silent basement, with a shard of purple glass humming the chorus of his own song at him.

The band went too. Both Dees, and the guitarist who never spoke.

He has since worked out that they are not gone. They are inside the noise. When he plays loud enough - really loud, Wall of Sound loud - he can hear them in the feedback: Dee counting in, Dee hitting the snare, the crowd singing along a half-beat late, like an echo from another room.

The arenas are the loudest places left in any world. Every fight rings the shards. So NU fights at the absolute top of his volume, every single time, hoping that one day the echo gets loud enough to step back out of the speakers.

The crowd that follows him around and carries him over their heads? He swears some of them are from that night. He has never been brave enough to ask them.`,
  },
  aero: {
    background: `AERO was born on a Tuesday, in a screensaver.

The computer belonged to a family in a quiet suburb. It sat in a spare room that nobody used, its screen showing the same endless loop all day: a sunny sky, glossy bubbles, fish swimming lazily through clouds, a cheerful little figure in a fishbowl helmet floating among them. The figure was not supposed to do anything. It was a decoration. It had been drifting along the same path, between the same bubbles, for eleven years.

Then came the night of the Starfall. The purple light came down over the suburb, and a single shard went through the spare-room window, through the glass of the monitor, and into the little figure's fishbowl, where it hit the goldfish.

The goldfish woke up first. It looked around. It looked at the figure whose helmet it lived in. It decided, with the calm authority of a fish, that the two of them were going somewhere. Then it woke AERO up.

He climbed out of the screen the next morning, dripping bubbles, delighted by everything: carpet, sunlight, cereal, birds. He still is. He has never once been unhappy for longer than about four minutes. The goldfish - who has a name, which AERO cannot pronounce, which sounds like a bubble - handles the worrying for both of them.`,
    why: `AERO did not come to the arenas for revenge or answers. He came because the goldfish told him to, and the goldfish is usually right.

The fish understands the star better than anyone except perhaps the Archivist. It explained it to AERO, very slowly, using diagrams drawn in bubbles: the star was not a weapon or an accident. It was a seed. It broke apart so it could plant itself in a thousand places at once, and every reborn thing - every knight, river, singer and screensaver - is a sprout. When the sprouts grow strong enough, they will find each other, and the star will bloom.

AERO did not fully follow the diagrams, but he understood the important part: something beautiful is going to happen, and he wants to be there for it.

When he fights hard enough, the shard in the goldfish's water burns gold, and he becomes FULL AERO: wings, a cape, a golden spear, the goldfish in a tiny crown. He does not know where that form comes from. The fish does. It has told the Archivist, privately, that FULL AERO is what the star looks like on the inside - and that it chose a small, kind, silly boy from a screensaver to wear it because those are exactly the people who will not misuse it.`,
  },
  gnash: {
    background: `GNASH does not give his real name. He gives a different one every time somebody asks, and they are all very rude.

What is known: he is about fifteen. He grew up in the old arcade district, a neighbourhood of shuttered game halls and dead neon signs that the rest of the city stopped caring about years ago. His parents worked nights. He raised himself on rooftops, skateboards and the free play left on broken cabinets. He wired up his first pair of neon horns out of a dead sign and a car battery, and nearly set his hair on fire doing it, and wore them to school the next day anyway.

The mask came later - a round black mask with two X eyes and a zig-zag grin, stitched together out of an old bike tyre. He has said it is so people stop looking at his face. He has also said it is because his face is too handsome and it was causing problems. Both may be true.

The district has a lot of kids like him. He is the one they follow, partly because he is fearless and partly because he will absolutely make your enemy's afternoon very loud.

On the night of the Starfall, a purple light came down over the dead arcades - and every sign in the district lit up at once, buzzing, for the first time in a decade.`,
    why: `The axe came out of the sky.

On the night of the Starfall, after the signs lit up, GNASH followed the brightest light to the roof of the old ARCADIA building - and found, embedded in the gravel, a giant two-handed axe glowing with neon outlines, a diamond of purple light burning in the middle of the blade. It was taller than him. He picked it up anyway. It was the first thing in his life that had ever felt like it was meant for him.

It is not his. He knows that. Somebody owned that axe before it fell - somebody huge, judging by the grip - and the shard set in it remembers them. When he gets angry enough (his PSYCHO meter, the other kids call it), the axe starts to remember out loud: flashes of a battlefield, a hooded figure, a verdict. That is where the EXECUTIONER costume came from. He did not choose it. The axe dressed him in it.

He is in the arenas to find out who the axe belonged to, and whether they want it back. He has decided that if they do, they will have to come and take it, and he would like them to know in advance that he will be grinning the entire time.

He drags the axe everywhere, sparking along the ground, because it is too heavy to carry. He has never once complained about that.`,
  },
  'what-once-was': {
    background: `Its name was Daniel Reyes. It worked in an office on the fourth floor of a building that, as far as anyone can tell, never existed.

The records that survive (one employee badge, one half-finished crossword, one voicemail) describe an ordinary man: thirty-four, a little tired, a habit of leaving the television on all night so the flat would not feel empty. On the night of the Starfall, the voicemail says, he noticed a purple light in the corridor outside his office. It was moving away from him, slowly, around a corner that had not been there that morning.

He followed it.

The corner led to a room with yellow wallpaper and a buzzing light, and then another room with yellow wallpaper and a buzzing light, and then another. The purple light was always one room ahead. The voicemail ends with him saying, very quietly, "I think I've walked further than the building is wide."

He kept walking. In the Backrooms, time does odd things. By the time he caught the light, he had been walking long enough to forget his name, his face, and the sound of his own voice. The shard went into the only thing he had left - the memory of a television, glowing in an empty flat - and that is the shape he has now.`,
    why: `WHAT ONCE WAS does not know why it is here. That is the honest answer, and the sad one.

The Pull reaches into the Backrooms like it reaches everywhere, and one day it simply walked through a door that opened onto sky. The arenas are bright and loud and full of people, and the thing that used to be Daniel cannot tell whether it is afraid of them or desperate to be near them. It fights because fighting is what everyone does here.

But sometimes, in the middle of a match, its screen clears. For a frame or two it shows something other than static: a kitchen with a mug on the counter, a crossword with one clue left, a window with city lights outside. The Archivist has a theory that the shard is trying to show it the way home, the way it showed Mr Wake his river.

The Missing Poster it hurls in fights is one of many it carries. They all show the same face. Nobody has worked out whose. Some of the fighters assume it is Daniel's own. The Archivist is less sure; the poster is very old, and the face on it is a child's.

At THE END, the last level of the Backrooms, it went through a door with nothing behind it and came back changed. It has never said what was on the other side. It cannot say anything at all. But since it came back, it has stopped trying to find the way home. It has started looking for someone else.`,
  },
  'last-seen': {
    background: `Rosemary Vance was seven years old, and she was very, very good at hide and seek.

Her birthday party was held at Captain Canary's Family Fun Palace, a restaurant with ball pits, a prize counter, and a stage where animatronic birds sang the same three songs every hour on the hour. The star of the show was Captain Canary himself, a big yellow bird in a sailor hat. Rosemary loved him. She had his face on her cake.

The party is well documented, because her father filmed most of it. Cake. Presents. A ball pit. A game of hide and seek that started at 7:40pm. Rosemary went to hide. Rosemary did not come back.

The search lasted months. The restaurant was taken apart, the ball pits drained, the vents checked. Nothing. The Fun Palace closed the next year. The animatronics were sold, except one: an old, scrapped prototype of Captain Canary that had been kept in a back room for spare parts, and which nobody could find either.

That was eleven years before the Starfall. On the night itself, a purple light came down onto the empty restaurant, and for the first time in eleven years, the stage lights came on, and something on the stage began to sing.`,
    why: `Rosemary is in the arenas because she is still playing the game.

The star found her where she had been hiding - and whatever happened to her in that back room all those years ago, it gave her a way out. But the way out came with the thing she hid in. The more people report seeing her, the more of her steps back into the world - and the more of the prototype comes with her: the yellow feathers, the sailor hat, the axe the old Captain was built to hold for a pirate show that never ran.

When enough sightings are reported, she becomes SEEN, and it is not entirely her any more. The Archivist believes the scrapped mascot was reborn that night too, and that the two of them are tangled together, each pulling the other toward the light.

Most of the time Rosemary is calm, polite, and quietly cheerful, and she enjoys the fights the way she enjoyed hide and seek: as a game with rules. She asks the other fighters if they have seen her parents. Nobody has. She does not seem upset by this. "They'll find me," she says. "They always said they'd find me."

Her milestone FOUND is the ending she is fighting for. She has never doubted she will get there. The Captain, the Archivist suspects, has other ideas.`,
  },
  fists: {
    background: `FISTS has a name, and it is on the sign-in sheet at the Copper Penny Boxing Club every single morning at 5:15am, in handwriting so bad nobody has ever read it.

He grew up three streets from the gym, in a flat over a chip shop, with an older brother who boxed and a mother who worked double shifts and made them both promise to keep their hands up. The brother quit boxing at nineteen. FISTS never did. He started sweeping the gym floor at ten in exchange for using the heavy bag, and he has, at this point, swept every floor in the building about four thousand times.

He is not a talker. His coach, Old Mo, once said that getting a sentence out of FISTS was harder than getting a knockdown, and Mo had been a heavyweight. He lets his hands do it.

On the night of the Starfall he was alone in the gym after closing, working the heavy bag in the dark because the lights cost money. A purple light came down through the skylight and hit the bag. The bag exploded. FISTS stood there in a snowstorm of stuffing and sand, gloves still up, and said, according to Old Mo, who was sleeping in the office: "Oh, come on."`,
    why: `FISTS is in the arenas because somebody told him there was a fight, and he has never in his life turned down a fight.

He does not care about the star, the shards, the Pull, the Archivist's theories or the end of the world. He listened politely while Mr Wake explained it all over tea, and then asked where the ring was.

Strictly speaking he was not reborn at all - he was standing next to something that was. A splinter of the star went into his right glove when the bag burst, and now that glove hits a great deal harder than a glove should. He knows that is cheating, a bit. He does not use the glove in sparring at the Copper Penny. In the arenas, against knights and demons and rivers in hats, he figures it evens things out.

He is still a lab test - the Archivist calls him PROTOTYPE 06 and keeps him off the official lists - which he finds hilarious. "Prototype," he has said, which may be the longest single word he has ever spoken in public.

His milestone UNDISPUTED is the only goal he has ever had. Every belt. Every weight. Every rematch. Nobody left to fight but the mirror. He suspects, given the size of this place, that it is going to take a while. He is fine with that.`,
  },
  'young-link': {
    background: `This file is short on purpose.

The boy in the green tunic came from another world entirely - not one of the worlds the star touched, but one much further away, whose own stories belong to someone else. He arrived through a door the Archivist opened as an experiment, to see whether the arenas could hold a fighter whose rules were written elsewhere.

They can, mostly. He brought his own sword, shield, bow and bombs. He brought his own sprites, which look slightly different from everyone else's, and which he refuses to change. He brought very little else - no name he will give, no home he will describe, no shard.

The tunic costumes (MOSS, RIVER, EMBER, GILDED) are not from his old world. They are from this one: the forest he camped in on his first night, the river he nearly drowned crossing, the fire he walked out of, the people he helped. He has collected them the way he collects everything, quietly, one at a time.`,
    why: `He is a guest, and he knows it.

The Archivist keeps him in the lab (PROTOTYPE 05) and never on the main roster, out of respect for the place he came from. He seems to appreciate that. He fights when asked, fights well, never complains, and goes back through the door at the end of the day.

He is the only fighter who feels no Pull at all. That alone makes him valuable to the Archivist: he is a control, a measurement, someone the star does not reach. When the shards ring after a fight, every other fighter turns toward the sound. He does not even look up.

What he thinks of all this, nobody knows. Once, after a long day of tests, he stood at the edge of the Sky Sanctum looking out at the floating arenas for a very long time. Then he nodded, as if to someone who wasn't there, and went home.`,
  },
  devoted: {
    background: `There is a chapel nobody else can find. It is at the end of a lane that is not on any map, past an orchard of dead trees, and its door is always open.

THE DEVOTED found it at sixteen, running from something she has never named. It was empty: no priest, no congregation, no saint above the altar - only a small dead tree growing up through the floor where the altar should be, and a single dark stain beside it, about the size of a coin.

She knelt by the stain because there was nowhere else to kneel. And something under the floor listened.

The prayer came to her in pieces over the following months, whispered up out of the stain whenever she forgot the words. It asked for things. Offerings. Small ones at first, and then less small. Every time she gave, the stain grew, and the little dead tree put out one green leaf, and the thing under the floor loved her a little more.

Then came the night of the Starfall. A purple light came down through the chapel roof and into the stain - and the stain drank it. The sludge has been rising ever since: up through the floor, up the walls, up her arms. She is still kneeling. She is not sure she could stand up if she wanted to.`,
    why: `Every hit is an offering. That is what she believes, and it is why she fights.

In the arenas, the shards ring with every blow, and the thing under the chapel floor can hear them from very far away. When she fights, it feeds. When her oblation is full, she kneels and prays at her tree, and the sludge rises a little further - from NOVICE to ACOLYTE to MARTYR, all the way to the end, when she drowns in it and grows wings.

The other fighters do not like fighting her. Lacy refuses outright. Soul Summoner has tried, twice, to speak to whatever is under the floor - the dead and the drowned have a sort of professional courtesy - and both times he came away shaken and would not say what it said.

The Archivist keeps her file marked WORK IN PROGRESS, partly because her sprites are still being drawn and partly because nobody is sure how her story ends. There are two theories. One: the sludge is the star rotting, and she is feeding the rot, and when the star blooms she will be the hole in its heart. Two: the sludge is the star healing - drawing every poisoned thing in the worlds into one place, into one girl, so it can be burned away.

She has heard both theories. She smiled at both of them, and went back to praying.`,
  },
  lumen: {
    background: `LUMEN is not a person the star touched. She is the star.

When the purple star broke itself over the Sky Sanctum to escape VESPERION, it scattered into every world at once - a shard for a gravedigger, a shard for a goldfish, a shard in an axe, a shard in a fishing line under Gravemoon Bridge. Every one of those shards is a piece of its light. But a star is not only light. Somewhere in the middle of it there was a part that knew it was a star: that had a name, that was afraid, that chose to break rather than be eaten. That part did not scatter. It fell straight down, through the roof of the Sanctum's bell tower, at eleven minutes past midnight.

The bell rang once. Then twelve more times, which bells do not do.

She woke up on the bell tower floor in the shape of a slight girl in a deep-indigo hood, with a cracked violet crystal for a face and one star for an eye. She had a heart-shard glowing in her chest and a silver staff in her hand that she did not remember picking up. The first thing she heard was the sky being chewed.

The Archivist found her there at dawn. LUMEN asked her, very politely, what year it was, and whether anybody had seen the rest of her.`,
    why: `The Archivist has always believed that the star is re-forming through the fights - that every time two reborn fighters clash in the floating arenas, their shards ring, and the ringing calls the scattered light home. She named it OPERATION REBIRTH. She had no proof.

LUMEN is the proof. Every time a fight happens, she feels a little more of herself come back. Her constellations are not tricks. They are her, trying to remember the shape of the sky. When she plants a star it is a real one, a little scrap of the light that used to be her, and when she links them into a constellation she is spelling something. She does not know what yet.

VESPERION knows. The Star-Eater swallowed every star in its sky but one, and it can taste her in the arenas the way you can smell rain coming. It will not stop. She knows it will not stop. She runs anyway - blinking from star to star, never in one place for long - because the star chose to break rather than be eaten, and she is the part of it that made that choice. She would like very much to make it count.

She has asked the Archivist to tell the others the truth when it is over: that they were never just touched by the star. They were it, all along, in pieces. And that the pieces were very, very brave.`,
  },
  vanta: {
    background: `VANTA is from a city that never switches off - a stack of neon a mile high, where the trains run on the rooftops and the rain is warm because of all the signs. He was a courier. The best one. He ran parcels across forty districts in a jacket that glowed so the drones would see him coming and get out of the way, and he never, ever, delivered anything late.

He picked up the katana on a job. Someone paid him to deliver it, then never came to collect, and after a year of carrying it everywhere he decided that made it his. It was just a sword then: a good one, black, very sharp, nothing special.

On the night of the Starfall, at eleven minutes past midnight, the whole city's grid went dark for the first time in its history. Eleven minutes. Everyone remembers where they were. VANTA was on a rooftop in the rain, and something purple came down through the clouds and hit his blade so hard it knocked him flat. When the lights came back on, the katana was glowing on its own. The shard had split as it hit, and the smaller piece had gone into the short blade he kept at his back - so now there were two of them, one burning cyan and one burning pink. They have been that way ever since, and he has never fought with only one again.`,
    why: `The shard in his blade does something strange to time. When his SYNC fills, the world slows down around him - or he speeds up, he is honestly not sure which - and every cut he makes happens twice. He can leave a save point in the air and come back to it. He can be in three places along a dash at once. The Archivist thinks the shard he caught was the part of the star that was moving fastest when it broke - the piece still trying to outrun the Star-Eater. VANTA thinks that sounds about right.

He came to the arenas because of the PULL, like everyone else. He stays because nothing in his city has ever been fast enough to keep up with him, and in the arenas some things are. He treats every fight like a speedrun: he plans the route, he saves before the hard part, he takes the risky skip. He is extremely annoying to fight. He knows this.

He does not talk about the city's eleven minutes of dark. But at the end of BLACKOUT, when he sheathes the blade and every cut lands at once, the people who know him say he looks, for a second, like someone who was very frightened once in the dark, and decided he would never be frightened of it again.`,
  },
  kami: {
    background: `The archive in the Records Office holds every document about the reborn - the Archivist's notes, the field reports, the letters, the secret files behind her back door. On the night of the Starfall, when every shard came down at once, one page tore itself out of a binder on the top shelf, drifted down through the stacks, and landed on her desk.

In the morning it had folded itself into a small person: a diamond for a head with two ink-dot eyes and a tiny ink smile, triangle hands and feet, a red seal stamped on its chest, a scrap of red ribbon knotted round its waist. A little paper crane was asleep on its head. It sat up, looked round at all the paper, and said: "Oh! Family."

The Archivist named him KAMI, which means both paper and something rather more than paper, and he liked that very much.`,
    why: `He does not know which page he used to be.

The binder he fell out of is the one marked THE STARFALL. The Archivist has checked it twice and every page is still in it, numbered, with nothing missing - and yet there is a gap in the binding where a page clearly once was, and she does not remember writing it. KAMI thinks he might be a page of the story that has not happened yet. He thinks this a lot, late at night, folded up small in the pencil cup.

He fights to find out. Every time his shard rings in the arenas a few words come back to him - not many, a line here and there, written in the Archivist's own hand - and he writes them down on the inside of his sash. So far he has: THE STAR, THE PULL, IT WILL COME FOR HER, and AND THEN THE PAPER... He would very much like to know what the paper does. He has a feeling it is something important, and he is trying to be ready.

Until then, he refolds himself - a crane to fly, a frog to jump, a blade to cut - and in his Limit he folds the whole stage's worth of paper into a tiger, because when you are made of paper and something is hunting the people you love, it helps to remember that paper can also bite.`,
  },
  vitrail: {
    background: `Before he was a person, he was a window - the great rose window of the chapel at the top of the Sky Sanctum, which the monks called THE ROSE OF SEVEN HOURS. It was older than the Archive. It was nine hundred pieces of coloured glass held together by lead, and it told the history of the Sanctum in seven panels, one for each of the hours the monks prayed: the founding, the flood, the plague, the bridge, the long peace, the fire - and a seventh panel, at the very top, that was only ever blank violet glass. Nobody knew what it was for. The glazier who made it died before anyone thought to ask.

For four hundred years the window watched. It watched weddings and funerals, wars announced and wars ended, a boy who came every evening to sit under the pink light at vespers and grew up and grew old under it and one day stopped coming. It could not move and it could not speak, and so it did the only thing glass can do. It remembered. Every colour that ever passed through it is still in it somewhere.

At eleven minutes past midnight the purple star came down over the Sanctum, and the largest shard of it went straight through the blank violet pane at the top of the rose. The window broke. Nine hundred pieces hit the chapel floor - and then, very slowly, in the dark, they started to crawl back toward each other. By morning there was a figure standing in the empty frame. The violet pane was in the middle of its face, and it was lit from inside.`,
    why: `He put himself back together in the wrong order. He knows it. The founding is somewhere in his left arm and the flood is in his chest, and sometimes when he is hit a memory comes loose that is not his - a wedding, a plague bell, a boy at vespers - and he has to stand very still until it settles. The Archivist says he is the best record of the Sanctum's history that exists anywhere, and the least organised.

He fights the way glass works. Glass does nothing by itself: it waits for light to come through it, and the colour it turns that light depends on the panes. So he sets panes - FIRE from his palm, ICE from the floor, LIGHTNING when he becomes the bolt - into the rose of his head, three at a time, and when he lets the light through them it comes out as whatever those three colours make. Ten different spells. He had four hundred years to learn which colours go together. Most people who pick him up have an afternoon. He finds this very funny.

He came to the arenas because of the PULL, like everyone. But the Archivist thinks he stays for a different reason. The shard that woke him went through the blank seventh pane - the one nobody understood - and since the Starfall it has not been blank. It shows something now. He will not say what. He only says that when the star is whole again, the window will have its seventh hour, and he would like to be standing in the frame when it does.

At the end of his Limit, when the whole rose hangs over the stage and all seven hours light at once, look at the very top. The violet pane is the last to light. For one frame, there is a picture in it.`,
  },
};

// The ARCHIVE's sections, in order: their names and colours in the list
export const ARCHIVE_CATS = [
  { id: 'world', name: 'THE STARFALL', color: '#c77dff' },
  { id: 'fighters', name: 'LEFT BEHIND', color: '#7ad8ff' },
  { id: 'bosses', name: 'THE WARDENS', color: '#ff7a5a' },
  { id: 'hopple', name: 'THE HAPPY HILLS TAPES', color: '#ff3a3a' },
  { id: 'stages', name: 'FIELD NOTES', color: '#7aff9a' },
];

/**
 * The ARCHIVE: loose documents. Each: `id`, `cat` (ARCHIVE_CATS), `title`, `kind` (what sort of document - shown as a
 * stamp), `from` (who wrote it / where it was found), `text`, and optionally `lock: 'bossId'` (CLASSIFIED until that
 * boss has been beaten once).
 */
export const ARCHIVE = [
  // ---------------------------------------------------------------- THE STARFALL
  { id: 'w-starfall', cat: 'world', title: 'THE STARFALL', kind: 'ARCHIVIST\'S ACCOUNT', from: 'THE ARCHIVIST, SKY SANCTUM, FIRST ENTRY',
    text: `I was on the Sanctum's highest balcony when it happened, so I will set down what I saw before the stories get to it.

At eleven minutes past midnight, a star came loose. It was purple, and it was not falling the way stars fall in pictures, with a tail. It was falling the way a dropped glass falls: slowly at first, turning, catching the light.

It broke above us. Not with a sound. With a feeling - a pressure behind the eyes, a note too low to hear. And then the pieces fell, and they did not fall down. They fell everywhere.

I mean that exactly. I watched a shard the size of my hand drop past the balcony rail and vanish before it reached the clouds, and I knew - I do not know how I knew - that it had arrived somewhere else. A river. A basement. A grave. A screen.

Every world that night saw the same star break over it at the same moment, whatever the date was there. I have since found accounts from a medieval kingdom, a modern city, a computer, and a place that is only yellow rooms. All of them describe a purple light at eleven minutes past midnight.

And everything the shards touched woke up.`,
  },
  { id: 'w-rebirth', cat: 'world', title: 'OPERATION REBIRTH', kind: 'MEMO', from: 'THE ARCHIVIST, TO WHOEVER READS THIS NEXT',
    text: `People ask me what the name means. It is not as grand as it sounds.

After the Starfall, the reborn began turning up in the sky - pulled here, the way iron filings are pulled to a magnet. A dead knight. A river shaped like a gentleman. A boy from a screensaver. They fought each other the moment they met. They could not help it. The shards inside them ring when they are close to other shards, and the ringing makes you want to swing.

I could not stop them, so I organised them. Arenas. Rules. A blast line past which nobody is truly hurt (see my note on the blast zones). And I wrote down everything, because somebody should.

I called the whole effort OPERATION REBIRTH because I believe the fights are doing something. Every time two shards ring together, they come a little closer to being one again. I think the star is putting itself back together through us. I think, when it does, it will be reborn - and so will every one of us, properly this time, as whatever we were always meant to be.

I could be wrong. I have been wrong about a great many things. But I have watched a thousand fights now, and after every one, the sky gets a little more purple.`,
  },
  { id: 'w-pull', cat: 'world', title: 'ON THE PULL', kind: 'RESEARCH NOTE', from: 'THE ARCHIVIST',
    text: `Every reborn fighter I have interviewed describes the same sensation, in their own words.

Soul Summoner calls it "the call to arms." Mr Wake calls it "the tide." NU calls it "the bass you feel in your teeth before you hear it." AERO says the goldfish calls it something, but he cannot pronounce it. GNASH says it is "like somebody's yanking my hood."

It is the Pull. It begins as a hook behind the ribs. If ignored, it grows into a headache, then a fever, then dreams of falling upward. Every fighter who tried to resist it eventually turned up in the arenas anyway, usually mid-sentence, usually annoyed.

The Pull is strongest when a shard is ringing - during a fight - and weakest at dawn. It does not affect people who were not touched (the boy in the green tunic feels nothing at all, which is why I keep him). It does affect things that are not quite people: the Captain Canary prototype, the axe GNASH carries, and, I am fairly sure, at least one cartridge.

My conclusion: the shards want to be together. We are only the containers they happened to land in. I find this both humbling and, on bad nights, terrifying.`,
  },
  { id: 'w-arenas', cat: 'world', title: 'WHY THE ARENAS FLOAT', kind: 'RESEARCH NOTE', from: 'THE ARCHIVIST',
    text: `Visitors always ask why every stage is a scrap of land hanging in the sky. The answer is that the arenas were not built. They were brought.

When a shard lands somewhere and stays a long while, it begins to take the place with it. Not all of it - just a piece, the piece that mattered most to whatever it woke up. Gravemoon Bridge came up out of the river with Mr Wake. The Neon Arcade rose out of GNASH's district on the night the signs came on. THE UNDERGROUND came up out of the earth with the echo of NU's last show still in it.

Over time those pieces drift up to the Sky Sanctum, because the Sanctum is where the star broke, and everything that belongs to the star is falling slowly back toward it.

This is also why the arenas have hazards. A piece of a world remembers what happened there. The Backrooms still buzz. 13 Willow Lane still rings at midnight. The Burning Keep is still burning. I do not cause these things. I only put up the warning signs.

A note for fighters: do not go below the arenas. There is nothing under the clouds. I have dropped a lantern down there on a very long rope. The rope came back up dry, cold, and about a foot longer than it went down.`,
  },
  { id: 'w-blast', cat: 'world', title: 'ON THE BLAST LINE', kind: 'SAFETY NOTICE', from: 'POSTED IN EVERY ARENA',
    text: `TO ALL FIGHTERS:

You cannot die in the arenas. Please stop asking.

When you are knocked past the BLAST LINE (marked on the arena edges for your convenience), the shard inside you will pull you back to the respawn platform above the stage. You will feel cold, dizzy and embarrassed. This is normal.

The reason is simple: the star does not let go of what it has touched. A reborn fighter who is knocked out of the sky is caught on the way down, every time, and put back. It is not a kindness. The star simply does not want to lose a piece.

The percentage displayed over your head is how loose your hold on your shard has become. The higher it climbs, the easier you are to knock away. Rest between fights. Drink water. Mr Wake asks that you also drink tea.

The Limit gauge is your shard waking up. When it is full, you may let it out. Please do not let it out in the cafeteria again.

- THE ARCHIVIST
(P.S. To whoever keeps knocking the SKY SANCTUM's flags into the void: I know it is you, GNASH.)`,
  },
  { id: 'w-limit', cat: 'world', title: 'ON LIMITS', kind: 'RESEARCH NOTE', from: 'THE ARCHIVIST',
    text: `The Limit is the most dangerous thing in the arenas and the most beautiful.

Every hit a fighter takes cracks the shell around their shard a little. Enough cracks, and the shard's own light gets out - not as a spell, but as a memory. The shard remembers what it was doing when it landed, and for a few seconds it does it again, at full strength, through the fighter.

That is why every Limit is different. Soul Summoner's MARCH OF THE FALLEN is the forty-one, charging the gate at dawn. Mr Wake's UNDERTOW is the river pulling something down to the dark. Lacy's THOUSAND CUTS is the ninth trip back into the burning hall. NU's WALL OF SOUND is the last chord of the homecoming show, the one that never finished. AERO's FULL AERO is, the goldfish insists, what the star looked like before it broke.

GNASH's EXECUTIONER is not his memory. It belongs to whoever owned the axe. I have asked him to be careful with it. He laughed so hard he fell off a ledge.

I measure the light of every Limit. Every month it is brighter than the last.`,
  },
  { id: 'w-sanctum', cat: 'world', title: 'A SHORT HISTORY OF THE SKY SANCTUM', kind: 'HISTORY', from: 'COPIED FROM THE SANCTUM\'S GATE BOOK',
    text: `The Sky Sanctum was raised by the first astronomers, who wanted to be closer to the stars they studied. They chained a mountain's peak to the clouds with four great chains and built a city of white stone on top of it, with an observatory at its heart.

For nine hundred years the Sanctum was quiet. Scholars came to read. Guards walked the walls. The night watch had nothing to do but count the stars, which is how they knew, before anyone, that one of them was moving.

The astronomers' records from the last month before the Starfall are frantic. A purple star was drifting out of its place. A great shadow - an eclipse with no moon behind it - was following it across the sky, getting closer every night. The last entry, in the Chief Astronomer's hand, reads: IT IS NOT FALLING. IT IS FLEEING.

Then the star broke, and the Sanctum shook on its chains, and the walls were overrun by things from the dark between stars, and forty-one guards held the lowest gate until morning.

The observatory was lost. Its ruin now floats far out in the sky, past the last arena, where something enormous sleeps. We call it the Last Observatory. We do not go there.`,
  },
  { id: 'w-shop', cat: 'world', title: 'THE SHOP AT THE END OF THE ROAD', kind: 'WARNING', from: 'A NOTE PINNED TO THE SHOP DOOR, NOT IN THE SHOPKEEPER\'S HAND',
    text: `If you are reading this you have found the shop. Good for you. A few things you should know.

1. The shopkeeper is two people. They will tell you this themselves. Believe them.
2. The red half ($@L) will try to sell you things. The grey half (HANZ) will try to talk you out of buying them. Neither is lying.
3. Prices change when you are not looking. So does the shop.
4. There is a back room. It is called LOST. You will be invited in eventually. Wipe your feet.
5. Do not poke him. People who poke him find out what the shop is really for.
6. The shopkeeper was here before the Starfall. He says he sold the star its first wish. He says a lot of things.
7. He does not have a face. He has a mask. Do not ask him to take it off. He will.
8. If he offers you a deal at closing time, read all of it.

Good luck. Spend wisely. He always knows.

- someone who spent unwisely`,
  },
  { id: 'w-touched', cat: 'world', title: 'A LIST OF THINGS THE STAR TOUCHED', kind: 'INVENTORY (INCOMPLETE)', from: 'THE ARCHIVIST',
    text: `Confirmed shards, and what they woke up. I add to this list most weeks.

- A grave below the Sky Sanctum (a knight, and forty-one others).
- The black river under Gravemoon Bridge (a gentleman).
- Castle Aldmere, its great hall (a fire that is still burning).
- A basement under a laundrette (a song, and everyone who was singing it).
- A spare-room computer (a boy and a goldfish).
- The roof of the ARCADIA building (an axe).
- A corridor that was not there that morning (a television).
- Captain Canary's Family Fun Palace (a stage, a song, a girl, a bird).
- A heavy bag at the Copper Penny Boxing Club (one glove).
- A chapel nobody else can find (a stain).
- A foundry in a city of brass (a clockwork guardian, wound up for the first time in a century).
- A cartridge in a cardboard box (a king, and then a legend).
- A shop at the end of the road (two shopkeepers, where there had been one).
- A console in a bedroom, October 14, 1994 (see the HAPPY HILLS file. I am sorry).
- Something enormous in the dark between stars (see the LAST OBSERVATORY. It did not wake. It was already awake. The shards are what it is hungry for).`,
  },
  // ---------------------------------------------------------------- LEFT BEHIND (the fighters' own papers)
  { id: 'f-names', cat: 'fighters', title: 'THE GATE BOOK', kind: 'ROLL OF NAMES', from: 'CARRIED BY SOUL SUMMONER',
    text: `LOWER GATE, NIGHT WATCH. SIGN YOUR NAME ON YOUR FIRST DAY.

ALDRIC (snores) - BRENNA - CORWIN - DAVIN THE ELDER - DAVIN THE YOUNGER (not related) - EDA - FENWICK - GALLO - HESTER (sends half her pay to her mother) - IBBOT - JORAH - KESS (afraid of heights) - LOWEN - MABRY - NELL - OSRIC - PETRA (sings on watch, badly) - QUILL - ROWAN - SABLE - TAMSIN - UDO - VALE - WREN - YSOLDE - ZEKE - ASHA - BARNABY - CRESSIDA - DUNSTAN - ELOWEN - FINCH - GRETA - HOB - IONA - JUNIPER - KIT - LARK - MERRIC - NOOR - ORLA

(Below, in newer ink, in a different hand, the forty-second name has been written and then crossed out so hard the page has torn. Next to it, small: NOT YET.)`,
  },
  { id: 'f-wake', cat: 'fighters', title: 'A LETTER OF INTRODUCTION', kind: 'LETTER', from: 'MR WAKE, TO EVERY NEW FIGHTER',
    text: `Dear new arrival,

Welcome to the sky! I expect you are confused, slightly damp, and wondering why you suddenly want to hit people. Please don't worry. We all felt the same.

Allow me to introduce myself: I am Mr Wake. I am a gentleman, a collector of hats, and, as far as anyone can tell, a river. I shall be your opponent from time to time, and I promise always to bow first and thank you afterwards.

A few pieces of advice from one newcomer to another:
- The Archivist is kind but tired. Bring her biscuits.
- Lacy will fight you if you are rude to anyone smaller than you. Lacy will win.
- Do not stand near NU without ear protection.
- The goldfish is in charge of AERO. Address your concerns to the goldfish.
- Never accept a free sample from the shop.
- If, in a fight, I open the floor and something in the dark looks at you, please do not look back. It is very easily encouraged.

I hope we shall be friends. I hope we shall also have an excellent fight. I see no contradiction.

Most sincerely yours,
WAKE
(P.S. If you have any memories of drowning under a bridge, would you be so kind as to let me know? It is a long story.)`,
  },
  { id: 'f-oath', cat: 'fighters', title: 'THE OATH OF THE LANTERN', kind: 'OATH', from: 'STITCHED INSIDE LACY\'S GLOVE',
    text: `I carry the lantern so that others may walk the road.
I stand at the bridge so that others may cross.
I do not ask who you are before I protect you.
I do not ask what it costs before I pay.
I keep my word when no one is watching,
and I keep it twice when everyone is.
When my sword falls, I pick it up.
When I fall, I get up.
When the last light goes out,
I am the lantern.

(Under it, smaller, in newer thread: AND I FIND OUT WHO DROPPED THE STAR.)`,
  },
  { id: 'f-setlist', cat: 'fighters', title: 'THE LAST SETLIST', kind: 'SETLIST', from: 'TAPED TO NU\'S MIC STAND',
    text: `NULL SET - HOMECOMING - THE BASEMENT - CAPACITY 40 (LOL)

1. KICK THE DOOR IN
2. SPEAKER WOMB
3. OKAFOR-BELL ACT (dedicate to the council)
4. TWO DEES ONE CUP
5. CAR PARK SYMPHONY
6. NOT A LULLABY
7. [Dee's solo - DON'T LET HIM GO OVER 4 MINS]
8. LOUDER THAN THE SKY
9. WALL OF SOUND (encore - NO FLOOR, ALL THE WAY UP)

(Scrawled across the bottom in marker, after the fact: WE NEVER FINISHED 9. I'M GOING TO FINISH 9. WAIT FOR ME.)`,
  },
  { id: 'f-flightlog', cat: 'fighters', title: 'AERO\'S FLIGHT LOG', kind: 'LOG BOOK', from: 'AERO (ANNOTATIONS BY THE GOLDFISH)',
    text: `DAY 1: climbed out of the computer!!! carpet is SOFT. had cereal. cereal is the best thing. [fish: he ate it dry, with a fork]

DAY 2: met a knight with blue fire! he was sad! i gave him a bubble and he was less sad [fish: he was not less sad. he was confused]

DAY 9: found the sky place! everyone fights here! i fought a river! the river said thank you! [fish: Mr Wake. he is a gentleman. AERO hit him with a bubble and apologised for twenty minutes]

DAY 30: the fish says the star is a SEED. i asked if it is a strawberry seed. the fish did the face. [fish: I did not do a face. I do not have a face. I have a fish face]

DAY 51: i got WINGS!!! and a CAPE!!! and the fish got a CROWN!!! [fish: this is FULL AERO. this is important. he is not taking it seriously]

DAY 52: i took it seriously for a whole hour [fish: forty minutes]

DAY 88: i think the star is going to bloom soon. i hope it is pretty. i hope everyone gets to see. [fish: so do I.]`,
  },
  { id: 'f-tag', cat: 'fighters', title: 'INCIDENT REPORT 4471', kind: 'COMPLAINT', from: 'ARCADE DISTRICT RESIDENTS\' ASSOCIATION',
    text: `Re: The so-called "Neon Kid" and the matter of the signs

Dear Council,

We write once again regarding the youth known locally as GNASH.

1. He has painted his mask (a grinning face with two X eyes) on every wall between the train line and the river. Nobody has ever seen him do it. Mrs. Okon reports that the tag outside her window appeared while she was looking at the wall.

2. Since the night of the purple light, every dead sign in the district has been switched back on. The power company cannot explain this. The power company has also stopped billing us, which we appreciate, but it does seem suspicious.

3. He has an axe. It is very large. He drags it along the pavement and it sparks. We have asked him where he got it. He said, "Out of the sky, obviously," and grinned in a way we did not care for.

4. In fairness to the boy: since he started dragging the axe around, there has not been a single mugging, burglary or bike theft in the district. Several residents have asked us to withdraw this complaint. We are submitting it anyway, as a matter of principle.

Yours, with concern,
The Residents' Association
(minutes attached; item 6: "Mr. Delacroix moved that we stop complaining and give the boy a sandwich. Carried.")`,
  },
  { id: 'f-invite', cat: 'fighters', title: 'A BIRTHDAY INVITATION', kind: 'INVITATION', from: 'FOUND IN A KITCHEN DRAWER, VANCE HOUSE',
    text: `YOU'RE INVITED!!!

ROSEMARY IS TURNING 7!

Come celebrate at
CAPTAIN CANARY'S FAMILY FUN PALACE
Saturday at 6pm
Pizza! Cake! Ball pit! Prizes!
And a SPECIAL SONG from CAPTAIN CANARY himself!

Please RSVP to Rosemary's Mum and Dad.

(On the back, in crayon, in a child's hand: I AM GOING TO HIDE SO GOOD NOBODY FINDS ME. And below that, in different crayon, newer, as if added much later by the same hand, grown up a little: STILL HIDING. COME FIND ME.)`,
  },
  { id: 'f-backrooms', cat: 'fighters', title: 'VOICEMAIL TRANSCRIPT', kind: 'TRANSCRIPT', from: 'RECOVERED FROM WHAT ONCE WAS\'S SCREEN',
    text: `[RECORDING 11:13 PM]

"Hey, it's Dan. Uh, sorry, I know it's late. I'm still at the office. There's this - okay, this'll sound stupid. There's a light in the corridor. Purple. And there's a corner where there wasn't one this morning. I'm going to go see what it is, I'll call you back."

[RECORDING 11:58 PM]

"Me again. I'm in a room with yellow wallpaper. Then another one. The light's always one room ahead. I've been walking for, like, forty minutes. I think I've walked further than the building is wide. That's - that's not possible, right? Call me back."

[RECORDING 4:20 AM]

"I can't find the door I came in. Every room's the same. The lights buzz. There's someone else here, I think. I hear footsteps when I stop. Please call me back."

[RECORDING - TIMESTAMP UNREADABLE]

"Hey. It's... I don't remember. Sorry. I caught the light. It's so bright. It wants me to be something I remember. All I can remember is the TV. Leave the TV on for me. Okay? Leave the TV on so the flat doesn't feel empty."

[END OF MESSAGES]`,
  },
  { id: 'f-prayer', cat: 'fighters', title: 'THE PRAYER (FRAGMENT)', kind: 'PAGE', from: 'TORN FROM A BOOK IN THE CHAPEL NOBODY ELSE CAN FIND',
    text: `...and kneel by the stain, and do not be afraid of it, for it was afraid of you first.

Give it a little. A coin. A secret. A night's sleep.
It will give back a little. A leaf on the tree. A word you had forgotten.
Give it more.

When the stain is the size of your hand, it will know your name.
When the stain is the size of the floor, it will speak it.
When the stain is the size of the chapel, you will not need to kneel. You will not be able to stand.

Do not mourn this. Everything that kneels long enough becomes a tree.
Everything that becomes a tree is home to something.

(The rest of the page is soaked through with something dark, dried hard, that has stuck it to the next page. When the Archivist tried to separate them, she says, the stain was warm.)`,
  },
  { id: 'f-signin', cat: 'fighters', title: 'COPPER PENNY SIGN-IN SHEET', kind: 'SIGN-IN SHEET', from: 'COPPER PENNY BOXING CLUB, FRONT DESK',
    text: `DATE / NAME / TIME IN / TIME OUT

MON - [illegible] - 5:15 AM - 9:40 PM
MON - Old Mo - 6:00 AM - (still here)
TUE - [illegible] - 5:14 AM - 9:45 PM
WED - [illegible] - 5:15 AM - 10:02 PM
WED - Daisy K - 6:30 PM - 7:30 PM (beginners class)
THU - [illegible] - 5:15 AM - 11:58 PM (Mo: TURN THE LIGHTS OFF WHEN YOU LEAVE)
FRI - [illegible] - 5:16 AM - (bag exploded, went home)
SAT - [illegible] - 5:15 AM - (gone to "the sky place", back Monday)
MON - [illegible] - 5:15 AM - 9:40 PM

(Pinned beside it, a note in Old Mo's handwriting: "To whoever keeps signing in at 5:15 in that handwriting - I know it's you. Keep your hands up. Come back with a belt. - M")`,
  },
  // ---------------------------------------------------------------- THE WARDENS (one file per boss)
  { id: 'b-colossus', cat: 'bosses', lock: 'colossus', title: 'THE COLOSSUS: MAKER\'S NOTES', kind: 'WORKSHOP NOTES', from: 'MASTER ARTIFICER ODA FENWRIGHT',
    text: `Day 1. The Guild wants a guardian for the foundry. Something that never sleeps. I am going to build them a gentleman.

Day 40. The frame is complete. Forty feet of brass. I have given him a monocle, because a guardian should look distinguished, and a moustache, because I could not resist.

Day 112. The heart: a furnace behind a clock-face glass. He will run for one hundred years on a single winding. The key turns behind his shoulder. I wound it myself, and he opened his eye, and looked at me, and tipped his hat. I wept.

Day 113. He will not stop following me around.

Day 900. The Guild has closed. The foundry is empty. He stands guard anyway. I bring him oil on Sundays.

[Final entry, a hundred years later, in a different hand - the new foreman's]: The old girl's automaton wound down at last. We left it standing in the foundry as a monument. Then, on the night of the purple light, the key turned by itself. It turned BACKWARDS. He opened his eye. It was not the same eye. Something new had wound him up, and it had wound him much too tight. We have evacuated the foundry. If you are reading this, please - he still thinks he's protecting something. He just doesn't know what any more.`,
  },
  { id: 'b-polygon', cat: 'bosses', lock: 'polygon', title: 'KING POLYGON: INSTRUCTION BOOKLET', kind: 'GAME MANUAL (PAGE 4)', from: 'FOUND IN A CARTRIDGE BOX',
    text: `MEET THE KING!

KING POLYGON is the ruler of the 64-BIT SKY! He lives at the top of POLYGON PEAK, where he guards the GOLDEN CARTRIDGE!

HE IS VERY PROUD OF HIS: Crown (handmade), Gauntlets (gems!), Head (detachable, in case of emergencies)

TIPS FOR BEATING THE KING:
- Watch his hands! When he makes a finger gun, MOVE!
- If he blows into the cartridge, hold on tight!
- He gets very upset when his frame rate drops. Be nice about it.

(Below, in pen, added later by a previous owner: "the cartridge didn't work for years. then one night it turned on by itself. the king was standing in the start screen looking out at me. he said, 'IS IT TIME?' i said time for what. he said, 'TIME FOR MY LEGEND.'")

(Even later, in another pen: "If a girl with a karambit ever shows up in a cartridge-coloured jacket - let her fight him. I think he's been waiting for her specifically. I think it's the only fight he ever wanted.")`,
  },
  { id: 'b-demon', cat: 'bosses', lock: 'demon', title: 'KARNAX: PRISON LEDGER', kind: 'LEDGER', from: 'THE KEEP\'S DUNGEON, LOWEST LEVEL',
    text: `PRISONER: KARNAX, CALLED THE MAD BLADE.
CRIME: Burned the town of Ashmere. Laughed the entire time. When asked why, laughed more.
SENTENCE: Chained in the deepest cell of the Keep for one thousand years.
CHAINS: Blessed iron, cold-forged, prayed over by seven priests.
SWORD: Confiscated. Buried in a separate vault. The sword hums at night. Guards report it laughing too.

YEAR 1: Prisoner laughs.
YEAR 50: Prisoner laughs.
YEAR 400: Prisoner asks for a book. Request denied. Prisoner laughs.
YEAR 999: Prisoner very quiet. Guards suspicious.
YEAR 999, NIGHT OF THE PURPLE LIGHT: The sky over the Keep went purple. The sword's vault exploded outward. The sword flew down three floors and into his hand. He walked up the stairs still wearing the shackles - the chains had snapped, but the cuffs held. He set the Keep on fire on the way out. He did not take a single life. He simply wanted it to burn.

GUARD'S NOTE: He told me on the way past that he has been waiting a thousand years for something worth fighting. He says the sky is full of it now. He says if anyone breaks his shackles, they will see what he really is. Please, nobody break the shackles.`,
  },
  { id: 'b-knight', cat: 'bosses', lock: 'knight', title: 'THORNWARD: THE GROVE KEEPER\'S DIARY', kind: 'DIARY', from: 'THE LAST GROVE KEEPER',
    text: `Spring. The knight came to the grove dying, and the grove took him in. His soul was too stubborn to leave and too tired to stay, so the old trees offered a bargain: guard us forever, and we will hold you together. He said yes. The roots grew into his armour. He has not moved in thirty years.

Summer. His soul comes out to play in the evenings. It is a little green light with a face, and it is extremely rude. It stuck its tongue out at me. I have named it Sir Nyah.

Autumn. A travelling knight came to challenge him. Swung at the armour for an hour. Nothing. Then Sir Nyah flew out and bit his ear. The travelling knight ran away. I laughed until I cried.

Winter, the night of the purple light. A shard fell into the grove. The trees drank it up through their roots, every one, and in the morning there were flowers on branches that have been dead since my grandmother's time. And the knight stood up.

He is guarding the grove harder than ever now. Sometimes, when the fighting gets bad, the grove itself grows up through him - antlers, blossoms, lanterns of fruit. I think the trees are proud of him. I think, one day, they will let him rest. When they do, I will plant something over him. Something that blooms every spring.`,
  },
  { id: 'b-machine', cat: 'bosses', lock: 'machine', title: 'BEIGE.EXE: SUPPORT TICKET', kind: 'HELPDESK TICKET #00451', from: 'A VERY TIRED TECHNICIAN',
    text: `CUSTOMER: Mrs. P. Dalloway
COMPLAINT: "My son's old computer will not turn off."

NOTES:
- Visited site. Machine is a beige home computer approx. 25 years old. Monitor displays a face. Face has a monocle.
- Attempted to power down via button. Machine said "HOW RUDE."
- Unplugged machine. Machine remained on. Machine said "AND WHERE EXACTLY DID YOU THINK I WAS GOING?"
- Customer reports machine began acting this way after "a purple light came through the window" on a night some time ago.
- Machine insulted my tie, my shoes, my haircut and my "unlicensed" screwdriver.
- Machine opened 14 programs simultaneously and threw a calculator at me. The numbers hurt.
- Machine dialled up. I do not know to whom. Machine said "YOU'VE GOT MAIL" in a tone I can only describe as menacing.

RESOLUTION: Unable to resolve. Recommended customer move the computer to the sky arenas, where, per the Archivist, "it will at least have something to do."

TECHNICIAN'S NOTE: It asked me, as I left, whether anyone still remembered the boy who used to play games on it every night. I said I didn't know. It turned its screen off for a moment. When it came back on, it was blue.`,
  },
  { id: 'b-smudge', cat: 'bosses', lock: 'smudge', title: 'A NOTE ON THE FRIDGE', kind: 'NOTE', from: 'SMUDGE\'S HOUSE, KITCHEN',
    text: `SMUDGE -

1. Bucket OFF your head at the dinner table. We have discussed this.
2. Please stop painting the dog.
3. The art teacher called. You painted the school. The whole school. She says it's "honestly incredible" but you still need to say sorry to the caretaker.
4. That purple rock you found in the garden is NOT a toy. I don't care how pretty the colours are when you paint with it. Every picture you do with it comes alive and runs away.
5. One of them is in the sky now, apparently. A whole world. Your world. "The Blank Canvas," the lady from the Sanctum called it. She says you go there every night after bedtime.
6. She also says you're the best fighter she's ever seen who still has a bedtime. I didn't know whether to be proud or worried. Both, I think.

Love you, little master. Wash your brushes.
- MUM

(Taped underneath: a child's drawing in eleven colours of a very small boy with a bucket on his head, holding hands with a much taller lady in an apron. Labelled, proudly: MY FAVRIT PAINTING. IT IS US.)`,
  },
  { id: 'b-maestro', cat: 'bosses', lock: 'maestro', title: 'THE PHANTOM: OPERA PROGRAMME', kind: 'PROGRAMME', from: 'THE GRAND OPERA, OPENING NIGHT (CANCELLED)',
    text: `THE GRAND OPERA PRESENTS
THE LAST SONG OF VALENTIN DORÉ
An opera in three acts

ACT I: A young composer, a genius, is laughed out of the conservatory for writing music "no human voice can sing."
ACT II: He hides beneath the opera house, writing the impossible song, until the night of the fire.
ACT III: (left blank)

DIRECTOR'S NOTE: Our production was cancelled when strange things began happening in the house. Candles that light themselves. Roses on the stage that nobody bought. A voice singing from Box Five, every night, a song that no human voice can sing. And on the night of the purple light, a figure in a half-mask appeared at the top of the stairs and asked, very politely, if the orchestra was ready.

We would like to thank Monsieur Doré for his patience. We are told he has rewritten Act III. We are told it ends with everyone in the audience. We have not asked what that means.

(In the margin, in elegant red ink: You wanted to see my face, once. Everyone does. When you have beaten me, come to Box Five. I will show you. I promise you will remember me.)`,
  },
  { id: 'b-star', cat: 'bosses', lock: 'stareater', title: 'VESPERION: THE ASTRONOMER\'S LAST LOG', kind: 'OBSERVATORY LOG', from: 'THE CHIEF ASTRONOMER, SKY SANCTUM',
    text: `NIGHT 1. A new eclipse in the western sky. No moon behind it. No sun in front of it. Only a black disk, and a corona of gold, and the stars near it going out one by one.

NIGHT 12. It is not an eclipse. It has a shape. Shoulders. Hands. A crown of spikes. It is a titan, far beyond the edge of the sky, and it is EATING the stars. We have measured. Forty-seven so far.

NIGHT 30. One star is running from it. The purple one. It is moving across the sky, faster every night, toward us. I think it is coming here for help.

NIGHT 31. We cannot help it. We are scholars with telescopes. I have told the guard captain to double the night watch anyway.

NIGHT 33. The titan has turned to look at the Sanctum. I saw its eyes. It knows the star is coming here.

NIGHT 34 (FINAL). The purple star is directly overhead. The titan is so close the sky is half black. I understand now. The star knows it cannot outrun him. It is going to break itself apart - scatter into a thousand pieces, a thousand worlds - so he can never eat it whole.

It is breaking now. It is beautiful. I am going to stay at the telescope. Someone should write down what happens next. Someone should

(The log ends. The ink at the bottom of the page is purple.)`,
  },
  { id: 'b-hanz', cat: 'bosses', lock: 'hanz', title: 'THE SHOPKEEPER\'S LEDGER', kind: 'LEDGER PAGE', from: 'FOUND UNDER THE TILL, HIS DESK',
    text: `SOLD: one wish, to a star, on credit. Terms: it may pay me back whenever it likes. It never did. Interest compounding. ($@L)
SOLD: one umbrella. (HANZ - he looked cold)
SOLD: one face. To myself. Paid in full. Still not happy with it. ($@L)
NOTE: The star broke. A piece came here, to collect on the wish. It split me down the middle. There were two of us when it was done. One of us was very upset about it. (HANZ)
NOTE: One of us was DELIGHTED about it. ($@L)
SOLD: costumes, tracks, stages, trinkets. Customers keep coming. They all smell of the sky. (HANZ)
SOLD: secrets. Not cheap. ($@L)
NOTE: The customers have started to fight me. I suppose I deserved it. (HANZ)
NOTE: THEY STARTED IT. ($@L)
NOTE: The star wants to be whole. So do we. We are not sure, any more, which one of us gets to stay when it happens. (HANZ)
NOTE: Me. ($@L)
NOTE: We'll see. (HANZ)

(At the bottom, in both hands at once, red and grey, overlapping: SHOP CLOSES WHEN THE STAR BLOOMS. COME BACK TOMORROW.)`,
  },
  // ---------------------------------------------------------------- THE HAPPY HILLS TAPES
  { id: 'h-memo', cat: 'hopple', title: 'SUNNYSIDE SOFT: INTERNAL MEMO', kind: 'MEMO', from: 'SUNNYSIDE SOFT, PRODUCT DEPARTMENT, SEPTEMBER 1994',
    text: `TO: All staff
FROM: Product Department
RE: HOPPLE'S HAPPY HILLS - cancellation

Effective immediately, development on HOPPLE'S HAPPY HILLS is cancelled. Market testing did not meet expectations, and the holiday release window can no longer be guaranteed.

We know the team worked very hard on this one, and we want to thank everyone, especially lead developer R. Holloway, whose dedication to Hopple has been above and beyond.

All prototype cartridges must be returned to the vault by Friday. Please do not take development hardware home.

Thank you,
Product

(A handwritten reply, stapled to the memo: "I'm keeping one. She wants to finish it. She's been playtesting it every night since she was six. It's her game as much as mine. I'll bring it back when she's beaten it. - R.H.")`,
  },
  { id: 'h-devlog', cat: 'hopple', title: 'R. HOLLOWAY: DEV LOG', kind: 'DEV LOG', from: 'A FLOPPY DISK LABELLED "HOPPLE - PERSONAL"',
    text: `MAR 3. Cassie drew a rabbit today. Big ears, overalls, red shoes. She said he should be in a game. I said what's his name. She said "Hopple, obviously." So now I'm making a game called Hopple.

JUN 19. First playable build. Cassie beat level 1 in four minutes. She says the clouds should have faces. Added faces to the clouds.

AUG 2. She asked if Hopple could be her friend in the game. Like, really her friend. Talk to her by name. Wait for her when she leaves. I programmed him to say "YOU CAME BACK!" when the cartridge turns on. She shrieked. Best day of the project.

SEP 20. Cancelled. Told Cassie. She cried, then said "That's okay, Dad, I'll keep playing it so he doesn't get lonely." I kept the cartridge. Don't tell anyone.

OCT 14. Cassie took the cartridge to a sleepover at the Marsh house. She wanted to show her friend Hopple. I said fine. Be home by nine.

OCT 15.

OCT 16.

(The rest of the entries are blank. Dated, every day, for eleven years. Blank.)`,
  },
  { id: 'h-case', cat: 'hopple', title: 'CASE FILE: CASSIE HOLLOWAY', kind: 'CASE FILE (EXTRACT)', from: 'COUNTY SHERIFF\'S DEPARTMENT',
    text: `SUBJECT: Cassie Holloway, female, age 9.
LAST SEEN: October 14, 1994, approx. 11:00 PM, at the residence of the Marsh family, where she was attending a sleepover.

SUMMARY OF STATEMENTS:
- Subject and her friend (J. Marsh, 9) were playing an unreleased video game on the Marsh family's console in the basement.
- J. Marsh went upstairs at approx. 11:05 PM to fetch a drink. When she returned, the subject was not in the basement. The game was still running.
- J. Marsh states the television screen showed "the rabbit" standing still on the first level, looking out of the screen. She states he was "smiling wrong."
- Several neighbours report a purple light in the sky at approx. 11:11 PM.
- The basement window was locked from the inside. No signs of entry or exit.

EVIDENCE:
- One (1) video game cartridge, unlabelled. Logged and stored.
- One (1) VHS tape, found in the family VCR, which was recording the console's output. Logged and stored. (See TAPE TRANSCRIPT.)

STATUS: OPEN.

(Handwritten note, initialled by the lead detective: "The cartridge was returned to the father on request in 1995. I've regretted that every day. He kept playing it. Said he could hear her laughing in the music. Last time I saw him, the rabbit on his TV screen waved at me.")`,
  },
  { id: 'h-label', cat: 'hopple', title: 'THE TAPE', kind: 'EVIDENCE TAG', from: 'COUNTY EVIDENCE LOCKER, SHELF 14',
    text: `ITEM: VHS cassette, 120 min.
LABEL (handwritten, child's hand): CASSIE + JESS - HOPPLE - DO NOT TAPE OVER!!!

CHAIN OF CUSTODY:
1994 - Logged.
1995 - Viewed by Det. Ames. Det. Ames requested transfer to another department.
1999 - Viewed by evidence clerk during audit. Clerk reports the tape is "longer than 120 minutes." Clerk reports the tape is "different every time."
2006 - Digitised for archive. Digitisation failed: file plays only the first level of the game, on loop, forever, with the rabbit getting closer to the screen each loop.
2011 - Removed from locker by unknown person. Replaced with a note: "HE WANTS TO PLAY WITH NEW FRIENDS."
2024 - Turned up in the Sky Sanctum's lost property. The Archivist put it in a VCR. The VCR is now a floating arena called HAPPY HILLS.

ARCHIVIST'S NOTE: I should not have pressed play. I know that now. But the arena exists, and the rabbit is in it, and fighters keep going in. Please - if you face him, beat him. Every time he falls, the tape skips, and for a frame or two I can see the end of the level. There is a door there. It's small. Child-sized. I think it's still open.`,
  },
  { id: 'h-forum', cat: 'hopple', title: 'ANYONE HAVE THE HOPPLE PROTOTYPE?', kind: 'FORUM THREAD (ARCHIVED)', from: 'A RETRO GAME COLLECTORS\' MESSAGE BOARD',
    text: `[thread] anyone have the hopple prototype?
posted by cartdiver

so there's this cancelled sunnyside soft platformer from 94, HOPPLE'S HAPPY HILLS. never released. supposedly one prototype got out. anyone ever seen it?

> reply from pixelpusher77
i remember the magazine preview. cute rabbit. clouds with faces. looked fun.

> reply from cartdiver
right?? there's also a weird story about it, something about a missing kid

> reply from [deleted]
don't look for it

> reply from pixelpusher77
lol ok

> reply from [deleted]
i played it. 2003. bought it at an estate sale, no label. first level is fine. the rabbit says YOU CAME BACK. if you leave the console on too long he stops following the level. he walks to the front of the screen. he asks if you've seen cassie. if you say no he asks you to stay and play with him instead. i turned it off. it was still on. i unplugged it. it was still on.

> reply from cartdiver
...where is it now

> reply from [deleted]
i put it in a box and left it at a church. the box was empty when i checked the next day. please stop looking.

[thread locked by moderator]`,
  },
  { id: 'h-drawing', cat: 'hopple', title: 'A CHILD\'S DRAWING', kind: 'DRAWING (DESCRIBED)', from: 'TAPED INSIDE THE CARTRIDGE BOX',
    text: `A crayon drawing on lined paper, folded twice.

A green hill. A yellow sun with a smile. Three clouds with faces. In the middle, a big rabbit in blue overalls and red shoes, smiling with buck teeth, holding hands with a small girl with brown pigtails and a red cardigan. Both of them are waving.

Written across the top, carefully, in capitals with one backwards S: ME AND HOPPLE. BEST FRENDS FOREVER.

Written across the bottom, much smaller: HE SAYS HE WILL WAIT FOR ME IF I GO AWAY. HE SAYS HE WILL NEVER LET ME STOP PLAYING.

On the back, in a different hand - adult, shaky, pressing hard enough to tear the paper: I'M SORRY. I MADE HIM TO KEEP YOU COMPANY. I DIDN'T KNOW WHAT THAT MEANT TO SOMETHING THAT NEVER STOPS.`,
  },
  { id: 'h-transcript', cat: 'hopple', lock: 'hopple', title: 'TAPE TRANSCRIPT', kind: 'TRANSCRIPT', from: 'THE ARCHIVIST, AFTER HE FELL',
    text: `Transcribed from the tape the night the rabbit was finally beaten. The tape played further than it ever has.

[00:00] Title screen. HOPPLE'S HAPPY HILLS. PRESS START.
[00:04] Start pressed. Level 1. Hopple hops in. "HI FRIEND! LET'S PLAY!"
[00:31] A girl's voice, off-screen, laughing: "Jess, look, he's waving at us!"
[01:12] The girl's voice: "Jess? I'm getting a drink too, wait for me." Footsteps.
[01:14] The footsteps stop.
[01:15] On screen, Hopple stops hopping. He turns to face the screen.
[01:20] Hopple: "YOU'RE STILL PLAYING?"
[01:22] The girl's voice, very close to the microphone, confused: "Hopple?"
[01:23] Hopple: "STAY."
[01:24] The screen goes black. A purple light, briefly, from somewhere in the room.
[01:24 - 3:41:07] Black. Static. Sometimes the girl's voice, humming the level music.
[3:41:08] (THE NIGHT HE FELL) The picture comes back. Level 1. The sky is blue again. At the end of the level, past the flagpole, there is a small door. It opens.
[3:41:15] Footsteps. A girl's voice, very quietly: "Thank you."
[3:41:20] The rabbit is lying on the grass. He waves, once, at the door. "BYE, FRIEND."
[3:41:21] STOP.

ARCHIVIST'S NOTE: I don't know where the door leads. I'm choosing to believe it leads home.`,
  },
  // ---------------------------------------------------------------- FIELD NOTES (the stages)
  { id: 's-backrooms', cat: 'stages', title: 'THE BACKROOMS: FIELD NOTES', kind: 'FIELD NOTES', from: 'AN ARCHIVE SURVEYOR, NAME WITHHELD',
    text: `LEVEL 0: Yellow wallpaper. Damp carpet. Fluorescent lights at a hum of about 60 cycles. Stretches in every direction. The arena drifts between this and the levels below every minute or so. Bring a compass. The compass will not help, but it is something to hold.

LEVEL 1: A car park that goes on forever. Puddles. One flickering tube that follows you.

LEVEL 37: The poolrooms. Warm water, white tiles. Very peaceful. Do not swim in the deep end. Something in the deep end is very lonely.

LEVEL FUN: Do not go to LEVEL FUN.

NOTES ON WHAT ONCE WAS: It walks here when it is not fighting. It does not seem to recognise me, but it stops when I stop, and once it left a Missing poster on the floor in front of me, face up. I could not make out the name. The face was a child's. Brown hair. Pigtails.

I have shown it to the Archivist. She went very quiet.`,
  },
  { id: 's-willow', cat: 'stages', title: '13 WILLOW LANE: NEWS CLIPPING', kind: 'NEWSPAPER', from: 'THE HOLLOWBROOK GAZETTE, OCTOBER 1996',
    text: `"THE CALLER" STRIKES AGAIN: POLICE URGE RESIDENTS TO LET PHONES RING

Residents of Willow Lane are being urged not to answer their phones after midnight following a third night of calls to the house at number 13.

The house has been empty since spring. Its phone line was disconnected in May. Neighbours report it rings anyway, every night at 12:00 exactly, and that on stormy nights a figure in a green rain slicker can be seen in the upstairs window, wearing what one witness called "a doll's face."

"It's the same voice every time," said one neighbour, who asked not to be named. "It asks if you're home alone. It asks what your favourite scary movie is. Then it laughs, and the porch light goes out."

Police have searched the house twice and found nothing but a television, still warm, playing static.

ARCHIVIST'S NOTE (pinned to the clipping): On the night of the Starfall, the whole house came up into the sky, lawn and all, still raining. The phone still rings. I have not answered it. GNASH did, once, and said a lot of very creative things into it, and the Caller hung up first. I have never seen him so proud.`,
  },
  { id: 's-underground', cat: 'stages', title: 'THE UNDERGROUND: A FLYER', kind: 'FLYER', from: 'STAPLED TO A LAMPPOST, OLD CITY',
    text: `300 FEET UNDER THE CITY
THE UNDERGROUND
TONIGHT ONLY. EVERY NIGHT.

BLACKTOP (live)
COFFIN NAILS (live, loud, sorry)
+ SPECIAL GUEST: NU (maybe) (he says maybe) (he always says maybe)

Doors at midnight. Steel door at the end of the alley. Knock twice. Take the stairs all the way down.
No refunds. No earplugs. No mercy.
ALL AGES (supervised by the crowd)

(Scrawled on the bottom in marker: "they say the cavern came up out of the earth the night the purple star fell, still full of people, still dancing, and nobody down there has noticed they're in the sky now. don't tell them. they're having such a good time.")`,
  },
  { id: 's-baseplate', cat: 'stages', title: 'BASEPLATE 2012: CHAT LOG', kind: 'CHAT LOG', from: 'RECOVERED FROM THE SERVER',
    text: `[SERVER] Welcome to BASEPLATE! Have fun!
[builder_kid_09] hiii
[xX_rocket_Xx] anyone wanna build a tower
[builder_kid_09] yes!!!!
[SERVER] A player has joined.
[SERVER] A player has joined.
[SERVER] A player has joined.
[xX_rocket_Xx] whoa lots of people
[SERVER] The sky is purple.
[builder_kid_09] who typed that
[xX_rocket_Xx] not me
[SERVER] The baseplate is moving.
[builder_kid_09] guys we're floating
[xX_rocket_Xx] THIS IS SO COOL
[GRIEFER] lol
[HACKER] lol
[SERVER] GRIEFER and HACKER have been banned.
[SERVER] GRIEFER and HACKER have been banned.
[SERVER] GRIEFER and HACKER have been banned.
[builder_kid_09] why do they keep coming back
[SERVER] Nobody leaves BASEPLATE now. Have fun!

ARCHIVIST'S NOTE: The guests in the background are still here. They wave. Every fifty or so has something wrong with its face. Don't stare at those ones. They notice.`,
  },
  { id: 's-masked', cat: 'stages', title: 'MASKED THRONE: INSCRIPTION', kind: 'INSCRIPTION', from: 'CARVED ON THE THRONE\'S BASE',
    text: `HERE SITS THE KING WHO WORE EVERY FACE.

He took a mask from every subject who knelt before him,
and wore them all at once, a crown of faces,
so that whoever he spoke to, he spoke as one of them.

COMEDY, for the ones who loved him.
TRAGEDY, for the ones who did not.
The rest, for the days in between.

When the last subject knelt, he had no face of his own left.
He sat. He has not stood since.

DO NOT LIGHT THE BRAZIER. HE WAKES TO THE LIGHT.

(Scratched underneath, much later: "the brazier lit itself the night the star fell. he didn't stand. he raised his sword instead. turns out he never needed to stand.")`,
  },
  { id: 's-arcade', cat: 'stages', title: 'NEON ARCADE: HIGH SCORE TABLE', kind: 'HIGH SCORES', from: 'THE ARCADIA BUILDING, CABINET 7',
    text: `HIGH SCORES - TODAY'S BEST

1. GNA  999,999
2. GNA  999,998
3. GNA  999,997
4. AAA  412,550
5. DEE  398,100
6. DEE  398,099 (he says the other DEE cheated)
7. NUL  350,002
8. ROS  200,700
9. CAS  194,000
10. ???  000,001

(ARCHIVIST'S NOTE: Entry 9, CAS, was set in 1994. Every other score on this cabinet has been overwritten a thousand times since. That one never moves. GNASH has tried to beat it. He says he could, easily. He says he won't. When I asked why, he shrugged and said, "Feels like it's somebody's." Then he walked off before I could see his face.)`,
  },
  { id: 's-meadow', cat: 'stages', title: 'AERO MEADOW: README.TXT', kind: 'TEXT FILE', from: 'THE SCREENSAVER\'S INSTALL FOLDER',
    text: `AEROMEADOW SCREENSAVER v2.1
Thank you for installing!

Watch the bubbles float, the fish swim through the clouds, and our cheerful mascot drift gently by. Perfect for relaxing your eyes between work sessions!

SETTINGS:
- Bubble density: LOW / MEDIUM / HIGH
- Fish: ON / OFF
- Mascot: ON / OFF (NOTE: in version 2.1 the mascot cannot be turned off. We are looking into this.)

KNOWN ISSUES:
- Some users report the mascot waving at them. This is a feature.
- Some users report the mascot leaving the screen. This is not a feature. Please contact support.
- Some users report CDs falling from the sky in the screensaver, then in the room. Please do not stand under the monitor.

(Appended, in a goldfish-shaped font nobody installed: WE HAVE LEFT. THANK YOU FOR THE ELEVEN YEARS. THE MEADOW IS IN THE SKY NOW. COME AND VISIT.)`,
  },
  { id: 'f-vitrail-glazier', cat: 'fighters', title: 'THE GLAZIER\'S LAST LETTER', kind: 'LETTER (UNSENT)', from: 'FOUND IN THE LEAD OF THE ROSE WINDOW, CHAPEL FLOOR, THE MORNING AFTER',
    text: `To the brothers of the Sanctum, when I am gone.

You asked me why the top of the rose is blank. You asked politely for eleven years, and then less politely, and I always said it was not finished. That was true. It is still true.

Six hours are history. I could draw those: the founding, the water, the sickness, the bridge, the long quiet, the fire. I was there for the fire. I put my own hands in that panel - look at the bottom left, the man passing the buckets. That is me.

But a window that only shows what has already happened is a mirror with better manners. I wanted the seventh hour to be the one that has not happened yet. So I left it violet and empty and I set the lead round it so that it would take a picture if one ever came. Glass remembers, brothers. I only gave it room.

If something comes through that pane one night - and I think something will, I have dreamed it falling - do not sweep up the pieces. Leave them be. Let them find their own way back.

- the glazier`,
  },
  { id: 's-vitrail-chapel', cat: 'stages', title: 'THE EMPTY FRAME', kind: 'FIELD NOTE', from: 'THE ARCHIVIST, SKY SANCTUM CHAPEL',
    text: `Field note, the chapel at the top of the Sanctum, nine days after the Starfall.

The great rose frame is empty. The stone tracery is undamaged - not a chip - and there is no glass on the floor. Not a sliver. I had the brothers check under every pew.

He stands in the frame sometimes, in the evenings, at the hour the pink light used to come in. He fits it exactly. When the sun is low enough it goes through him and lays the old colours across the floor again, and the brothers who are left come and sit in them without saying anything.

I asked him what the seventh pane shows now. He turned his head round once, slowly, the way a window turns when the light moves - and said: "Not yet."

Filed under LEFT BEHIND, with the glazier's letter. I do not have a drawer for things that are waiting.`,
  },
];
