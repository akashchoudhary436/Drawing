// Word lists organized by category for Doodle Duel.

export interface WordCategory {
  id: string
  name: string
  emoji: string
  words: string[]
}

export const WORD_CATEGORIES: WordCategory[] = [
  {
    id: 'animals',
    name: 'Animals',
    emoji: '🐾',
    words: [
      'cat', 'dog', 'elephant', 'giraffe', 'penguin', 'dolphin', 'kangaroo',
      'octopus', 'butterfly', 'crocodile', 'flamingo', 'hedgehog', 'jellyfish',
      'koala', 'lion', 'monkey', 'narwhal', 'owl', 'panda', 'rabbit',
      'snail', 'tiger', 'unicorn', 'whale', 'zebra', 'crab', 'frog',
      'snake', 'turtle', 'peacock', 'rhino', 'hippo', 'bat', 'wolf',
      'fox', 'bear', 'deer', 'raccoon', 'sloth', 'shark', 'seahorse',
    ],
  },
  {
    id: 'food',
    name: 'Food',
    emoji: '🍔',
    words: [
      'pizza', 'burger', 'sushi', 'taco', 'pancake', 'donut', 'cupcake',
      'popcorn', 'watermelon', 'strawberry', 'pineapple', 'avocado', 'banana',
      'carrot', 'broccoli', 'ice cream', 'cookie', 'croissant', 'baguette',
      'spaghetti', 'sandwich', 'hotdog', 'pretzel', 'waffle', 'muffin',
      'cherry', 'lemon', 'corn', 'pumpkin', 'egg', 'cheese', 'noodles',
      'dumpling', 'burrito', 'bagel', 'lollipop', 'chocolate', 'coffee',
    ],
  },
  {
    id: 'objects',
    name: 'Objects',
    emoji: '📦',
    words: [
      'umbrella', 'telephone', 'bicycle', 'camera', 'guitar', 'piano',
      'telescope', 'microscope', 'hourglass', 'lighthouse', 'windmill',
      'anchor', 'compass', 'treasure', 'crown', 'sword', 'shield',
      'helmet', 'rocket', 'satellite', 'robot', 'lamp', 'candle', 'clock',
      'scissors', 'hammer', 'wrench', 'key', 'lock', 'chain', 'bucket',
      'broom', 'mirror', 'window', 'door', 'stairs', 'bridge', 'tower',
      'castle', 'tent', 'wagon', 'balloon', 'kite', 'puzzle', 'glasses',
    ],
  },
  {
    id: 'nature',
    name: 'Nature',
    emoji: '🌳',
    words: [
      'mountain', 'volcano', 'waterfall', 'rainbow', 'tornado', 'lightning',
      'sunflower', 'cactus', 'mushroom', 'palm tree', 'snowflake', 'ocean',
      'desert', 'forest', 'river', 'island', 'cave', 'glacier', 'canyon',
      'meadow', 'swamp', 'cliff', 'beach', 'cloud', 'star', 'moon',
      'earth', 'comet', 'aurora', 'fossil', 'coral', 'seashell', 'maple leaf',
    ],
  },
  {
    id: 'fantasy',
    name: 'Fantasy',
    emoji: '🦄',
    words: [
      'dragon', 'wizard', 'witch', 'castle', 'unicorn', 'mermaid', 'phoenix',
      'centaur', 'griffin', 'fairy', 'goblin', 'troll', 'knight', 'pirate',
      'ninja', 'samurai', 'vampire', 'zombie', 'ghost', 'alien', 'spaceship',
      'time machine', 'magic wand', 'potion', 'spell book', 'crystal ball',
      'flying broom', 'treasure chest', 'crown jewels', 'enchanted forest',
    ],
  },
  {
    id: 'sports',
    name: 'Sports',
    emoji: '⚽',
    words: [
      'soccer', 'basketball', 'tennis', 'baseball', 'football', 'volleyball',
      'hockey', 'golf', 'bowling', 'surfing', 'skateboard', 'skiing',
      'snowboard', 'boxing', 'wrestling', 'archery', 'fencing', 'cycling',
      'swimming', 'running', 'climbing', 'fishing', 'kayaking', 'sailing',
      'karate', 'gymnastics', 'badminton', 'cricket', 'rugby', 'billiards',
    ],
  },
  {
    id: 'movies',
    name: 'Movies & TV',
    emoji: '🎬',
    words: [
      'Batman', 'Spider-Man', 'Superman', 'Iron Man', 'Hulk', 'Thor',
      'Harry Potter', 'Shrek', 'Yoda', 'Lightsaber', 'TARDIS', 'Joker',
      'Mario', 'Sonic', 'Pikachu', 'Pac-Man', 'Lara Croft', 'Minecraft',
      'Roblox', 'Among Us', 'Fortnite', 'Zelda', 'Kirby', 'Doodle',
    ],
  },
  {
    id: 'hard',
    name: 'Challenge',
    emoji: '🔥',
    words: [
      'quantum physics', 'black hole', 'photosynthesis', 'algorithm',
      'blockchain', 'artificial intelligence', 'virtual reality', 'neural network',
      'parallel universe', 'time travel', 'schrodinger cat', 'uncertainty principle',
      'string theory', 'multiverse', 'wormhole', 'singularity', 'hologram',
      'metaverse', ' cryptocurrency', 'machine learning', 'augmented reality',
    ],
  },
]

export const ALL_WORDS = WORD_CATEGORIES.flatMap((c) => c.words)

export function getWordsForSettings(settings: {
  wordMode: 'all' | 'custom' | 'category'
  category?: string
  customWords?: string[]
}): string[] {
  if (settings.wordMode === 'custom' && settings.customWords && settings.customWords.length >= 3) {
    return settings.customWords
  }
  if (settings.wordMode === 'category' && settings.category) {
    const cat = WORD_CATEGORIES.find((c) => c.id === settings.category)
    if (cat) return cat.words
  }
  return ALL_WORDS
}

export function pickRandomWords(pool: string[], count = 3): string[] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

// Avatars and colors for player customization
export const AVATARS = [
  '🦊', '🐼', '🐸', '🦁', '🐯', '🦄', '🐙', '🦉', '🐶', '🐱',
  '🐰', '🐺', '🦝', '🐨', '🐮', '🐷', '🐵', '🦋', '🐢', '🦖',
  '🐳', '🦈', '🦓', '🦒', '🐘', '🦏', '🐲', '🦚', '👽', '🤖',
]

export const AVATAR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#FFE66D', '#A8E6CF', '#FF8B94', '#B5EAD7',
  '#C7CEEA', '#FFDAC1', '#E2F0CB', '#FF9F1C', '#2EC4B6', '#E71D36',
  '#FFD23F', '#9B5DE5', '#F15BB5', '#00BBF9', '#00F5D4',
  '#FEE440', '#06D6A0', '#118AB2', '#EF476F', '#FFC43D',
]
