// The Story Mixer question bank. Family Mad-Libs: each person privately answers
// ten rapid-fire cards; the 30 answers become the ingredients a story is built
// from. Internal ingredient "types" and "tiers" are structure only and are never
// shown to the family. Keep the tone fast and funny — party game, not homework.

export type IngredientTier = "core" | "flavor" | "callback";

// Ingredient types carry a tier (how the story engine uses them) and a reveal
// verb template used when a highlight is announced ("{who} decided ...").
export interface IngredientMeta {
  tier: IngredientTier;
  // A short lead-in shown above the value during the family reveal.
  reveal: string;
  // Relative importance when picking reveal highlights (higher = more likely).
  weight: number;
}

export const ingredientTypes = {
  // ---- Core plot ----
  setting: { tier: "core", reveal: "the whole thing happens at", weight: 9 },
  problem: { tier: "core", reveal: "the thing that goes wrong is", weight: 9 },
  flavor: { tier: "core", reveal: "it turns out to be", weight: 6 },
  hero: { tier: "core", reveal: "the one who saves the day is", weight: 8 },
  villain: { tier: "core", reveal: "nobody should trust", weight: 9 },
  goal: { tier: "core", reveal: "what we are secretly after is", weight: 7 },
  obstacle: { tier: "core", reveal: "standing in the way is", weight: 6 },
  rule: { tier: "core", reveal: "the rule everyone must follow:", weight: 8 },
  twist: { tier: "core", reveal: "the twist nobody saw coming:", weight: 8 },
  ending: {
    tier: "core",
    reveal: "before it ends, this must happen:",
    weight: 8,
  },
  // ---- Flavor ----
  object: { tier: "flavor", reveal: "someone brings along", weight: 5 },
  food: { tier: "flavor", reveal: "the snack of the evening is", weight: 4 },
  vehicle: { tier: "flavor", reveal: "the getaway vehicle is", weight: 6 },
  disguise: { tier: "flavor", reveal: "the disguise is", weight: 5 },
  sound: { tier: "flavor", reveal: "a sound keeps coming back:", weight: 3 },
  weather: { tier: "flavor", reveal: "the weather refuses to cooperate:", weight: 3 },
  job: { tier: "flavor", reveal: "somebody's job is apparently", weight: 4 },
  phrase: { tier: "flavor", reveal: "the catchphrase of the night:", weight: 5 },
  place: { tier: "flavor", reveal: "there is a very specific spot:", weight: 3 },
  habit: { tier: "flavor", reveal: "one character will not stop", weight: 4 },
  // ---- Callback / Easter egg ----
  dadHas: { tier: "callback", reveal: "Dad, for no reason, has", weight: 7 },
  maxSkill: { tier: "callback", reveal: "Max is inexplicably great at", weight: 7 },
  keepsake: { tier: "callback", reveal: "nobody is allowed to throw away", weight: 6 },
  mustAppear: { tier: "callback", reveal: "this has to show up again:", weight: 6 },
  lucky: {
    tier: "callback",
    reveal: "one useless thing that saves everyone:",
    weight: 7,
  },
} as const;

export type IngredientType = keyof typeof ingredientTypes;

export interface QuestionOption {
  id: string;
  label: string;
}
export interface QuestionCard {
  id: string;
  type: IngredientType;
  text: string;
  options: QuestionOption[];
  // A hidden pool for "Surprise Me" — the mock picks from here deterministically.
  surprise: string[];
  // Whether the family may write their own answer. Defaults to true.
  allowCustom?: boolean;
}

const opt = (list: [string, string][]): QuestionOption[] =>
  list.map(([id, label]) => ({ id, label }));

// The bank. At least 60 cards so back-to-back stories don't feel identical.
export const questionBank: QuestionCard[] = [
  // ---------- SETTING (core) ----------
  {
    id: "set-disaster",
    type: "setting",
    text: "Where does this whole disaster begin?",
    options: opt([
      ["cruise", "A cruise ship that just left port"],
      ["park", "A theme park after closing"],
      ["hotel", "A fancy hotel at midnight"],
      ["airport", "An airport during a very long delay"],
      ["house", "Our own house, somehow"],
      ["museum", "A museum with too many alarms"],
    ]),
    surprise: ["A submarine nobody remembers boarding", "A ski lodge with no snow"],
  },
  {
    id: "set-vacation",
    type: "setting",
    text: "Pick the worst possible place to be stuck.",
    options: opt([
      ["waterpark", "A water park in the rain"],
      ["campsite", "A campsite next to a very loud owl"],
      ["mall", "A mall the moment the lights go out"],
      ["train", "A train that will not stop"],
      ["aquarium", "An aquarium after hours"],
      ["motel", "A motel shaped like a shoe"],
    ]),
    surprise: ["A rest stop at the edge of nowhere", "A castle gift shop"],
  },
  {
    id: "set-town",
    type: "setting",
    text: "What kind of town is this happening in?",
    options: opt([
      ["foggy", "A town that is always foggy"],
      ["festival", "A town in the middle of a weird festival"],
      ["tiny", "A town with exactly one traffic light"],
      ["tourist", "A tourist trap that takes itself too seriously"],
      ["seaside", "A sleepy seaside town with a secret"],
      ["snow", "A snowed-in mountain town"],
    ]),
    surprise: ["A town that is legally a single large house", "A town run entirely by cats"],
  },
  // ---------- PROBLEM (core) ----------
  {
    id: "prob-missing",
    type: "problem",
    text: "What goes wrong first?",
    options: opt([
      ["vanish", "Something important completely vanishes"],
      ["locked", "Everyone gets locked in"],
      ["swap", "Two things get hilariously swapped"],
      ["chase", "Somebody starts chasing us"],
      ["countdown", "A countdown starts and nobody knows why"],
      ["flood", "The whole place starts to flood"],
    ]),
    surprise: ["Gravity takes the night off", "Everyone forgets one specific word"],
  },
  {
    id: "prob-stolen",
    type: "problem",
    text: "Pick the crime of the century.",
    options: opt([
      ["karaoke", "Someone stole the karaoke machine"],
      ["cake", "The world's largest cake is missing"],
      ["trophy", "The championship trophy is a fake"],
      ["keys", "All the keys in town disappeared"],
      ["mascot", "The beloved mascot has been kidnapped"],
      ["wifi", "Someone unplugged the entire internet"],
    ]),
    surprise: ["The moon has been slightly moved", "Every left shoe is gone"],
  },
  {
    id: "prob-mixup",
    type: "problem",
    text: "What is the big mix-up?",
    options: opt([
      ["luggage", "We grabbed the wrong mysterious suitcase"],
      ["identity", "Everyone thinks Dad is a famous spy"],
      ["map", "The map is upside down and nobody noticed"],
      ["reservation", "We booked the wrong extremely haunted room"],
      ["twin", "There is a second family that looks just like us"],
      ["invite", "We showed up to the wrong secret meeting"],
    ]),
    surprise: ["We accidentally won an election", "We adopted a goose by mistake"],
  },
  // ---------- FLAVOR / STORY TYPE (core) ----------
  {
    id: "flav-type",
    type: "flavor",
    text: "What kind of story do we want tonight?",
    options: opt([
      ["heist", "A ridiculous heist"],
      ["mystery", "A mystery with too many clues"],
      ["chase", "A wild chase"],
      ["survival", "A silly survival adventure"],
      ["contest", "A high-stakes contest"],
      ["quest", "A grand quest for something dumb"],
    ]),
    surprise: ["A courtroom drama about a sandwich", "A rescue mission for a houseplant"],
  },
  {
    id: "flav-mood",
    type: "flavor",
    text: "How dramatic are we being about this?",
    options: opt([
      ["epic", "Epic, like the fate of the world"],
      ["cozy", "Cozy, but with one big problem"],
      ["spooky", "Spooky but never actually scary"],
      ["goofy", "Completely goofy"],
      ["sneaky", "Sneaky and full of schemes"],
      ["heartfelt", "Secretly heartfelt"],
    ]),
    surprise: ["Like a nature documentary narrated badly", "Like a commercial that got out of hand"],
  },
  // ---------- HERO (core) ----------
  {
    id: "hero-who",
    type: "hero",
    text: "Who is secretly the hero of this one?",
    options: opt([
      ["mia", "Mia, obviously"],
      ["max", "Max the dog"],
      ["mom", "Mom, being terrifyingly competent"],
      ["dad", "Dad, purely by accident"],
      ["all", "All of us, chaotically together"],
      ["stranger", "A stranger we just met"],
    ]),
    surprise: ["The hotel's oldest employee", "A very confident pigeon"],
  },
  {
    id: "hero-power",
    type: "hero",
    text: "What is our secret advantage?",
    options: opt([
      ["snacks", "We brought an unreasonable amount of snacks"],
      ["max", "Max notices everything"],
      ["mia-brain", "Mia figures out puzzles instantly"],
      ["mom-plan", "Mom already has a plan"],
      ["dad-luck", "Dad is impossibly lucky"],
      ["nobody", "Nobody expects us to do anything"],
    ]),
    surprise: ["We are weirdly good at trivia", "We can all whistle the same song"],
  },
  // ---------- VILLAIN (core) ----------
  {
    id: "vil-trust",
    type: "villain",
    text: "Who should we absolutely NOT trust?",
    options: opt([
      ["magician", "An overly cheerful magician"],
      ["guide", "A tour guide who knows too much"],
      ["mascot", "A mascot that never breaks character"],
      ["waiter", "A waiter who keeps whispering"],
      ["neighbor", "A neighbor with binoculars"],
      ["twin", "Someone who looks exactly like Mom"],
    ]),
    surprise: ["The suspiciously nice weather forecaster", "A butler with three phones"],
  },
  {
    id: "vil-boss",
    type: "villain",
    text: "Who is behind the whole thing?",
    options: opt([
      ["mayor", "The town's smiling mayor"],
      ["chef", "A world-famous chef"],
      ["kid", "A very polite ten-year-old"],
      ["ceo", "The CEO of a snack company"],
      ["captain", "The ship's captain"],
      ["influencer", "A local celebrity nobody can name"],
    ]),
    surprise: ["A committee that meets in a broom closet", "A parrot with a clipboard"],
  },
  // ---------- GOAL (core) ----------
  {
    id: "goal-want",
    type: "goal",
    text: "What are we actually trying to get?",
    options: opt([
      ["recipe", "A secret recipe"],
      ["ticket", "The last golden ticket"],
      ["dog", "Max's stolen favorite ball"],
      ["treasure", "Treasure hidden in plain sight"],
      ["answer", "The answer to one specific question"],
      ["home", "Just to get home before breakfast"],
    ]),
    surprise: ["The world's okayest participation medal", "A single very important sock"],
  },
  {
    id: "goal-win",
    type: "goal",
    text: "What does winning look like?",
    options: opt([
      ["trophy", "Lifting a slightly-too-heavy trophy"],
      ["escape", "Escaping before anyone notices"],
      ["proof", "Proving we were right all along"],
      ["rescue", "Rescuing someone silly"],
      ["record", "Setting a very specific world record"],
      ["nap", "Finally being allowed to nap"],
    ]),
    surprise: ["Getting our deposit back", "Being invited back next year"],
  },
  // ---------- OBSTACLE (core) ----------
  {
    id: "obs-block",
    type: "obstacle",
    text: "What is standing in our way?",
    options: opt([
      ["guards", "Extremely bored security guards"],
      ["maze", "A hedge maze that rearranges itself"],
      ["line", "An impossibly long line"],
      ["bridge", "A bridge that asks riddles"],
      ["crowd", "A crowd all wearing the same costume"],
      ["rules", "A person who only speaks in rules"],
    ]),
    surprise: ["A very slow revolving door", "A goose union on strike"],
  },
  {
    id: "obs-timer",
    type: "obstacle",
    text: "What makes this urgent?",
    options: opt([
      ["closing", "The place closes in one hour"],
      ["tide", "The tide is coming in"],
      ["show", "The big show is about to start"],
      ["battery", "The last flashlight is dying"],
      ["train", "The last train leaves soon"],
      ["cake", "The cake is melting"],
    ]),
    surprise: ["A nap time nobody can skip", "A parking meter running out"],
  },
  // ---------- RULE (core) ----------
  {
    id: "rule-follow",
    type: "rule",
    text: "Pick a rule everyone has to follow.",
    options: opt([
      ["banana", "Nobody can say the word banana"],
      ["whisper", "Everyone must whisper after sunset"],
      ["shoes", "Shoes are illegal indoors"],
      ["question", "Answer every question with a question"],
      ["backward", "Nobody can walk backward"],
      ["compliment", "You must compliment every door"],
    ]),
    surprise: ["No pointing, only nodding", "Everyone must hum while running"],
  },
  {
    id: "rule-weird",
    type: "rule",
    text: "What is the strange local custom?",
    options: opt([
      ["hats", "Everyone wears enormous hats"],
      ["names", "You must introduce your snack"],
      ["left", "You can only turn left"],
      ["quiet", "The town has one designated shouting hour"],
      ["trade", "You pay for things with jokes"],
      ["wave", "You must wave at every statue"],
    ]),
    surprise: ["Tuesdays are pronounced differently", "All doors must be knocked on twice"],
  },
  // ---------- TWIST (core) ----------
  {
    id: "twist-reveal",
    type: "twist",
    text: "What is the big twist?",
    options: opt([
      ["inside", "It was an inside job the whole time"],
      ["fake", "The treasure was fake, but the map was real"],
      ["friend", "The villain just wanted a friend"],
      ["dream", "One of us has been asleep this whole time"],
      ["max", "Max understood everything from the start"],
      ["us", "We caused the problem in the first place"],
    ]),
    surprise: ["There were two of everything all along", "The building was the map"],
  },
  {
    id: "twist-secret",
    type: "twist",
    text: "What secret comes out at the worst time?",
    options: opt([
      ["door", "There was a secret door all along"],
      ["twin", "Someone has a secret twin"],
      ["contest", "It was a contest nobody entered"],
      ["famous", "Max is quietly famous here"],
      ["swap", "The real thing was swapped days ago"],
      ["family", "We are distantly related to the villain"],
    ]),
    surprise: ["The map was in the snack bag", "Everyone else is also lost"],
  },
  // ---------- ENDING REQUIREMENT (core) ----------
  {
    id: "end-must",
    type: "ending",
    text: "Something that MUST happen before the story ends.",
    options: opt([
      ["fountain", "Someone falls into a fountain"],
      ["speech", "Dad gives a dramatic speech"],
      ["dance", "There is an unnecessary dance number"],
      ["confession", "The villain confesses everything"],
      ["treat", "Max gets an enormous treat"],
      ["rescue", "We rescue something small and grumpy"],
    ]),
    surprise: ["A parade breaks out", "Everyone gets matching pajamas"],
  },
  {
    id: "end-feeling",
    type: "ending",
    text: "How should this whole thing wrap up?",
    options: opt([
      ["hug", "With a big ridiculous group hug"],
      ["trophy", "With a trophy we did not earn"],
      ["escape", "With a very narrow escape"],
      ["snack", "With everyone finally eating"],
      ["sunset", "Walking off into a very fake sunset"],
      ["sequel", "With an obvious threat of a sequel"],
    ]),
    surprise: ["With the whole town apologizing", "With a certificate of participation"],
  },
  // ---------- OBJECT (flavor) ----------
  {
    id: "obj-useless",
    type: "object",
    text: "Pick a completely useless thing to bring along.",
    options: opt([
      ["kazoo", "A kazoo"],
      ["snowglobe", "A very heavy snow globe"],
      ["map", "A map of a different city"],
      ["umbrella", "A broken umbrella"],
      ["trophy", "A tiny trophy for nothing"],
      ["cone", "A single traffic cone"],
    ]),
    surprise: ["A wind-up dinosaur that only walks backward", "A jar labeled 'later'"],
  },
  {
    id: "obj-pocket",
    type: "object",
    text: "What is rattling around in someone's pocket?",
    options: opt([
      ["marbles", "Exactly forty marbles"],
      ["whistle", "A whistle that plays the wrong note"],
      ["coupon", "An extremely expired coupon"],
      ["key", "A key to something we no longer own"],
      ["rubber", "A rubber chicken named Gerald"],
      ["compass", "A compass that only points at snacks"],
    ]),
    surprise: ["A fortune cookie with a threat inside", "Half a walkie-talkie"],
  },
  {
    id: "obj-gadget",
    type: "object",
    text: "Choose a gadget we absolutely do not need.",
    options: opt([
      ["binoculars", "Binoculars that only zoom out"],
      ["flashlight", "A flashlight that hums"],
      ["watch", "A watch set to the wrong planet"],
      ["fan", "A tiny fan for dramatic moments"],
      ["camera", "A camera with no film"],
      ["remote", "A universal remote for nothing"],
    ]),
    surprise: ["A metal detector that only finds forks", "Night-vision goggles for daytime"],
  },
  // ---------- FOOD (flavor) ----------
  {
    id: "food-snack",
    type: "food",
    text: "What snack fuels this adventure?",
    options: opt([
      ["waffles", "An alarming number of waffles"],
      ["pretzels", "One giant pretzel"],
      ["gummies", "Suspiciously glowing gummies"],
      ["soup", "Soup, in a cup, somehow"],
      ["popcorn", "Popcorn that keeps popping"],
      ["cheese", "A very old wheel of cheese"],
    ]),
    surprise: ["A sandwich labeled 'do not eat'", "Ice cream that refuses to melt"],
  },
  {
    id: "food-fancy",
    type: "food",
    text: "What is the fanciest thing on the menu?",
    options: opt([
      ["cake", "A cake taller than Dad"],
      ["noodles", "Endless noodles"],
      ["tiny", "Extremely tiny food"],
      ["flaming", "A dessert that is briefly on fire"],
      ["mystery", "The 'mystery plate'"],
      ["pancake", "A single, warm, glowing pancake"],
    ]),
    surprise: ["A soup that stares back", "Spaghetti served in a shoe"],
  },
  // ---------- VEHICLE (flavor) ----------
  {
    id: "veh-getaway",
    type: "vehicle",
    text: "Pick our terrible getaway vehicle.",
    options: opt([
      ["golfcart", "A golf cart"],
      ["swan", "A pedal boat shaped like a swan"],
      ["shopping", "A runaway shopping cart"],
      ["tandem", "A tandem bike, badly balanced"],
      ["float", "A parade float"],
      ["zamboni", "A borrowed zamboni"],
    ]),
    surprise: ["A very patient donkey", "A luggage carousel we never got off"],
  },
  {
    id: "veh-arrive",
    type: "vehicle",
    text: "How do we make a dramatic entrance?",
    options: opt([
      ["scooter", "On one very small scooter"],
      ["canoe", "In a canoe, on land"],
      ["balloon", "By hot air balloon, slightly on fire"],
      ["skateboard", "On a skateboard built for two"],
      ["horse", "On a horse named after a snack"],
      ["segway", "On a fleet of confused rental scooters"],
    ]),
    surprise: ["Sliding in on a room-service cart", "Riding the world's slowest escalator"],
  },
  // ---------- DISGUISE (flavor) ----------
  {
    id: "dis-costume",
    type: "disguise",
    text: "Pick our embarrassing disguise.",
    options: opt([
      ["mascot", "A sweaty mascot costume"],
      ["waiters", "Matching waiter outfits"],
      ["plants", "Dressed as potted plants"],
      ["tourists", "Aggressively normal tourists"],
      ["band", "A marching band nobody hired"],
      ["ghost", "One bedsheet, three people"],
    ]),
    surprise: ["Very unconvincing statues", "A pantomime horse, but for four"],
  },
  {
    id: "dis-fake",
    type: "disguise",
    text: "What is our fake identity?",
    options: opt([
      ["inspectors", "Very official inspectors"],
      ["chefs", "World-renowned chefs"],
      ["judges", "Judges of a contest we invented"],
      ["royalty", "Minor royalty, definitely"],
      ["delivery", "Extremely confident delivery people"],
      ["scientists", "Scientists studying the carpet"],
    ]),
    surprise: ["The new lighthouse committee", "Professional nappers"],
  },
  // ---------- SOUND (flavor) ----------
  {
    id: "snd-noise",
    type: "sound",
    text: "What sound keeps happening at the worst moments?",
    options: opt([
      ["kazoo", "A distant kazoo"],
      ["bark", "One very specific bark"],
      ["hum", "A hum nobody can locate"],
      ["ding", "An elevator ding with no elevator"],
      ["squeak", "A single squeaky shoe"],
      ["music", "Hold music, everywhere"],
    ]),
    surprise: ["A foghorn that sounds apologetic", "Applause from an empty room"],
  },
  // ---------- WEATHER (flavor) ----------
  {
    id: "wea-sky",
    type: "weather",
    text: "What is the weather absolutely refusing to do?",
    options: opt([
      ["rain", "It will not stop raining, indoors"],
      ["fog", "Fog that only follows Dad"],
      ["wind", "Wind that steals exactly one thing"],
      ["heat", "A heat wave in one room"],
      ["snow", "Snow that falls upward"],
      ["sun", "Sunshine at midnight"],
    ]),
    surprise: ["A tiny personal thundercloud", "Rainbows, aggressively"],
  },
  // ---------- JOB (flavor) ----------
  {
    id: "job-weird",
    type: "job",
    text: "Give someone a ridiculous job.",
    options: opt([
      ["taster", "Official cake taster"],
      ["whisperer", "Professional goose whisperer"],
      ["tester", "Mattress tester, on the clock"],
      ["namer", "The person who names hurricanes"],
      ["untangler", "Full-time cord untangler"],
      ["mascot", "Backup mascot"],
    ]),
    surprise: ["Elevator music composer", "Keeper of the one good pen"],
  },
  // ---------- PHRASE (flavor) ----------
  {
    id: "phr-say",
    type: "phrase",
    text: "Pick a phrase someone keeps saying.",
    options: opt([
      ["fine", "\"This is fine.\""],
      ["plan", "\"That was the plan all along.\""],
      ["max", "\"Ask Max.\""],
      ["door", "\"Do NOT open that door.\""],
      ["snack", "\"We'll deal with it after snacks.\""],
      ["trust", "\"Trust me, I read a book about this.\""],
    ]),
    surprise: ["\"Nobody panic, I'm barely panicking.\"", "\"It's technically not illegal.\""],
  },
  {
    id: "phr-motto",
    type: "phrase",
    text: "What is the family motto for tonight?",
    options: opt([
      ["forward", "\"Only forward, mostly.\""],
      ["snacks", "\"Snacks first, questions later.\""],
      ["together", "\"We panic together.\""],
      ["max", "\"When in doubt, follow the dog.\""],
      ["loud", "\"If it's loud, it's working.\""],
      ["home", "\"Home before the toast is cold.\""],
    ]),
    surprise: ["\"Bold choices, gentle landings.\"", "\"We meant to do that.\""],
  },
  // ---------- PLACE DETAIL (flavor) ----------
  {
    id: "plc-spot",
    type: "place",
    text: "Name one weirdly specific spot in this place.",
    options: opt([
      ["fountain", "A fountain nobody is allowed near"],
      ["door", "A door painted to look like a wall"],
      ["room", "The room labeled 'do not'"],
      ["statue", "A statue of someone very confused"],
      ["closet", "A broom closet with a chandelier"],
      ["elevator", "An elevator that only goes sideways"],
    ]),
    surprise: ["A hallway that is somehow uphill both ways", "A gift shop with one item"],
  },
  // ---------- HABIT (flavor) ----------
  {
    id: "hab-cant",
    type: "habit",
    text: "What will one character NOT stop doing?",
    options: opt([
      ["narrate", "Narrating everything out loud"],
      ["collect", "Collecting little pamphlets"],
      ["snack", "Sneaking snacks mid-sentence"],
      ["photos", "Taking photos of doors"],
      ["names", "Naming every animal they see"],
      ["shortcuts", "Insisting on shortcuts"],
    ]),
    surprise: ["Reorganizing other people's bags", "Saying 'noted' and writing nothing"],
  },
  // ---------- DAD HAS (callback) ----------
  {
    id: "dad-has",
    type: "dadHas",
    text: "Pick something Dad has for absolutely no good reason.",
    options: opt([
      ["waffle", "A waffle maker"],
      ["blower", "A leaf blower"],
      ["cone", "A traffic cone"],
      ["flamingo", "An inflatable flamingo"],
      ["helmet", "A medieval helmet"],
      ["map", "A laminated map of a mall"],
    ]),
    surprise: ["A jar of assorted buttons", "A tiny accordion"],
  },
  {
    id: "dad-carry",
    type: "dadHas",
    text: "What did Dad 'bring just in case'?",
    options: opt([
      ["rope", "Forty feet of rope"],
      ["snacks", "A backpack that is only snacks"],
      ["radio", "A radio that gets one station"],
      ["glue", "Way too much glue"],
      ["horn", "A bike horn"],
      ["gnome", "A garden gnome"],
    ]),
    surprise: ["A folding chair, always", "A spare mustache"],
  },
  // ---------- MAX SKILL (callback) ----------
  {
    id: "max-good",
    type: "maxSkill",
    text: "What is Max inexplicably amazing at?",
    options: opt([
      ["doors", "Finding secret doors"],
      ["poker", "Poker"],
      ["lies", "Detecting lies"],
      ["cart", "Driving a golf cart"],
      ["rooms", "Opening hotel rooms"],
      ["directions", "Knowing exactly where to go"],
    ]),
    surprise: ["Winning staring contests", "Predicting the weather"],
  },
  {
    id: "max-trick",
    type: "maxSkill",
    text: "What is Max's most useful talent?",
    options: opt([
      ["sniff", "Sniffing out the villain"],
      ["dig", "Digging in exactly the right spot"],
      ["distract", "Distracting anyone instantly"],
      ["balance", "Balancing on absolutely anything"],
      ["fetch", "Fetching the one important item"],
      ["nap", "Napping through danger, heroically"],
    ]),
    surprise: ["Understanding three languages", "Operating vending machines"],
  },
  // ---------- KEEPSAKE (callback) ----------
  {
    id: "keep-throw",
    type: "keepsake",
    text: "What is somebody refusing to throw away?",
    options: opt([
      ["ticket", "A ticket stub from years ago"],
      ["rock", "A rock shaped like a rock"],
      ["hat", "A hat that no longer fits"],
      ["receipt", "A very long receipt"],
      ["shell", "A single seashell"],
      ["magnet", "A fridge magnet from nowhere"],
    ]),
    surprise: ["A balloon, mostly deflated", "A pinecone with a name"],
  },
  // ---------- MUST APPEAR (callback) ----------
  {
    id: "must-appear",
    type: "mustAppear",
    text: "Something that HAS to show up again later.",
    options: opt([
      ["duck", "A rubber duck"],
      ["note", "A mysterious note"],
      ["song", "One specific song"],
      ["stranger", "That stranger from the beginning"],
      ["stain", "A suspicious stain"],
      ["key", "A key that fits nothing yet"],
    ]),
    surprise: ["A very persistent seagull", "A second, smaller map"],
  },
  // ---------- LUCKY / USELESS-BECOMES-USEFUL (callback) ----------
  {
    id: "lucky-save",
    type: "lucky",
    text: "Pick a stupid object that unexpectedly saves the day.",
    options: opt([
      ["kazoo", "That kazoo"],
      ["cone", "A single traffic cone"],
      ["gum", "One piece of gum"],
      ["sock", "A very long sock"],
      ["magnet", "A surprisingly strong magnet"],
      ["balloon", "A slightly deflated balloon"],
    ]),
    surprise: ["An unopened ketchup packet", "A whistle nobody could hear"],
  },
  {
    id: "lucky-hero",
    type: "lucky",
    text: "What ends up being the secret weapon?",
    options: opt([
      ["snack", "The emergency snack"],
      ["rope", "Dad's pointless rope"],
      ["dance", "A truly terrible dance"],
      ["horn", "A very loud horn"],
      ["list", "A to-do list nobody finished"],
      ["umbrella", "The broken umbrella"],
    ]),
    surprise: ["A coupon, finally useful", "A pocket full of marbles"],
  },
  // ---------- Extra variety so back-to-back stories differ ----------
  {
    id: "set-building",
    type: "setting",
    text: "Pick the building we should not be inside.",
    options: opt([
      ["library", "A library that is far too quiet"],
      ["factory", "A factory that makes one weird thing"],
      ["theater", "An old theater between shows"],
      ["bank", "A bank that only holds buttons"],
      ["lighthouse", "A lighthouse with the light off"],
      ["arcade", "An arcade after the power flickers"],
    ]),
    surprise: ["A greenhouse full of suspicious plants", "A wax museum, obviously"],
  },
  {
    id: "prob-curse",
    type: "problem",
    text: "What ridiculous curse is on this place?",
    options: opt([
      ["backward", "Everything works backward after dark"],
      ["duplicate", "Anything left alone duplicates"],
      ["swap", "Names keep swapping between people"],
      ["shrink", "One room slowly shrinks"],
      ["loop", "The last five minutes keep repeating"],
      ["polite", "Everyone is forced to be unbearably polite"],
    ]),
    surprise: ["All clocks run on snack time", "Shadows do their own thing"],
  },
  {
    id: "hero-team",
    type: "hero",
    text: "Who forms the unlikely team?",
    options: opt([
      ["mia-max", "Mia and Max, unstoppable"],
      ["parents", "Mom and Dad, finally agreeing"],
      ["max-solo", "Max, leading everyone"],
      ["mia-stranger", "Mia and a brand-new friend"],
      ["everyone", "The whole family plus a goose"],
      ["mom-mia", "Mom and Mia, scheming"],
    ]),
    surprise: ["Dad and a very smart broom", "Max and the night janitor"],
  },
  {
    id: "vil-clue",
    type: "villain",
    text: "How do we spot the culprit?",
    options: opt([
      ["smile", "They smile a little too much"],
      ["shoes", "They keep hiding their shoes"],
      ["snack", "They refuse to share snacks"],
      ["notes", "They take suspicious notes"],
      ["gloves", "They never take off their gloves"],
      ["max", "Max growls only at them"],
    ]),
    surprise: ["They hum the villain music themselves", "They own two clipboards"],
  },
  {
    id: "obj-wear",
    type: "object",
    text: "Pick a pointless thing someone insists on wearing.",
    options: opt([
      ["cape", "A cape, for confidence"],
      ["goggles", "Swim goggles, indoors"],
      ["boots", "Boots two sizes too big"],
      ["scarf", "A scarf in summer"],
      ["badge", "A badge that says 'BOSS'"],
      ["hat", "A hat with a working fan"],
    ]),
    surprise: ["Novelty glasses with a fake nose", "One very fancy glove"],
  },
  {
    id: "food-emergency",
    type: "food",
    text: "What is the emergency snack for tonight?",
    options: opt([
      ["granola", "Suspiciously sturdy granola bars"],
      ["crackers", "A sleeve of crackers"],
      ["juice", "One juice box, shared"],
      ["mints", "An entire tin of mints"],
      ["jerky", "Mystery jerky"],
      ["fruit", "A single, very important banana"],
    ]),
    surprise: ["Trail mix with no nuts, just candy", "A thermos of soup, again"],
  },
  {
    id: "veh-broken",
    type: "vehicle",
    text: "What barely-working ride do we find?",
    options: opt([
      ["train", "A tiny train from a kids' ride"],
      ["boat", "A leaky rowboat"],
      ["cart", "A wobbly luggage cart"],
      ["mower", "A ride-on lawn mower"],
      ["ferris", "A single Ferris wheel car"],
      ["sled", "A sled, with no snow"],
    ]),
    surprise: ["A bumper car that escaped", "A very determined tricycle"],
  },
  {
    id: "snd-signal",
    type: "sound",
    text: "What is the secret signal?",
    options: opt([
      ["whistle", "Two short whistles"],
      ["bark", "One dramatic bark"],
      ["clap", "A very specific clap"],
      ["song", "The first line of a song"],
      ["knock", "A knock nobody taught anyone"],
      ["cough", "An obviously fake cough"],
    ]),
    surprise: ["A kazoo, of course", "The word 'pineapple' at full volume"],
  },
  {
    id: "wea-trouble",
    type: "weather",
    text: "What weather makes everything harder?",
    options: opt([
      ["storm", "A storm that is weirdly polite"],
      ["heat", "Sticky, dramatic heat"],
      ["ice", "Ice on every single step"],
      ["wind", "Wind that only blows uphill"],
      ["mist", "Mist that smells like waffles"],
      ["glare", "Sun exactly in our eyes"],
    ]),
    surprise: ["Sudden confetti weather", "A drizzle of warm apple juice"],
  },
  {
    id: "job-title",
    type: "job",
    text: "What is somebody weirdly official about?",
    options: opt([
      ["inspector", "Being the snack inspector"],
      ["captain", "Being 'team captain'"],
      ["mapper", "Being the map holder"],
      ["timer", "Being the official timekeeper"],
      ["greeter", "Being the door greeter"],
      ["scout", "Being the advance scout"],
    ]),
    surprise: ["Chief of vibes", "Assistant to the dog"],
  },
  {
    id: "plc-hidden",
    type: "place",
    text: "Where is the perfect hiding spot?",
    options: opt([
      ["curtain", "Behind a very short curtain"],
      ["plant", "Inside a giant potted plant"],
      ["cart", "Under a room-service cart"],
      ["costume", "In the spare mascot suit"],
      ["fountain", "In (not near) the fountain"],
      ["piano", "Inside an old piano"],
    ]),
    surprise: ["In plain sight, wearing a name tag", "Up a tree that shouldn't be indoors"],
  },
  {
    id: "hab-quirk",
    type: "habit",
    text: "What quirk gives someone away every time?",
    options: opt([
      ["humming", "Humming when nervous"],
      ["counting", "Counting everything out loud"],
      ["snacking", "Snacking during emergencies"],
      ["saluting", "Saluting for no reason"],
      ["rhyming", "Accidentally rhyming"],
      ["tiptoe", "Tiptoeing everywhere, loudly"],
    ]),
    surprise: ["Announcing their own footsteps", "Whispering 'sneaky' while sneaking"],
  },
  {
    id: "dad-skill",
    type: "dadHas",
    text: "What oddly specific thing is Dad weirdly proud of?",
    options: opt([
      ["parallel", "Perfect parallel parking"],
      ["whistle", "A two-fingered whistle"],
      ["knots", "Knowing every knot"],
      ["grill", "Grilling in any conditions"],
      ["directions", "Never using directions"],
      ["coupons", "An elaborate coupon system"],
    ]),
    surprise: ["Folding a fitted sheet", "Naming every cloud"],
  },
  {
    id: "max-sense",
    type: "maxSkill",
    text: "What can Max sense that nobody else can?",
    options: opt([
      ["danger", "Danger, three rooms away"],
      ["snacks", "Hidden snacks, anywhere"],
      ["liars", "Exactly who is lying"],
      ["exits", "The nearest secret exit"],
      ["weather", "When it's about to rain"],
      ["friends", "Who is actually nice"],
    ]),
    surprise: ["When the story is almost over", "The one trustworthy stranger"],
  },
  {
    id: "keep-treasure",
    type: "keepsake",
    text: "What silly treasure must be protected at all costs?",
    options: opt([
      ["mug", "A chipped favorite mug"],
      ["drawing", "A drawing Mia made age four"],
      ["ticket", "A movie ticket from a great day"],
      ["patch", "A jacket patch"],
      ["spoon", "A weirdly perfect spoon"],
      ["pebble", "A pebble named Kevin"],
    ]),
    surprise: ["A single mismatched sock", "A postcard nobody sent"],
  },
  {
    id: "must-return",
    type: "mustAppear",
    text: "What early detail has to come back at the end?",
    options: opt([
      ["fountain", "That fountain, obviously"],
      ["stranger", "The whistling stranger"],
      ["snack", "The emergency snack"],
      ["sign", "A sign we ignored"],
      ["hat", "The runaway hat"],
      ["door", "The door marked 'do not'"],
    ]),
    surprise: ["The pigeon from page one", "A joke nobody laughed at"],
  },
];

// A quick lookup by id (used to resolve assignments back to their card).
export const questionById: Map<string, QuestionCard> = new Map(
  questionBank.map((q) => [q.id, q]),
);
