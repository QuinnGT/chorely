/**
 * Curated emoji catalog and keyword-based suggester for chore icons.
 *
 * `suggestEmoji(text)` returns the best emoji match for a chore name by
 * scoring each catalog entry's keywords against the input tokens. Higher
 * scores come from longer/more-specific keyword matches.
 *
 * `searchEmojis(query)` filters the catalog for the picker UI.
 *
 * Pure functions — no React, no DOM.
 */

export type EmojiCategory =
  | 'cleaning'
  | 'kitchen'
  | 'food'
  | 'clothes'
  | 'home'
  | 'pets'
  | 'nature'
  | 'school'
  | 'music'
  | 'sports'
  | 'tools'
  | 'transport'
  | 'rewards'
  | 'weather'
  | 'people'
  | 'symbols';

export const CATEGORY_LABELS: Readonly<Record<EmojiCategory, string>> = {
  cleaning: 'Cleaning & Care',
  kitchen: 'Kitchen',
  food: 'Food & Drink',
  clothes: 'Clothes & Laundry',
  home: 'Home & Rooms',
  pets: 'Pets & Animals',
  nature: 'Plants & Nature',
  school: 'School & Art',
  music: 'Music',
  sports: 'Sports & Play',
  tools: 'Tools & Tasks',
  transport: 'Transport',
  rewards: 'Rewards & Symbols',
  weather: 'Weather & Time',
  people: 'People',
  symbols: 'Hearts & Misc',
};

export interface EmojiEntry {
  readonly emoji: string;
  readonly name: string;
  readonly category: EmojiCategory;
  readonly keywords: readonly string[];
}

// Order matters only for ties: earlier entries win, so put the more "default"
// choice for an ambiguous keyword first (e.g. wastebasket before recycle for "trash").
// Entries are grouped by category so they render together in the picker.
export const EMOJI_CATALOG: readonly EmojiEntry[] = [
  // ─── Cleaning & Care ───────────────────────────────────────────────────
  { emoji: '🧹', name: 'broom', category: 'cleaning', keywords: ['broom', 'sweep', 'sweeping', 'floor', 'floors'] },
  { emoji: '🧽', name: 'sponge', category: 'cleaning', keywords: ['sponge', 'wipe', 'wiping', 'scrub', 'scrubbing', 'clean', 'cleaning', 'wash'] },
  { emoji: '🧼', name: 'soap', category: 'cleaning', keywords: ['soap', 'wash', 'washing', 'hands', 'handwash'] },
  { emoji: '🪣', name: 'bucket', category: 'cleaning', keywords: ['bucket', 'mop', 'mopping'] },
  { emoji: '🧴', name: 'lotion bottle', category: 'cleaning', keywords: ['lotion', 'spray', 'cleaner', 'shampoo', 'sanitizer'] },
  { emoji: '🧺', name: 'basket', category: 'cleaning', keywords: ['basket', 'laundry', 'laundery'] },
  { emoji: '🧻', name: 'roll of paper', category: 'cleaning', keywords: ['paper', 'towel', 'towels', 'tissue', 'toiletpaper'] },
  { emoji: '💨', name: 'dash', category: 'cleaning', keywords: ['dust', 'dusting'] },
  { emoji: '🗑️', name: 'wastebasket', category: 'cleaning', keywords: ['trash', 'garbage', 'rubbish', 'bin', 'bins', 'can', 'cans', 'wastebasket', 'waste', 'dump'] },
  { emoji: '♻️', name: 'recycle', category: 'cleaning', keywords: ['recycle', 'recycling', 'compost'] },
  { emoji: '🩹', name: 'bandage', category: 'cleaning', keywords: ['bandage', 'firstaid', 'bandaid', 'boo-boo'] },
  { emoji: '🩺', name: 'stethoscope', category: 'cleaning', keywords: ['doctor', 'health', 'checkup', 'medicine'] },
  { emoji: '💊', name: 'pill', category: 'cleaning', keywords: ['pill', 'medicine', 'vitamin', 'vitamins'] },
  { emoji: '🦷', name: 'tooth', category: 'cleaning', keywords: ['tooth', 'teeth', 'floss', 'flossing'] },
  { emoji: '🪥', name: 'toothbrush', category: 'cleaning', keywords: ['brush', 'brushing', 'teeth', 'tooth', 'toothbrush', 'dental'] },
  { emoji: '🪒', name: 'razor', category: 'cleaning', keywords: ['razor', 'shave'] },
  { emoji: '🪞', name: 'mirror', category: 'cleaning', keywords: ['mirror', 'reflection'] },

  // ─── Kitchen ───────────────────────────────────────────────────────────
  { emoji: '🍽️', name: 'plate with utensils', category: 'kitchen', keywords: ['dishes', 'dish', 'plate', 'plates', 'dinner', 'eat', 'table', 'setting', 'placemat'] },
  { emoji: '🍴', name: 'fork and knife', category: 'kitchen', keywords: ['cutlery', 'utensils', 'silverware', 'fork', 'knife'] },
  { emoji: '🥄', name: 'spoon', category: 'kitchen', keywords: ['spoon'] },
  { emoji: '🥢', name: 'chopsticks', category: 'kitchen', keywords: ['chopsticks'] },
  { emoji: '🍳', name: 'cooking', category: 'kitchen', keywords: ['cook', 'cooking', 'breakfast', 'eggs', 'pan'] },
  { emoji: '🥘', name: 'shallow pan', category: 'kitchen', keywords: ['pan', 'pot', 'dinner', 'lunch'] },
  { emoji: '🫖', name: 'teapot', category: 'kitchen', keywords: ['teapot', 'kettle'] },
  { emoji: '🧂', name: 'salt', category: 'kitchen', keywords: ['salt', 'shaker'] },
  { emoji: '🧊', name: 'ice', category: 'kitchen', keywords: ['ice', 'freezer', 'fridge', 'refrigerator'] },
  { emoji: '🪤', name: 'mousetrap', category: 'kitchen', keywords: ['mousetrap', 'pest'] },

  // ─── Food & Drink ──────────────────────────────────────────────────────
  { emoji: '🍞', name: 'bread', category: 'food', keywords: ['bread', 'toast', 'sandwich'] },
  { emoji: '🥖', name: 'baguette', category: 'food', keywords: ['baguette', 'french', 'loaf'] },
  { emoji: '🥪', name: 'sandwich', category: 'food', keywords: ['sandwich', 'lunch'] },
  { emoji: '🍕', name: 'pizza', category: 'food', keywords: ['pizza'] },
  { emoji: '🍔', name: 'burger', category: 'food', keywords: ['burger', 'hamburger'] },
  { emoji: '🌮', name: 'taco', category: 'food', keywords: ['taco'] },
  { emoji: '🍝', name: 'spaghetti', category: 'food', keywords: ['spaghetti', 'pasta', 'noodles'] },
  { emoji: '🥗', name: 'salad', category: 'food', keywords: ['salad', 'greens'] },
  { emoji: '🍎', name: 'apple', category: 'food', keywords: ['apple', 'fruit', 'snack'] },
  { emoji: '🍌', name: 'banana', category: 'food', keywords: ['banana'] },
  { emoji: '🍇', name: 'grapes', category: 'food', keywords: ['grapes', 'grape'] },
  { emoji: '🍓', name: 'strawberry', category: 'food', keywords: ['strawberry', 'berry'] },
  { emoji: '🥦', name: 'broccoli', category: 'food', keywords: ['broccoli', 'vegetable', 'veggies', 'vegetables'] },
  { emoji: '🥕', name: 'carrot', category: 'food', keywords: ['carrot'] },
  { emoji: '🌽', name: 'corn', category: 'food', keywords: ['corn'] },
  { emoji: '🥚', name: 'egg', category: 'food', keywords: ['egg', 'eggs'] },
  { emoji: '🧀', name: 'cheese', category: 'food', keywords: ['cheese'] },
  { emoji: '🥞', name: 'pancakes', category: 'food', keywords: ['pancakes', 'pancake'] },
  { emoji: '🍿', name: 'popcorn', category: 'food', keywords: ['popcorn', 'movie'] },
  { emoji: '🍪', name: 'cookie', category: 'food', keywords: ['cookie', 'snack', 'dessert'] },
  { emoji: '🍰', name: 'cake slice', category: 'food', keywords: ['cake'] },
  { emoji: '🎂', name: 'birthday cake', category: 'food', keywords: ['birthday', 'cake', 'party'] },
  { emoji: '🍦', name: 'ice cream', category: 'food', keywords: ['icecream', 'dessert'] },
  { emoji: '🍯', name: 'honey', category: 'food', keywords: ['honey'] },
  { emoji: '🥛', name: 'glass of milk', category: 'food', keywords: ['milk', 'drink', 'glass'] },
  { emoji: '☕', name: 'coffee', category: 'food', keywords: ['coffee', 'tea', 'hot'] },
  { emoji: '🍵', name: 'tea', category: 'food', keywords: ['tea', 'matcha'] },
  { emoji: '🥤', name: 'cup with straw', category: 'food', keywords: ['drink', 'soda', 'cup'] },
  { emoji: '🧃', name: 'juice box', category: 'food', keywords: ['juice', 'juicebox'] },
  { emoji: '🍺', name: 'beer', category: 'food', keywords: ['beer', 'beverage'] },

  // ─── Clothes & Laundry ─────────────────────────────────────────────────
  { emoji: '👕', name: 'shirt', category: 'clothes', keywords: ['shirt', 'clothes', 'clothing', 'wear'] },
  { emoji: '👖', name: 'jeans', category: 'clothes', keywords: ['jeans', 'pants', 'trousers'] },
  { emoji: '🧦', name: 'socks', category: 'clothes', keywords: ['socks', 'sock'] },
  { emoji: '👟', name: 'shoe', category: 'clothes', keywords: ['shoes', 'shoe', 'sneakers'] },
  { emoji: '👞', name: 'dress shoe', category: 'clothes', keywords: ['dressshoe', 'formal'] },
  { emoji: '🥿', name: 'flat shoe', category: 'clothes', keywords: ['flat', 'flats'] },
  { emoji: '👒', name: 'sun hat', category: 'clothes', keywords: ['sunhat'] },
  { emoji: '🧢', name: 'cap', category: 'clothes', keywords: ['hat', 'cap'] },
  { emoji: '🧣', name: 'scarf', category: 'clothes', keywords: ['scarf'] },
  { emoji: '🧤', name: 'gloves', category: 'clothes', keywords: ['gloves', 'glove', 'mittens'] },
  { emoji: '🧥', name: 'coat', category: 'clothes', keywords: ['coat', 'jacket'] },
  { emoji: '👗', name: 'dress', category: 'clothes', keywords: ['dress'] },
  { emoji: '🧷', name: 'safety pin', category: 'clothes', keywords: ['pin', 'mending', 'sew'] },

  // ─── Home & Rooms ──────────────────────────────────────────────────────
  { emoji: '🏠', name: 'house', category: 'home', keywords: ['house', 'home', 'tidy', 'tidying'] },
  { emoji: '🏡', name: 'house with garden', category: 'home', keywords: ['home', 'garden'] },
  { emoji: '🛏️', name: 'bed', category: 'home', keywords: ['bed', 'make', 'making', 'sheets', 'pillow', 'bedroom', 'sleep'] },
  { emoji: '🧸', name: 'teddy bear', category: 'home', keywords: ['toy', 'toys', 'stuffed', 'teddy', 'plushie'] },
  { emoji: '🪑', name: 'chair', category: 'home', keywords: ['chair', 'desk', 'seat'] },
  { emoji: '🛋️', name: 'couch', category: 'home', keywords: ['couch', 'sofa', 'living', 'room'] },
  { emoji: '💡', name: 'light bulb', category: 'home', keywords: ['light', 'lights', 'lamp', 'bulb'] },
  { emoji: '🪞', name: 'mirror', category: 'home', keywords: ['mirror'] },
  { emoji: '🪟', name: 'window', category: 'home', keywords: ['window', 'windows', 'glass'] },
  { emoji: '🚪', name: 'door', category: 'home', keywords: ['door', 'doors'] },
  { emoji: '🔑', name: 'key', category: 'home', keywords: ['key', 'lock'] },
  { emoji: '🚽', name: 'toilet', category: 'home', keywords: ['toilet', 'bathroom', 'flush'] },
  { emoji: '🛁', name: 'bathtub', category: 'home', keywords: ['bath', 'bathtub', 'tub'] },
  { emoji: '🚿', name: 'shower', category: 'home', keywords: ['shower', 'showering'] },
  { emoji: '🛒', name: 'shopping cart', category: 'home', keywords: ['shopping', 'cart', 'groceries'] },
  { emoji: '🛍️', name: 'shopping bags', category: 'home', keywords: ['shopping', 'bags'] },
  { emoji: '📦', name: 'package', category: 'home', keywords: ['package', 'box', 'mail', 'amazon', 'delivery', 'unbox', 'unpack'] },
  { emoji: '📬', name: 'mailbox', category: 'home', keywords: ['mail', 'mailbox', 'letters'] },
  { emoji: '🪜', name: 'ladder', category: 'home', keywords: ['ladder'] },

  // ─── Pets & Animals ────────────────────────────────────────────────────
  { emoji: '🐶', name: 'dog', category: 'pets', keywords: ['dog', 'puppy', 'walk', 'walking', 'pet'] },
  { emoji: '🐱', name: 'cat', category: 'pets', keywords: ['cat', 'kitten', 'kitty', 'litter'] },
  { emoji: '🐭', name: 'mouse', category: 'pets', keywords: ['mouse'] },
  { emoji: '🐹', name: 'hamster', category: 'pets', keywords: ['hamster', 'gerbil'] },
  { emoji: '🐰', name: 'rabbit', category: 'pets', keywords: ['rabbit', 'bunny'] },
  { emoji: '🦊', name: 'fox', category: 'pets', keywords: ['fox'] },
  { emoji: '🐻', name: 'bear', category: 'pets', keywords: ['bear'] },
  { emoji: '🐼', name: 'panda', category: 'pets', keywords: ['panda'] },
  { emoji: '🐯', name: 'tiger', category: 'pets', keywords: ['tiger'] },
  { emoji: '🦁', name: 'lion', category: 'pets', keywords: ['lion'] },
  { emoji: '🐮', name: 'cow', category: 'pets', keywords: ['cow', 'farm'] },
  { emoji: '🐷', name: 'pig', category: 'pets', keywords: ['pig'] },
  { emoji: '🐸', name: 'frog', category: 'pets', keywords: ['frog'] },
  { emoji: '🐢', name: 'turtle', category: 'pets', keywords: ['turtle'] },
  { emoji: '🐍', name: 'snake', category: 'pets', keywords: ['snake'] },
  { emoji: '🐔', name: 'chicken', category: 'pets', keywords: ['chicken', 'hen'] },
  { emoji: '🐣', name: 'hatching chick', category: 'pets', keywords: ['chick', 'bird', 'birds', 'coop'] },
  { emoji: '🦆', name: 'duck', category: 'pets', keywords: ['duck'] },
  { emoji: '🦉', name: 'owl', category: 'pets', keywords: ['owl'] },
  { emoji: '🐧', name: 'penguin', category: 'pets', keywords: ['penguin'] },
  { emoji: '🐝', name: 'bee', category: 'pets', keywords: ['bee', 'honey'] },
  { emoji: '🐞', name: 'ladybug', category: 'pets', keywords: ['ladybug', 'bug'] },
  { emoji: '🦋', name: 'butterfly', category: 'pets', keywords: ['butterfly'] },
  { emoji: '🐌', name: 'snail', category: 'pets', keywords: ['snail'] },
  { emoji: '🕷️', name: 'spider', category: 'pets', keywords: ['spider'] },
  { emoji: '🐟', name: 'fish', category: 'pets', keywords: ['fish', 'aquarium', 'tank'] },
  { emoji: '🐠', name: 'tropical fish', category: 'pets', keywords: ['fish', 'tropical'] },
  { emoji: '🐬', name: 'dolphin', category: 'pets', keywords: ['dolphin'] },
  { emoji: '🐳', name: 'whale', category: 'pets', keywords: ['whale'] },
  { emoji: '🦄', name: 'unicorn', category: 'pets', keywords: ['unicorn'] },
  { emoji: '🐲', name: 'dragon', category: 'pets', keywords: ['dragon'] },
  { emoji: '🦴', name: 'bone', category: 'pets', keywords: ['bone'] },
  { emoji: '🐾', name: 'paw prints', category: 'pets', keywords: ['paw', 'paws', 'animal', 'animals'] },

  // ─── Plants & Nature ───────────────────────────────────────────────────
  { emoji: '🪴', name: 'potted plant', category: 'nature', keywords: ['plant', 'plants', 'pot', 'gardening'] },
  { emoji: '🌿', name: 'herb', category: 'nature', keywords: ['herb', 'leaf', 'leaves', 'garden'] },
  { emoji: '🌱', name: 'seedling', category: 'nature', keywords: ['seedling', 'sprout', 'grow'] },
  { emoji: '🌳', name: 'deciduous tree', category: 'nature', keywords: ['tree', 'trees'] },
  { emoji: '🌲', name: 'evergreen tree', category: 'nature', keywords: ['tree', 'pine', 'forest'] },
  { emoji: '🌴', name: 'palm tree', category: 'nature', keywords: ['palm', 'beach'] },
  { emoji: '🌵', name: 'cactus', category: 'nature', keywords: ['cactus'] },
  { emoji: '🍄', name: 'mushroom', category: 'nature', keywords: ['mushroom'] },
  { emoji: '🍃', name: 'leaf fluttering', category: 'nature', keywords: ['leaves', 'leaf', 'rake', 'raking', 'fall', 'autumn'] },
  { emoji: '🌾', name: 'sheaf of rice', category: 'nature', keywords: ['grass', 'lawn', 'mow', 'mowing', 'yard', 'weed', 'weeds', 'weeding'] },
  { emoji: '🌻', name: 'sunflower', category: 'nature', keywords: ['flower', 'flowers', 'sunflower'] },
  { emoji: '🌹', name: 'rose', category: 'nature', keywords: ['rose', 'flower'] },
  { emoji: '🌷', name: 'tulip', category: 'nature', keywords: ['tulip', 'flower'] },
  { emoji: '🌼', name: 'daisy', category: 'nature', keywords: ['daisy', 'flower'] },
  { emoji: '🌸', name: 'cherry blossom', category: 'nature', keywords: ['blossom', 'sakura', 'flower'] },
  { emoji: '💧', name: 'droplet', category: 'nature', keywords: ['water', 'watering', 'drop', 'droplet'] },
  { emoji: '🌊', name: 'wave', category: 'nature', keywords: ['wave', 'ocean', 'sea'] },
  { emoji: '🔥', name: 'fire', category: 'nature', keywords: ['fire', 'flame'] },
  { emoji: '🌎', name: 'earth', category: 'nature', keywords: ['earth', 'world', 'planet'] },

  // ─── School & Art ──────────────────────────────────────────────────────
  { emoji: '📚', name: 'books', category: 'school', keywords: ['homework', 'study', 'studying', 'read', 'reading', 'books', 'school'] },
  { emoji: '📖', name: 'open book', category: 'school', keywords: ['book', 'read', 'reading', 'story'] },
  { emoji: '📒', name: 'ledger', category: 'school', keywords: ['notebook', 'journal'] },
  { emoji: '📓', name: 'composition book', category: 'school', keywords: ['notebook'] },
  { emoji: '✏️', name: 'pencil', category: 'school', keywords: ['pencil', 'write', 'writing', 'draw'] },
  { emoji: '🖊️', name: 'pen', category: 'school', keywords: ['pen', 'ballpoint'] },
  { emoji: '🖍️', name: 'crayon', category: 'school', keywords: ['crayon', 'color'] },
  { emoji: '🖌️', name: 'paintbrush', category: 'school', keywords: ['paintbrush', 'paint'] },
  { emoji: '🎨', name: 'artist palette', category: 'school', keywords: ['art', 'paint', 'painting', 'draw', 'drawing'] },
  { emoji: '📝', name: 'memo', category: 'school', keywords: ['memo', 'notes', 'journal', 'note', 'writing'] },
  { emoji: '📐', name: 'triangular ruler', category: 'school', keywords: ['ruler', 'math', 'geometry'] },
  { emoji: '📏', name: 'straight ruler', category: 'school', keywords: ['ruler', 'measure'] },
  { emoji: '🧮', name: 'abacus', category: 'school', keywords: ['abacus', 'math', 'count'] },
  { emoji: '✂️', name: 'scissors', category: 'school', keywords: ['scissors', 'cut'] },
  { emoji: '📎', name: 'paperclip', category: 'school', keywords: ['paperclip'] },
  { emoji: '📌', name: 'pushpin', category: 'school', keywords: ['pin', 'pushpin'] },
  { emoji: '🎒', name: 'backpack', category: 'school', keywords: ['backpack', 'bag', 'school'] },
  { emoji: '📅', name: 'calendar', category: 'school', keywords: ['calendar', 'date', 'schedule'] },
  { emoji: '🗓️', name: 'spiral calendar', category: 'school', keywords: ['calendar', 'schedule'] },
  { emoji: '🌍', name: 'globe', category: 'school', keywords: ['globe', 'geography', 'world'] },
  { emoji: '🔬', name: 'microscope', category: 'school', keywords: ['microscope', 'science'] },
  { emoji: '🔭', name: 'telescope', category: 'school', keywords: ['telescope', 'astronomy', 'stars'] },
  { emoji: '🧪', name: 'test tube', category: 'school', keywords: ['testtube', 'science', 'experiment'] },
  { emoji: '🧬', name: 'dna', category: 'school', keywords: ['dna', 'biology'] },
  { emoji: '🖼️', name: 'framed picture', category: 'school', keywords: ['picture', 'frame', 'art'] },
  { emoji: '📷', name: 'camera', category: 'school', keywords: ['camera', 'photo'] },
  { emoji: '🎬', name: 'clapper', category: 'school', keywords: ['movie', 'film', 'clapper'] },

  // ─── Music ─────────────────────────────────────────────────────────────
  { emoji: '🎵', name: 'musical note', category: 'music', keywords: ['music', 'practice', 'song'] },
  { emoji: '🎶', name: 'musical notes', category: 'music', keywords: ['music', 'notes'] },
  { emoji: '🎤', name: 'microphone', category: 'music', keywords: ['mic', 'microphone', 'sing', 'singing', 'karaoke'] },
  { emoji: '🎧', name: 'headphones', category: 'music', keywords: ['headphones'] },
  { emoji: '🎼', name: 'musical score', category: 'music', keywords: ['score', 'sheet', 'music'] },
  { emoji: '🎹', name: 'piano', category: 'music', keywords: ['piano', 'practice'] },
  { emoji: '🎸', name: 'guitar', category: 'music', keywords: ['guitar', 'practice'] },
  { emoji: '🎻', name: 'violin', category: 'music', keywords: ['violin', 'fiddle'] },
  { emoji: '🥁', name: 'drum', category: 'music', keywords: ['drum', 'drums'] },
  { emoji: '🎺', name: 'trumpet', category: 'music', keywords: ['trumpet'] },
  { emoji: '🎷', name: 'saxophone', category: 'music', keywords: ['saxophone', 'sax'] },

  // ─── Sports & Play ─────────────────────────────────────────────────────
  { emoji: '⚽', name: 'soccer ball', category: 'sports', keywords: ['soccer', 'ball'] },
  { emoji: '🏀', name: 'basketball', category: 'sports', keywords: ['basketball'] },
  { emoji: '⚾', name: 'baseball', category: 'sports', keywords: ['baseball', 'softball'] },
  { emoji: '🏈', name: 'football', category: 'sports', keywords: ['football'] },
  { emoji: '🎾', name: 'tennis', category: 'sports', keywords: ['tennis'] },
  { emoji: '🏐', name: 'volleyball', category: 'sports', keywords: ['volleyball'] },
  { emoji: '🏓', name: 'ping pong', category: 'sports', keywords: ['pingpong', 'tabletennis'] },
  { emoji: '🏸', name: 'badminton', category: 'sports', keywords: ['badminton'] },
  { emoji: '⛳', name: 'golf flag', category: 'sports', keywords: ['golf'] },
  { emoji: '🎳', name: 'bowling', category: 'sports', keywords: ['bowling'] },
  { emoji: '🏊', name: 'swimmer', category: 'sports', keywords: ['swim', 'swimming', 'pool'] },
  { emoji: '🏄', name: 'surfer', category: 'sports', keywords: ['surf', 'surfing'] },
  { emoji: '🚴', name: 'cyclist', category: 'sports', keywords: ['bike', 'biking', 'cycling', 'ride'] },
  { emoji: '🛹', name: 'skateboard', category: 'sports', keywords: ['skateboard', 'skating'] },
  { emoji: '🛼', name: 'roller skate', category: 'sports', keywords: ['rollerskate', 'skate'] },
  { emoji: '🧘', name: 'meditation', category: 'sports', keywords: ['yoga', 'meditation', 'meditate'] },
  { emoji: '🤸', name: 'cartwheel', category: 'sports', keywords: ['cartwheel', 'gymnastics'] },
  { emoji: '🥋', name: 'martial arts', category: 'sports', keywords: ['karate', 'martial', 'judo'] },
  { emoji: '🏃', name: 'runner', category: 'sports', keywords: ['run', 'running', 'exercise'] },
  { emoji: '🚶', name: 'walking', category: 'sports', keywords: ['walk', 'walking'] },
  { emoji: '🎯', name: 'target', category: 'sports', keywords: ['target', 'goal', 'aim'] },
  { emoji: '🎮', name: 'video game', category: 'sports', keywords: ['game', 'games', 'gaming', 'console'] },
  { emoji: '🎲', name: 'die', category: 'sports', keywords: ['dice', 'die'] },
  { emoji: '🧩', name: 'puzzle', category: 'sports', keywords: ['puzzle', 'jigsaw'] },
  { emoji: '♟️', name: 'chess', category: 'sports', keywords: ['chess'] },
  { emoji: '🎣', name: 'fishing', category: 'sports', keywords: ['fishing', 'fish'] },
  { emoji: '🎈', name: 'balloon', category: 'sports', keywords: ['balloon', 'party'] },
  { emoji: '🎁', name: 'gift', category: 'sports', keywords: ['gift', 'present', 'reward'] },

  // ─── Tools & Tasks ─────────────────────────────────────────────────────
  { emoji: '🔧', name: 'wrench', category: 'tools', keywords: ['wrench', 'fix', 'repair'] },
  { emoji: '🔨', name: 'hammer', category: 'tools', keywords: ['hammer', 'build'] },
  { emoji: '🛠️', name: 'tools', category: 'tools', keywords: ['tools', 'tool', 'repair', 'maintenance'] },
  { emoji: '🪛', name: 'screwdriver', category: 'tools', keywords: ['screwdriver'] },
  { emoji: '🪚', name: 'saw', category: 'tools', keywords: ['saw'] },
  { emoji: '⛏️', name: 'pickaxe', category: 'tools', keywords: ['pickaxe', 'mining'] },
  { emoji: '🔩', name: 'nut and bolt', category: 'tools', keywords: ['bolt', 'screw'] },
  { emoji: '📋', name: 'clipboard', category: 'tools', keywords: ['list', 'task', 'tasks', 'clipboard', 'checklist'] },
  { emoji: '✅', name: 'check mark', category: 'tools', keywords: ['check', 'done', 'complete'] },
  { emoji: '☑️', name: 'ballot box check', category: 'tools', keywords: ['checkbox', 'check'] },
  { emoji: '📌', name: 'pin', category: 'tools', keywords: ['pin'] },
  { emoji: '💼', name: 'briefcase', category: 'tools', keywords: ['briefcase', 'work', 'office'] },
  { emoji: '🛎️', name: 'bell', category: 'tools', keywords: ['bell', 'service'] },
  { emoji: '🔔', name: 'bell', category: 'tools', keywords: ['bell', 'notification', 'alert'] },

  // ─── Transport ─────────────────────────────────────────────────────────
  { emoji: '🚗', name: 'car', category: 'transport', keywords: ['car', 'vehicle', 'drive'] },
  { emoji: '🚙', name: 'suv', category: 'transport', keywords: ['suv'] },
  { emoji: '🚌', name: 'bus', category: 'transport', keywords: ['bus', 'school'] },
  { emoji: '🚓', name: 'police car', category: 'transport', keywords: ['police'] },
  { emoji: '🚑', name: 'ambulance', category: 'transport', keywords: ['ambulance'] },
  { emoji: '🚒', name: 'fire truck', category: 'transport', keywords: ['firetruck', 'fire'] },
  { emoji: '🚲', name: 'bicycle', category: 'transport', keywords: ['bicycle', 'bike'] },
  { emoji: '🛴', name: 'scooter', category: 'transport', keywords: ['scooter'] },
  { emoji: '🚂', name: 'locomotive', category: 'transport', keywords: ['train', 'locomotive'] },
  { emoji: '✈️', name: 'airplane', category: 'transport', keywords: ['plane', 'airplane', 'flight'] },
  { emoji: '🚀', name: 'rocket', category: 'transport', keywords: ['rocket', 'launch', 'space'] },
  { emoji: '🛸', name: 'ufo', category: 'transport', keywords: ['ufo', 'alien'] },
  { emoji: '⛵', name: 'sailboat', category: 'transport', keywords: ['boat', 'sail', 'sailboat'] },
  { emoji: '🚢', name: 'ship', category: 'transport', keywords: ['ship'] },

  // ─── Rewards & Symbols ─────────────────────────────────────────────────
  { emoji: '⭐', name: 'star', category: 'rewards', keywords: ['star', 'reward'] },
  { emoji: '🌟', name: 'glowing star', category: 'rewards', keywords: ['star', 'shining'] },
  { emoji: '✨', name: 'sparkles', category: 'rewards', keywords: ['sparkle', 'sparkles', 'shine', 'shiny'] },
  { emoji: '💫', name: 'dizzy', category: 'rewards', keywords: ['dizzy', 'sparkle'] },
  { emoji: '🌠', name: 'shooting star', category: 'rewards', keywords: ['shootingstar', 'wish'] },
  { emoji: '🏆', name: 'trophy', category: 'rewards', keywords: ['trophy', 'win', 'winner', 'champion'] },
  { emoji: '🥇', name: 'gold medal', category: 'rewards', keywords: ['gold', 'medal', 'first'] },
  { emoji: '🥈', name: 'silver medal', category: 'rewards', keywords: ['silver', 'medal'] },
  { emoji: '🥉', name: 'bronze medal', category: 'rewards', keywords: ['bronze', 'medal'] },
  { emoji: '🎖️', name: 'military medal', category: 'rewards', keywords: ['medal', 'honor'] },
  { emoji: '👑', name: 'crown', category: 'rewards', keywords: ['crown', 'king', 'queen'] },
  { emoji: '💎', name: 'gem', category: 'rewards', keywords: ['gem', 'diamond', 'jewel'] },
  { emoji: '💰', name: 'money bag', category: 'rewards', keywords: ['money', 'allowance', 'savings'] },
  { emoji: '🪙', name: 'coin', category: 'rewards', keywords: ['coin', 'change'] },
  { emoji: '💵', name: 'dollar bill', category: 'rewards', keywords: ['dollar', 'cash', 'money'] },
  { emoji: '🎉', name: 'party popper', category: 'rewards', keywords: ['celebrate', 'party', 'birthday'] },
  { emoji: '🎊', name: 'confetti ball', category: 'rewards', keywords: ['confetti', 'party'] },
  { emoji: '🪅', name: 'pinata', category: 'rewards', keywords: ['pinata', 'party'] },
  { emoji: '🎀', name: 'ribbon', category: 'rewards', keywords: ['ribbon', 'bow'] },

  // ─── Weather & Time ────────────────────────────────────────────────────
  { emoji: '☀️', name: 'sun', category: 'weather', keywords: ['sun', 'sunny', 'morning'] },
  { emoji: '⛅', name: 'partly cloudy', category: 'weather', keywords: ['cloudy', 'partly'] },
  { emoji: '☁️', name: 'cloud', category: 'weather', keywords: ['cloud', 'cloudy'] },
  { emoji: '🌧️', name: 'cloud with rain', category: 'weather', keywords: ['rain', 'rainy'] },
  { emoji: '⛈️', name: 'thunderstorm', category: 'weather', keywords: ['thunderstorm', 'storm'] },
  { emoji: '⚡', name: 'lightning', category: 'weather', keywords: ['lightning', 'voltage'] },
  { emoji: '☂️', name: 'umbrella', category: 'weather', keywords: ['umbrella', 'rain'] },
  { emoji: '🌈', name: 'rainbow', category: 'weather', keywords: ['rainbow'] },
  { emoji: '❄️', name: 'snowflake', category: 'weather', keywords: ['snow', 'snowflake', 'shovel', 'shoveling', 'ice'] },
  { emoji: '⛄', name: 'snowman', category: 'weather', keywords: ['snowman'] },
  { emoji: '🌬️', name: 'wind', category: 'weather', keywords: ['wind', 'blow'] },
  { emoji: '🌙', name: 'moon', category: 'weather', keywords: ['moon', 'night', 'bedtime'] },
  { emoji: '🌑', name: 'new moon', category: 'weather', keywords: ['newmoon'] },
  { emoji: '🌕', name: 'full moon', category: 'weather', keywords: ['fullmoon'] },
  { emoji: '⏰', name: 'alarm clock', category: 'weather', keywords: ['alarm', 'wake', 'morning', 'clock', 'time'] },
  { emoji: '⏱️', name: 'stopwatch', category: 'weather', keywords: ['stopwatch', 'timer'] },
  { emoji: '⌛', name: 'hourglass', category: 'weather', keywords: ['hourglass', 'wait'] },

  // ─── People ────────────────────────────────────────────────────────────
  { emoji: '👋', name: 'wave', category: 'people', keywords: ['wave', 'hello', 'hi'] },
  { emoji: '👍', name: 'thumbs up', category: 'people', keywords: ['thumbsup', 'good', 'yes'] },
  { emoji: '👏', name: 'clap', category: 'people', keywords: ['clap', 'applause'] },
  { emoji: '🤝', name: 'handshake', category: 'people', keywords: ['handshake', 'deal'] },
  { emoji: '🙏', name: 'thanks', category: 'people', keywords: ['thanks', 'please', 'pray'] },
  { emoji: '💪', name: 'muscle', category: 'people', keywords: ['muscle', 'strong'] },
  { emoji: '🧠', name: 'brain', category: 'people', keywords: ['brain', 'think', 'smart'] },
  { emoji: '👀', name: 'eyes', category: 'people', keywords: ['eyes', 'look'] },
  { emoji: '👂', name: 'ear', category: 'people', keywords: ['ear', 'listen'] },
  { emoji: '👃', name: 'nose', category: 'people', keywords: ['nose'] },
  { emoji: '👶', name: 'baby', category: 'people', keywords: ['baby'] },
  { emoji: '👧', name: 'girl', category: 'people', keywords: ['girl'] },
  { emoji: '👦', name: 'boy', category: 'people', keywords: ['boy'] },
  { emoji: '😊', name: 'smile', category: 'people', keywords: ['smile', 'happy'] },
  { emoji: '😎', name: 'cool', category: 'people', keywords: ['cool', 'sunglasses'] },
  { emoji: '🥳', name: 'partying face', category: 'people', keywords: ['party', 'birthday'] },
  { emoji: '😴', name: 'sleeping', category: 'people', keywords: ['sleep', 'sleeping', 'tired'] },

  // ─── Hearts & Misc ─────────────────────────────────────────────────────
  { emoji: '❤️', name: 'red heart', category: 'symbols', keywords: ['heart', 'love'] },
  { emoji: '🧡', name: 'orange heart', category: 'symbols', keywords: ['heart'] },
  { emoji: '💛', name: 'yellow heart', category: 'symbols', keywords: ['heart'] },
  { emoji: '💚', name: 'green heart', category: 'symbols', keywords: ['heart'] },
  { emoji: '💙', name: 'blue heart', category: 'symbols', keywords: ['heart'] },
  { emoji: '💜', name: 'purple heart', category: 'symbols', keywords: ['heart'] },
  { emoji: '🖤', name: 'black heart', category: 'symbols', keywords: ['heart'] },
  { emoji: '🤍', name: 'white heart', category: 'symbols', keywords: ['heart'] },
  { emoji: '💖', name: 'sparkling heart', category: 'symbols', keywords: ['heart', 'sparkle'] },
  { emoji: '💕', name: 'two hearts', category: 'symbols', keywords: ['hearts', 'love'] },
  { emoji: '🪐', name: 'ringed planet', category: 'symbols', keywords: ['planet', 'saturn'] },
  { emoji: '🪩', name: 'disco ball', category: 'symbols', keywords: ['disco', 'dance', 'party'] },
  { emoji: '🔮', name: 'crystal ball', category: 'symbols', keywords: ['crystal', 'magic'] },
  { emoji: '🪄', name: 'magic wand', category: 'symbols', keywords: ['magic', 'wand'] },
];

// ─── Helpers ───────────────────────────────────────────────────────────────

const TOKEN_SPLIT_RE = /[^a-z0-9]+/g;

function tokenize(text: string): readonly string[] {
  return text
    .toLowerCase()
    .split(TOKEN_SPLIT_RE)
    .filter((t) => t.length > 0);
}

// Generic words that shouldn't drive a match by themselves.
const STOPWORDS = new Set([
  'the', 'a', 'an', 'to', 'and', 'or', 'for', 'of', 'in', 'on', 'at',
  'my', 'your', 'our', 'with', 'up', 'out', 'down', 'do', 'doing', 'go',
  'take', 'taking', 'put', 'get', 'getting', 'bring', 'bringing', 'make', 'making',
]);

/**
 * Suggest the best emoji for a chore name based on keyword overlap.
 *
 * Scoring: each keyword that matches a token scores `keyword.length` (so
 * longer/more-specific keywords beat short generic ones). Returns null if
 * nothing matches.
 */
export function suggestEmoji(text: string): string | null {
  const tokens = tokenize(text);
  if (tokens.length === 0) return null;

  const tokenSet = new Set(tokens);

  let best: { emoji: string; score: number } | null = null;

  for (const entry of EMOJI_CATALOG) {
    let score = 0;
    for (const kw of entry.keywords) {
      if (tokenSet.has(kw) && !STOPWORDS.has(kw)) {
        score += kw.length;
      }
    }
    if (score > 0 && (best === null || score > best.score)) {
      best = { emoji: entry.emoji, score };
    }
  }

  return best?.emoji ?? null;
}

/**
 * Search the catalog by free-text query, matching against name and keywords.
 * Empty query returns the entire catalog. Any matching token includes the entry;
 * results are ranked by number of token matches (descending).
 */
export function searchEmojis(query: string): readonly EmojiEntry[] {
  const trimmed = query.trim().toLowerCase();
  if (trimmed === '') return EMOJI_CATALOG;

  const tokens = tokenize(trimmed);
  if (tokens.length === 0) return EMOJI_CATALOG;

  const scored: { entry: EmojiEntry; score: number }[] = [];

  for (const entry of EMOJI_CATALOG) {
    const haystack = [entry.name, ...entry.keywords];
    let score = 0;
    for (const token of tokens) {
      if (haystack.some((h) => h.includes(token))) score += 1;
    }
    if (score > 0) scored.push({ entry, score });
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .map(({ entry }) => entry);
}

/**
 * Group catalog entries by category, preserving catalog order within each group.
 * Used by the picker to render section headings when no search query is active.
 */
export function groupByCategory(
  entries: readonly EmojiEntry[]
): ReadonlyArray<{ category: EmojiCategory; label: string; entries: readonly EmojiEntry[] }> {
  const groups = new Map<EmojiCategory, EmojiEntry[]>();
  for (const entry of entries) {
    const existing = groups.get(entry.category);
    if (existing) existing.push(entry);
    else groups.set(entry.category, [entry]);
  }
  const out: { category: EmojiCategory; label: string; entries: EmojiEntry[] }[] = [];
  for (const [category, list] of groups) {
    out.push({ category, label: CATEGORY_LABELS[category], entries: list });
  }
  return out;
}
