import { CATEGORY_PROMPTS } from './category-prompts'
import type { Category, Specimen } from './types'

export const CATEGORIES: Category[] = [
  {
    id: 'cells-microbes',
    name: 'Cells & Microbes',
    description:
      'Cells, microbes, parasites, pollen, plankton, and hidden microscopic life.',
    scale: 'microscopic',
    prompts: CATEGORY_PROMPTS['cells-microbes'],
  },
  {
    id: 'human-body',
    name: 'Human Body',
    description:
      'Organs, development, disease, healing, immune responses, and body systems.',
    scale: 'organ',
    prompts: CATEGORY_PROMPTS['human-body'],
  },
  {
    id: 'animals',
    name: 'Animals',
    description:
      'Anatomy, senses, life cycles, behavior, adaptations, and evolution.',
    scale: 'organism',
    prompts: CATEGORY_PROMPTS.animals,
  },
  {
    id: 'plants-fungi',
    name: 'Plants & Fungi',
    description:
      'Leaves, roots, seeds, flowers, bark, mushrooms, lichens, and forest networks.',
    scale: 'organism',
    prompts: CATEGORY_PROMPTS['plants-fungi'],
  },
  {
    id: 'ecosystems-places',
    name: 'Ecosystems & Places',
    description:
      'Habitats, food webs, native species, invasive species, and biogeography.',
    scale: 'ecosystem',
    prompts: CATEGORY_PROMPTS['ecosystems-places'],
  },
  {
    id: 'water-worlds',
    name: 'Water Worlds',
    description:
      'Drops, oceans, glaciers, clouds, surface tension, microplastics, and treatment.',
    scale: 'microscopic',
    prompts: CATEGORY_PROMPTS['water-worlds'],
  },
  {
    id: 'food-materials',
    name: 'Food & Materials',
    description:
      'Everyday food, fibers, dust, metals, plastics, glass, soap, paper, and screens.',
    scale: 'microscopic',
    prompts: CATEGORY_PROMPTS['food-materials'],
  },
  {
    id: 'chemistry-matter',
    name: 'Chemistry & Matter',
    description:
      'Atoms, molecules, crystals, reactions, proteins, DNA, batteries, and medicines.',
    scale: 'molecular',
    prompts: CATEGORY_PROMPTS['chemistry-matter'],
  },
  {
    id: 'earth-weather',
    name: 'Earth & Weather',
    description:
      'Rocks, fossils, volcanoes, clouds, storms, auroras, climate, and deep time.',
    scale: 'planetary',
    prompts: CATEGORY_PROMPTS['earth-weather'],
  },
  {
    id: 'space-time',
    name: 'Space & Deep Time',
    description:
      'Stars, planets, galaxies, black holes, evolution, extinction, and future life.',
    scale: 'cosmic',
    prompts: CATEGORY_PROMPTS['space-time'],
  },
  {
    id: 'machines-systems',
    name: 'Machines & Systems',
    description:
      'Engines, batteries, microchips, cameras, bridges, treatment plants, and rockets.',
    scale: 'system',
    prompts: CATEGORY_PROMPTS['machines-systems'],
  },
]

export const SPECIMENS: Specimen[] = []
