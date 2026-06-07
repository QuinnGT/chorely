/**
 * Curated icon catalog and keyword-based suggester for chore icons.
 *
 * Icons are referenced by Iconify ID (Material Design Icons / `mdi:` set) and
 * rendered as themeable monochrome SVGs via `<ChoreIcon>`. The IDs in this file
 * drive `scripts/gen-chore-icons.mjs`, which bundles their SVG data into
 * `chore-icons.generated.ts` for offline use — keep them in sync (run
 * `pnpm icons:gen` after editing this catalog).
 *
 * `suggestIcon(text)` returns the best icon ID for a chore name by scoring each
 * catalog entry's keywords against the input tokens. Higher scores come from
 * longer/more-specific keyword matches.
 *
 * `searchIcons(query)` filters the catalog for the picker UI.
 *
 * Pure functions — no React, no DOM.
 */

export type IconCategory =
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
  | 'people';

export const CATEGORY_LABELS: Readonly<Record<IconCategory, string>> = {
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
};

export interface IconEntry {
  /** Iconify ID, e.g. "mdi:broom". This is the value stored on a chore. */
  readonly iconId: string;
  readonly name: string;
  readonly category: IconCategory;
  readonly keywords: readonly string[];
}

// Order matters only for ties: earlier entries win, so put the more "default"
// choice for an ambiguous keyword first. Entries are grouped by category so
// they render together in the picker.
export const ICON_CATALOG: readonly IconEntry[] = [
  // ─── Cleaning & Care ───────────────────────────────────────────────────
  { iconId: 'mdi:broom', name: 'broom', category: 'cleaning', keywords: ['broom', 'sweep', 'sweeping', 'floor', 'floors'] },
  { iconId: 'mdi:vacuum', name: 'vacuum', category: 'cleaning', keywords: ['vacuum', 'vacuuming', 'hoover', 'carpet', 'rug'] },
  { iconId: 'mdi:spray-bottle', name: 'spray cleaner', category: 'cleaning', keywords: ['spray', 'cleaner', 'clean', 'cleaning', 'wipe', 'wiping', 'surface', 'disinfect', 'scrub'] },
  { iconId: 'mdi:bucket-outline', name: 'bucket', category: 'cleaning', keywords: ['bucket', 'mop', 'mopping', 'wash'] },
  { iconId: 'mdi:hand-wash-outline', name: 'soap', category: 'cleaning', keywords: ['soap', 'handwash', 'hands', 'sanitizer', 'wash'] },
  { iconId: 'mdi:toilet-paper', name: 'paper towel', category: 'cleaning', keywords: ['paper', 'towel', 'towels', 'tissue', 'toiletpaper'] },
  { iconId: 'mdi:feather', name: 'duster', category: 'cleaning', keywords: ['dust', 'dusting', 'duster'] },
  { iconId: 'mdi:trash-can-outline', name: 'trash can', category: 'cleaning', keywords: ['trash', 'garbage', 'rubbish', 'bin', 'bins', 'can', 'cans', 'waste', 'dump'] },
  { iconId: 'mdi:recycle', name: 'recycle', category: 'cleaning', keywords: ['recycle', 'recycling', 'compost'] },
  { iconId: 'mdi:cleaning', name: 'cleaning', category: 'cleaning', keywords: ['cleaning', 'chores', 'housework', 'tidy', 'tidying'] },
  { iconId: 'mdi:bandage', name: 'bandage', category: 'cleaning', keywords: ['bandage', 'firstaid', 'bandaid', 'booboo'] },
  { iconId: 'mdi:stethoscope', name: 'stethoscope', category: 'cleaning', keywords: ['doctor', 'health', 'checkup'] },
  { iconId: 'mdi:pill', name: 'pill', category: 'cleaning', keywords: ['pill', 'medicine', 'vitamin', 'vitamins'] },
  { iconId: 'mdi:tooth-outline', name: 'tooth', category: 'cleaning', keywords: ['tooth', 'teeth', 'floss', 'flossing'] },
  { iconId: 'mdi:toothbrush', name: 'toothbrush', category: 'cleaning', keywords: ['brush', 'brushing', 'teeth', 'tooth', 'toothbrush', 'dental'] },
  { iconId: 'mdi:razor-double-edge', name: 'razor', category: 'cleaning', keywords: ['razor', 'shave'] },
  { iconId: 'mdi:mirror', name: 'mirror', category: 'cleaning', keywords: ['mirror', 'reflection'] },

  // ─── Kitchen ───────────────────────────────────────────────────────────
  { iconId: 'mdi:silverware-clean', name: 'clean dishes', category: 'kitchen', keywords: ['dishes', 'dish', 'dishwashing', 'washup'] },
  { iconId: 'mdi:silverware-fork-knife', name: 'fork and knife', category: 'kitchen', keywords: ['table', 'setting', 'set', 'cutlery', 'utensils', 'silverware', 'fork', 'knife', 'dinner', 'eat', 'mealtime'] },
  { iconId: 'mdi:dishwasher', name: 'dishwasher', category: 'kitchen', keywords: ['dishwasher', 'appliance', 'unload'] },
  { iconId: 'mdi:stove', name: 'stove', category: 'kitchen', keywords: ['stove', 'cook', 'cooking', 'cooktop', 'burner', 'kitchen'] },
  { iconId: 'mdi:chef-hat', name: 'chef hat', category: 'kitchen', keywords: ['chef', 'bake', 'baking', 'recipe', 'meal'] },
  { iconId: 'mdi:pot-steam', name: 'pot', category: 'kitchen', keywords: ['pot', 'pan', 'boil', 'simmer', 'soup'] },
  { iconId: 'mdi:kettle', name: 'kettle', category: 'kitchen', keywords: ['kettle', 'teapot', 'boil'] },
  { iconId: 'mdi:shaker-outline', name: 'shaker', category: 'kitchen', keywords: ['salt', 'pepper', 'spice', 'season'] },
  { iconId: 'mdi:fridge-outline', name: 'fridge', category: 'kitchen', keywords: ['fridge', 'refrigerator', 'freezer', 'ice', 'cold'] },
  { iconId: 'mdi:microwave', name: 'microwave', category: 'kitchen', keywords: ['microwave', 'reheat'] },
  { iconId: 'mdi:rodent', name: 'pest', category: 'kitchen', keywords: ['mouse', 'pest', 'mousetrap', 'rodent'] },

  // ─── Food & Drink ──────────────────────────────────────────────────────
  { iconId: 'mdi:bread-slice', name: 'bread', category: 'food', keywords: ['bread', 'toast', 'sandwich'] },
  { iconId: 'mdi:baguette', name: 'baguette', category: 'food', keywords: ['baguette', 'loaf'] },
  { iconId: 'mdi:hamburger', name: 'burger', category: 'food', keywords: ['burger', 'hamburger'] },
  { iconId: 'mdi:pizza', name: 'pizza', category: 'food', keywords: ['pizza'] },
  { iconId: 'mdi:taco', name: 'taco', category: 'food', keywords: ['taco'] },
  { iconId: 'mdi:pasta', name: 'pasta', category: 'food', keywords: ['pasta', 'spaghetti', 'noodles'] },
  { iconId: 'mdi:bowl-mix', name: 'bowl', category: 'food', keywords: ['salad', 'bowl', 'cereal', 'soup'] },
  { iconId: 'mdi:food-apple', name: 'apple', category: 'food', keywords: ['apple', 'fruit', 'snack'] },
  { iconId: 'mdi:fruit-grapes', name: 'grapes', category: 'food', keywords: ['grapes', 'grape'] },
  { iconId: 'mdi:fruit-watermelon', name: 'watermelon', category: 'food', keywords: ['watermelon', 'melon'] },
  { iconId: 'mdi:carrot', name: 'carrot', category: 'food', keywords: ['carrot', 'vegetable', 'veggies', 'veggie'] },
  { iconId: 'mdi:corn', name: 'corn', category: 'food', keywords: ['corn'] },
  { iconId: 'mdi:egg', name: 'egg', category: 'food', keywords: ['egg', 'eggs'] },
  { iconId: 'mdi:cheese', name: 'cheese', category: 'food', keywords: ['cheese'] },
  { iconId: 'mdi:food-drumstick', name: 'drumstick', category: 'food', keywords: ['chicken', 'meat', 'drumstick'] },
  { iconId: 'mdi:cookie', name: 'cookie', category: 'food', keywords: ['cookie', 'snack', 'dessert'] },
  { iconId: 'mdi:cake-variant', name: 'cake', category: 'food', keywords: ['cake', 'birthday', 'dessert', 'party'] },
  { iconId: 'mdi:ice-cream', name: 'ice cream', category: 'food', keywords: ['icecream', 'dessert'] },
  { iconId: 'mdi:cup-water', name: 'glass of water', category: 'food', keywords: ['drink', 'glass', 'hydrate'] },
  { iconId: 'mdi:coffee', name: 'coffee', category: 'food', keywords: ['coffee', 'hot'] },
  { iconId: 'mdi:tea', name: 'tea', category: 'food', keywords: ['tea', 'matcha'] },
  { iconId: 'mdi:cup', name: 'cup', category: 'food', keywords: ['cup', 'juice', 'soda'] },

  // ─── Clothes & Laundry ─────────────────────────────────────────────────
  { iconId: 'mdi:tshirt-crew', name: 'shirt', category: 'clothes', keywords: ['shirt', 'clothes', 'clothing', 'wear', 'tshirt'] },
  { iconId: 'mdi:washing-machine', name: 'washing machine', category: 'clothes', keywords: ['washer', 'washing', 'washingmachine', 'laundry', 'wash'] },
  { iconId: 'mdi:tumble-dryer', name: 'dryer', category: 'clothes', keywords: ['dryer', 'dry', 'drying', 'tumble'] },
  { iconId: 'mdi:basket', name: 'laundry basket', category: 'clothes', keywords: ['laundry', 'basket', 'hamper', 'fold', 'folding', 'folded', 'dirty'] },
  { iconId: 'mdi:hanger', name: 'hanger', category: 'clothes', keywords: ['hang', 'hanger', 'closet', 'hangup', 'putaway'] },
  { iconId: 'mdi:wardrobe-outline', name: 'wardrobe', category: 'clothes', keywords: ['closet', 'wardrobe', 'dresser', 'drawers', 'putaway'] },
  { iconId: 'mdi:iron', name: 'iron', category: 'clothes', keywords: ['iron', 'ironing', 'press'] },
  { iconId: 'mdi:needle', name: 'needle', category: 'clothes', keywords: ['sew', 'sewing', 'mend', 'mending', 'stitch', 'button'] },
  { iconId: 'mdi:shoe-sneaker', name: 'sneaker', category: 'clothes', keywords: ['shoes', 'shoe', 'sneakers', 'trainers'] },
  { iconId: 'mdi:shoe-formal', name: 'dress shoe', category: 'clothes', keywords: ['dressshoe', 'formal'] },
  { iconId: 'mdi:hat-fedora', name: 'hat', category: 'clothes', keywords: ['hat', 'cap'] },
  { iconId: 'mdi:tie', name: 'tie', category: 'clothes', keywords: ['tie', 'formal'] },

  // ─── Home & Rooms ──────────────────────────────────────────────────────
  { iconId: 'mdi:home', name: 'house', category: 'home', keywords: ['house', 'home', 'tidy', 'tidying'] },
  { iconId: 'mdi:bed', name: 'bed', category: 'home', keywords: ['bed', 'make', 'making', 'sheets', 'pillow', 'bedroom', 'sleep'] },
  { iconId: 'mdi:teddy-bear', name: 'teddy bear', category: 'home', keywords: ['toy', 'toys', 'stuffed', 'teddy', 'plushie'] },
  { iconId: 'mdi:sofa', name: 'couch', category: 'home', keywords: ['couch', 'sofa', 'living', 'room'] },
  { iconId: 'mdi:chair-rolling', name: 'chair', category: 'home', keywords: ['chair', 'desk', 'seat', 'office'] },
  { iconId: 'mdi:lightbulb', name: 'light bulb', category: 'home', keywords: ['light', 'lights', 'lamp', 'bulb'] },
  { iconId: 'mdi:window-closed-variant', name: 'window', category: 'home', keywords: ['window', 'windows', 'glass', 'blinds'] },
  { iconId: 'mdi:door', name: 'door', category: 'home', keywords: ['door', 'doors'] },
  { iconId: 'mdi:key', name: 'key', category: 'home', keywords: ['key', 'keys', 'lock'] },
  { iconId: 'mdi:toilet', name: 'toilet', category: 'home', keywords: ['toilet', 'bathroom', 'flush', 'washroom'] },
  { iconId: 'mdi:bathtub', name: 'bathtub', category: 'home', keywords: ['bath', 'bathtub', 'tub'] },
  { iconId: 'mdi:shower-head', name: 'shower', category: 'home', keywords: ['shower', 'showering'] },
  { iconId: 'mdi:faucet', name: 'sink', category: 'home', keywords: ['sink', 'faucet', 'tap', 'basin'] },
  { iconId: 'mdi:cart', name: 'shopping cart', category: 'home', keywords: ['shopping', 'cart', 'groceries', 'grocery'] },
  { iconId: 'mdi:shopping', name: 'shopping bags', category: 'home', keywords: ['shopping', 'bags', 'errands'] },
  { iconId: 'mdi:package-variant-closed', name: 'package', category: 'home', keywords: ['package', 'box', 'amazon', 'delivery', 'parcel', 'unbox'] },
  { iconId: 'mdi:mailbox-outline', name: 'mailbox', category: 'home', keywords: ['mail', 'mailbox', 'letters', 'post'] },
  { iconId: 'mdi:ladder', name: 'ladder', category: 'home', keywords: ['ladder', 'climb'] },
  { iconId: 'mdi:cupboard-outline', name: 'cupboard', category: 'home', keywords: ['cupboard', 'cabinet', 'cabinets', 'pantry', 'shelf', 'shelves'] },
  { iconId: 'mdi:stairs', name: 'stairs', category: 'home', keywords: ['stairs', 'steps'] },
  { iconId: 'mdi:garage-variant', name: 'garage', category: 'home', keywords: ['garage', 'workshop', 'shed'] },
  { iconId: 'mdi:fan', name: 'fan', category: 'home', keywords: ['fan', 'ceiling', 'cooling'] },
  { iconId: 'mdi:fireplace', name: 'fireplace', category: 'home', keywords: ['fireplace', 'hearth', 'firewood'] },

  // ─── Pets & Animals ────────────────────────────────────────────────────
  { iconId: 'mdi:dog', name: 'dog', category: 'pets', keywords: ['dog', 'puppy', 'walk', 'walking', 'pet', 'feed'] },
  { iconId: 'mdi:cat', name: 'cat', category: 'pets', keywords: ['cat', 'kitten', 'kitty', 'litter'] },
  { iconId: 'mdi:fish', name: 'fish', category: 'pets', keywords: ['fish', 'aquarium', 'tank'] },
  { iconId: 'mdi:bird', name: 'bird', category: 'pets', keywords: ['bird', 'birds', 'cage', 'parrot'] },
  { iconId: 'mdi:rabbit', name: 'rabbit', category: 'pets', keywords: ['rabbit', 'bunny', 'hutch'] },
  { iconId: 'mdi:paw', name: 'paw prints', category: 'pets', keywords: ['paw', 'paws', 'animal', 'animals'] },
  { iconId: 'mdi:bone', name: 'bone', category: 'pets', keywords: ['bone', 'treat'] },
  { iconId: 'mdi:cow', name: 'cow', category: 'pets', keywords: ['cow', 'farm', 'cattle'] },
  { iconId: 'mdi:horse', name: 'horse', category: 'pets', keywords: ['horse', 'pony', 'stable'] },
  { iconId: 'mdi:pig', name: 'pig', category: 'pets', keywords: ['pig', 'piglet'] },
  { iconId: 'mdi:turtle', name: 'turtle', category: 'pets', keywords: ['turtle', 'tortoise'] },
  { iconId: 'mdi:snake', name: 'snake', category: 'pets', keywords: ['snake'] },
  { iconId: 'mdi:duck', name: 'duck', category: 'pets', keywords: ['duck'] },
  { iconId: 'mdi:penguin', name: 'penguin', category: 'pets', keywords: ['penguin'] },
  { iconId: 'mdi:bee', name: 'bee', category: 'pets', keywords: ['bee', 'honey'] },
  { iconId: 'mdi:ladybug', name: 'ladybug', category: 'pets', keywords: ['ladybug', 'bug', 'insect'] },
  { iconId: 'mdi:butterfly', name: 'butterfly', category: 'pets', keywords: ['butterfly'] },
  { iconId: 'mdi:spider', name: 'spider', category: 'pets', keywords: ['spider', 'web'] },
  { iconId: 'mdi:unicorn', name: 'unicorn', category: 'pets', keywords: ['unicorn'] },

  // ─── Plants & Nature ───────────────────────────────────────────────────
  { iconId: 'mdi:sprout', name: 'seedling', category: 'nature', keywords: ['plant', 'plants', 'seedling', 'sprout', 'grow', 'gardening', 'houseplant'] },
  { iconId: 'mdi:watering-can', name: 'watering can', category: 'nature', keywords: ['watering', 'wateringcan', 'water', 'plants', 'garden', 'hose'] },
  { iconId: 'mdi:flower', name: 'flower', category: 'nature', keywords: ['flower', 'flowers', 'bloom'] },
  { iconId: 'mdi:flower-tulip', name: 'tulip', category: 'nature', keywords: ['tulip', 'spring'] },
  { iconId: 'mdi:tree', name: 'tree', category: 'nature', keywords: ['tree', 'trees'] },
  { iconId: 'mdi:pine-tree', name: 'pine tree', category: 'nature', keywords: ['pine', 'evergreen', 'forest'] },
  { iconId: 'mdi:palm-tree', name: 'palm tree', category: 'nature', keywords: ['palm', 'beach'] },
  { iconId: 'mdi:cactus', name: 'cactus', category: 'nature', keywords: ['cactus', 'succulent'] },
  { iconId: 'mdi:mushroom', name: 'mushroom', category: 'nature', keywords: ['mushroom', 'fungi'] },
  { iconId: 'mdi:leaf', name: 'leaf', category: 'nature', keywords: ['leaves', 'leaf', 'fall', 'autumn'] },
  { iconId: 'mdi:leaf-maple', name: 'maple leaf', category: 'nature', keywords: ['rake', 'raking', 'leaves'] },
  { iconId: 'mdi:rake', name: 'rake', category: 'nature', keywords: ['rake', 'raking'] },
  { iconId: 'mdi:grass', name: 'grass', category: 'nature', keywords: ['grass', 'lawn', 'mow', 'mowing', 'yard', 'weed', 'weeds', 'weeding'] },
  { iconId: 'mdi:shovel', name: 'shovel', category: 'nature', keywords: ['shovel', 'dig', 'digging', 'shoveling'] },
  { iconId: 'mdi:water', name: 'droplet', category: 'nature', keywords: ['droplet', 'drop', 'splash'] },
  { iconId: 'mdi:waves', name: 'waves', category: 'nature', keywords: ['wave', 'ocean', 'sea', 'pool'] },
  { iconId: 'mdi:fire', name: 'fire', category: 'nature', keywords: ['fire', 'flame', 'campfire'] },
  { iconId: 'mdi:earth', name: 'earth', category: 'nature', keywords: ['earth', 'world', 'planet', 'globe'] },

  // ─── School & Art ──────────────────────────────────────────────────────
  { iconId: 'mdi:bookshelf', name: 'bookshelf', category: 'school', keywords: ['homework', 'study', 'studying', 'books', 'school', 'shelf'] },
  { iconId: 'mdi:book-open-variant', name: 'open book', category: 'school', keywords: ['book', 'read', 'reading', 'story'] },
  { iconId: 'mdi:notebook', name: 'notebook', category: 'school', keywords: ['notebook', 'journal', 'diary'] },
  { iconId: 'mdi:pencil', name: 'pencil', category: 'school', keywords: ['pencil', 'write', 'writing', 'draw'] },
  { iconId: 'mdi:pen', name: 'pen', category: 'school', keywords: ['pen', 'ink'] },
  { iconId: 'mdi:brush', name: 'paintbrush', category: 'school', keywords: ['paintbrush', 'paint', 'painting'] },
  { iconId: 'mdi:palette', name: 'palette', category: 'school', keywords: ['art', 'palette', 'colors', 'color', 'drawing'] },
  { iconId: 'mdi:note-edit-outline', name: 'note', category: 'school', keywords: ['memo', 'notes', 'note', 'todo'] },
  { iconId: 'mdi:ruler-square', name: 'ruler', category: 'school', keywords: ['ruler', 'measure', 'math', 'geometry'] },
  { iconId: 'mdi:abacus', name: 'abacus', category: 'school', keywords: ['abacus', 'math', 'count', 'counting'] },
  { iconId: 'mdi:content-cut', name: 'scissors', category: 'school', keywords: ['scissors', 'cut', 'cutting'] },
  { iconId: 'mdi:backpack', name: 'backpack', category: 'school', keywords: ['backpack', 'bag', 'school'] },
  { iconId: 'mdi:calendar-month', name: 'calendar', category: 'school', keywords: ['calendar', 'schedule', 'date', 'planner'] },
  { iconId: 'mdi:microscope', name: 'microscope', category: 'school', keywords: ['microscope', 'science'] },
  { iconId: 'mdi:telescope', name: 'telescope', category: 'school', keywords: ['telescope', 'astronomy', 'stars'] },
  { iconId: 'mdi:test-tube', name: 'test tube', category: 'school', keywords: ['testtube', 'science', 'experiment', 'chemistry'] },
  { iconId: 'mdi:camera', name: 'camera', category: 'school', keywords: ['camera', 'photo', 'picture'] },

  // ─── Music ─────────────────────────────────────────────────────────────
  { iconId: 'mdi:music-note', name: 'musical note', category: 'music', keywords: ['music', 'practice', 'song', 'note'] },
  { iconId: 'mdi:microphone', name: 'microphone', category: 'music', keywords: ['mic', 'microphone', 'sing', 'singing', 'karaoke'] },
  { iconId: 'mdi:headphones', name: 'headphones', category: 'music', keywords: ['headphones', 'listen', 'audio'] },
  { iconId: 'mdi:piano', name: 'piano', category: 'music', keywords: ['piano', 'keyboard', 'practice'] },
  { iconId: 'mdi:guitar-acoustic', name: 'guitar', category: 'music', keywords: ['guitar', 'practice', 'acoustic'] },
  { iconId: 'mdi:violin', name: 'violin', category: 'music', keywords: ['violin', 'fiddle'] },
  { iconId: 'mdi:trumpet', name: 'trumpet', category: 'music', keywords: ['trumpet', 'brass'] },
  { iconId: 'mdi:saxophone', name: 'saxophone', category: 'music', keywords: ['saxophone', 'sax'] },

  // ─── Sports & Play ─────────────────────────────────────────────────────
  { iconId: 'mdi:soccer', name: 'soccer ball', category: 'sports', keywords: ['soccer', 'ball'] },
  { iconId: 'mdi:basketball', name: 'basketball', category: 'sports', keywords: ['basketball', 'hoops'] },
  { iconId: 'mdi:baseball', name: 'baseball', category: 'sports', keywords: ['baseball', 'softball'] },
  { iconId: 'mdi:football', name: 'football', category: 'sports', keywords: ['football'] },
  { iconId: 'mdi:tennis', name: 'tennis', category: 'sports', keywords: ['tennis'] },
  { iconId: 'mdi:volleyball', name: 'volleyball', category: 'sports', keywords: ['volleyball'] },
  { iconId: 'mdi:table-tennis', name: 'ping pong', category: 'sports', keywords: ['pingpong', 'tabletennis'] },
  { iconId: 'mdi:badminton', name: 'badminton', category: 'sports', keywords: ['badminton'] },
  { iconId: 'mdi:golf', name: 'golf', category: 'sports', keywords: ['golf'] },
  { iconId: 'mdi:bowling', name: 'bowling', category: 'sports', keywords: ['bowling'] },
  { iconId: 'mdi:swim', name: 'swimming', category: 'sports', keywords: ['swim', 'swimming', 'pool'] },
  { iconId: 'mdi:surfing', name: 'surfing', category: 'sports', keywords: ['surf', 'surfing'] },
  { iconId: 'mdi:bike', name: 'bicycle', category: 'sports', keywords: ['bike', 'biking', 'cycling', 'ride', 'bicycle'] },
  { iconId: 'mdi:skateboard', name: 'skateboard', category: 'sports', keywords: ['skateboard', 'skating'] },
  { iconId: 'mdi:roller-skate', name: 'roller skate', category: 'sports', keywords: ['rollerskate', 'skate'] },
  { iconId: 'mdi:yoga', name: 'yoga', category: 'sports', keywords: ['yoga', 'stretch'] },
  { iconId: 'mdi:meditation', name: 'meditation', category: 'sports', keywords: ['meditation', 'meditate', 'mindfulness'] },
  { iconId: 'mdi:run', name: 'runner', category: 'sports', keywords: ['run', 'running', 'exercise', 'jog'] },
  { iconId: 'mdi:walk', name: 'walking', category: 'sports', keywords: ['walk', 'walking', 'steps'] },
  { iconId: 'mdi:target', name: 'target', category: 'sports', keywords: ['target', 'goal', 'aim'] },
  { iconId: 'mdi:controller', name: 'game controller', category: 'sports', keywords: ['game', 'games', 'gaming', 'console', 'videogame'] },
  { iconId: 'mdi:dice-5', name: 'dice', category: 'sports', keywords: ['dice', 'die', 'boardgame'] },
  { iconId: 'mdi:puzzle', name: 'puzzle', category: 'sports', keywords: ['puzzle', 'jigsaw'] },
  { iconId: 'mdi:chess-knight', name: 'chess', category: 'sports', keywords: ['chess'] },
  { iconId: 'mdi:balloon', name: 'balloon', category: 'sports', keywords: ['balloon', 'party'] },
  { iconId: 'mdi:gift', name: 'gift', category: 'sports', keywords: ['gift', 'present', 'reward', 'birthday'] },

  // ─── Tools & Tasks ─────────────────────────────────────────────────────
  { iconId: 'mdi:wrench', name: 'wrench', category: 'tools', keywords: ['wrench', 'fix', 'repair'] },
  { iconId: 'mdi:hammer', name: 'hammer', category: 'tools', keywords: ['hammer', 'build', 'nail'] },
  { iconId: 'mdi:tools', name: 'tools', category: 'tools', keywords: ['tools', 'tool', 'repair', 'maintenance', 'fix'] },
  { iconId: 'mdi:screwdriver', name: 'screwdriver', category: 'tools', keywords: ['screwdriver', 'screw'] },
  { iconId: 'mdi:toolbox', name: 'toolbox', category: 'tools', keywords: ['toolbox', 'garage', 'workshop'] },
  { iconId: 'mdi:power-plug', name: 'plug', category: 'tools', keywords: ['plug', 'outlet', 'electric', 'charger', 'unplug'] },
  { iconId: 'mdi:format-paint', name: 'paint roller', category: 'tools', keywords: ['paint', 'painting', 'wall', 'walls', 'roller'] },
  { iconId: 'mdi:cog', name: 'gear', category: 'tools', keywords: ['gear', 'settings', 'machine', 'cog'] },
  { iconId: 'mdi:clipboard-text', name: 'clipboard', category: 'tools', keywords: ['list', 'task', 'tasks', 'clipboard', 'checklist', 'chores'] },
  { iconId: 'mdi:format-list-checks', name: 'checklist', category: 'tools', keywords: ['checklist', 'todo', 'list'] },
  { iconId: 'mdi:check-circle', name: 'check', category: 'tools', keywords: ['check', 'done', 'complete', 'finished'] },
  { iconId: 'mdi:checkbox-marked', name: 'checkbox', category: 'tools', keywords: ['checkbox'] },
  { iconId: 'mdi:pin', name: 'pin', category: 'tools', keywords: ['pin', 'important'] },
  { iconId: 'mdi:briefcase', name: 'briefcase', category: 'tools', keywords: ['briefcase', 'work', 'office', 'job'] },
  { iconId: 'mdi:bell', name: 'bell', category: 'tools', keywords: ['bell', 'notification', 'alert', 'reminder'] },

  // ─── Transport ─────────────────────────────────────────────────────────
  { iconId: 'mdi:car', name: 'car', category: 'transport', keywords: ['car', 'vehicle', 'drive'] },
  { iconId: 'mdi:car-estate', name: 'wagon', category: 'transport', keywords: ['suv', 'wagon'] },
  { iconId: 'mdi:bus', name: 'bus', category: 'transport', keywords: ['bus', 'schoolbus'] },
  { iconId: 'mdi:ambulance', name: 'ambulance', category: 'transport', keywords: ['ambulance'] },
  { iconId: 'mdi:fire-truck', name: 'fire truck', category: 'transport', keywords: ['firetruck', 'fire'] },
  { iconId: 'mdi:scooter', name: 'scooter', category: 'transport', keywords: ['scooter'] },
  { iconId: 'mdi:train', name: 'train', category: 'transport', keywords: ['train', 'locomotive', 'rail'] },
  { iconId: 'mdi:airplane', name: 'airplane', category: 'transport', keywords: ['plane', 'airplane', 'flight', 'travel'] },
  { iconId: 'mdi:rocket-launch', name: 'rocket', category: 'transport', keywords: ['rocket', 'launch', 'space', 'blastoff'] },
  { iconId: 'mdi:sail-boat', name: 'sailboat', category: 'transport', keywords: ['boat', 'sail', 'sailboat'] },
  { iconId: 'mdi:ferry', name: 'ferry', category: 'transport', keywords: ['ferry', 'ship'] },

  // ─── Rewards & Symbols ─────────────────────────────────────────────────
  { iconId: 'mdi:star', name: 'star', category: 'rewards', keywords: ['star', 'reward', 'favorite'] },
  { iconId: 'mdi:shimmer', name: 'sparkles', category: 'rewards', keywords: ['sparkle', 'sparkles', 'shine', 'shiny', 'magic'] },
  { iconId: 'mdi:trophy', name: 'trophy', category: 'rewards', keywords: ['trophy', 'win', 'winner', 'champion'] },
  { iconId: 'mdi:medal', name: 'medal', category: 'rewards', keywords: ['medal', 'award', 'honor', 'first'] },
  { iconId: 'mdi:crown', name: 'crown', category: 'rewards', keywords: ['crown', 'king', 'queen', 'royal'] },
  { iconId: 'mdi:diamond-stone', name: 'gem', category: 'rewards', keywords: ['gem', 'diamond', 'jewel'] },
  { iconId: 'mdi:piggy-bank', name: 'piggy bank', category: 'rewards', keywords: ['savings', 'save', 'allowance', 'bank'] },
  { iconId: 'mdi:cash', name: 'cash', category: 'rewards', keywords: ['money', 'cash', 'dollars'] },
  { iconId: 'mdi:currency-usd', name: 'dollar', category: 'rewards', keywords: ['dollar', 'pay', 'payment', 'price'] },
  { iconId: 'mdi:hand-coin', name: 'coin', category: 'rewards', keywords: ['coin', 'earn', 'reward', 'tip'] },
  { iconId: 'mdi:party-popper', name: 'party popper', category: 'rewards', keywords: ['celebrate', 'party', 'birthday', 'confetti'] },
  { iconId: 'mdi:ribbon', name: 'ribbon', category: 'rewards', keywords: ['ribbon', 'bow', 'award'] },
  { iconId: 'mdi:heart', name: 'heart', category: 'rewards', keywords: ['heart', 'love', 'like'] },

  // ─── Weather & Time ────────────────────────────────────────────────────
  { iconId: 'mdi:weather-sunny', name: 'sun', category: 'weather', keywords: ['sun', 'sunny', 'morning', 'day'] },
  { iconId: 'mdi:weather-partly-cloudy', name: 'partly cloudy', category: 'weather', keywords: ['cloudy', 'partly'] },
  { iconId: 'mdi:weather-cloudy', name: 'cloud', category: 'weather', keywords: ['cloud', 'cloudy', 'overcast'] },
  { iconId: 'mdi:weather-rainy', name: 'rain', category: 'weather', keywords: ['rain', 'rainy'] },
  { iconId: 'mdi:weather-lightning-rainy', name: 'storm', category: 'weather', keywords: ['storm', 'thunderstorm'] },
  { iconId: 'mdi:flash', name: 'lightning', category: 'weather', keywords: ['lightning', 'flash', 'voltage'] },
  { iconId: 'mdi:umbrella', name: 'umbrella', category: 'weather', keywords: ['umbrella', 'rain'] },
  { iconId: 'mdi:weather-snowy', name: 'snow', category: 'weather', keywords: ['snow', 'snowy', 'snowing'] },
  { iconId: 'mdi:snowflake', name: 'snowflake', category: 'weather', keywords: ['snowflake', 'ice', 'frost', 'cold'] },
  { iconId: 'mdi:weather-windy', name: 'wind', category: 'weather', keywords: ['wind', 'windy', 'blow'] },
  { iconId: 'mdi:weather-night', name: 'moon', category: 'weather', keywords: ['moon', 'night', 'bedtime', 'evening'] },
  { iconId: 'mdi:alarm', name: 'alarm clock', category: 'weather', keywords: ['alarm', 'wake', 'morning', 'clock'] },
  { iconId: 'mdi:timer-outline', name: 'timer', category: 'weather', keywords: ['timer', 'stopwatch', 'countdown'] },
  { iconId: 'mdi:timer-sand', name: 'hourglass', category: 'weather', keywords: ['hourglass', 'wait'] },
  { iconId: 'mdi:clock-outline', name: 'clock', category: 'weather', keywords: ['clock', 'time', 'schedule'] },

  // ─── People ────────────────────────────────────────────────────────────
  { iconId: 'mdi:hand-wave', name: 'wave', category: 'people', keywords: ['wave', 'hello', 'hi', 'greet'] },
  { iconId: 'mdi:thumb-up', name: 'thumbs up', category: 'people', keywords: ['thumbsup', 'good', 'yes', 'like'] },
  { iconId: 'mdi:hand-clap', name: 'clap', category: 'people', keywords: ['clap', 'applause', 'cheer'] },
  { iconId: 'mdi:handshake', name: 'handshake', category: 'people', keywords: ['handshake', 'deal', 'agree'] },
  { iconId: 'mdi:hands-pray', name: 'thanks', category: 'people', keywords: ['thanks', 'please', 'pray', 'gratitude'] },
  { iconId: 'mdi:arm-flex', name: 'muscle', category: 'people', keywords: ['muscle', 'strong', 'strength'] },
  { iconId: 'mdi:brain', name: 'brain', category: 'people', keywords: ['brain', 'think', 'smart', 'learn'] },
  { iconId: 'mdi:eye', name: 'eye', category: 'people', keywords: ['eyes', 'eye', 'look', 'watch', 'see'] },
  { iconId: 'mdi:ear-hearing', name: 'ear', category: 'people', keywords: ['ear', 'listen', 'hear'] },
  { iconId: 'mdi:baby-face-outline', name: 'baby', category: 'people', keywords: ['baby', 'infant'] },
  { iconId: 'mdi:emoticon-happy', name: 'smile', category: 'people', keywords: ['smile', 'happy', 'face'] },
  { iconId: 'mdi:emoticon-cool', name: 'cool', category: 'people', keywords: ['cool', 'sunglasses'] },
  { iconId: 'mdi:sleep', name: 'sleeping', category: 'people', keywords: ['sleep', 'sleeping', 'tired', 'nap', 'bedtime'] },
];

/** Default icon for new chores (matches the DB column default). */
export const DEFAULT_CHORE_ICON = 'mdi:clipboard-text';

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
 * Suggest the best icon ID for a chore name based on keyword overlap.
 *
 * Scoring: each keyword that matches a token scores `keyword.length` (so
 * longer/more-specific keywords beat short generic ones). Returns null if
 * nothing matches.
 */
export function suggestIcon(text: string): string | null {
  const tokens = tokenize(text);
  if (tokens.length === 0) return null;

  const tokenSet = new Set(tokens);

  let best: { iconId: string; score: number } | null = null;

  for (const entry of ICON_CATALOG) {
    let score = 0;
    for (const kw of entry.keywords) {
      if (tokenSet.has(kw) && !STOPWORDS.has(kw)) {
        score += kw.length;
      }
    }
    if (score > 0 && (best === null || score > best.score)) {
      best = { iconId: entry.iconId, score };
    }
  }

  return best?.iconId ?? null;
}

/**
 * Search the catalog by free-text query, matching against name and keywords.
 * Empty query returns the entire catalog. Any matching token includes the entry;
 * results are ranked by number of token matches (descending).
 */
export function searchIcons(query: string): readonly IconEntry[] {
  const trimmed = query.trim().toLowerCase();
  if (trimmed === '') return ICON_CATALOG;

  const tokens = tokenize(trimmed);
  if (tokens.length === 0) return ICON_CATALOG;

  const scored: { entry: IconEntry; score: number }[] = [];

  for (const entry of ICON_CATALOG) {
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
  entries: readonly IconEntry[]
): ReadonlyArray<{ category: IconCategory; label: string; entries: readonly IconEntry[] }> {
  const groups = new Map<IconCategory, IconEntry[]>();
  for (const entry of entries) {
    const existing = groups.get(entry.category);
    if (existing) existing.push(entry);
    else groups.set(entry.category, [entry]);
  }
  const out: { category: IconCategory; label: string; entries: IconEntry[] }[] = [];
  for (const [category, list] of groups) {
    out.push({ category, label: CATEGORY_LABELS[category], entries: list });
  }
  return out;
}
