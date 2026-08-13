const dungeonAdjectives = [
  'Forgotten',
  'Cursed',
  'Ancient',
  'Sunken',
  'Whispering',
  'Forbidden',
  'Bloodied',
  'Shattered',
  'Desolate',
  'Ethereal',
]

const dungeonNouns = [
  'Crypt',
  'Labyrinth',
  'Keep',
  'Hollow',
  'Depths',
  'Sanctum',
  'Catacombs',
  'Ruins',
  'Spire',
  'Abyss',
]

const itemAdjectives = [
  'Glimmering',
  'Tarnished',
  'Blessed',
  'Demonic',
  'Heavy',
  'Fragile',
  'Rusty',
  'Flawless',
]

const itemMaterials = [
  'Iron',
  'Mithril',
  'Crystal',
  'Bone',
  'Shadow',
  'Gold',
  'Obsidian',
  'Silver',
]

const itemNouns = [
  'Ring',
  'Amulet',
  'Chalice',
  'Crown',
  'Idol',
  'Relic',
  'Gem',
  'Tome',
]

const itemSuffixes = [
  'of Wisdom',
  'of the Leech',
  'of Eternal Fire',
  'of the Boar',
  'of Agony',
  'of the Stars',
]

function getRandomElement<T>(arr: T[]): T {
  if (arr.length === 0) {
    throw new Error('Cannot pick from an empty array')
  }
  return arr[Math.floor(Math.random() * arr.length)]!
}

export function generateDungeonName(): string {
  return `${getRandomElement(dungeonAdjectives)} ${getRandomElement(dungeonNouns)}`
}

export function generateLootName(): string {
  const material = getRandomElement(itemMaterials)
  const noun = getRandomElement(itemNouns)
  if (Math.random() < 0.5) {
    return `${getRandomElement(itemAdjectives)} ${material} ${noun}`
  }
  return `${material} ${noun} ${getRandomElement(itemSuffixes)}`
}
