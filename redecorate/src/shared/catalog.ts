// AUTO-GENERATED design catalog for Redecorate.
// A curated library of style presets, fill-in-the-blank prompt templates, and
// starter folders so anyone — not just designers — can reimagine a space in one tap.

export type SpaceKind = 'interior' | 'exterior' | 'both'

export interface PresetCategory {
  key: string
  label: string
  emoji: string
  description: string
}

export interface StylePreset {
  id: string
  name: string
  blurb: string
  /** Image-generation instruction that restyles a photo while preserving room geometry. */
  prompt: string
  applies: SpaceKind
  /** Hex color that represents the style in the UI. */
  accent: string
  tags: string[]
  category: string
  /** Room/area subtype keys this style suits (see STYLE_SUBTYPES) — powers room search + filters. */
  subtypes: string[]
  /** Optional example-render URL, auto-filled by the server from public/styles/<id>.{webp,jpg,png}. */
  thumbnail?: string
}

export interface StyleSubtype {
  key: string
  label: string
  emoji: string
  space: SpaceKind
}

export interface TemplatePlaceholder {
  key: string
  examples: string[]
}

export interface PromptTemplate {
  id: string
  name: string
  blurb: string
  /** Prompt with {placeholders} in curly braces. */
  template: string
  placeholders: TemplatePlaceholder[]
}

export interface StarterFolder {
  name: string
  blurb: string
  emoji: string
  space: SpaceKind
}

export const PRESET_CATEGORIES: PresetCategory[] = [
  {
    key: 'interior-styles',
    label: 'Interior styles',
    emoji: '🛋️',
    description: 'Whole-room aesthetics for indoor spaces',
  },
  {
    key: 'exterior-styles',
    label: 'Exterior & architecture',
    emoji: '🏛️',
    description: 'Facade and architectural restyles',
  },
  {
    key: 'backyard-landscape',
    label: 'Backyard & landscape',
    emoji: '🌳',
    description: 'Patios, gardens, pools, and outdoor living',
  },
  {
    key: 'room-makeovers',
    label: 'Room makeovers',
    emoji: '🪄',
    description: 'Targeted transformations by room type',
  },
  {
    key: 'color-mood',
    label: 'Color & mood',
    emoji: '🎨',
    description: 'Restyle by palette and atmosphere',
  },
  {
    key: 'seasonal-occasion',
    label: 'Seasonal & occasion',
    emoji: '🍂',
    description: 'Temporary decorative layering',
  },
  {
    key: 'floorplan-staging',
    label: 'Floorplan & staging',
    emoji: '📐',
    description: 'Floorplans, empty rooms, and virtual staging',
  },
]

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: 'interior-modern',
    name: 'Modern',
    blurb:
      'Clean lines, neutral palette, and uncluttered open space with sleek finishes',
    prompt:
      'Restyle this room in a crisp Modern aesthetic: smooth matte-white and warm-gray surfaces, a low-profile leather or linen sofa with clean geometric lines, polished concrete or wide oak flooring, a glass-and-steel coffee table, and minimal sculptural decor. Light it with bright even daylight and a single statement pendant in a palette of white, charcoal, and muted taupe, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout.',
    applies: 'interior',
    accent: '#8A8D91',
    tags: ['modern', 'clean', 'neutral', 'sleek'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'interior-styles',
  },
  {
    id: 'interior-contemporary',
    name: 'Contemporary',
    blurb:
      'Current, gallery-fresh look with curved forms and soft neutral layering',
    prompt:
      'Give this room a Contemporary makeover: soft greige and cream walls, a plush curved sofa, rounded boucle accent chairs, large-scale abstract art, and layered textured rugs. Add brushed-brass fixtures, a sculptural floor lamp, and warm dimmable lighting for an of-the-moment gallery feel, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout.',
    applies: 'interior',
    accent: '#B7AFA3',
    tags: ['contemporary', 'current', 'curved', 'neutral'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'interior-styles',
  },
  {
    id: 'interior-mid-century-modern',
    name: 'Mid-Century Modern',
    blurb: 'Warm woods, tapered legs, and retro 1950s-60s silhouettes',
    prompt:
      'Restyle the furnishings in Mid-Century Modern style: walnut furniture with tapered peg legs, a low tufted sofa in mustard or burnt-orange, an Eames-style lounge chair, an organic-shaped coffee table, and a starburst clock. Add warm woods, olive and teal accents, brass globe lighting, and soft afternoon sunlight, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout.',
    applies: 'interior',
    accent: '#C97B3C',
    tags: ['midcentury', 'retro', 'walnut', 'warm'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'interior-styles',
  },
  {
    id: 'interior-scandinavian',
    name: 'Scandinavian',
    blurb: 'Light woods, white walls, and cozy minimal Nordic warmth',
    prompt:
      'Restyle this space in a Scandinavian aesthetic: bright white walls, pale ash and birch furniture with clean simple lines, a light-gray linen sofa, chunky knit throws, sheepskin accents, and a few leafy potted plants. Keep flooring blond wood, decor sparse and functional, and lighting soft and diffuse like Nordic daylight, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout.',
    applies: 'interior',
    accent: '#D8D3CA',
    tags: ['scandinavian', 'nordic', 'light-wood', 'cozy'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'interior-styles',
  },
  {
    id: 'interior-japandi',
    name: 'Japandi',
    blurb: 'Japanese serenity meets Scandinavian warmth in muted calm',
    prompt:
      'Reimagine this room in Japandi style: low-slung wood furniture, handmade ceramics, paper-shade lamps, and tactile linen and wool textiles in a muted palette of oatmeal, clay, and charcoal. Blend warm light woods with matte black accents, leave surfaces serene and uncluttered, and use soft natural light, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout.',
    applies: 'interior',
    accent: '#A99B86',
    tags: ['japandi', 'zen', 'muted', 'minimal'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'interior-styles',
  },
  {
    id: 'interior-minimalist',
    name: 'Minimalist',
    blurb: 'Bare, intentional, and calm with only the essentials',
    prompt:
      'Restyle this room into a Minimalist aesthetic: monochrome white and pale-gray surfaces, a single low sofa, one clean-lined table, concealed storage furniture, and almost no decor beyond a single vase or artwork. Keep every surface clear, lines straight, and lighting bright and even for a calm, breathable emptiness, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout.',
    applies: 'interior',
    accent: '#CFCFCF',
    tags: ['minimalist', 'calm', 'monochrome', 'essential'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'interior-styles',
  },
  {
    id: 'interior-warm-minimalism',
    name: 'Warm Minimalism',
    blurb: 'Organic minimalism with earthy tones and soft natural textures',
    prompt:
      'Restyle this room as Warm Organic Minimalism: plaster-look walls in warm beige, a rounded oatmeal sofa, travertine and pale-oak surfaces, linen drapery, and a few sculptural ceramic objects. Keep it spare but inviting with soft curves, earthy tones, and golden diffuse lighting, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout.',
    applies: 'interior',
    accent: '#C9B79C',
    tags: ['minimalist', 'organic', 'earthy', 'warm'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'interior-styles',
  },
  {
    id: 'interior-industrial',
    name: 'Industrial',
    blurb: 'Exposed brick, raw metal, and warehouse-loft grit',
    prompt:
      'Restyle the finishes in an Industrial aesthetic: exposed-brick-look feature walls, blackened steel and reclaimed-wood furniture, a worn leather sofa, concrete-look flooring, and Edison-bulb cage fixtures. Use a moody palette of charcoal, rust, and aged wood with directional warm lighting, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout.',
    applies: 'interior',
    accent: '#6E6A66',
    tags: ['industrial', 'loft', 'metal', 'brick'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'interior-styles',
  },
  {
    id: 'interior-bohemian',
    name: 'Bohemian',
    blurb: 'Layered textiles, plants, and free-spirited global color',
    prompt:
      'Restyle this room in a Bohemian aesthetic: layered patterned rugs, a low rattan sofa piled with eclectic throw pillows, macrame wall hangings, abundant trailing plants, and warm terracotta and jewel-tone accents. Mix vintage wood, woven baskets, and brass for a relaxed collected look with warm ambient lighting, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout.',
    applies: 'interior',
    accent: '#B5683E',
    tags: ['bohemian', 'boho', 'layered', 'eclectic'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'interior-styles',
  },
  {
    id: 'interior-coastal-hamptons',
    name: 'Coastal (Hamptons)',
    blurb: 'Breezy blues, crisp whites, and relaxed seaside elegance',
    prompt:
      'Reimagine this room in Coastal Hamptons style: crisp white shiplap-look walls, slipcovered linen sofas, weathered light-oak furniture, navy and seafoam accents, and natural jute rugs. Add rattan textures, woven pendant lights, and breezy sheer drapery for an airy seaside elegance bathed in bright daylight, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout.',
    applies: 'interior',
    accent: '#7FA8C9',
    tags: ['coastal', 'hamptons', 'beach', 'breezy'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'interior-styles',
  },
  {
    id: 'interior-modern-farmhouse',
    name: 'Modern Farmhouse',
    blurb: 'Crisp whites, black accents, and cozy rustic-modern balance',
    prompt:
      'Restyle this room as a Modern Farmhouse: warm white shiplap-look walls, a comfy neutral linen sofa, reclaimed-wood coffee table, matte-black fixtures and window-frame finishes, and woven baskets. Layer cozy throws, greenery, and a jute rug with bright airy light for a clean rustic-modern blend, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout.',
    applies: 'interior',
    accent: '#9A9287',
    tags: ['farmhouse', 'modern-farmhouse', 'shiplap', 'cozy'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'interior-styles',
  },
  {
    id: 'interior-farmhouse',
    name: 'Farmhouse',
    blurb: 'Rustic country warmth with vintage charm and aged woods',
    prompt:
      'Give this room a classic Farmhouse aesthetic: warm whitewashed walls, distressed-wood furniture, a deep slipcovered sofa, vintage enamel and galvanized accents, and gingham or floral textiles. Add barn-style decorative touches, antique finds, and soft warm light for a homey country charm, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout.',
    applies: 'interior',
    accent: '#B0A48E',
    tags: ['farmhouse', 'rustic', 'country', 'vintage'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'interior-styles',
  },
  {
    id: 'interior-transitional',
    name: 'Transitional',
    blurb: 'Balanced blend of traditional comfort and modern restraint',
    prompt:
      'Restyle this room in a Transitional aesthetic: a soft neutral palette of greige, ivory, and taupe, a comfortable rolled-arm sofa with clean lines, classic-yet-simple furniture, tone-on-tone textured rugs, and understated metallic accents. Balance traditional warmth with modern simplicity under soft layered lighting, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout.',
    applies: 'interior',
    accent: '#A89F92',
    tags: ['transitional', 'balanced', 'neutral', 'timeless'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'interior-styles',
  },
  {
    id: 'interior-traditional',
    name: 'Traditional',
    blurb: 'Classic elegance with rich woods, symmetry, and refined detail',
    prompt:
      'Reimagine this room in a Traditional aesthetic: rich mahogany and cherry furniture, a tufted rolled-arm sofa, symmetrical arrangements, damask and floral textiles, and a classic patterned area rug. Add crown-molding-style trim accents, framed oil paintings, and warm chandelier lighting for refined timeless elegance, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout.',
    applies: 'interior',
    accent: '#7A5A41',
    tags: ['traditional', 'classic', 'elegant', 'formal'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'interior-styles',
  },
  {
    id: 'interior-art-deco',
    name: 'Art Deco',
    blurb: 'Glamorous geometry, brass, and bold 1920s opulence',
    prompt:
      'Restyle this room in lavish Art Deco style: bold geometric patterns, velvet upholstery in emerald or sapphire, lacquered black and gold surfaces, fluted detailing, and mirrored furniture. Add fan-motif accents, brass sunburst fixtures, and dramatic glamorous lighting for 1920s opulence, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout.',
    applies: 'interior',
    accent: '#C8A04B',
    tags: ['artdeco', 'glamour', 'geometric', 'brass'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'interior-styles',
  },
  {
    id: 'interior-hollywood-regency',
    name: 'Hollywood Regency',
    blurb: 'High-glam maximalism with lacquer, mirrors, and bold contrast',
    prompt:
      'Give this room a Hollywood Regency makeover: high-gloss lacquered surfaces, tufted velvet seating, mirrored and gold-accented furniture, bold black-and-white contrast, and dramatic jewel tones. Add a crystal chandelier, animal-print or chinoiserie accents, and glamorous theatrical lighting, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout.',
    applies: 'interior',
    accent: '#D4AF6A',
    tags: ['regency', 'glam', 'lacquer', 'bold'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'interior-styles',
  },
  {
    id: 'interior-maximalist',
    name: 'Maximalist',
    blurb: 'More-is-more layering of pattern, color, and collected treasures',
    prompt:
      'Restyle this room as bold Maximalism: saturated jewel-tone walls, clashing-yet-curated patterns, layered rugs and textiles, gallery walls of framed art, and shelves brimming with books and objects. Mix velvet, brass, and lacquer in a rich exuberant palette under warm layered lighting, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout.',
    applies: 'interior',
    accent: '#9B3B5A',
    tags: ['maximalist', 'bold', 'pattern', 'eclectic'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'interior-styles',
  },
  {
    id: 'interior-rustic',
    name: 'Rustic',
    blurb: 'Rugged natural woods, stone, and warm lodge-like comfort',
    prompt:
      'Reimagine this room in a Rustic aesthetic: rough-hewn timber furniture, exposed wood-beam-look ceiling finishes, a stacked-stone fireplace-surround look, leather and wool upholstery, and cozy plaid throws. Use warm earthy browns, amber, and forest green with a glowing fireside light for a rugged lodge comfort, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout.',
    applies: 'interior',
    accent: '#7C5E3C',
    tags: ['rustic', 'lodge', 'wood', 'cozy'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'interior-styles',
  },
  {
    id: 'interior-french-country',
    name: 'French Country',
    blurb: 'Soft pastels, carved wood, and rustic Provencal romance',
    prompt:
      'Restyle this room in French Country style: soft buttery-cream and lavender tones, carved and gently distressed wood furniture, a curved cabriole-leg sofa, toile and floral textiles, and wrought-iron accents. Add a weathered armoire, fresh-cut flowers, and warm romantic lighting for rustic Provencal charm, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout.',
    applies: 'interior',
    accent: '#B9A6C0',
    tags: ['french-country', 'provencal', 'romantic', 'pastel'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'interior-styles',
  },
  {
    id: 'interior-parisian',
    name: 'Parisian Apartment',
    blurb: 'Chic effortless elegance with vintage finds and airy light',
    prompt:
      'Give this room the air of a chic Parisian apartment: soft ivory walls, ornate trim and panel-molding-look detailing, a velvet or linen sofa, vintage gilt mirrors, mismatched antique chairs, and stacks of art books. Mix old and new effortlessly with brass accents and soft natural light for understated French elegance, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout.',
    applies: 'interior',
    accent: '#C2B8A8',
    tags: ['parisian', 'chic', 'vintage', 'elegant'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'interior-styles',
  },
  {
    id: 'interior-english-country',
    name: 'English Country',
    blurb: 'Layered florals, cozy clutter, and timeless heritage comfort',
    prompt:
      'Restyle this room in English Country style: layered floral and chintz fabrics, a deep tufted roll-arm sofa, antique wood furniture, a worn Persian rug, and shelves of books and china. Add botanical prints, a fireside armchair, and warm lamplight for cozy lived-in heritage charm, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout.',
    applies: 'interior',
    accent: '#8A7B4F',
    tags: ['english-country', 'cottage', 'floral', 'heritage'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'interior-styles',
  },
  {
    id: 'interior-mediterranean',
    name: 'Mediterranean',
    blurb: 'Sun-warmed plaster, terracotta, and relaxed seaside-villa charm',
    prompt:
      'Reimagine this room in a Mediterranean aesthetic: warm plaster-look walls, terracotta tile-look flooring, arched-niche decor accents, carved wood and wrought-iron furniture, and patterned ceramic pieces. Use sun-baked tones of ochre, olive, and azure with woven textures and warm golden light for a relaxed seaside-villa feel, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout.',
    applies: 'interior',
    accent: '#C98A4B',
    tags: ['mediterranean', 'villa', 'terracotta', 'warm'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'interior-styles',
  },
  {
    id: 'interior-tuscan',
    name: 'Tuscan',
    blurb: 'Old-world Italian warmth with stone, iron, and earthy richness',
    prompt:
      'Restyle this room in Tuscan style: textured ochre and umber plaster-look walls, heavy carved-wood furniture, a stone fireplace-surround look, wrought-iron details, and rich leather and tapestry textiles. Add terracotta accents, grapevine motifs, and warm amber lighting for old-world Italian richness, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout.',
    applies: 'interior',
    accent: '#A6702E',
    tags: ['tuscan', 'italian', 'old-world', 'earthy'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'interior-styles',
  },
  {
    id: 'interior-southwestern',
    name: 'Southwestern / Santa Fe',
    blurb: 'Desert hues, adobe textures, and woven Native-inspired warmth',
    prompt:
      'Give this room a Southwestern Santa Fe aesthetic: warm adobe-plaster-look walls, terracotta tile-look floors, leather and woven-textile furniture, vega-beam-look ceiling accents, and Navajo-inspired patterned rugs and pillows. Use sun-bleached desert tones of clay, sand, turquoise, and cactus green with warm lighting and clay pottery, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout.',
    applies: 'interior',
    accent: '#C0764A',
    tags: ['southwestern', 'santa-fe', 'desert', 'adobe'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'interior-styles',
  },
  {
    id: 'interior-moroccan',
    name: 'Moroccan',
    blurb: 'Jewel tones, intricate tile, and exotic lantern-lit luxury',
    prompt:
      'Restyle this room in Moroccan style: richly patterned zellige tile-look surfaces, low plush seating with embroidered cushions, carved wood and inlaid furniture, layered Berber rugs, and pierced-metal lanterns. Use saturated jewel tones of ruby, sapphire, and gold with intricate arabesque detail and warm lantern glow, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout.',
    applies: 'interior',
    accent: '#B0413E',
    tags: ['moroccan', 'exotic', 'jewel-tone', 'lantern'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'interior-styles',
  },
  {
    id: 'interior-eclectic',
    name: 'Eclectic',
    blurb: 'Curated mix of eras, styles, and personality in harmony',
    prompt:
      'Reimagine this room as artful Eclectic style: a confident mix of vintage and modern furniture, contrasting patterns and textures, a bold gallery wall, and globally collected objects unified by a cohesive accent color. Layer rugs, mix metals and woods, and use warm flexible lighting for a personal collected-over-time look, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout.',
    applies: 'interior',
    accent: '#7E6E9B',
    tags: ['eclectic', 'curated', 'mixed', 'personal'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'interior-styles',
  },
  {
    id: 'interior-wabi-sabi',
    name: 'Wabi-Sabi',
    blurb: 'Beauty in imperfection with raw, weathered, organic calm',
    prompt:
      'Restyle this room in Wabi-Sabi style: rough plaster-look walls, weathered and imperfect wood furniture, handmade unglazed ceramics, raw linen textiles, and natural stone accents. Keep a muted earthy palette of clay, ash, and stone with sparse arrangement and soft shadowy natural light for serene imperfect beauty, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout.',
    applies: 'interior',
    accent: '#9C9082',
    tags: ['wabi-sabi', 'imperfect', 'raw', 'calm'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'interior-styles',
  },
  {
    id: 'interior-cottagecore',
    name: 'Cottagecore',
    blurb: 'Whimsical pastoral charm with florals, lace, and vintage sweetness',
    prompt:
      'Give this room a Cottagecore aesthetic: soft floral wallpaper-look walls, vintage painted-wood furniture, a cozy slipcovered sofa, gingham and lace textiles, and dried-flower and botanical decor. Add open shelves of crockery, warm pastoral tones, and gentle daylight for whimsical countryside sweetness, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout.',
    applies: 'interior',
    accent: '#C7A8B5',
    tags: ['cottagecore', 'pastoral', 'floral', 'vintage'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'interior-styles',
  },
  {
    id: 'interior-dark-academia',
    name: 'Dark Academia',
    blurb: 'Moody scholarly library with rich woods and vintage books',
    prompt:
      'Restyle this room in Dark Academia style: deep forest-green or oxblood walls, dark-wood bookshelves crammed with books, leather Chesterfield seating, brass and amber lighting, and vintage maps and framed art. Use a moody palette of mahogany, charcoal, and burgundy with warm dim scholarly light, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout.',
    applies: 'interior',
    accent: '#5A4632',
    tags: ['dark-academia', 'moody', 'library', 'vintage'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'interior-styles',
  },
  {
    id: 'interior-biophilic',
    name: 'Biophilic',
    blurb: 'Nature-immersed greenery, natural materials, and fresh calm',
    prompt:
      'Reimagine this room in a Biophilic aesthetic: abundant lush plants and hanging greenery, living-wall accents, natural wood and stone surfaces, woven organic textiles, and earthy green tones. Maximize the feel of natural light, add a tabletop water-feature or moss accent, and keep materials raw and tactile for a fresh nature-connected calm, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout.',
    applies: 'interior',
    accent: '#5E7E54',
    tags: ['biophilic', 'plants', 'natural', 'green'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'interior-styles',
  },
  {
    id: 'interior-hygge',
    name: 'Hygge',
    blurb: 'Soft, snug Danish coziness built for comfort and calm',
    prompt:
      'Restyle this room in cozy Hygge style: soft neutral and warm-white tones, plush oversized sofa with layered chunky knit blankets and pillows, sheepskin throws, natural wood accents, and abundant candles. Add a warm soft glow from lamps and candlelight for an intimate snug Danish comfort, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout.',
    applies: 'interior',
    accent: '#C8B9A6',
    tags: ['hygge', 'cozy', 'danish', 'warm'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'interior-styles',
  },
  {
    id: 'interior-coastal-grandmother',
    name: 'Coastal Grandmother',
    blurb: 'Relaxed creamy elegance with linen, hydrangeas, and soft light',
    prompt:
      'Give this room a Coastal Grandmother aesthetic: creamy white walls, slipcovered linen sofas, light natural-wood and rattan furniture, soft blue-and-white accents, and fresh hydrangeas in ceramic vases. Layer cozy throws, woven textures, and breezy linen drapery with soft warm daylight for relaxed timeless comfort, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout.',
    applies: 'interior',
    accent: '#A9BBC4',
    tags: ['coastal', 'grandmother', 'linen', 'relaxed'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'interior-styles',
  },
  {
    id: 'interior-shabby-chic',
    name: 'Shabby Chic',
    blurb: 'Soft distressed whites, romantic florals, and vintage softness',
    prompt:
      'Restyle this room in Shabby Chic style: distressed white-painted wood furniture, a plush slipcovered sofa, soft pastel and faded-floral textiles, vintage crystal accents, and lace or ruffled details. Keep a romantic palette of cream, blush, and pale sage with soft diffuse light for tender vintage charm, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout.',
    applies: 'interior',
    accent: '#D6C2C7',
    tags: ['shabby-chic', 'vintage', 'distressed', 'romantic'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'interior-styles',
  },
  {
    id: 'interior-british-colonial',
    name: 'Tropical British Colonial',
    blurb: 'Dark woods, rattan, and lush palms with old-world tropical flair',
    prompt:
      'Reimagine this room in Tropical British Colonial style: dark mahogany furniture, rattan and cane seating, crisp white upholstery, botanical palm-print textiles, and brass accents. Add lush potted palms, plantation-shutter-look window dressing, and a ceiling fan with warm filtered light for a refined old-world tropical retreat, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout.',
    applies: 'interior',
    accent: '#6B5238',
    tags: ['colonial', 'tropical', 'rattan', 'palm'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'interior-styles',
  },
  {
    id: 'interior-mid-century-revival',
    name: 'Mid-Century Revival',
    blurb: 'Updated retro silhouettes with modern color and fresh polish',
    prompt:
      'Restyle this room as a Mid-Century Revival: iconic tapered-leg silhouettes refreshed with contemporary boucle and velvet, walnut and cane furniture, an updated palette of sage, rust, and cream, and bold graphic art. Pair brass globe lighting with sleek modern finishes and bright clean light for a polished retro-modern blend, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout.',
    applies: 'interior',
    accent: '#B07A4A',
    tags: ['midcentury', 'revival', 'retro-modern', 'walnut'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'interior-styles',
  },
  {
    id: 'interior-retro-70s',
    name: 'Retro 70s',
    blurb: 'Earthy grooviness with warm oranges, shag, and bold patterns',
    prompt:
      'Give this room a Retro 70s aesthetic: warm earthy palette of avocado, burnt orange, harvest gold, and brown, a low modular sofa, shag rug, and rattan and chrome accents. Add geometric or paisley patterns, macrame, and globe lamps with warm groovy lighting for a nostalgic 1970s vibe, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout.',
    applies: 'interior',
    accent: '#C26A2C',
    tags: ['retro', '70s', 'groovy', 'earthy'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'interior-styles',
  },
  {
    id: 'exterior-craftsman',
    name: 'Craftsman',
    blurb: 'Tapered columns, deep eaves, earthy hand-built character',
    prompt:
      'Restyle the home as an Arts-and-Crafts Craftsman: earthy shingle-and-clapboard siding, tapered columns on stone piers, deep overhanging eaves with exposed rafter tails and knee braces, and a low-pitched gabled roof. Recolor in muted olive, sage, and warm brown with multi-light wood-style window trim, a covered porch, and a substantial craftsman front door with sidelights and warm path lighting. This is a surface restyle only: preserve the exact structure, footprint, rooflines, and the existing window and door positions, sizes, and openings without adding, removing, or relocating any.',
    applies: 'exterior',
    accent: '#6B7B4F',
    tags: ['craftsman', 'arts-and-crafts', 'porch', 'popular'],
    subtypes: ['facade', 'front-yard'],
    category: 'exterior-styles',
  },
  {
    id: 'exterior-colonial',
    name: 'Colonial',
    blurb: 'Symmetrical two-story, shutters, classic centered entry',
    prompt:
      'Restyle the facade into a classic American Colonial: symmetrical composition, paired louvered shutters flanking each existing window, white clapboard or red brick, and a centered paneled door beneath a pediment. Restyle in crisp white with black shutters or warm red brick, neat boxwood hedges, a brick walkway, and a brass-accented entry lantern. This is a surface restyle only: preserve the exact structure, footprint, rooflines, and the existing window and door positions, sizes, and openings without adding, removing, or relocating any.',
    applies: 'exterior',
    accent: '#8B3A3A',
    tags: ['colonial', 'symmetrical', 'traditional'],
    subtypes: ['facade', 'front-yard'],
    category: 'exterior-styles',
  },
  {
    id: 'exterior-spanish-colonial',
    name: 'Spanish Colonial',
    blurb: 'White stucco, red tile, bell-gable accents, hacienda spirit',
    prompt:
      'Restyle the home in Spanish Colonial style: thick whitewashed stucco walls, a low red clay-tile roof, exposed wood beam accents, and decorative tile and wrought-iron details around the existing openings. Use a palette of bright white, terracotta, and deep blue accents with a heavy carved-wood front door, hacienda courtyard styling, olive and citrus trees, and warm Mission-era charm. This is a surface restyle only: preserve the exact structure, footprint, rooflines, and the existing window and door positions, sizes, and openings without adding, removing, or relocating any.',
    applies: 'exterior',
    accent: '#B85C3C',
    tags: ['spanish-colonial', 'stucco', 'tile', 'hacienda'],
    subtypes: ['facade', 'front-yard'],
    category: 'exterior-styles',
  },
  {
    id: 'exterior-tudor',
    name: 'Tudor',
    blurb: 'Half-timbering, steep gables, brick-and-stucco storybook look',
    prompt:
      'Restyle the facade as an English Tudor: decorative dark half-timbering over cream stucco, mixed brick and stone at the base, steeply pitched cross-gable styling, and leaded diamond-pane window detailing. Use a palette of espresso timber, warm stucco, and earthy brick with a rounded arched-look front door, a prominent chimney accent, and storybook cottage landscaping. This is a surface restyle only: preserve the exact structure, footprint, rooflines, and the existing window and door positions, sizes, and openings without adding, removing, or relocating any.',
    applies: 'exterior',
    accent: '#5A4632',
    tags: ['tudor', 'half-timber', 'storybook'],
    subtypes: ['facade', 'front-yard'],
    category: 'exterior-styles',
  },
  {
    id: 'exterior-ranch',
    name: 'Ranch',
    blurb: 'Long single-story, low roof, easy mid-century suburban ease',
    prompt:
      'Restyle the facade as a classic single-story Ranch: long horizontal massing, a low-pitched roof with wide eaves, a mix of brick and horizontal siding, and a relaxed low-profile entry. Use warm brick, tan siding, and white trim with picture-window styling, a front-yard lawn, tidy foundation shrubs, and an inviting recessed porch. This is a surface restyle only: preserve the exact structure, footprint, rooflines, and the existing window and door positions, sizes, and openings without adding, removing, or relocating any.',
    applies: 'exterior',
    accent: '#A8845C',
    tags: ['ranch', 'single-story', 'suburban'],
    subtypes: ['facade', 'front-yard'],
    category: 'exterior-styles',
  },
  {
    id: 'exterior-farmhouse',
    name: 'Classic Farmhouse',
    blurb: 'Wraparound porch, gabled roof, white siding, country warmth',
    prompt:
      'Restyle the home as a classic American farmhouse: white horizontal lap siding, a steep gabled roof, a deep wraparound-style covered porch with simple square posts, and a welcoming wood front door. Use a warm white-and-cream palette with green or barn-red accents, double-hung window styling, a picket fence, hydrangeas, and a stone-edged garden path. This is a surface restyle only: preserve the exact structure, footprint, rooflines, and the existing window and door positions, sizes, and openings without adding, removing, or relocating any.',
    applies: 'exterior',
    accent: '#7C8C6A',
    tags: ['farmhouse', 'country', 'porch', 'white'],
    subtypes: ['facade', 'front-yard'],
    category: 'exterior-styles',
  },
  {
    id: 'exterior-cottage',
    name: 'Cottage',
    blurb: 'Cozy curb appeal, soft colors, flower beds, storybook scale',
    prompt:
      'Restyle the home as a charming cottage: textured stucco or painted lap siding, a softly weathered shingle roof, shutters and window-box styling, and a cozy arched or paneled front door. Use a gentle palette of sage, butter cream, and soft slate with climbing roses, lush cottage-garden flower beds, a curved stone path, and warm lantern lighting. This is a surface restyle only: preserve the exact structure, footprint, rooflines, and the existing window and door positions, sizes, and openings without adding, removing, or relocating any.',
    applies: 'exterior',
    accent: '#9CA77E',
    tags: ['cottage', 'cozy', 'garden', 'storybook'],
    subtypes: ['facade', 'front-yard'],
    category: 'exterior-styles',
  },
  {
    id: 'exterior-victorian',
    name: 'Victorian',
    blurb: 'Ornate trim, painted-lady colors, gingerbread detail',
    prompt:
      'Restyle the home as an ornate Victorian: intricate gingerbread trim, decorative bargeboards, fish-scale shingles, a porch with turned-spindle styling, and tall narrow window detailing. Apply a layered painted-lady palette of plum, sage, gold, and cream with contrasting trim, ornamental ironwork, and a romantic Victorian front door framed by detailed millwork. This is a surface restyle only: preserve the exact structure, footprint, rooflines, and the existing window and door positions, sizes, and openings without adding, removing, or relocating any.',
    applies: 'exterior',
    accent: '#7E4A6B',
    tags: ['victorian', 'ornate', 'painted-lady'],
    subtypes: ['facade', 'front-yard'],
    category: 'exterior-styles',
  },
  {
    id: 'exterior-capecod',
    name: 'Cape Cod',
    blurb: 'Steep roof, dormers, cedar shingles, tidy New England charm',
    prompt:
      'Restyle the facade as a New England Cape Cod: weathered cedar shingle or clapboard siding, a steeply pitched roof with dormer styling, a symmetrical front, and a simple paneled center door with sidelights. Use a palette of gray-shingle, soft white trim, and navy or black shutters with multi-pane window styling, climbing roses, a picket fence, and a brick path. This is a surface restyle only: preserve the exact structure, footprint, rooflines, and the existing window and door positions, sizes, and openings without adding, removing, or relocating any.',
    applies: 'exterior',
    accent: '#5C6B7A',
    tags: ['capecod', 'new-england', 'shingle'],
    subtypes: ['facade', 'front-yard'],
    category: 'exterior-styles',
  },
  {
    id: 'exterior-coastal-beach',
    name: 'Coastal / Beach House',
    blurb: 'Breezy siding, soft blues, weathered wood, seaside calm',
    prompt:
      'Restyle the home into a breezy coastal beach house: light horizontal lap or shingle siding, a relaxed covered porch, weathered-wood accents, and a soft sea-glass front door. Use a palette of soft white, sky blue, and driftwood gray with airy window styling, beach grasses, a sandy stone path, woven outdoor accents, and bright seaside daylight. This is a surface restyle only: preserve the exact structure, footprint, rooflines, and the existing window and door positions, sizes, and openings without adding, removing, or relocating any.',
    applies: 'exterior',
    accent: '#7FB1C4',
    tags: ['coastal', 'beach', 'breezy', 'blue'],
    subtypes: ['facade', 'front-yard'],
    category: 'exterior-styles',
  },
  {
    id: 'exterior-modern-black',
    name: 'Modern Black',
    blurb: 'All-black siding, matte minimalism, bold Scandinavian edge',
    prompt:
      'Restyle the facade in a striking modern-black aesthetic: matte charcoal-black vertical siding or charred-wood-style cladding, black-framed windows, a black metal roof, and warm natural-wood entry contrast. Use an all-black palette warmed by cedar tones, minimalist gravel and ornamental-grass landscaping, hidden linear lighting, and a sleek front door. This is a surface restyle only: preserve the exact structure, footprint, rooflines, and the existing window and door positions, sizes, and openings without adding, removing, or relocating any.',
    applies: 'exterior',
    accent: '#1A1A1A',
    tags: ['modern', 'black', 'minimal', 'trending'],
    subtypes: ['facade', 'front-yard'],
    category: 'exterior-styles',
  },
  {
    id: 'exterior-mountain-chalet',
    name: 'Mountain / Chalet',
    blurb: 'Timber, stone, big eaves, cozy alpine-lodge warmth',
    prompt:
      'Restyle the home as a mountain chalet lodge: heavy timber beam accents, a stacked-stone base, warm wood siding, and a steeply pitched roof with deep overhanging eaves. Use a palette of natural log-brown, river stone, and forest green with large divided-light window styling, a covered timber entry, evergreen landscaping, and warm glowing lantern lighting. This is a surface restyle only: preserve the exact structure, footprint, rooflines, and the existing window and door positions, sizes, and openings without adding, removing, or relocating any.',
    applies: 'exterior',
    accent: '#6B4F33',
    tags: ['mountain', 'chalet', 'timber', 'stone'],
    subtypes: ['facade', 'front-yard'],
    category: 'exterior-styles',
  },
  {
    id: 'exterior-mediterranean-revival',
    name: 'Mediterranean Revival',
    blurb: 'Grand stucco villa, low tile roof, arched loggias, ornate iron',
    prompt:
      'Restyle the home into a grand Mediterranean Revival villa: smooth cream stucco, a low-pitched terracotta barrel-tile roof, decorative cast-stone surrounds, ornate wrought-iron balcony and lantern accents, and arched-detail entry styling. Use a palette of warm ivory, golden stone, and terracotta with manicured cypress and palm landscaping, a tiled fountain accent, and a carved-wood double door. This is a surface restyle only: preserve the exact structure, footprint, rooflines, and the existing window and door positions, sizes, and openings without adding, removing, or relocating any.',
    applies: 'exterior',
    accent: '#C9A56A',
    tags: ['mediterranean', 'revival', 'stucco', 'villa'],
    subtypes: ['facade', 'front-yard'],
    category: 'exterior-styles',
  },
  {
    id: 'exterior-prairie',
    name: 'Prairie',
    blurb: 'Frank Lloyd Wright horizontals, broad eaves, banded windows',
    prompt:
      'Restyle the facade in Frank Lloyd Wright Prairie style: strong horizontal massing, broad low-pitched hipped-roof styling with deep overhanging eaves, art-glass-style window banding, and earthy brick or stucco with wood banding. Use a palette of warm ochre, russet brick, and bronze with geometric trim, integrated planters, low horizontal landscaping, and a sheltered recessed entry. This is a surface restyle only: preserve the exact structure, footprint, rooflines, and the existing window and door positions, sizes, and openings without adding, removing, or relocating any.',
    applies: 'exterior',
    accent: '#9A7B4F',
    tags: ['prairie', 'wright', 'horizontal'],
    subtypes: ['facade', 'front-yard'],
    category: 'exterior-styles',
  },
  {
    id: 'exterior-georgian',
    name: 'Georgian',
    blurb: 'Stately brick symmetry, crown pediment, formal elegance',
    prompt:
      'Restyle the facade into a stately Georgian: a perfectly symmetrical red-brick composition, evenly aligned multi-pane window styling with stone keystone accents, dentil cornice trim, and a paneled front door crowned by a pediment and pilasters. Use a palette of warm brick, crisp white trim, and black shutters with a brick walkway, clipped boxwood parterres, and brass entry lanterns. This is a surface restyle only: preserve the exact structure, footprint, rooflines, and the existing window and door positions, sizes, and openings without adding, removing, or relocating any.',
    applies: 'exterior',
    accent: '#9B4A3A',
    tags: ['georgian', 'brick', 'symmetrical', 'formal'],
    subtypes: ['facade', 'front-yard'],
    category: 'exterior-styles',
  },
  {
    id: 'exterior-french-provincial',
    name: 'French Provincial',
    blurb: 'Steep hipped roof, stone-and-stucco, French-country elegance',
    prompt:
      'Restyle the home as French Provincial: warm limestone or cream stucco, a steeply pitched hipped-roof look, tall shuttered window styling, and a refined arched entry with iron lantern accents. Use a palette of soft stone, weathered slate-blue, and antique cream with manicured lavender and boxwood landscaping, a gravel courtyard feel, and elegant French-country curb appeal. This is a surface restyle only: preserve the exact structure, footprint, rooflines, and the existing window and door positions, sizes, and openings without adding, removing, or relocating any.',
    applies: 'exterior',
    accent: '#A89B82',
    tags: ['french', 'provincial', 'stone', 'elegant'],
    subtypes: ['facade', 'front-yard'],
    category: 'exterior-styles',
  },
  {
    id: 'exterior-bungalow',
    name: 'Bungalow',
    blurb: 'Cozy one-and-a-half story, low gable, welcoming front porch',
    prompt:
      'Restyle the home as a classic Bungalow: low-slung one-and-a-half-story massing, a wide front-gable roof with exposed bracket accents, a generous covered porch on tapered columns, and a charming multi-light front door. Use a warm palette of clay, cream, and forest green with grouped window styling, a brick or stone porch base, and inviting cottage-garden landscaping. This is a surface restyle only: preserve the exact structure, footprint, rooflines, and the existing window and door positions, sizes, and openings without adding, removing, or relocating any.',
    applies: 'exterior',
    accent: '#A86B43',
    tags: ['bungalow', 'porch', 'cozy'],
    subtypes: ['facade', 'front-yard'],
    category: 'exterior-styles',
  },
  {
    id: 'exterior-desert-adobe',
    name: 'Desert / Adobe / Pueblo',
    blurb: 'Earthen stucco, flat parapets, vigas, Southwestern warmth',
    prompt:
      'Restyle the home in Southwestern adobe pueblo style: rounded earthen-tone stucco walls, flat parapet roofline styling, projecting wood viga beam accents, and deep-set window detailing. Use a palette of warm terracotta, sand, and clay with a carved wood-and-turquoise door, native desert landscaping of agave and cacti, gravel beds, and warm golden-hour desert light. This is a surface restyle only: preserve the exact structure, footprint, rooflines, and the existing window and door positions, sizes, and openings without adding, removing, or relocating any.',
    applies: 'exterior',
    accent: '#C08457',
    tags: ['desert', 'adobe', 'pueblo', 'southwest'],
    subtypes: ['facade', 'front-yard'],
    category: 'exterior-styles',
  },
  {
    id: 'exterior-dutch-colonial',
    name: 'Dutch Colonial',
    blurb: 'Signature gambrel roof, flared eaves, symmetrical charm',
    prompt:
      'Restyle the facade as a Dutch Colonial: the signature broad gambrel-roof styling with flared eaves, symmetrical lap or shingle siding, double-hung multi-pane window styling with shutters, and a centered paneled door with a transom. Use a palette of soft white or warm gray with black shutters, neat hedges, a brick walkway, and a welcoming lantern entry. This is a surface restyle only: preserve the exact structure, footprint, rooflines, and the existing window and door positions, sizes, and openings without adding, removing, or relocating any.',
    applies: 'exterior',
    accent: '#6E7B6A',
    tags: ['dutch-colonial', 'gambrel', 'symmetrical'],
    subtypes: ['facade', 'front-yard'],
    category: 'exterior-styles',
  },
  {
    id: 'exterior-japanese',
    name: 'Japanese',
    blurb: 'Deep eaves, dark timber, shoji calm, serene Zen restraint',
    prompt:
      'Restyle the home in serene Japanese style: dark stained-wood siding or charred shou-sugi-ban cladding, deep overhanging eaves, exposed timber framing accents, and shoji-inspired window styling. Use a palette of charcoal, natural cedar, and warm paper-white with a clean timber entry, a Zen garden of raked gravel, moss, maples, and stone, and soft lantern lighting. This is a surface restyle only: preserve the exact structure, footprint, rooflines, and the existing window and door positions, sizes, and openings without adding, removing, or relocating any.',
    applies: 'exterior',
    accent: '#3E3A35',
    tags: ['japanese', 'zen', 'timber', 'minimal'],
    subtypes: ['facade', 'front-yard'],
    category: 'exterior-styles',
  },
  {
    id: 'exterior-barndominium',
    name: 'Barndominium',
    blurb: 'Metal-clad barn form, big gable, modern rural workhorse',
    prompt:
      'Restyle the facade as a modern barndominium: standing-seam metal siding and roof, a tall simple gable form, oversized black-framed window styling, and a board-and-batten or wood accent entry. Use a palette of matte charcoal, weathered steel, and warm wood with sliding barn-door styling, a gravel drive, ornamental grasses, and rugged rural-modern curb appeal. This is a surface restyle only: preserve the exact structure, footprint, rooflines, and the existing window and door positions, sizes, and openings without adding, removing, or relocating any.',
    applies: 'exterior',
    accent: '#54595E',
    tags: ['barndominium', 'metal', 'rural', 'trending'],
    subtypes: ['facade', 'front-yard'],
    category: 'exterior-styles',
  },
  {
    id: 'exterior-a-frame',
    name: 'A-Frame',
    blurb: 'Dramatic triangular roof, wall of glass, retreat cabin vibe',
    prompt:
      'Restyle the home with A-frame cabin character: a dramatic steep triangular gable look, warm wood or dark siding sweeping toward the ground, and a tall wall of glass at the gable end. Use a palette of natural cedar, charcoal, and glass with exposed timber accents, a wood-deck feel, evergreen-and-fern landscaping, and a cozy mountain-retreat glow. This is a surface restyle only: preserve the exact structure, footprint, rooflines, and the existing window and door positions, sizes, and openings without adding, removing, or relocating any.',
    applies: 'exterior',
    accent: '#5E4A34',
    tags: ['a-frame', 'cabin', 'glass', 'retreat'],
    subtypes: ['facade', 'front-yard'],
    category: 'exterior-styles',
  },
  {
    id: 'exterior-brutalist',
    name: 'Brutalist',
    blurb: 'Raw board-formed concrete, bold geometry, monolithic drama',
    prompt:
      'Restyle the facade into bold brutalist architecture: raw board-formed concrete cladding, monolithic geometric surface volumes, deep-set window reveal styling, and stark cantilevered plane accents. Use a palette of gray concrete, charcoal, and warm-wood contrast with a heavy minimalist entry, sculptural gravel-and-concrete landscaping, architectural shadow lines, and dramatic dusk lighting. This is a surface restyle only: preserve the exact structure, footprint, rooflines, and the existing window and door positions, sizes, and openings without adding, removing, or relocating any.',
    applies: 'exterior',
    accent: '#7A7A7A',
    tags: ['brutalist', 'concrete', 'monolithic'],
    subtypes: ['facade', 'front-yard'],
    category: 'exterior-styles',
  },
  {
    id: 'exterior-modern-farmhouse',
    name: 'Modern Farmhouse',
    blurb:
      'White board-and-batten, black windows, standing-seam metal porch roof',
    prompt:
      "Reclad the home in crisp white vertical board-and-batten siding with clean black-painted trim and matte black window frames, refresh the roof in dark charcoal architectural shingles, and add a covered front porch detail with simple square posts and a standing-seam metal accent roof. Repaint the front door a soft black, swap to black gas-style lantern fixtures, and landscape with neat boxwoods, gravel borders, and a natural stone walkway, while preserving the home's existing structure, rooflines, footprint, and window and door positions.",
    applies: 'exterior',
    accent: '#2b2b2b',
    tags: ['farmhouse', 'modern', 'white', 'black-trim'],
    subtypes: ['facade', 'front-yard'],
    category: 'exterior-styles',
  },
  {
    id: 'exterior-modern',
    name: 'Modern',
    blurb: 'Flat planes, smooth stucco, large glazing trim, monochrome palette',
    prompt:
      "Transform the exterior into a clean modern aesthetic with smooth white and warm-gray stucco panels, slim dark aluminum window and door trim, and a sleek low-profile roof finish in flat dark gray. Use a flush minimalist front door in natural wood tone, recessed linear lighting at the entry, and landscaping of architectural grasses, poured concrete pavers, and a single sculptural tree, while preserving the home's existing structure, rooflines, footprint, and window and door positions.",
    applies: 'exterior',
    accent: '#3a3f44',
    tags: ['modern', 'stucco', 'minimal', 'gray'],
    subtypes: ['facade', 'front-yard'],
    category: 'exterior-styles',
  },
  {
    id: 'exterior-mid-century-modern',
    name: 'Mid-Century Modern',
    blurb: 'Warm wood, flat roof tone, pops of color, geometric entry',
    prompt:
      "Reimagine the facade in mid-century modern style with horizontal tongue-and-groove wood siding stained warm walnut, contrasting painted stucco sections in soft white, and slim trim in muted charcoal. Add a bold accent front door in turquoise or orange, a geometric house-number screen, and globe pendant entry lighting, then landscape with low succulents, smooth river rock, and a clean concrete path, while preserving the home's existing structure, rooflines, footprint, and window and door positions.",
    applies: 'exterior',
    accent: '#d9803f',
    tags: ['mid-century', 'retro', 'wood', 'color-pop'],
    subtypes: ['facade', 'front-yard'],
    category: 'exterior-styles',
  },
  {
    id: 'exterior-contemporary',
    name: 'Contemporary',
    blurb: 'Mixed materials, fiber-cement, warm wood accents, sleek metal trim',
    prompt:
      "Update the home with a contemporary mixed-material palette of smooth light-gray fiber-cement panels, warm cedar-toned accent cladding around the entry, and crisp black metal trim and fascia. Refresh the roof in flat dark gray, install a wide modern wood-and-glass front door, sleek horizontal sconces, and landscape with layered ornamental grasses, dark mulch beds, and large-format stone pavers, while preserving the home's existing structure, rooflines, footprint, and window and door positions.",
    applies: 'exterior',
    accent: '#5b6770',
    tags: ['contemporary', 'fiber-cement', 'wood-accent', 'mixed-material'],
    subtypes: ['facade', 'front-yard'],
    category: 'exterior-styles',
  },
  {
    id: 'exterior-scandinavian',
    name: 'Scandinavian',
    blurb: 'Muted matte paint, pale wood, simple trim, calm minimal landscape',
    prompt:
      "Give the exterior a serene Scandinavian look with smooth siding painted soft muted sage or warm off-white, pale natural-wood trim and entry accents, and a clean matte charcoal roof. Add an unadorned light-wood front door, minimalist black hardware, and simple linear lighting, then landscape with birch saplings, mossy ground cover, pale gravel, and uncluttered planting beds, while preserving the home's existing structure, rooflines, footprint, and window and door positions.",
    applies: 'exterior',
    accent: '#8a9a85',
    tags: ['scandinavian', 'minimal', 'muted', 'wood'],
    subtypes: ['facade', 'front-yard'],
    category: 'exterior-styles',
  },
  {
    id: 'exterior-tuscan',
    name: 'Tuscan',
    blurb: 'Warm earthy stucco, terracotta roof, stone accents, iron details',
    prompt:
      "Reclad the home in warm hand-troweled stucco in honey and ochre earth tones with rustic stacked-stone accents at the base and entry, and finish the roof in weathered terracotta clay-tile coloring. Add an arched-detail wood front door, wrought-iron lanterns and accents, and landscape with cypress, lavender, terracotta pots, and a gravel-and-stone walkway, while preserving the home's existing structure, rooflines, footprint, and window and door positions.",
    applies: 'exterior',
    accent: '#b5793a',
    tags: ['tuscan', 'stucco', 'terracotta', 'earthy'],
    subtypes: ['facade', 'front-yard'],
    category: 'exterior-styles',
  },
  {
    id: 'exterior-greek-revival',
    name: 'Greek Revival',
    blurb:
      'Bright white siding, bold columns, black shutters, pedimented entry',
    prompt:
      "Refresh the facade in stately Greek Revival style with bright white painted siding, crisp wide trim and corner pilasters, and a refined pedimented entry detail with classical square or round columns on the existing porch. Add black louvered shutters framing the windows, a paneled white front door with sidelight-style trim, brass lantern fixtures, and symmetrical boxwood-and-magnolia landscaping with a brick path, while preserving the home's existing structure, rooflines, footprint, and window and door positions.",
    applies: 'exterior',
    accent: '#1f2a33',
    tags: ['greek-revival', 'white', 'columns', 'classical'],
    subtypes: ['facade', 'front-yard'],
    category: 'exterior-styles',
  },
  {
    id: 'exterior-shingle-nantucket',
    name: 'Shingle / Nantucket',
    blurb: 'Weathered cedar shingles, white trim, breezy New England coastal',
    prompt:
      "Clad the home in natural weathered-gray cedar shingle siding with crisp white trim, white window casings, and a soft gray architectural shingle roof for a classic Nantucket look. Add a white paneled front door, black gooseneck or lantern lighting, and a covered entry with simple white posts, then landscape with hydrangeas, beach grass, a crushed-shell or gravel path, and a low picket border, while preserving the home's existing structure, rooflines, footprint, and window and door positions.",
    applies: 'exterior',
    accent: '#9aa3a8',
    tags: ['shingle', 'nantucket', 'coastal', 'cedar'],
    subtypes: ['facade', 'front-yard'],
    category: 'exterior-styles',
  },
  {
    id: 'exterior-spanish-mission',
    name: 'Spanish Mission',
    blurb: 'Smooth white stucco, red clay tile, arched accents, iron lanterns',
    prompt:
      "Reimagine the exterior in Spanish Mission style with smooth creamy-white stucco walls, a warm red barrel clay-tile roof finish, and gently arched detailing at the entry and porch. Add a rustic carved-wood front door, wrought-iron lantern fixtures and accents, decorative tile insets, and landscape with agave, olive trees, terracotta pots, and a warm-toned paver path, while preserving the home's existing structure, rooflines, footprint, and window and door positions.",
    applies: 'exterior',
    accent: '#c25a3c',
    tags: ['spanish', 'mission', 'stucco', 'clay-tile'],
    subtypes: ['facade', 'front-yard'],
    category: 'exterior-styles',
  },
  {
    id: 'exterior-coastal-contemporary',
    name: 'Coastal Contemporary',
    blurb:
      'Crisp white cladding, glass-rail accents, weathered wood, airy palette',
    prompt:
      "Update the home into a bright coastal contemporary aesthetic with crisp white horizontal siding, weathered light-wood accent cladding at the entry, and slim black or bronze window trim. Refresh the roof in pale gray, add a sleek wood-and-glass front door, modern glass-rail porch detailing where one exists, linear sconces, and breezy landscaping of dune grasses, light gravel, and large pale pavers, while preserving the home's existing structure, rooflines, footprint, and window and door positions.",
    applies: 'exterior',
    accent: '#4f7d8c',
    tags: ['coastal', 'contemporary', 'white', 'airy'],
    subtypes: ['facade', 'front-yard'],
    category: 'exterior-styles',
  },
  {
    id: 'backyard-resort-pool-oasis',
    name: 'Resort Pool Oasis',
    blurb:
      'Vacation-style pool deck with loungers, palms, and crisp white cabana shade.',
    prompt:
      'Restyle the backyard as a luxury resort pool oasis: dress the existing pool with large-format travertine or limestone deck finishes, plush white-cushioned chaise loungers, and crisp striped umbrellas. Frame the space with potted palms, manicured tropical foliage, and a low rendered planter edge, with a lightweight white pergola or cabana with billowing curtains for shade. Keep the palette bright and clean with turquoise water, white textiles, and warm stone. Do not relocate, resize, or reshape the existing pool, and preserve the existing lot footprint, the house structure, rooflines, exterior walls, window and door positions, fences, hardscape locations, and overall yard layout.',
    applies: 'exterior',
    accent: '#2BB3C0',
    tags: ['pool', 'resort', 'luxury', 'tropical', 'summer'],
    subtypes: ['pool', 'backyard'],
    category: 'backyard-landscape',
  },
  {
    id: 'backyard-modern-desert-xeriscape',
    name: 'Modern Desert Xeriscape',
    blurb:
      'Sculptural agave, decomposed granite, and warm stucco for low-water living.',
    prompt:
      'Restyle the yard as a modern desert xeriscape with sculptural agave, golden barrel cactus, ocotillo, and silvery succulents arranged in clean gravel beds of decomposed granite and crushed stone. Add corten steel or warm stucco planter edging, large boulders, and a few low-water ornamental grasses for movement, with a minimalist concrete or paver path following the existing layout. Keep the palette earthy and sun-baked with terracotta, rust, sage, and sand tones. Preserve the existing lot footprint, the house structure, rooflines, exterior walls, window and door positions, fences, hardscape locations, and overall yard layout.',
    applies: 'exterior',
    accent: '#C98A5E',
    tags: ['desert', 'xeriscape', 'drought-tolerant', 'modern', 'low-water'],
    subtypes: ['garden'],
    category: 'backyard-landscape',
  },
  {
    id: 'backyard-cozy-firepit-lounge',
    name: 'Cozy Fire-Pit Lounge',
    blurb:
      'Sunken gathering circle with a crackling fire pit and deep weatherproof seating.',
    prompt:
      'Restyle the existing patio around a cozy fire-pit lounge with a round gas or wood fire pit set on the current paver or flagstone surface, ringed by deep weatherproof sectional seating with charcoal and cream cushions. Layer in an outdoor rug, lanterns, throw blankets, and a low coffee table, with warm string lights overhead and soft uplighting in nearby planting. Keep the mood intimate and warm with glowing flame, natural stone, and muted earth tones. Preserve the existing lot footprint, the house structure, rooflines, exterior walls, window and door positions, fences, hardscape locations, and overall yard layout.',
    applies: 'exterior',
    accent: '#B5563A',
    tags: ['fire-pit', 'lounge', 'cozy', 'evening', 'entertaining'],
    subtypes: ['backyard'],
    category: 'backyard-landscape',
  },
  {
    id: 'backyard-lush-tropical-resort',
    name: 'Lush Tropical Resort',
    blurb:
      'Dense banana, palm, and bird-of-paradise greenery with a Bali-style getaway feel.',
    prompt:
      'Restyle the yard as a lush tropical resort retreat with dense layered greenery of banana plants, fan palms, bird-of-paradise, philodendron, and ferns spilling along the existing path. Add teak or rattan lounge furniture, a lightweight thatched or timber shade canopy, tiki torches, and warm lantern lighting for a Bali-inspired getaway feel. Keep the palette deep emerald and jungle green with natural wood and warm amber light. Preserve the existing lot footprint, the house structure, rooflines, exterior walls, window and door positions, fences, hardscape locations, and overall yard layout.',
    applies: 'exterior',
    accent: '#1F7A4D',
    tags: ['tropical', 'resort', 'lush', 'bali', 'greenery'],
    subtypes: ['backyard', 'garden'],
    category: 'backyard-landscape',
  },
  {
    id: 'backyard-english-cottage-garden',
    name: 'English Cottage Garden',
    blurb:
      'Romantic overflowing borders of roses, foxglove, and lavender along a gravel path.',
    prompt:
      'Restyle the garden as a romantic English cottage garden with densely planted borders overflowing with roses, foxglove, delphinium, lavender, hollyhock, and catmint in soft pastels along the existing beds and paths. Dress the current path in gravel or brick, add a weathered timber arbor draped in climbing roses, a rustic bench, and terracotta pots brimming with blooms. Keep the palette dreamy with blush pink, lavender, white, and silvery foliage. Preserve the existing lot footprint, the house structure, rooflines, exterior walls, window and door positions, fences, paths, and overall yard layout.',
    applies: 'exterior',
    accent: '#C98AB0',
    tags: ['cottage', 'english', 'romantic', 'flowers', 'garden'],
    subtypes: ['garden'],
    category: 'backyard-landscape',
  },
  {
    id: 'backyard-japanese-zen-garden',
    name: 'Japanese Zen Garden',
    blurb:
      'Raked gravel, mossy stones, maples, and a tranquil meditative balance.',
    prompt:
      'Restyle the space as a tranquil Japanese zen garden with raked fine gravel, carefully placed moss-covered boulders, a Japanese maple, clipped mounded shrubs, and a stone lantern. Add a simple wood-framed gravel path or stepping stones along the existing route, a small bamboo water spout, and restrained planting for a meditative, balanced composition. Keep the palette serene with grey gravel, deep green moss, weathered stone, and crimson maple accents. Preserve the existing lot footprint, the house structure, rooflines, exterior walls, window and door positions, fences, hardscape locations, and overall yard layout.',
    applies: 'exterior',
    accent: '#6B8E5A',
    tags: ['japanese', 'zen', 'minimalist', 'meditative', 'garden'],
    subtypes: ['garden'],
    category: 'backyard-landscape',
  },
  {
    id: 'backyard-outdoor-kitchen-pergola',
    name: 'Outdoor Kitchen & Dining Pergola',
    blurb:
      'Built-in grill island and a long dining table under a slatted cedar pergola.',
    prompt:
      'Restyle the existing patio as an outdoor kitchen and dining area beneath a slatted cedar pergola, with a built-in stone or stainless grill island, bar seating, and a long dining table with comfortable chairs. Add pendant or string lighting under the pergola, large planters of herbs and greenery, and refinish the floor in durable stone or porcelain tile. Keep the palette warm and inviting with natural wood, stone, and soft ambient light. Preserve the existing lot footprint, the house structure, rooflines, exterior walls, window and door positions, fences, hardscape locations, and overall yard layout.',
    applies: 'exterior',
    accent: '#A67843',
    tags: ['outdoor-kitchen', 'pergola', 'dining', 'entertaining', 'grill'],
    subtypes: ['outdoor-kitchen'],
    category: 'backyard-landscape',
  },
  {
    id: 'backyard-mediterranean-courtyard',
    name: 'Mediterranean Courtyard',
    blurb:
      'Terracotta pavers, olive trees, and a tiled fountain with Tuscan warmth.',
    prompt:
      'Restyle the yard as a Mediterranean courtyard with warm terracotta paver finishes, an olive tree, potted citrus and rosemary, and clay urns overflowing with bougainvillea. Add a small tiled fountain, wrought-iron furniture with striped cushions, and dress the existing low wall with cascading vines. Keep the palette sun-washed with terracotta, ochre, cobalt-and-white tile, and silvery olive foliage. Preserve the existing lot footprint, the house structure, rooflines, exterior walls, window and door positions, fences, hardscape locations, and overall yard layout.',
    applies: 'exterior',
    accent: '#CB6D3E',
    tags: ['mediterranean', 'courtyard', 'tuscan', 'fountain', 'olive'],
    subtypes: ['patio-deck', 'garden'],
    category: 'backyard-landscape',
  },
  {
    id: 'backyard-deck-pergola-lounge',
    name: 'Deck & Pergola Lounge',
    blurb:
      'Warm wood deck with a slatted pergola and a relaxed sectional lounge.',
    prompt:
      'Restyle the existing deck as a warm wood lounge topped by a slatted pergola, furnished with a low-profile outdoor sectional, lounge chairs, and a coffee table on a textured outdoor rug. Add bench planters with grasses, soft string and uplighting, and a few large potted plants for greenery. Keep the palette relaxed with honey-toned timber, charcoal cushions, and warm evening light. Do not relocate or resize the deck, and preserve the existing lot footprint, the house structure, rooflines, exterior walls, window and door positions, fences, and overall yard layout.',
    applies: 'exterior',
    accent: '#B98A52',
    tags: ['deck', 'pergola', 'lounge', 'wood', 'relaxing'],
    subtypes: ['backyard', 'patio-deck'],
    category: 'backyard-landscape',
  },
  {
    id: 'backyard-modern-infinity-pool',
    name: 'Modern Infinity Pool',
    blurb:
      'Sleek vanishing-edge pool styling with porcelain decking and clipped planting.',
    prompt:
      'Restyle the existing pool with a sleek modern look: dark waterline tile, crisp coping, and a refined edge treatment, surrounded by large-format porcelain or concrete deck finishes. Add minimalist sun loungers, a slim linear fire feature, architectural planting of clipped boxwood and ornamental grasses, and crisp linear lighting. Keep the palette cool and contemporary with charcoal, white, and deep blue water. Do not relocate, resize, or reshape the existing pool, and preserve the existing lot footprint, the house structure, rooflines, exterior walls, window and door positions, fences, and overall yard layout.',
    applies: 'exterior',
    accent: '#3A6B8C',
    tags: ['pool', 'modern', 'infinity', 'minimalist', 'luxury'],
    subtypes: ['pool', 'backyard'],
    category: 'backyard-landscape',
  },
  {
    id: 'backyard-farmhouse-backyard',
    name: 'Farmhouse Backyard',
    blurb:
      'Relaxed country yard with raised beds, picket charm, and a string-lit table.',
    prompt:
      'Restyle the yard as a relaxed modern-farmhouse backyard with weathered timber raised garden beds, a gravel gathering area, and a long farmhouse dining table beneath a canopy of warm string lights. Add Adirondack or cross-back chairs, galvanized planters of wildflowers, a rustic bench, and a white picket or board fence finish. Keep the palette homey with warm wood, soft white, sage green, and golden evening light. Preserve the existing lot footprint, the house structure, rooflines, exterior walls, window and door positions, fence positions, and overall yard layout.',
    applies: 'exterior',
    accent: '#9AA875',
    tags: ['farmhouse', 'country', 'rustic', 'raised-beds', 'string-lights'],
    subtypes: ['backyard', 'garden'],
    category: 'backyard-landscape',
  },
  {
    id: 'backyard-twinkle-lit-evening-patio',
    name: 'Twinkle-Lit Evening Patio',
    blurb:
      'Magical canopy of warm string lights over an intimate cushioned patio at dusk.',
    prompt:
      'Restyle the existing patio as a magical twinkle-lit evening retreat with a dense overhead canopy of warm Edison string lights crisscrossing the space at dusk. Furnish with comfortable lounge seating, soft cushions, lanterns on side tables, and lush potted greenery glowing in the warm light. Keep the mood romantic and atmospheric with deep twilight blues and golden bistro lighting. Preserve the existing lot footprint, the patio location, the house structure, rooflines, exterior walls, window and door positions, fences, and overall yard layout.',
    applies: 'exterior',
    accent: '#E2A94E',
    tags: ['string-lights', 'evening', 'romantic', 'patio', 'ambient'],
    subtypes: ['patio-deck', 'backyard'],
    category: 'backyard-landscape',
  },
  {
    id: 'backyard-hot-tub-retreat',
    name: 'Hot-Tub Retreat',
    blurb:
      'Spa-like soaking nook framed by privacy screens, cedar, and soft lighting.',
    prompt:
      'Restyle a corner of the yard as a spa-like hot-tub retreat with a deck-level hot tub framed by horizontal cedar privacy screens and lush ornamental grasses. Add a small adjacent lounge area, a teak bench, plush towels, lanterns, and soft low-level lighting for an intimate evening soak. Keep the palette calming with warm cedar, charcoal, steam, and soft amber glow. Do not relocate plumbing or re-grade the yard, and preserve the existing lot footprint, the house structure, rooflines, exterior walls, window and door positions, fences, hardscape locations, and overall yard layout.',
    applies: 'exterior',
    accent: '#7E8A6E',
    tags: ['hot-tub', 'spa', 'retreat', 'cedar', 'private'],
    subtypes: ['backyard'],
    category: 'backyard-landscape',
  },
  {
    id: 'backyard-family-play-yard',
    name: 'Family Play Yard',
    blurb:
      'Soft turf lawn, play structure, and a durable kid-friendly gathering space.',
    prompt:
      'Restyle the backyard as a cheerful family play yard with a lush soft lawn or artificial turf play area, a natural-wood swing set or climbing structure, and a shaded sandbox or play nook. Add durable lounge seating for parents, a paver patio finish, low rounded shrubs, and warm-toned border planting kept safe and open. Keep the palette bright and friendly with fresh green turf, natural wood, and cheerful accents. Preserve the existing lot footprint, the house structure, rooflines, exterior walls, window and door positions, fences, and overall yard layout.',
    applies: 'exterior',
    accent: '#6FB04A',
    tags: ['family', 'play', 'kids', 'lawn', 'functional'],
    subtypes: ['backyard'],
    category: 'backyard-landscape',
  },
  {
    id: 'backyard-edible-kitchen-garden',
    name: 'Edible Kitchen Garden',
    blurb:
      'Tidy raised beds of vegetables, herbs, and espaliered fruit in a potager layout.',
    prompt:
      'Restyle the yard as a productive edible kitchen garden with neat timber or steel raised beds brimming with vegetables, leafy greens, tomatoes on trellises, and clipped herb borders in a tidy potager arrangement. Dress the existing paths in gravel or brick, add a rustic potting bench, espaliered fruit along a fence, and a small arched trellis of climbing beans. Keep the palette fresh and organic with verdant greens, warm wood, terracotta, and gravel. Preserve the existing lot footprint, the house structure, rooflines, exterior walls, window and door positions, fences, paths, and overall yard layout.',
    applies: 'exterior',
    accent: '#5E8C3A',
    tags: ['edible', 'kitchen-garden', 'vegetables', 'potager', 'raised-beds'],
    subtypes: ['garden'],
    category: 'backyard-landscape',
  },
  {
    id: 'backyard-formal-symmetrical-garden',
    name: 'Formal Symmetrical Garden',
    blurb:
      'Crisp boxwood parterres, gravel axes, and clipped topiary in classic balance.',
    prompt:
      'Restyle the garden as an elegant formal symmetrical landscape with crisp clipped boxwood parterres, geometric gravel paths following the existing layout, and a focal urn, fountain, or topiary at the heart. Add matching pairs of potted standards, low hedging outlining tidy beds, and restrained seasonal planting in symmetrical pattern. Keep the palette refined with deep evergreen green, pale gravel, and pale stone. Preserve the existing lot footprint, the house structure, rooflines, exterior walls, window and door positions, fences, paths, and overall yard layout.',
    applies: 'exterior',
    accent: '#4F7A4A',
    tags: ['formal', 'symmetrical', 'boxwood', 'topiary', 'classic'],
    subtypes: ['garden'],
    category: 'backyard-landscape',
  },
  {
    id: 'backyard-koi-pond-water-feature',
    name: 'Koi Pond & Water Feature',
    blurb:
      'Serene koi pond with stone edging, a waterfall, and lush waterside planting.',
    prompt:
      'Restyle the yard around a serene koi pond and water feature with a natural stone-edged pond, a gentle cascading rock waterfall, water lilies, and bright koi gliding below the surface. Add a wooden footbridge or stepping stones, lush waterside planting of irises, hostas, ferns, and Japanese maple, and a quiet bench to sit by the water. Keep the palette tranquil with mossy green, weathered stone, and shimmering water. Preserve the existing lot footprint, the house structure, rooflines, exterior walls, window and door positions, fences, and overall yard layout.',
    applies: 'exterior',
    accent: '#3F8C7A',
    tags: ['koi-pond', 'water-feature', 'serene', 'waterfall', 'garden'],
    subtypes: ['garden', 'backyard'],
    category: 'backyard-landscape',
  },
  {
    id: 'backyard-native-prairie-meadow',
    name: 'Native Prairie Meadow',
    blurb:
      'Wild swaying grasses, coneflowers, and pollinator blooms with a mown path.',
    prompt:
      'Restyle the yard as a naturalistic native prairie meadow with drifts of swaying ornamental and native grasses interwoven with coneflowers, black-eyed Susans, yarrow, and milkweed buzzing with pollinators. Carve a soft mown or stepping-stone path through the meadow along the existing route, add a simple bench and a few birch or amelanchier trees for height. Keep the palette warm and wild with golden grasses and purple, rust, and butter-yellow blooms. Preserve the existing lot footprint, the house structure, rooflines, exterior walls, window and door positions, fences, and overall yard layout.',
    applies: 'exterior',
    accent: '#C7973A',
    tags: ['native', 'prairie', 'meadow', 'pollinator', 'naturalistic'],
    subtypes: ['garden'],
    category: 'backyard-landscape',
  },
  {
    id: 'backyard-minimalist-hardscape',
    name: 'Minimalist Hardscape',
    blurb:
      'Clean concrete pavers, gravel joints, and sculptural single-specimen planting.',
    prompt:
      'Restyle the yard as a serene minimalist hardscape with large-format poured concrete or porcelain paver finishes separated by clean gravel or low groundcover joints, framed by crisp steel-edged beds. Add a single sculptural specimen tree, restrained architectural planting, a low bench, and discreet linear lighting for a calm, gallery-like feel. Keep the palette monochromatic and quiet with pale grey, charcoal, and muted green. Preserve the existing lot footprint, the house structure, rooflines, exterior walls, window and door positions, fences, hardscape locations, and overall yard layout.',
    applies: 'exterior',
    accent: '#8C8C86',
    tags: ['minimalist', 'hardscape', 'modern', 'concrete', 'clean'],
    subtypes: ['patio-deck', 'backyard'],
    category: 'backyard-landscape',
  },
  {
    id: 'backyard-drought-tolerant-gravel',
    name: 'Drought-Tolerant Gravel Garden',
    blurb:
      'Sun-loving grasses and salvias set in pale gravel for low-maintenance beauty.',
    prompt:
      'Restyle the yard as a relaxed drought-tolerant gravel garden with pale crushed-stone groundcover threaded with self-seeding Mediterranean planting of lavender, salvia, euphorbia, sedum, and feathery grasses. Add a few weathered boulders, a gravel seating nook with a simple bistro set, and clusters of terracotta pots. Keep the palette soft and sun-bleached with grey gravel, sage, lilac, and silvery foliage. Preserve the existing lot footprint, the house structure, rooflines, exterior walls, window and door positions, fences, and overall yard layout.',
    applies: 'exterior',
    accent: '#A89B7E',
    tags: [
      'drought-tolerant',
      'gravel',
      'low-maintenance',
      'mediterranean',
      'grasses',
    ],
    subtypes: ['garden'],
    category: 'backyard-landscape',
  },
  {
    id: 'backyard-succulent-rock-garden',
    name: 'Succulent Rock Garden',
    blurb:
      'Jewel-toned succulents tucked among boulders and gravel in a sculptural mosaic.',
    prompt:
      'Restyle the yard as a striking succulent rock garden with jewel-toned echeveria, aeonium, sedum, and aloes nestled among layered boulders, rugged stone, and decomposed-granite gravel. Add sculptural agave and a few tall cacti for height, with low stone terraces creating a natural mosaic of texture. Keep the palette rich with rosette greens, dusty purples, terracotta stone, and pale gravel. Preserve the existing lot footprint, the house structure, rooflines, exterior walls, window and door positions, fences, and overall yard layout.',
    applies: 'exterior',
    accent: '#9C7BA0',
    tags: ['succulent', 'rock-garden', 'low-water', 'sculptural', 'boulders'],
    subtypes: ['garden'],
    category: 'backyard-landscape',
  },
  {
    id: 'backyard-rooftop-terrace',
    name: 'Rooftop Terrace',
    blurb:
      'Urban deck lounge with planters, modular seating, and skyline-ready styling.',
    prompt:
      'Restyle the existing terrace as a chic urban rooftop lounge with composite or ipe decking-tile finishes, modular low seating with weatherproof cushions, and a slim dining or bar nook. Frame the space with sleek tall planters of bamboo, grasses, and olive trees for privacy, add a slatted privacy screen, lanterns, and warm string lighting. Keep the palette sophisticated and city-cool with charcoal, warm wood, greenery, and soft evening light. Preserve the existing terrace footprint, railings, the building structure, rooflines, exterior walls, door and window positions, and overall layout.',
    applies: 'exterior',
    accent: '#5E6E78',
    tags: ['rooftop', 'terrace', 'urban', 'modern', 'container-garden'],
    subtypes: ['patio-deck'],
    category: 'backyard-landscape',
  },
  {
    id: 'backyard-woodland-shade-garden',
    name: 'Woodland Shade Garden',
    blurb:
      'Ferns, hostas, and dappled light beneath a canopy along a mulched path.',
    prompt:
      'Restyle a shaded yard as a lush woodland shade garden with layered ferns, hostas, astilbe, hellebores, and woodland groundcovers beneath the existing leafy canopy and dappled light. Wind a soft bark-mulch or stepping-stone path through the planting along the current route, add a mossy boulder, a quiet bench, and a small trickling water bowl. Keep the palette cool and lush with deep greens, soft chartreuse, and dappled shade. Preserve the existing lot footprint, mature trees, the house structure, rooflines, exterior walls, window and door positions, fences, and overall yard layout.',
    applies: 'exterior',
    accent: '#4A7355',
    tags: ['woodland', 'shade', 'ferns', 'naturalistic', 'lush'],
    subtypes: ['garden'],
    category: 'backyard-landscape',
  },
  {
    id: 'backyard-coastal-dune-garden',
    name: 'Coastal Dune Garden',
    blurb:
      'Beachy grasses, weathered timber, and breezy seaside planting in sandy tones.',
    prompt:
      'Restyle the yard as a breezy coastal dune garden with billowing beach grasses, sea oats, blue fescue, and salt-tolerant planting drifting through sandy gravel and weathered driftwood accents. Add a bleached-timber boardwalk path along the existing route, a low cedar deck with relaxed seating, and clusters of grasses softening the fence. Keep the palette light and airy with sand, silvery green, soft blue, and sun-bleached wood. Preserve the existing lot footprint, the house structure, rooflines, exterior walls, window and door positions, fences, and overall yard layout.',
    applies: 'exterior',
    accent: '#A7B0A0',
    tags: ['coastal', 'dune', 'beach', 'grasses', 'breezy'],
    subtypes: ['garden'],
    category: 'backyard-landscape',
  },
  {
    id: 'room-modern-farmhouse-living',
    name: 'Modern Farmhouse Living Room',
    blurb: 'Warm shiplap-and-linen comfort with rustic-meets-clean styling.',
    prompt:
      'Restyle this living room into a modern farmhouse retreat: warm white shiplap accent wall treatment, natural oak plank flooring, a deep linen-upholstered sofa with chunky knit throws, a reclaimed-wood coffee table, a woven jute rug, matte-black sconces and a wrought-iron chandelier, and soft layered daylight. Keep the palette creamy white, greige, and warm wood with muted sage accents. Change only finishes, furniture, textiles, decor, palette, and lighting. Preserve the existing room geometry, walls, windows, doors, openings, built-ins, fixture and plumbing locations, ceiling height, and the overall architectural layout exactly as they are.',
    applies: 'interior',
    accent: '#C9B89A',
    tags: ['living-room', 'farmhouse', 'cozy', 'popular'],
    subtypes: ['living-room'],
    category: 'room-makeovers',
  },
  {
    id: 'room-spa-bathroom-serene',
    name: 'Serene Spa Bathroom',
    blurb: 'Hotel-spa calm in stone, teak, and soft diffused light.',
    prompt:
      "Restyle this bathroom into a serene spa sanctuary: large-format honed stone-look tile, a teak bath mat and stool, plush white towels rolled on floating shelves, brushed-brass fixture finishes, a frameless mirror, eucalyptus greenery, and warm dimmable backlighting with candle ambiance. Keep the palette soft greige, warm white, and natural wood. Change only finishes, surfaces, fixtures' appearance, decor, palette, and lighting. Preserve the existing tub, shower, sink, and toilet in their current positions, all plumbing and fixture locations, the window and door placements, and the overall room layout exactly as they are.",
    applies: 'interior',
    accent: '#B7C4BE',
    tags: ['bathroom', 'spa', 'serene', 'popular'],
    subtypes: ['bathroom'],
    category: 'room-makeovers',
  },
  {
    id: 'room-chefs-kitchen-warm',
    name: "Warm Chef's Kitchen",
    blurb: 'Elevated cabinetry fronts, stone counters, and brass warmth.',
    prompt:
      "Elevate this kitchen into a warm chef's kitchen: refaced shaker cabinet fronts in soft sage-green and creamy white, honed marble-look countertops and a full-height backsplash, unlacquered brass hardware and faucet finish, open walnut shelving styled with ceramics, and a row of warm pendant lights over the existing counter. Keep the palette warm neutrals with brass and greenery. Change only surfaces, finishes, cabinet fronts, hardware, decor, palette, and lighting. Preserve the existing cabinet boxes, appliance and sink locations, all plumbing and fixture positions, windows, doors, and the exact kitchen layout and footprint.",
    applies: 'interior',
    accent: '#9CA68C',
    tags: ['kitchen', 'warm', 'brass', 'popular'],
    subtypes: ['kitchen'],
    category: 'room-makeovers',
  },
  {
    id: 'room-primary-bedroom-retreat',
    name: 'Primary Bedroom Retreat',
    blurb: 'Layered neutrals, soft textiles, and hotel-suite calm.',
    prompt:
      'Restyle this primary bedroom into a calming retreat: an upholstered linen headboard, layered white and oatmeal bedding with a chunky throw, warm wood nightstands, a soft wool area rug, sheer drapery panels, plaster-toned walls, and bedside pendant glow with a warm dimmed mood. Keep the palette warm white, taupe, and muted clay. Change only finishes, furniture, textiles, decor, palette, and lighting. Preserve the existing room geometry, windows, doors, closets and built-ins, ceiling height, and the overall layout exactly as they are.',
    applies: 'interior',
    accent: '#D6C6B5',
    tags: ['bedroom', 'retreat', 'calm', 'popular'],
    subtypes: ['bedroom'],
    category: 'room-makeovers',
  },
  {
    id: 'room-scandi-living',
    name: 'Scandinavian Living Room',
    blurb: 'Light wood, clean lines, and airy hygge minimalism.',
    prompt:
      'Restyle this living room in bright Scandinavian style: pale ash flooring and white walls, a low-profile gray sofa with sheepskin and linen pillows, light birch furniture, a simple geometric wool rug, leafy potted greenery, a paper globe pendant, and crisp natural light. Keep the palette white, soft gray, and light wood with a single muted accent. Change only finishes, furniture, textiles, decor, palette, and lighting. Preserve the existing room geometry, walls, windows, doors, openings, built-ins, and the overall architectural layout exactly as they are.',
    applies: 'interior',
    accent: '#E3DDD3',
    tags: ['living-room', 'scandinavian', 'minimal', 'trending'],
    subtypes: ['living-room'],
    category: 'room-makeovers',
  },
  {
    id: 'room-cozy-reading-nook',
    name: 'Cozy Reading Nook',
    blurb: 'Window-seat warmth with books, lamplight, and soft layers.',
    prompt:
      'Cozy up this reading nook: a cushioned bench with deep velvet and linen pillows, a draped chunky throw, a small brass swing-arm reading lamp, a stack of books and a steaming mug, warm wood shelving styled with greenery, and golden-hour light filtering through sheer curtains. Keep the palette warm caramel, cream, and forest green. Change only finishes, furnishings, textiles, decor, palette, and lighting. Preserve the existing window seat or alcove, windows, built-in shelving, walls, openings, and the overall layout exactly as they are.',
    applies: 'interior',
    accent: '#A9734F',
    tags: ['reading-nook', 'cozy', 'warm', 'popular'],
    subtypes: ['living-room'],
    category: 'room-makeovers',
  },
  {
    id: 'room-modern-home-office',
    name: 'Modern Home Office',
    blurb: 'Focused, warm-minimal workspace with walnut and greenery.',
    prompt:
      'Restyle this home office into a focused modern workspace: a clean walnut desk styled with a sleek lamp and laptop, an ergonomic upholstered chair, floating wood shelves with curated books and ceramics, a soft wool rug, a leafy plant, framed art, and bright even daylight balanced with warm task lighting. Keep the palette warm white, walnut, and muted blue-green. Change only finishes, furniture, decor, palette, and lighting. Preserve the existing room geometry, windows, doors, built-in shelving, outlets, and the overall layout exactly as they are.',
    applies: 'interior',
    accent: '#7C8A99',
    tags: ['home-office', 'modern', 'productive', 'popular'],
    subtypes: ['home-office'],
    category: 'room-makeovers',
  },
  {
    id: 'room-dining-room-elegant',
    name: 'Elegant Dining Room',
    blurb: 'Dinner-party-ready with statement lighting and rich textiles.',
    prompt:
      'Elevate this dining room for elegant entertaining: a solid wood table with upholstered dining chairs, a sculptural statement chandelier over the existing table location, a sideboard styled with ceramics and a mirror, layered drapery, a textured area rug, and warm dimmable ambiance. Keep the palette warm taupe, soft black, and brass with greenery. Change only finishes, furniture, textiles, decor, palette, and lighting. Preserve the existing room geometry, windows, doors, openings, built-ins, and the overall dining layout exactly as they are.',
    applies: 'interior',
    accent: '#8C7B6B',
    tags: ['dining-room', 'elegant', 'entertaining', 'popular'],
    subtypes: ['dining-room'],
    category: 'room-makeovers',
  },
  {
    id: 'room-kids-room-playful',
    name: "Playful Kids' Room",
    blurb: 'Cheerful, durable, and imaginative without the clutter.',
    prompt:
      "Restyle this kids' room into a cheerful, playful space: a fun upholstered bed with patterned bedding, a soft washable rug, open cubby storage with bins of toys and books, whimsical wall art and a string of warm fairy lights, a reading teepee, and bright friendly daylight. Keep the palette soft primary brights against warm white. Change only finishes, furniture, textiles, decor, palette, and lighting. Preserve the existing room geometry, windows, doors, closets and built-ins, and the overall layout exactly as they are.",
    applies: 'interior',
    accent: '#F2A65A',
    tags: ['kids-room', 'playful', 'family', 'popular'],
    subtypes: ['kids-room'],
    category: 'room-makeovers',
  },
  {
    id: 'room-nursery-soft',
    name: 'Soft Calm Nursery',
    blurb: 'Soothing pastels, natural wood, and gentle dreamy light.',
    prompt:
      'Restyle this nursery into a soft, soothing retreat: a wooden crib dressed in muted bedding, an upholstered glider with a knit throw, a plush round rug, a wall of framed animal art, woven baskets, a leafy plant, and gentle warm light with a soft cloud-toned ceiling glow. Keep the palette warm white, sage, and dusty blush. Change only finishes, furniture, textiles, decor, palette, and lighting. Preserve the existing room geometry, windows, doors, closet and built-ins, and the overall layout exactly as they are.',
    applies: 'interior',
    accent: '#E7CFD0',
    tags: ['nursery', 'soft', 'calm', 'family'],
    subtypes: ['kids-room'],
    category: 'room-makeovers',
  },
  {
    id: 'room-japandi-bedroom',
    name: 'Japandi Bedroom',
    blurb: 'Wabi-sabi calm blending Japanese and Scandi minimalism.',
    prompt:
      'Restyle this bedroom in serene Japandi style: a low wood-platform bed with natural linen bedding, handmade ceramics, woven floor cushions, a textured plaster wall treatment, light oak nightstands, a single ikebana arrangement, paper-lantern lighting, and soft diffused daylight. Keep the palette warm beige, charcoal, and natural wood. Change only finishes, furniture, textiles, decor, palette, and lighting. Preserve the existing room geometry, windows, doors, closets and built-ins, ceiling height, and the overall layout exactly as they are.',
    applies: 'interior',
    accent: '#B9A88F',
    tags: ['bedroom', 'japandi', 'minimal', 'trending'],
    subtypes: ['bedroom'],
    category: 'room-makeovers',
  },
  {
    id: 'room-entryway-welcoming',
    name: 'Welcoming Entryway Foyer',
    blurb: 'A polished first impression with console, mirror, and warmth.',
    prompt:
      'Restyle this entryway foyer into a welcoming first impression: a slim console table styled with a lamp, tray, and greenery, a large round mirror, a runner rug over the existing flooring, wall hooks with a styled basket, and a warm pendant or sconce glow. Keep the palette warm neutral with black and brass accents. Change only finishes, furniture, decor, palette, and lighting. Preserve the existing room geometry, front door, windows, openings, stairs, built-ins, and the overall layout exactly as they are.',
    applies: 'interior',
    accent: '#A89684',
    tags: ['entryway', 'foyer', 'welcoming', 'popular'],
    subtypes: ['entryway'],
    category: 'room-makeovers',
  },
  {
    id: 'room-sunroom-botanical',
    name: 'Botanical Sunroom',
    blurb: 'Light-drenched greenery, rattan, and breezy textiles.',
    prompt:
      'Restyle this sunroom into a lush botanical retreat: rattan and wicker seating with linen cushions, abundant layered potted plants and hanging greenery, a natural fiber rug, a small bistro table, breezy sheer curtains, and bright sun-washed daylight. Keep the palette green, warm white, and natural fiber tones. Change only finishes, furniture, textiles, decor, palette, and lighting. Preserve the existing room geometry, glass walls and windows, doors, openings, built-ins, and the overall layout exactly as they are.',
    applies: 'interior',
    accent: '#7FA66A',
    tags: ['sunroom', 'botanical', 'bright', 'popular'],
    subtypes: ['sunroom'],
    category: 'room-makeovers',
  },
  {
    id: 'room-home-bar-moody',
    name: 'Moody Home Bar',
    blurb: 'Speakeasy glamour in dark wood, brass, and amber glow.',
    prompt:
      'Restyle this home bar into a moody speakeasy: deep walnut refaced cabinetry fronts, a marble-look bar top, brass shelving styled with glassware and bottles, a mirrored or fluted-glass backsplash, leather bar stools, and warm amber accent lighting. Keep the palette dark green, walnut, and brass. Change only surfaces, finishes, cabinet fronts, decor, palette, and lighting. Preserve the existing bar cabinetry boxes, sink and plumbing locations, walls, windows, openings, and the overall layout and footprint.',
    applies: 'interior',
    accent: '#7A5C3E',
    tags: ['home-bar', 'moody', 'glam', 'trending'],
    subtypes: ['home-bar'],
    category: 'room-makeovers',
  },
  {
    id: 'room-walk-in-closet-boutique',
    name: 'Boutique Walk-in Closet',
    blurb: 'Luxe dressing-room polish with display lighting and seating.',
    prompt:
      'Restyle this walk-in closet into a luxe boutique dressing room: refaced cabinetry and shelving fronts in soft warm white, brass rods and hardware, integrated display lighting along shelves, a small upholstered bench, a full-length mirror, styled handbags and folded textiles, and a soft glamorous glow. Keep the palette cream, soft taupe, and brass. Change only surfaces, finishes, cabinet fronts, decor, palette, and lighting. Preserve the existing closet built-ins, shelving framework, walls, door, and the overall layout exactly as they are.',
    applies: 'interior',
    accent: '#C7B299',
    tags: ['closet', 'boutique', 'luxe', 'popular'],
    subtypes: ['closet'],
    category: 'room-makeovers',
  },
  {
    id: 'room-laundry-room-bright',
    name: 'Bright Laundry Room',
    blurb: 'Crisp, cheerful, and organized with patterned-tile charm.',
    prompt:
      'Restyle this laundry room into a bright, cheerful space: refaced cabinet fronts in soft blue or white, a patterned cement-look floor tile, a butcher-block-look counter over the existing machines, woven baskets, a drying rod, framed art, leafy greenery, and crisp clean lighting. Keep the palette white, soft blue, and warm wood. Change only surfaces, finishes, cabinet fronts, decor, palette, and lighting. Preserve the existing washer and dryer locations, cabinetry boxes, sink and plumbing positions, windows, door, and the overall layout exactly as they are.',
    applies: 'interior',
    accent: '#9FB8CC',
    tags: ['laundry-room', 'bright', 'organized', 'popular'],
    subtypes: ['laundry-mudroom'],
    category: 'room-makeovers',
  },
  {
    id: 'room-mudroom-functional',
    name: 'Functional Mudroom',
    blurb: 'Built-in bench, hooks, and durable farmhouse practicality.',
    prompt:
      'Restyle this mudroom into a tidy, functional drop zone: a cushioned bench over the existing built-in, refaced cubby and locker fronts in a soft muted hue, rows of brass hooks, woven baskets for storage, a durable patterned runner, beadboard wall texture, and warm even lighting. Keep the palette greige, soft navy, and warm wood. Change only surfaces, finishes, cabinet fronts, decor, palette, and lighting. Preserve the existing built-in bench and cubbies, walls, door, windows, and the overall layout exactly as they are.',
    applies: 'interior',
    accent: '#6E7C8C',
    tags: ['mudroom', 'functional', 'farmhouse', 'family'],
    subtypes: ['laundry-mudroom'],
    category: 'room-makeovers',
  },
  {
    id: 'room-media-room-cinematic',
    name: 'Cinematic Media Room',
    blurb: 'Cozy theater vibes with deep seating and ambient glow.',
    prompt:
      'Restyle this media room into a cozy cinematic lounge: a deep sectional or theater-style seating in soft charcoal, blackout drapery, an acoustic-textured feature wall behind the existing screen location, a low media console, a plush rug, soft throw blankets, and warm dimmable ambient backlighting. Keep the palette charcoal, warm gray, and bronze. Change only finishes, furniture, textiles, decor, palette, and lighting. Preserve the existing room geometry, screen and equipment locations, windows, doors, built-ins, and the overall layout exactly as they are.',
    applies: 'interior',
    accent: '#5A5660',
    tags: ['media-room', 'cinematic', 'cozy', 'popular'],
    subtypes: ['media-room'],
    category: 'room-makeovers',
  },
  {
    id: 'room-guest-bedroom-inviting',
    name: 'Inviting Guest Bedroom',
    blurb: 'Hotel-comfort hospitality that feels effortless and warm.',
    prompt:
      'Restyle this guest bedroom into an inviting hotel-style retreat: a neatly dressed bed with layered crisp white and soft-blue bedding, simple wood nightstands with reading lamps, a folded throw and a water carafe tray, framed art, light drapery, a soft rug, and a warm welcoming glow. Keep the palette soft white, dusty blue, and warm wood. Change only finishes, furniture, textiles, decor, palette, and lighting. Preserve the existing room geometry, windows, doors, closet and built-ins, and the overall layout exactly as they are.',
    applies: 'interior',
    accent: '#A6B7C4',
    tags: ['guest-bedroom', 'inviting', 'hospitality'],
    subtypes: ['bedroom'],
    category: 'room-makeovers',
  },
  {
    id: 'room-powder-room-jewel',
    name: 'Jewel-Box Powder Room',
    blurb: 'Bold wallpaper, brass, and dramatic small-room glamour.',
    prompt:
      'Restyle this powder room into a dramatic jewel box: bold patterned wallpaper, a refaced vanity front in a deep lacquered hue, a brass faucet finish and matching mirror frame, a statement sconce or pendant, plush hand towels, and warm flattering light. Keep the palette deep emerald or navy with brass and warm white. Change only surfaces, finishes, vanity fronts, decor, palette, and lighting. Preserve the existing sink, toilet, and plumbing locations, the vanity footprint, window and door positions, and the overall room layout exactly as they are.',
    applies: 'interior',
    accent: '#2F5D54',
    tags: ['powder-room', 'jewel-box', 'glam', 'trending'],
    subtypes: ['bathroom'],
    category: 'room-makeovers',
  },
  {
    id: 'room-breakfast-nook-charming',
    name: 'Charming Breakfast Nook',
    blurb: 'Sun-filled banquette dining with cushions and warmth.',
    prompt:
      'Restyle this breakfast nook into a charming sunny spot: a cushioned banquette over the existing bench with patterned pillows, a round pedestal table, a couple of woven chairs, a warm pendant centered over the table location, a small vase of flowers, and bright morning light. Keep the palette warm white, soft yellow, and natural wood. Change only finishes, furniture, textiles, decor, palette, and lighting. Preserve the existing banquette or alcove, windows, walls, built-ins, and the overall layout exactly as they are.',
    applies: 'interior',
    accent: '#E8C969',
    tags: ['breakfast-nook', 'charming', 'bright', 'popular'],
    subtypes: ['kitchen'],
    category: 'room-makeovers',
  },
  {
    id: 'room-library-study-classic',
    name: 'Classic Study Library',
    blurb: 'Scholarly warmth in dark wood, leather, and lamplight.',
    prompt:
      'Elevate this study into a classic library: existing built-in shelves refaced in rich stained wood and styled with books and curios, a leather club chair with a brass floor lamp, a wood desk, a vintage rug, framed art, and a warm scholarly glow. Keep the palette deep green, cognac leather, and dark walnut. Change only surfaces, finishes, furniture, decor, palette, and lighting. Preserve the existing built-in shelving framework, room geometry, windows, doors, and the overall layout exactly as they are.',
    applies: 'interior',
    accent: '#3E4D3A',
    tags: ['study', 'library', 'classic', 'cozy'],
    subtypes: ['home-office'],
    category: 'room-makeovers',
  },
  {
    id: 'room-home-gym-energizing',
    name: 'Energizing Home Gym',
    blurb: 'Clean, motivating fitness space with rubber floors and mirrors.',
    prompt:
      'Restyle this home gym into a clean, energizing space: dark rubber-tile flooring, a large wall mirror, a styled equipment layout with neatly racked weights, a motivational framed print, a leafy plant, a water-station shelf, and bright crisp lighting. Keep the palette charcoal, white, and a single energizing accent. Change only finishes, furnishings, decor, palette, and lighting. Preserve the existing equipment locations, room geometry, windows, doors, outlets, and the overall layout exactly as they are.',
    applies: 'interior',
    accent: '#E2542C',
    tags: ['home-gym', 'energizing', 'clean'],
    subtypes: ['home-gym'],
    category: 'room-makeovers',
  },
  {
    id: 'room-pantry-organized',
    name: 'Organized Pantry',
    blurb: 'Picture-perfect storage with jars, labels, and tidy shelving.',
    prompt:
      'Restyle this pantry into a beautifully organized space: existing shelving styled with matching glass jars and labeled canisters, woven baskets for produce, refaced door fronts in warm white, a patterned wallpaper or tile back accent, and crisp clean lighting along the shelves. Keep the palette warm white, natural wicker, and soft sage. Change only surfaces, finishes, door fronts, decor, palette, and lighting. Preserve the existing shelving framework, walls, door, and the overall pantry layout and footprint exactly as they are.',
    applies: 'interior',
    accent: '#B5C0A0',
    tags: ['pantry', 'organized', 'tidy'],
    subtypes: ['kitchen'],
    category: 'room-makeovers',
  },
  {
    id: 'color-warm-neutrals',
    name: 'Warm Neutrals',
    blurb: 'Creamy beige, oatmeal, and soft taupe for a cozy, inviting glow.',
    prompt:
      'Recolor the space in warm neutrals: walls washed in creamy oatmeal and soft greige, textiles and rugs in beige, taupe, and camel linen, with natural oak and rattan tones. Bathe everything in soft warm lighting for a cozy, inviting mood, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout.',
    applies: 'interior',
    accent: '#C9B79C',
    tags: ['warm', 'neutral', 'beige', 'cozy', 'taupe'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'color-mood',
  },
  {
    id: 'color-bright-airy-white',
    name: 'Bright & Airy White',
    blurb: 'Crisp whites and pale wood flooded with bright natural daylight.',
    prompt:
      'Apply a bright, airy all-white palette: walls and trim in crisp soft white, textiles in pure white and pale linen, with light bleached-oak tones and sheer fabrics. Flood the space with abundant clean natural daylight for a fresh, open, breathable mood, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout.',
    applies: 'interior',
    accent: '#F4F1EA',
    tags: ['white', 'bright', 'airy', 'fresh', 'minimal'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'color-mood',
  },
  {
    id: 'color-cool-greys',
    name: 'Cool Greys',
    blurb: 'Sophisticated dove-to-charcoal greys with cool, calm restraint.',
    prompt:
      'Restyle in a cool grey palette: walls in dove and slate grey, textiles in charcoal, ash, and pale silver, with cool-toned metals and concrete-grey finishes. Light it with crisp, even cool-white illumination for a calm, modern, restrained mood, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout.',
    applies: 'interior',
    accent: '#9AA1A8',
    tags: ['grey', 'cool', 'modern', 'slate', 'calm'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'color-mood',
  },
  {
    id: 'color-sage-cream',
    name: 'Sage & Cream',
    blurb: 'Soft sage green paired with warm cream for a serene, organic calm.',
    prompt:
      'Recolor with a sage-and-cream palette: walls in muted sage green and soft cream, textiles in eucalyptus, ivory, and natural linen, with warm wood and brushed brass accents. Use gentle diffused daylight for a serene, organic, garden-fresh mood, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout.',
    applies: 'interior',
    accent: '#A8B49A',
    tags: ['sage', 'green', 'cream', 'serene', 'organic'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'color-mood',
  },
  {
    id: 'color-moody-dark-dramatic',
    name: 'Moody & Dramatic',
    blurb: 'Deep inky charcoal and espresso tones with rich, low-lit drama.',
    prompt:
      'Transform the palette into moody, dramatic darks: walls in deep charcoal and inky near-black, textiles in espresso, smoke, and oxblood velvet, with matte-black and aged-bronze finishes. Light it low and atmospheric with warm pooled lamplight for an enveloping, cinematic mood, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout.',
    applies: 'interior',
    accent: '#2E2C2A',
    tags: ['dark', 'moody', 'dramatic', 'charcoal', 'cinematic'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'color-mood',
  },
  {
    id: 'color-earthy-terracotta',
    name: 'Earthy Terracotta',
    blurb: 'Sun-baked clay, rust, and ochre for warm Mediterranean earthiness.',
    prompt:
      'Recolor in earthy terracotta: walls in warm clay and plaster ochre, textiles in rust, burnt sienna, and sandy cream, with terracotta tile tones and natural wood. Wash it in golden warm light for a sun-baked Mediterranean, earthy mood, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout.',
    applies: 'interior',
    accent: '#C77B52',
    tags: ['terracotta', 'earthy', 'clay', 'rust', 'mediterranean'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'color-mood',
  },
  {
    id: 'color-navy-brass',
    name: 'Navy & Brass',
    blurb: 'Rich navy walls with warm brass accents for refined elegance.',
    prompt:
      'Restyle in navy and brass: walls in deep saturated navy blue, textiles in indigo, cream, and slate, with gleaming aged-brass and gold fixtures and accents. Light it with warm focused glow for a refined, elegant, classic mood, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout.',
    applies: 'interior',
    accent: '#2B3A57',
    tags: ['navy', 'brass', 'elegant', 'blue', 'gold'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'color-mood',
  },
  {
    id: 'color-soft-pastel',
    name: 'Soft Pastel',
    blurb:
      'Powder blue, blush, and butter yellow for a sweet, gentle softness.',
    prompt:
      'Recolor in soft pastels: walls in powder blue, blush pink, and pale mint, textiles in lavender, butter yellow, and cream, with whitewashed wood and matte-white finishes. Use bright soft diffused light for a sweet, gentle, dreamy mood, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout.',
    applies: 'interior',
    accent: '#E7C6D4',
    tags: ['pastel', 'blush', 'soft', 'mint', 'dreamy'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'color-mood',
  },
  {
    id: 'color-black-white-monochrome',
    name: 'Black & White',
    blurb: 'Crisp high-contrast black-and-white with graphic, timeless punch.',
    prompt:
      'Restyle in a black-and-white monochrome palette: walls in clean white, textiles in black, white, and greyscale patterns, with matte-black hardware and chrome accents. Light it crisp and even for a graphic, high-contrast, timeless mood, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout.',
    applies: 'interior',
    accent: '#1A1A1A',
    tags: ['black', 'white', 'monochrome', 'contrast', 'graphic'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'color-mood',
  },
  {
    id: 'color-forest-green-wood',
    name: 'Forest Green & Wood',
    blurb: 'Deep emerald and pine paired with rich warm wood tones.',
    prompt:
      'Recolor in forest green and warm wood: walls in deep emerald and pine green, textiles in moss, olive, and cream, with rich walnut and oak wood tones and brass touches. Light it warm and layered for a grounded, cozy, nature-rich mood, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout.',
    applies: 'interior',
    accent: '#3A5141',
    tags: ['green', 'forest', 'wood', 'emerald', 'nature'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'color-mood',
  },
  {
    id: 'color-jewel-tones',
    name: 'Jewel Tones',
    blurb: 'Lush emerald, sapphire, and ruby velvets for opulent richness.',
    prompt:
      'Transform the palette into rich jewel tones: walls in deep teal or sapphire, textiles in emerald, ruby, amethyst, and gold velvet, with brass and dark wood finishes. Light it with warm glowing lamplight for an opulent, saturated, luxurious mood, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout.',
    applies: 'interior',
    accent: '#6B2E5F',
    tags: ['jewel', 'emerald', 'sapphire', 'luxe', 'saturated'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'color-mood',
  },
  {
    id: 'color-blush-gold',
    name: 'Blush & Gold',
    blurb: 'Romantic blush pink with shimmering gold for soft glamour.',
    prompt:
      'Recolor in blush and gold: walls in soft rose and dusty pink, textiles in blush, champagne, and ivory, with polished gold and rose-gold accents and glass. Use warm flattering light for a romantic, glamorous, feminine mood, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout.',
    applies: 'interior',
    accent: '#D9A5A0',
    tags: ['blush', 'gold', 'romantic', 'pink', 'glam'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'color-mood',
  },
  {
    id: 'color-ocean-blues',
    name: 'Ocean Blues',
    blurb: 'Layered aqua, teal, and seafoam for a breezy coastal calm.',
    prompt:
      'Restyle in ocean blues: walls in soft aqua and seafoam, textiles in teal, denim, and sandy white, with weathered driftwood and natural rope tones. Flood it with bright airy coastal light for a breezy, calming seaside mood, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout.',
    applies: 'interior',
    accent: '#5C9DB0',
    tags: ['blue', 'ocean', 'coastal', 'teal', 'breezy'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'color-mood',
  },
  {
    id: 'color-greige-monochromatic',
    name: 'Monochromatic Greige',
    blurb: 'Tonal greige layered from light to deep for quiet sophistication.',
    prompt:
      'Recolor in a monochromatic greige palette: walls in warm greige, textiles layered tone-on-tone from pale mushroom to deep stone, with matching wood and matte finishes in the same family. Use soft even light for a quiet, cohesive, sophisticated mood, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout.',
    applies: 'interior',
    accent: '#B3A99A',
    tags: ['greige', 'monochromatic', 'tonal', 'neutral', 'sophisticated'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'color-mood',
  },
  {
    id: 'color-desert-sand',
    name: 'Desert Sand',
    blurb: 'Warm sand, dune, and bone tones for a calm Southwestern warmth.',
    prompt:
      'Recolor in desert sand tones: walls in warm sand and bone plaster, textiles in dune, camel, and faded clay, with pale bleached wood and natural jute. Wash it in soft warm daylight for a calm, sun-faded Southwestern mood, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout.',
    applies: 'interior',
    accent: '#D4BE9C',
    tags: ['sand', 'desert', 'southwestern', 'dune', 'warm'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'color-mood',
  },
  {
    id: 'color-sun-washed',
    name: 'Sun-Washed',
    blurb: 'Faded, light-bleached tones glowing with golden afternoon haze.',
    prompt:
      'Restyle with a sun-washed palette: walls and textiles in faded, light-bleached warm tones of pale gold, washed terracotta, and sun-softened linen, with weathered natural wood. Bathe everything in hazy golden-hour light for a relaxed, sun-faded, nostalgic mood, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout. On exteriors, change only cladding color, trim, and paint finishes while preserving the structure, rooflines, footprint, and window and door positions.',
    applies: 'both',
    accent: '#E3C99B',
    tags: ['sun-washed', 'faded', 'golden', 'warm', 'nostalgic'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'color-mood',
  },
  {
    id: 'color-mustard-teal',
    name: 'Mustard & Teal',
    blurb:
      'Retro mustard yellow and deep teal for warm mid-century color play.',
    prompt:
      'Restyle in a mustard-and-teal palette: walls in soft warm white or muted teal, textiles in golden mustard, peacock teal, and burnt orange, with walnut wood and brass accents. Light it warm and inviting for a retro, mid-century, color-confident mood, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout.',
    applies: 'interior',
    accent: '#C99A3B',
    tags: ['mustard', 'teal', 'retro', 'mid-century', 'colorful'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'color-mood',
  },
  {
    id: 'color-vibrant-maximal',
    name: 'Vibrant Maximalist',
    blurb: 'Saturated clashing colors and bold patterns for joyful maximalism.',
    prompt:
      'Transform into vibrant maximalism: walls in a bold saturated hue, textiles in clashing jewel-bright colors, eclectic prints, and layered patterns, with glossy colorful finishes. Light it bright and lively for a joyful, expressive, more-is-more mood, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout.',
    applies: 'interior',
    accent: '#D8483B',
    tags: ['vibrant', 'maximalist', 'colorful', 'bold', 'eclectic'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'color-mood',
  },
  {
    id: 'seasonal-cozy-autumn',
    name: 'Cozy Autumn',
    blurb:
      'Warm fall layering — chunky throws, amber glow, pumpkins and dried botanicals.',
    prompt:
      'Dress the existing space for a cozy autumn refresh using only decorative layering: drape chunky knit throws and rust, ochre, and burnt-orange velvet pillows over the current seating, roll out a warm-toned wool rug, and add tabletop vignettes of white and heirloom pumpkins, dried wheat, eucalyptus, and amber glass vessels. Warm the lighting with soft golden lamplight and clustered candles, and tuck a cinnamon-and-fir garland along an existing shelf. Keep all furniture, surfaces, and built-ins exactly as they are, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout.',
    applies: 'interior',
    accent: '#C8722E',
    tags: ['autumn', 'fall', 'cozy', 'warm', 'seasonal'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'seasonal-occasion',
  },
  {
    id: 'seasonal-winter-holiday',
    name: 'Winter Holiday',
    blurb:
      'Classic Christmas — decorated tree, garland, red-and-green warmth, twinkle lights.',
    prompt:
      'Style the existing room for a classic Christmas holiday using temporary decor only: add a decorated evergreen tree in an open corner, drape lush fir garland with warm twinkle lights along the existing mantel or shelving, and layer in red, green, and tartan plaid throws and pillows over the current furniture. Set out brass candlesticks, wrapped gifts, pinecones, and red berry stems, and bathe the scene in cozy warm-white string lights and candle glow. Move no furniture and change nothing structural, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout.',
    applies: 'interior',
    accent: '#B23A35',
    tags: ['christmas', 'holiday', 'winter', 'festive', 'seasonal'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'seasonal-occasion',
  },
  {
    id: 'seasonal-scandi-christmas',
    name: 'Scandi Christmas',
    blurb:
      'Minimalist Nordic holiday — neutral whites, natural greenery, candle-warm hygge.',
    prompt:
      'Give the existing space a Scandinavian-neutral Christmas using only soft decorative layering: a simply adorned evergreen with natural wood and white ornaments, fresh fir and eucalyptus garland, and cream wool and bouclé throws over the current seating. Add white pillar candles, paper stars, kraft-wrapped gifts, and matte ceramic vessels in a palette of white, oatmeal, and pale wood, lit by warm hygge candlelight. Keep all furniture and finishes in place, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout.',
    applies: 'interior',
    accent: '#D8C7B5',
    tags: ['christmas', 'scandinavian', 'neutral', 'hygge', 'minimalist'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'seasonal-occasion',
  },
  {
    id: 'seasonal-spring-refresh',
    name: 'Spring Refresh',
    blurb:
      'Light and airy — fresh florals, pastel textiles, breezy linen brightness.',
    prompt:
      'Refresh the existing room for spring with decorative styling alone: swap in light linen throws and pastel pillows in soft green, blush, and butter-yellow, lay down a pale natural-fiber rug, and fill vases with tulips, ranunculus, cherry blossom branches, and fresh greenery. Add woven baskets, light ceramic accents, and gauzy textile layers, brightening the mood with airy daylight and soft lamplight. Keep every piece of furniture and all surfaces exactly where they are, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout.',
    applies: 'interior',
    accent: '#9DBF8E',
    tags: ['spring', 'floral', 'pastel', 'fresh', 'airy'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'seasonal-occasion',
  },
  {
    id: 'seasonal-summer-bright',
    name: 'Summer Bright',
    blurb:
      'Sun-drenched coastal cheer — crisp whites, blue accents, fresh citrus and greenery.',
    prompt:
      'Style the existing space for a bright summer refresh using only decor and textiles: crisp white and breezy blue-striped pillows and throws over the current seating, a light woven jute rug, and rattan or wicker decorative accents. Add bowls of fresh lemons, leafy potted greenery, sheer light curtains over the existing windows, and clear glass vessels, all bathed in airy sun-drenched daylight. Leave all furniture and architecture untouched, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout.',
    applies: 'interior',
    accent: '#3E8FB0',
    tags: ['summer', 'coastal', 'bright', 'fresh', 'blue'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'seasonal-occasion',
  },
  {
    id: 'seasonal-dinner-party',
    name: 'Dinner-Party Ready',
    blurb:
      'Elevated entertaining — layered tablescape, candlelight, florals and fine glassware.',
    prompt:
      'Stage the existing space for an elegant dinner party using only decorative layering: dress the current table with a linen runner, layered chargers, fine glassware, and folded napkins, add a low floral centerpiece with seasonal blooms and greenery, and line the table and shelves with tapered candles in brass holders. Warm the mood with dimmed pendant light and abundant candle glow, adding a few cushions and a throw to soften nearby seating. Keep all furniture, surfaces, and fixtures in their existing positions, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout.',
    applies: 'interior',
    accent: '#A88B5C',
    tags: [
      'entertaining',
      'dinner-party',
      'candlelight',
      'tablescape',
      'elegant',
    ],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'seasonal-occasion',
  },
  {
    id: 'seasonal-biophilic-refresh',
    name: 'Plant-Filled Refresh',
    blurb:
      'Biophilic greenery — layered potted plants, trailing vines, fresh organic calm.',
    prompt:
      'Transform the mood of the existing room with a plant-filled biophilic refresh using only decorative additions: cluster potted plants of varying heights, a statement fiddle-leaf or palm in an open corner, trailing pothos and ivy from existing shelves, and hanging planters near the windows. Add woven baskets, terracotta and stoneware pots, a jute rug, and a few botanical-toned cushions, brightening the space with soft natural daylight. Add no structures and move no furniture, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout.',
    applies: 'interior',
    accent: '#5C8A4A',
    tags: ['biophilic', 'plants', 'greenery', 'organic', 'refresh'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'seasonal-occasion',
  },
  {
    id: 'seasonal-candlelit-romantic',
    name: 'Candlelit Romantic',
    blurb:
      'Intimate glow — clustered candles, soft florals, blush textiles and warm shadows.',
    prompt:
      'Layer the existing space into a candlelit romantic scene using only decor: cluster pillar and taper candles across the current surfaces and mantel, scatter rose petals and soft blush and ivory blooms, and drape velvet and plush throws with satin-trimmed pillows over the seating. Add warm fairy-light strands, a sumptuous rug underfoot, and dim every light source to a low golden flicker for an intimate, glowing mood. Keep all furniture and finishes exactly as they are, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout.',
    applies: 'interior',
    accent: '#C98A8F',
    tags: ['romantic', 'candlelit', 'intimate', 'blush', 'warm'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'seasonal-occasion',
  },
  {
    id: 'seasonal-halloween',
    name: 'Halloween',
    blurb:
      'Spooky-chic styling — moody pumpkins, cobweb accents, flickering amber gloom.',
    prompt:
      'Dress the existing room for a tasteful, spooky-chic Halloween using only temporary decor: arrange clusters of white, black, and orange pumpkins and gourds, drape subtle faux cobwebs and dark garland along the existing mantel or shelves, and add black and deep-plum pillows and throws over the current seating. Place flickering LED candles in lanterns, amber glass, dried branches, and a few moody curiosities, dimming the lighting to a warm, shadowy glow. Move nothing structural and keep all furniture in place, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout.',
    applies: 'interior',
    accent: '#7A4E1E',
    tags: ['halloween', 'spooky', 'autumn', 'moody', 'festive'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'seasonal-occasion',
  },
  {
    id: 'seasonal-lunar-new-year',
    name: 'Lunar New Year',
    blurb:
      'Festive red-and-gold — blossoms, lanterns, auspicious accents and warm prosperity.',
    prompt:
      'Style the existing space for Lunar New Year using only decorative layering: add red and gold cushions and a runner over the current furniture, hang red lanterns and tassels near existing openings, and arrange branches of plum or cherry blossom and potted kumquat in ceramic vessels. Set out gold accents, red envelopes, auspicious decor, and a tray of oranges, warming the room with soft golden light. Keep all furniture, surfaces, and architecture untouched, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout.',
    applies: 'interior',
    accent: '#C81E2C',
    tags: ['lunar-new-year', 'festive', 'red-gold', 'cultural', 'seasonal'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'seasonal-occasion',
  },
  {
    id: 'seasonal-diwali-warm',
    name: 'Diwali Warm',
    blurb:
      'Glowing festival of lights — diyas, marigolds, jewel textiles and brass warmth.',
    prompt:
      'Dress the existing room for a warm Diwali celebration using only temporary decor: line the current surfaces, shelves, and entry with glowing diyas and tealights, drape marigold and jasmine garlands along existing openings, and lay a colorful rangoli pattern on the floor. Layer jewel-toned silk and brocade cushions and throws in saffron, magenta, and gold over the seating, add brass lanterns and metallic accents, and fill the room with a warm, radiant golden glow. Move no furniture and change nothing structural, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout.',
    applies: 'interior',
    accent: '#E0922F',
    tags: ['diwali', 'festival-of-lights', 'warm', 'cultural', 'festive'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'seasonal-occasion',
  },
  {
    id: 'seasonal-nye-gold',
    name: 'Festive NYE Gold',
    blurb:
      'Glamorous countdown — gold and black accents, sparkle, candlelight and champagne.',
    prompt:
      "Stage the existing space for a glamorous New Year's Eve using only decorative layering: add gold and black metallic cushions and throws over the current seating, drape shimmering gold garland and star accents along existing shelves, and cluster tapered candles with a champagne-and-coupe tabletop vignette. Introduce sparkling fairy lights, sequined and velvet textures, and a few balloon or confetti touches, dimming the room to a warm sparkling glow. Keep all furniture and finishes exactly in place, while preserving the existing room geometry, windows, doors, openings, built-ins, and architectural layout.",
    applies: 'interior',
    accent: '#C9A227',
    tags: ['new-years-eve', 'gold', 'glamorous', 'festive', 'sparkle'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'seasonal-occasion',
  },
  {
    id: 'staging-floor-plan-visualizer',
    name: 'Floor Plan Visualizer',
    blurb:
      'Turns a 2D architectural plan into a clear faux-3D isometric you can actually read.',
    prompt:
      "Turn this 2D architectural floor plan into a clean faux-3D isometric visualization: raise the walls to a low, consistent height so every room stays readable from above, furnish each space with simple true-to-scale furniture, use soft material colors for floors (warm wood, tile, rugs) and light neutral walls, and light it evenly with gentle shadows. Keep room labels and dimensions legible. Faithfully follow the plan's exact wall positions, room layout, doorways, windows, and proportions — do not invent, move, or resize rooms.",
    applies: 'both',
    accent: '#6E8CA0',
    tags: ['floorplan', 'isometric', 'faux-3d', 'visualization'],
    subtypes: ['floorplan'],
    category: 'floorplan-staging',
  },
  {
    id: 'staging-3d-floor-plan-cutaway',
    name: 'Realistic 3D Floor Plan',
    blurb:
      'A roofless, photoreal 3D cutaway of the whole plan from a high angle.',
    prompt:
      'Render this floor plan as a realistic 3D cutaway seen from a high three-quarter angle, as if the roof were removed: extrude the walls to full height, add real flooring materials, furniture, rugs, plants, and warm interior lighting so it reads like a finished home you can walk through. Keep the exact room layout, wall placement, doorways, windows, and scale from the plan — only add height, materials, and furnishings to help visualize the finished space.',
    applies: 'both',
    accent: '#B5836B',
    tags: ['floorplan', '3d', 'cutaway', 'render'],
    subtypes: ['floorplan'],
    category: 'floorplan-staging',
  },
  {
    id: 'staging-empty-to-staged',
    name: 'Virtually Staged',
    blurb:
      'Empty room filled with tasteful, broadly appealing furniture and warm styling',
    prompt:
      'Virtually stage this empty room with elegant, broadly appealing furnishings: a tailored sofa or upholstered bed, layered neutral textiles, a low coffee table or nightstand, a soft area rug, framed art, and a leafy plant, all arranged naturally within the existing footprint. Light it with soft daylight from the current windows for an inviting, move-in-ready feel. Add only furniture, decor, textiles, and lighting, while preserving the existing room geometry, walls, windows, doors, openings, ceiling height, built-ins, fixture locations, and architectural layout.',
    applies: 'interior',
    accent: '#B79A7D',
    tags: ['virtual staging', 'empty room', 'furnished', 'real estate'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'floorplan-staging',
  },
  {
    id: 'staging-realestate-neutral',
    name: 'Real-Estate Neutral',
    blurb:
      'Broad-appeal neutral staging tuned to photograph cleanly for listings',
    prompt:
      'Stage this room in a broadly appealing neutral real-estate style: beige and greige upholstery, light-oak accents, crisp white walls, simple symmetrical decor, fresh linens, and a few understated accessories, lit with bright, balanced light that photographs cleanly. Keep it uncluttered and buyer-friendly so anyone can picture themselves living here. Change only furniture, decor, finishes, and color palette, while preserving the existing room geometry, walls, windows, doors, openings, ceiling height, built-ins, fixture locations, and overall layout.',
    applies: 'interior',
    accent: '#CDBFA8',
    tags: ['real estate', 'neutral', 'listing', 'broad appeal'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'floorplan-staging',
  },
  {
    id: 'staging-declutter-depersonalize',
    name: 'Declutter & Depersonalize',
    blurb:
      'Strip clutter and personal items for a clean, neutral, listing-ready look',
    prompt:
      'Restyle this room to look decluttered and depersonalized: clear away personal photos, clutter, and excess belongings, simplify to a few neutral, tasteful furnishings, fresh white-toned walls, tidy surfaces, and clean folded textiles, with bright even light for a calm, spacious, listing-ready feel. Change only the furniture, decor, finishes, and color palette, while preserving the existing room geometry, walls, windows, doors, openings, ceiling height, built-ins, fixture locations, and architectural layout.',
    applies: 'interior',
    accent: '#D8D2C6',
    tags: ['declutter', 'depersonalize', 'listing', 'clean'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'floorplan-staging',
  },
  {
    id: 'staging-2d-to-3d-render',
    name: '2D to Furnished 3D',
    blurb:
      'Flat 2D floorplan reborn as a furnished, photoreal three-quarter render',
    prompt:
      'Transform this flat 2D floorplan into a photorealistic furnished 3D render, tilting the camera to a three-quarter perspective while keeping every wall, window, and door exactly where the plan shows them. Add warm oak flooring, soft area rugs, contemporary sofas, beds, and dining sets with realistic ambient daylight casting gentle shadows and material textures across each room. Add only furnishings, finishes, perspective, and lighting, while preserving the exact wall positions, window and door placements, openings, and overall floor plan from the drawing.',
    applies: 'interior',
    accent: '#C9A66B',
    tags: ['floorplan', '3d render', 'conversion', 'furnished'],
    subtypes: ['floorplan'],
    category: 'floorplan-staging',
  },
  {
    id: 'staging-topdown-color-plan',
    name: 'Top-Down Color Plan',
    blurb:
      'Crisp top-down floorplan with color-coded rooms and furniture icons',
    prompt:
      'Render this floorplan as a clean top-down colored architectural plan viewed straight from above, with soft pastel color fills per zone, neatly drawn furniture symbols, textured flooring patterns, room labels, and subtle drop shadows for a polished real-estate marketing diagram. Add only color, textures, labels, and furniture symbols, while preserving all wall positions, doorways, window markings, openings, and the exact floor plan precisely as drawn.',
    applies: 'interior',
    accent: '#7FB3A6',
    tags: ['top-down', 'color plan', 'diagram', 'floorplan'],
    subtypes: ['floorplan'],
    category: 'floorplan-staging',
  },
  {
    id: 'staging-isometric-dollhouse',
    name: 'Isometric Dollhouse',
    blurb:
      'Charming roofless dollhouse view of the whole layout in isometric 3D',
    prompt:
      'Reimagine this floorplan as a roofless isometric dollhouse render seen from a 45-degree elevated angle, showing miniature furnished rooms with cozy furniture, tiny rugs and plants, warm interior lighting glowing through, and clean white exterior walls for a delightful cutaway model. Add only furnishings, finishes, perspective, and lighting, while keeping the full layout, wall lengths, openings, and door and window positions true to the plan and preserving the exact floor plan and footprint.',
    applies: 'interior',
    accent: '#E0A458',
    tags: ['isometric', 'dollhouse', 'cutaway', 'floorplan'],
    subtypes: ['floorplan'],
    category: 'floorplan-staging',
  },
  {
    id: 'staging-raw-to-finished',
    name: 'Raw Shell to Finished',
    blurb:
      'Bare construction shell visualized with finished surfaces and styling',
    prompt:
      'Visualize this raw, under-construction shell as a finished interior by dressing only its surfaces: smooth painted drywall, baseboards and trim, engineered wood floors, recessed light fixtures, and modern fittings placed at the existing fixture and plumbing locations, rendered with clean even light so the space reads as freshly completed. Change only finishes, surface treatments, fixtures, and lighting, while preserving the existing structural framing, window and door openings, ceiling height, room layout, geometry, and overall footprint.',
    applies: 'interior',
    accent: '#9CA3AF',
    tags: ['construction', 'finished', 'shell', 'staging'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'floorplan-staging',
  },
  {
    id: 'staging-model-home',
    name: 'Model-Home Staging',
    blurb:
      'Polished builder-showroom styling like a professionally staged model unit',
    prompt:
      'Stage this space like a professionally designed builder model home: coordinated transitional furniture, a curated neutral palette with warm accent colors, symmetrical decor vignettes, fresh florals, layered drapery and rugs, and styled bookshelves, all lit bright and crisp like a showroom. Add only furnishings, finishes, and decor within the current footprint, while preserving the existing room geometry, walls, windows, doors, openings, ceiling height, built-ins, fixture locations, and architectural layout.',
    applies: 'interior',
    accent: '#BBA88C',
    tags: ['model home', 'showroom', 'staging', 'builder'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'floorplan-staging',
  },
  {
    id: 'staging-lifestyle',
    name: 'Lifestyle Staging',
    blurb: 'Warm, lived-in editorial styling that tells an aspirational story',
    prompt:
      'Stage this room with warm, aspirational lifestyle styling: a relaxed sofa or made bed with layered throws and cushions, an open book and coffee on the table, a draped blanket, fresh flowers, trailing plants, and soft golden afternoon light for a lived-in, editorial mood that tells a story. Add only furniture, textiles, decor, and lighting within the existing footprint, while preserving the existing room geometry, walls, windows, doors, openings, ceiling height, built-ins, fixture locations, and architectural layout.',
    applies: 'interior',
    accent: '#C8A07C',
    tags: ['lifestyle', 'editorial', 'lived-in', 'staging'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'floorplan-staging',
  },
  {
    id: 'staging-small-space-optimize',
    name: 'Small-Space Optimizer',
    blurb: 'Tight footprint maximized with clever multifunctional furniture',
    prompt:
      'Optimize this small space with clever multifunctional furnishings: a fold-down or wall-mounted desk, a sofa bed, slim vertical shelving, under-bench storage, light-reflecting mirrors, and a soft bright palette that makes the compact room feel open, efficient, and clutter-free. Add only furniture, storage, decor, and finishes within the current tight footprint, while preserving the existing room geometry, walls, windows, doors, openings, ceiling height, built-ins, and overall layout.',
    applies: 'interior',
    accent: '#B9C4C9',
    tags: ['small space', 'compact', 'storage', 'multifunctional'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'floorplan-staging',
  },
  {
    id: 'staging-apartment-rental',
    name: 'Apartment Staging',
    blurb: 'Compact rental furnished with smart, stylish urban pieces',
    prompt:
      'Stage this apartment with smart, space-conscious urban furnishings: a compact sectional, a slim dining setup, multi-use storage, warm accent lighting, framed prints, and greenery, styled in a modern city palette of warm greys and soft brass for an aspirational, rental-ready feel. Add only furniture, decor, and finishes within the existing footprint, while preserving the existing room geometry, walls, windows, doors, openings, ceiling height, built-ins, fixture locations, and overall floor plan.',
    applies: 'interior',
    accent: '#A38C6E',
    tags: ['apartment', 'urban', 'rental', 'staging'],
    subtypes: [
      'living-room',
      'kitchen',
      'bedroom',
      'bathroom',
      'home-office',
      'dining-room',
      'entryway',
    ],
    category: 'floorplan-staging',
  },
  {
    id: 'staging-twilight-listing-exterior',
    name: 'Twilight Listing Exterior',
    blurb: 'Dusk listing shot with glowing windows and a warm, inviting facade',
    prompt:
      "Restyle this home's exterior into a magazine-quality twilight listing shot: a deep dusk-blue sky, warm glowing light spilling from every window, soft landscape uplighting on tidy shrubs and a manicured lawn, a welcoming porch light, and a freshly painted facade with crisp trim and an inviting front door. Change only siding and paint colors, trim, front-door and lighting style, landscaping, and the dusk lighting mood, while preserving the existing structure, rooflines, footprint, and the positions and sizes of all windows and doors.",
    applies: 'exterior',
    accent: '#3E4C6B',
    tags: ['twilight', 'exterior', 'listing', 'curb appeal'],
    subtypes: ['facade'],
    category: 'floorplan-staging',
  },
]

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'wall_color',
    name: 'Change Wall Color',
    blurb:
      'Repaints the walls a new color while keeping trim, furniture, and lighting untouched.',
    template:
      "Repaint only the {wall_target} in this photo to {color}, with a {finish} finish. Keep the exact same room geometry, layout, windows, trim, ceiling, flooring, furniture, decor, lighting, and shadows. Only the wall paint color should change. Match the original photo's perspective, camera angle, and natural lighting so the result looks like the same room photographed after painting.",
    placeholders: [
      {
        key: 'wall_target',
        examples: [
          'all walls',
          'the accent wall behind the bed',
          'the back wall',
          'the wall behind the sofa',
          'the lower half of the walls below the chair rail',
        ],
      },
      {
        key: 'color',
        examples: [
          'warm white (Benjamin Moore Swiss Coffee)',
          'soft sage green',
          'deep navy blue',
          'charcoal gray',
          'muted terracotta',
          'pale blush pink',
        ],
      },
      {
        key: 'finish',
        examples: ['matte', 'eggshell', 'satin', 'semi-gloss'],
      },
    ],
  },
  {
    id: 'swap_flooring',
    name: 'Swap Flooring',
    blurb:
      'Replaces the floor surface with a new material while preserving everything resting on it.',
    template:
      "Replace only the flooring in this photo with {flooring_material} in a {tone} tone, laid in a {pattern} pattern. Keep the exact same room dimensions, walls, furniture placement, rugs' relationship to the floor, lighting, and perspective. All furniture and objects must stay in the same positions with correct contact shadows and reflections on the new floor. Change nothing except the floor surface.",
    placeholders: [
      {
        key: 'flooring_material',
        examples: [
          'wide-plank oak hardwood',
          'light maple wood',
          'gray porcelain tile',
          'polished concrete',
          'natural stone',
          'neutral wool carpet',
        ],
      },
      {
        key: 'tone',
        examples: [
          'light natural',
          'warm honey',
          'mid-brown',
          'weathered gray',
          'dark walnut',
        ],
      },
      {
        key: 'pattern',
        examples: [
          'straight plank',
          'herringbone',
          'chevron',
          'large square tile',
          'diagonal',
        ],
      },
    ],
  },
  {
    id: 'change_furniture_piece',
    name: 'Change One Furniture Piece',
    blurb:
      'Swaps a single specified furniture item for a new one, leaving the rest of the room intact.',
    template:
      'Replace only the {furniture_item} in this photo with a {new_description} in {material_or_color}. Place the new piece in the exact same location and at the same scale as the original, with correct perspective, contact shadows, and reflections. Keep every other object, the walls, flooring, lighting, and camera angle unchanged. Only the {furniture_item} should be different.',
    placeholders: [
      {
        key: 'furniture_item',
        examples: [
          'sofa',
          'dining table',
          'coffee table',
          'bed frame',
          'armchair',
          'bookshelf',
        ],
      },
      {
        key: 'new_description',
        examples: [
          'mid-century modern 3-seat sofa',
          'round pedestal table',
          'low minimalist platform bed',
          'tufted leather wingback chair',
          'slim floating console',
        ],
      },
      {
        key: 'material_or_color',
        examples: [
          'cognac leather',
          'oatmeal linen',
          'solid walnut',
          'matte black metal',
          'natural rattan',
          'forest green velvet',
        ],
      },
    ],
  },
  {
    id: 'add_remove_element',
    name: 'Add or Remove an Element',
    blurb:
      'Adds a new object into the scene or removes an existing one, filling the gap realistically.',
    template:
      '{action} this photo. Keep the room geometry, walls, flooring, existing furniture, lighting, and camera angle exactly the same. If adding, place the new item naturally at a realistic scale with correct shadows and perspective; if removing, fill the vacated space convincingly with whatever surface or background should logically be behind it. Make no other changes.',
    placeholders: [
      {
        key: 'action',
        examples: [
          'Add a large leafy potted fiddle-leaf fig plant in the empty corner of',
          'Add a framed gallery wall of art above the sofa in',
          'Remove the floor lamp from',
          'Remove the television and its stand from',
          'Add a patterned area rug under the coffee table in',
          'Remove the clutter of cables and remove the small side table from',
        ],
      },
    ],
  },
  {
    id: 'lighting_time_of_day',
    name: 'Change Lighting / Time of Day',
    blurb:
      'Re-lights the scene for a different time of day or lighting mood without moving anything.',
    template:
      'Relight this photo to look like {lighting_scenario}. Keep the exact same room, furniture, materials, layout, and camera angle. Adjust only the lighting, shadows, color temperature, and light coming through the windows to match. Make highlights, shadow direction, and ambient glow physically consistent with the new light source. Do not move, add, or remove any objects.',
    placeholders: [
      {
        key: 'lighting_scenario',
        examples: [
          'warm golden-hour sunset light streaming through the windows',
          'soft bright midday daylight',
          'cozy evening with warm lamps on and dark windows',
          'cool overcast morning',
          'moody candlelit nighttime',
          'crisp blue-hour dusk',
        ],
      },
    ],
  },
  {
    id: 'countertop_cabinet_finish',
    name: 'Change Countertop / Cabinet Finish',
    blurb:
      'Updates kitchen or bath countertops and/or cabinet finishes while keeping the layout fixed.',
    template:
      'In this photo, change the {surface_target} to {new_finish}. Keep the exact same cabinet layout, appliance positions, sink and faucet, backsplash (unless specified), wall color, flooring, lighting, and camera angle. Preserve the original geometry and proportions; only the finish of the specified surface should change, with realistic material texture, reflections, and edge profiles.',
    placeholders: [
      {
        key: 'surface_target',
        examples: [
          'countertops',
          'cabinet doors and drawer fronts',
          'both countertops and cabinets',
          'kitchen island countertop only',
          'upper cabinets only',
        ],
      },
      {
        key: 'new_finish',
        examples: [
          'white quartz with subtle gray veining',
          'honed black granite',
          'warm butcher-block wood',
          'matte navy painted cabinets',
          'natural oak shaker cabinets',
          'high-gloss white lacquer',
        ],
      },
    ],
  },
  {
    id: 'restyle_named_style',
    name: 'Restyle in a Named Style (with Intensity)',
    blurb:
      'Reinterprets the room in a chosen design style at a controllable strength, from subtle to full.',
    template:
      'Restyle this room in a {style} aesthetic at {intensity} intensity. Preserve the exact room geometry, window and door positions, ceiling height, and camera perspective. At lower intensity change only finishes, colors, and a few accents; at higher intensity restyle furniture, materials, decor, and palette to fully express the style. Keep the result photorealistic and the architecture unchanged.',
    placeholders: [
      {
        key: 'style',
        examples: [
          'Scandinavian minimalist',
          'warm Japandi',
          'mid-century modern',
          'industrial loft',
          'coastal',
          'bohemian',
          'modern farmhouse',
        ],
      },
      {
        key: 'intensity',
        examples: [
          'subtle (10-20%, accents only)',
          'moderate (40-50%)',
          'strong (70-80%)',
          'full transformation (100%)',
        ],
      },
    ],
  },
  {
    id: 'season_decor',
    name: 'Change Season / Decor',
    blurb:
      'Swaps seasonal or holiday decor and styling cues while keeping the core room the same.',
    template:
      'Restyle the decor of this room for {season_or_occasion}. Keep the same walls, flooring, large furniture, layout, and camera angle. Update only the soft decor and seasonal accents such as throws, pillows, table styling, plants or florals, and small decorative touches to suit the occasion. Keep it tasteful and photorealistic; do not alter the architecture or major furniture pieces.',
    placeholders: [
      {
        key: 'season_or_occasion',
        examples: [
          'cozy autumn with warm tones and throws',
          'fresh spring with light florals',
          'bright airy summer styling',
          'winter holidays with subtle festive decor',
          'minimalist Christmas',
          'neutral year-round refresh',
        ],
      },
    ],
  },
  {
    id: 'declutter',
    name: 'Declutter',
    blurb:
      'Tidies and removes visual clutter to make the space look clean and staged.',
    template:
      'Declutter this room at a {declutter_level} level. Remove visual clutter such as {clutter_items} while keeping the same walls, flooring, major furniture, layout, lighting, and camera angle. Fill any revealed surfaces or floor realistically. The result should look like the same room cleaned and tidied, not redesigned. Do not change furniture style or wall colors.',
    placeholders: [
      {
        key: 'declutter_level',
        examples: [
          'light tidy-up',
          'moderate',
          'deep declutter (minimal surfaces)',
          'fully staged / show-home',
        ],
      },
      {
        key: 'clutter_items',
        examples: [
          'loose papers, cables, and small countertop items',
          'excess pillows, blankets, and floor clutter',
          'personal items, toiletries, and tabletop knick-knacks',
          'visible cords, magazines, and stacked boxes',
        ],
      },
    ],
  },
  {
    id: 'change_window_view',
    name: 'Change View Out the Window',
    blurb:
      'Replaces the scenery visible through the windows without touching the interior.',
    template:
      'Change only what is visible through the windows in this photo to {new_view}. Keep the window frames, glass reflections, interior room, furniture, walls, and camera angle exactly the same. The new view should look natural for the time of day and let realistic light into the room. Adjust the light entering through the glass to match the new scene, but change nothing inside the room.',
    placeholders: [
      {
        key: 'new_view',
        examples: [
          'a calm ocean and beach',
          'a forest of tall green trees',
          'a snowy mountain range',
          'a city skyline at dusk',
          'a lush green garden',
          'rolling countryside hills',
        ],
      },
    ],
  },
  {
    id: 'recolor_facade',
    name: 'Recolor a Facade',
    blurb:
      'Repaints an exterior building facade a new color while keeping structure and surroundings fixed.',
    template:
      'Recolor only the {facade_target} of this house exterior to {color}. Keep the exact same architecture, rooflines, windows, doors, trim, landscaping, driveway, sky, and camera angle. Preserve all materials and textures; change only the paint or siding color of the specified surface, with realistic lighting and shadows consistent with the original photo.',
    placeholders: [
      {
        key: 'facade_target',
        examples: [
          'main siding',
          'siding and keep the trim white',
          'front door only',
          'garage door',
          'shutters and trim',
          'lower stone-and-siding combination',
        ],
      },
      {
        key: 'color',
        examples: [
          'classic white',
          'soft sage green',
          'warm greige',
          'deep charcoal',
          'navy blue with white trim',
          'natural cedar stain',
        ],
      },
    ],
  },
  {
    id: 'redo_landscaping',
    name: 'Redo Landscaping',
    blurb:
      'Reworks the yard and plantings around a building while keeping the structure unchanged.',
    template:
      "Redesign the landscaping in this exterior photo to a {landscape_style} look. Keep the house, driveway, walkways' general path, rooflines, windows, and camera angle exactly the same. Update only the plants, lawn, garden beds, mulch, and yard greenery to match the style. Keep it seasonally appropriate and photorealistic, with healthy plantings and natural shadows. Do not alter the building.",
    placeholders: [
      {
        key: 'landscape_style',
        examples: [
          'clean low-maintenance modern',
          'lush cottage garden',
          'drought-tolerant xeriscape with gravel and succulents',
          'tropical with palms and broad leaves',
          'tidy traditional with boxwood hedges',
          'native wildflower meadow',
        ],
      },
    ],
  },
  {
    id: 'add_feature',
    name: 'Add a Feature',
    blurb:
      'Introduces a major new structural or outdoor feature into the scene, realistically integrated.',
    template:
      'Add {feature} to this photo. Integrate it realistically into the existing space at a believable scale and position, with correct perspective, materials, shadows, and reflections. Keep the surrounding {context}, building structure, and camera angle unchanged. The new feature should look professionally built and naturally part of the scene. Make no other changes.',
    placeholders: [
      {
        key: 'feature',
        examples: [
          'a wooden pergola over the patio',
          'an in-ground rectangular swimming pool in the backyard',
          'a modern linear gas fireplace on the main wall',
          'a built-in outdoor kitchen island',
          'a covered front porch',
          'a fire pit with seating in the yard',
        ],
      },
      {
        key: 'context',
        examples: [
          'yard and landscaping',
          'patio and furniture',
          'room and existing furniture',
          'deck and railing',
        ],
      },
    ],
  },
  {
    id: 'adjust_materials',
    name: 'Adjust Materials',
    blurb:
      'Changes the material of a specific surface or element without altering its shape or placement.',
    template:
      "Change the material of the {element} in this photo to {new_material}. Keep the exact same shape, size, position, and proportions of that element, along with the rest of the room or exterior, the layout, lighting, and camera angle. Render the new material with realistic texture, sheen, and detail consistent with the scene's lighting. Change nothing else.",
    placeholders: [
      {
        key: 'element',
        examples: [
          'fireplace surround',
          'backsplash',
          'kitchen island base',
          'accent wall',
          'stair railing',
          'exterior porch columns',
        ],
      },
      {
        key: 'new_material',
        examples: [
          'natural stacked stone',
          'white subway tile',
          'warm wood slats',
          'blackened steel',
          'marble',
          'exposed brick',
        ],
      },
    ],
  },
  {
    id: 'change_mood',
    name: 'Change Mood',
    blurb:
      'Shifts the overall atmosphere and feeling of the space through color, light, and styling tone.',
    template:
      'Adjust the overall mood of this room to feel {mood}. Keep the same room geometry, furniture layout, and camera angle. Shift the color palette, lighting warmth, textures, and accent styling to evoke the desired feeling, making subtle coordinated changes rather than redesigning the space. Keep the result photorealistic and the architecture unchanged.',
    placeholders: [
      {
        key: 'mood',
        examples: [
          'calm and serene',
          'warm and cozy',
          'bright and energizing',
          'moody and dramatic',
          'fresh and airy',
          'luxurious and refined',
        ],
      },
    ],
  },
  {
    id: 'virtually_stage',
    name: 'Virtually Stage Furniture',
    blurb:
      'Furnishes an empty or sparse room with tasteful furniture for listings or visualization.',
    template:
      "Virtually stage this {room_type} as if empty, furnishing it in a {style} style appropriate for the space. Keep the exact same walls, flooring, windows, doors, ceiling, lighting, and camera angle. Add realistically scaled furniture and tasteful decor with correct perspective, contact shadows, and reflections, arranged for a natural and inviting layout. Do not alter the room's architecture or finishes.",
    placeholders: [
      {
        key: 'room_type',
        examples: [
          'living room',
          'primary bedroom',
          'dining room',
          'home office',
          'open-plan living and dining area',
          'nursery',
        ],
      },
      {
        key: 'style',
        examples: [
          'modern neutral',
          'Scandinavian',
          'transitional',
          'mid-century modern',
          'warm contemporary',
          'coastal',
        ],
      },
    ],
  },
]

export const STARTER_FOLDERS: StarterFolder[] = [
  {
    name: 'Living Room',
    blurb:
      'Where the home gathers — sofas, lighting, and the layout everyone actually lives in.',
    emoji: '🛋️',
    space: 'interior',
  },
  {
    name: 'Kitchen',
    blurb:
      'Cabinets, counters, and the work triangle — the hardest-working room in the house.',
    emoji: '🍳',
    space: 'interior',
  },
  {
    name: 'Primary Bedroom',
    blurb:
      'Your personal retreat — bed, storage, and a calm palette to wind down in.',
    emoji: '🛏️',
    space: 'interior',
  },
  {
    name: 'Bathroom',
    blurb: 'Tile, fixtures, and finishes for a spa-feeling daily ritual.',
    emoji: '🛁',
    space: 'interior',
  },
  {
    name: 'Home Office',
    blurb:
      'A focused workspace with the right desk, light, and storage to actually get things done.',
    emoji: '🖥️',
    space: 'interior',
  },
  {
    name: 'Backyard',
    blurb:
      'Patio, planting, and outdoor living — your private escape out back.',
    emoji: '🌳',
    space: 'exterior',
  },
  {
    name: 'Front Exterior',
    blurb:
      'Curb appeal first impressions — facade, entry, and landscaping out front.',
    emoji: '🏡',
    space: 'exterior',
  },
  {
    name: 'Floorplans',
    blurb:
      'The big picture — room dimensions, flow, and how every zone connects.',
    emoji: '📐',
    space: 'both',
  },
]

export function presetsForSpace(space: SpaceKind | 'all'): StylePreset[] {
  if (space === 'all') return STYLE_PRESETS
  return STYLE_PRESETS.filter(
    (p) => p.applies === space || p.applies === 'both',
  )
}

export function presetById(id: string): StylePreset | undefined {
  return STYLE_PRESETS.find((p) => p.id === id)
}

// Room / area subtypes — the "where" axis used by search and the browse filters.
export const STYLE_SUBTYPES: StyleSubtype[] = [
  { key: 'living-room', label: 'Living Room', emoji: '🛋️', space: 'interior' },
  { key: 'kitchen', label: 'Kitchen', emoji: '🍳', space: 'interior' },
  { key: 'bedroom', label: 'Bedroom', emoji: '🛏️', space: 'interior' },
  { key: 'bathroom', label: 'Bathroom', emoji: '🛁', space: 'interior' },
  { key: 'home-office', label: 'Home Office', emoji: '🖥️', space: 'interior' },
  { key: 'dining-room', label: 'Dining Room', emoji: '🍽️', space: 'interior' },
  { key: 'entryway', label: 'Entryway', emoji: '🚪', space: 'interior' },
  { key: 'kids-room', label: "Kids' Room", emoji: '🧸', space: 'interior' },
  { key: 'closet', label: 'Closet', emoji: '👗', space: 'interior' },
  {
    key: 'laundry-mudroom',
    label: 'Laundry & Mud',
    emoji: '🧺',
    space: 'interior',
  },
  { key: 'home-gym', label: 'Home Gym', emoji: '🏋️', space: 'interior' },
  { key: 'home-bar', label: 'Bar & Lounge', emoji: '🍸', space: 'interior' },
  { key: 'sunroom', label: 'Sunroom', emoji: '🪴', space: 'interior' },
  { key: 'media-room', label: 'Media Room', emoji: '📺', space: 'interior' },
  { key: 'floorplan', label: 'Floor Plan', emoji: '📐', space: 'both' },
  { key: 'facade', label: 'Facade', emoji: '🏠', space: 'exterior' },
  { key: 'front-yard', label: 'Front Yard', emoji: '🌿', space: 'exterior' },
  { key: 'backyard', label: 'Backyard', emoji: '🌳', space: 'exterior' },
  { key: 'patio-deck', label: 'Patio & Deck', emoji: '☀️', space: 'exterior' },
  { key: 'pool', label: 'Pool', emoji: '🏊', space: 'exterior' },
  { key: 'garden', label: 'Garden', emoji: '🌷', space: 'exterior' },
  {
    key: 'outdoor-kitchen',
    label: 'Outdoor Kitchen',
    emoji: '🍢',
    space: 'exterior',
  },
]

const SUBTYPE_BY_KEY = new Map(STYLE_SUBTYPES.map((s) => [s.key, s]))

export function subtypeLabel(key: string): string {
  return SUBTYPE_BY_KEY.get(key)?.label ?? key
}
