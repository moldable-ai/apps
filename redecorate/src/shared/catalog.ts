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
      'Clean lines, neutral palette, uncluttered open space with sleek finishes',
    prompt:
      'Restyle this room in a Modern aesthetic while keeping the existing walls, windows, and door placement intact: smooth matte-white and warm-gray surfaces, a low-profile leather or linen sofa with crisp geometric lines, polished concrete or wide oak flooring, a glass-and-steel coffee table, and minimal decor. Light the space with bright even daylight and a single sculptural pendant, palette of white, charcoal, and muted taupe.',
    applies: 'interior',
    accent: '#8A8D91',
    tags: ['modern', 'clean', 'neutral', 'sleek'],
    category: 'interior-styles',
  },
  {
    id: 'interior-mid-century-modern',
    name: 'Mid-Century Modern',
    blurb: 'Warm woods, tapered legs, and retro 1950s-60s silhouettes',
    prompt:
      "Transform the furnishings into Mid-Century Modern style without altering the room's architecture, windows, or doorways: walnut furniture with tapered peg legs, a low tufted sofa in mustard or burnt-orange, an Eames-style lounge chair, organic-shaped coffee table, and a starburst clock. Add warm woods, olive and teal accents, brass globe lighting, and soft afternoon sunlight.",
    applies: 'interior',
    accent: '#C97B3C',
    tags: ['midcentury', 'retro', 'walnut', '1960s'],
    category: 'interior-styles',
  },
  {
    id: 'interior-scandinavian',
    name: 'Scandinavian',
    blurb: 'Bright, airy Nordic simplicity with pale wood and cozy textiles',
    prompt:
      'Redesign in Scandinavian style, preserving the existing room shape, windows, and doors: white and soft-gray walls, pale ash or birch floors, light-wood furniture with slim legs, a simple linen sofa, chunky knit throws, sheepskin accents, and a few green potted plants. Flood the space with bright diffuse natural light, palette of white, pale wood, and muted dusty blue.',
    applies: 'interior',
    accent: '#D9E2E8',
    tags: ['scandinavian', 'nordic', 'airy', 'minimal'],
    category: 'interior-styles',
  },
  {
    id: 'interior-japandi',
    name: 'Japandi',
    blurb: 'Japanese-Nordic fusion: low furniture, warm neutrals, quiet calm',
    prompt:
      'Restyle into Japandi, keeping all walls, window and door positions unchanged: a blend of Japanese and Scandinavian design with low-slung wood furniture, handmade ceramics, paper lantern lighting, tatami-toned textiles, and a single ikebana arrangement. Use warm beige, muted clay, and charcoal tones, natural oak and bamboo, and soft veiled daylight for a serene minimal mood.',
    applies: 'interior',
    accent: '#B9A78E',
    tags: ['japandi', 'zen', 'warm', 'minimal'],
    category: 'interior-styles',
  },
  {
    id: 'interior-minimalist',
    name: 'Minimalist',
    blurb: 'Radical restraint: empty surfaces, monochrome, only the essential',
    prompt:
      "Apply a strict Minimalist treatment while retaining the room's existing geometry, windows, and doors: clear every surface, use a monochrome white-and-greige palette, one low platform sofa, a single slab coffee table, hidden storage, and bare walls with perhaps one framed line drawing. Even shadowless lighting, no clutter, sense of calm emptiness and negative space.",
    applies: 'interior',
    accent: '#E4E2DD',
    tags: ['minimalist', 'monochrome', 'spare', 'calm'],
    category: 'interior-styles',
  },
  {
    id: 'interior-industrial',
    name: 'Industrial',
    blurb: 'Exposed brick, raw metal, and reclaimed wood loft toughness',
    prompt:
      'Convert this space to Industrial style, leaving structural walls, windows, and doorways as they are: expose brick and concrete surfaces, add black steel-framed furniture, reclaimed-wood tabletops, leather club chairs, Edison-bulb cage pendants, and visible ductwork-style accents. Palette of rust, charcoal, weathered brown, and gunmetal, with moody directional light from the windows.',
    applies: 'interior',
    accent: '#6E5B4E',
    tags: ['industrial', 'loft', 'brick', 'metal'],
    category: 'interior-styles',
  },
  {
    id: 'interior-bohemian',
    name: 'Bohemian',
    blurb: 'Layered textiles, rattan, plants, and free-spirited global pattern',
    prompt:
      "Restyle in Bohemian style without changing the room's bones, windows, or doors: layered Persian and kilim rugs, a low textile-draped sofa with abundant patterned cushions, macrame wall hangings, rattan and cane furniture, hanging and potted plants everywhere, and warm string lighting. Rich terracotta, mustard, jewel teal, and warm earth tones with a cozy lived-in glow.",
    applies: 'interior',
    accent: '#B5603A',
    tags: ['bohemian', 'boho', 'eclectic', 'plants'],
    category: 'interior-styles',
  },
  {
    id: 'interior-coastal',
    name: 'Coastal',
    blurb: 'Breezy beach house: whitewashed wood, blues, and natural light',
    prompt:
      'Give this room a Coastal makeover while keeping all walls, windows, and doors in place: whitewashed and weathered-wood surfaces, slipcovered white linen sofas, navy-and-white stripes, woven jute rugs, rope and driftwood accents, seagrass baskets, and breezy sheer curtains. Bright airy light, palette of crisp white, sandy beige, and ocean blues for a relaxed seaside feel.',
    applies: 'interior',
    accent: '#5B8FB0',
    tags: ['coastal', 'beach', 'nautical', 'breezy'],
    category: 'interior-styles',
  },
  {
    id: 'interior-farmhouse',
    name: 'Farmhouse',
    blurb: 'Cozy country comfort with shiplap, aged wood, and vintage charm',
    prompt:
      'Restyle into classic Farmhouse, preserving the existing architecture, windows, and doorways: white shiplap walls, distressed and reclaimed wood furniture, a deep slipcovered sofa, galvanized metal accents, enamelware, mason-jar decor, and gingham or floral textiles. Warm inviting light, palette of cream, soft sage, and weathered brown for rustic country comfort.',
    applies: 'interior',
    accent: '#C9B79C',
    tags: ['farmhouse', 'country', 'rustic', 'vintage'],
    category: 'interior-styles',
  },
  {
    id: 'interior-modern-farmhouse',
    name: 'Modern Farmhouse',
    blurb: 'Crisp black-and-white farmhouse with clean contemporary edges',
    prompt:
      'Transform into Modern Farmhouse while leaving room geometry, windows, and doors unchanged: bright white shiplap, black matte hardware and window frames, a comfortable linen sectional, light oak floors, woven baskets, simple greenery, and sliding barn-door accents. Crisp high-contrast palette of white, black, and natural wood with bright clean daylight.',
    applies: 'interior',
    accent: '#3A3A38',
    tags: ['modern-farmhouse', 'white', 'black', 'clean'],
    category: 'interior-styles',
  },
  {
    id: 'interior-traditional',
    name: 'Traditional',
    blurb: 'Classic elegance with rich woods, symmetry, and refined detail',
    prompt:
      'Redesign in Traditional style, keeping the existing walls, windows, and door placement: rich mahogany and cherry furniture, a rolled-arm sofa in damask or velvet, symmetrical arrangements, crown molding accents, oriental rugs, table lamps with pleated shades, and classic framed art. Warm palette of burgundy, deep green, and gold with soft ambient lighting for timeless refinement.',
    applies: 'interior',
    accent: '#7A2E2E',
    tags: ['traditional', 'classic', 'elegant', 'formal'],
    category: 'interior-styles',
  },
  {
    id: 'interior-transitional',
    name: 'Transitional',
    blurb: 'Balanced blend of traditional comfort and contemporary calm',
    prompt:
      "Apply a Transitional restyle while preserving the room's structure, windows, and doors: a balanced mix of classic and contemporary with neutral upholstered furniture, clean-lined wood pieces, tone-on-tone textures, subtle pattern, and curated minimal accessories. Soft greige, taupe, and ivory palette with warm layered lighting for an understated, polished comfort.",
    applies: 'interior',
    accent: '#A89B8C',
    tags: ['transitional', 'neutral', 'balanced', 'refined'],
    category: 'interior-styles',
  },
  {
    id: 'interior-contemporary',
    name: 'Contemporary',
    blurb:
      'Of-the-moment sophistication with curves, texture, and soft neutrals',
    prompt:
      'Restyle in current Contemporary style, leaving architecture, windows, and doors intact: curved sculptural sofas in boucle or soft wool, organic-shaped furniture, layered neutral textures, a statement light fixture, and large abstract art. Sophisticated palette of warm white, putty, camel, and charcoal with diffuse modern lighting and an airy, gallery-like mood.',
    applies: 'interior',
    accent: '#9C8E7D',
    tags: ['contemporary', 'curved', 'boucle', 'neutral'],
    category: 'interior-styles',
  },
  {
    id: 'interior-art-deco',
    name: 'Art Deco',
    blurb: 'Glamorous 1920s geometry, brass, lacquer, and bold symmetry',
    prompt:
      "Transform into Art Deco luxury while keeping the room's walls, windows, and doorways unchanged: bold geometric patterns, fluted and lacquered furniture, velvet upholstery in emerald and sapphire, polished brass and chrome accents, mirrored surfaces, and sunburst motifs. Dramatic palette of black, gold, and jewel tones with glamorous layered lighting and high-shine finishes.",
    applies: 'interior',
    accent: '#C6A24A',
    tags: ['artdeco', 'glam', 'geometric', 'brass'],
    category: 'interior-styles',
  },
  {
    id: 'interior-hollywood-regency',
    name: 'Hollywood Regency',
    blurb: 'Old-Hollywood opulence: high-gloss, mirrors, and bold color',
    prompt:
      'Redesign in Hollywood Regency glamour, preserving existing geometry, windows, and doors: high-gloss lacquered surfaces, tufted velvet seating, mirrored and acrylic furniture, gold accents, animal-print or bold lacquer pops, oversized mirrors, and a crystal chandelier. Dramatic palette of black, white, hot pink or emerald with brass, lit for theatrical, opulent sparkle.',
    applies: 'interior',
    accent: '#D14F8A',
    tags: ['regency', 'glam', 'lacquer', 'opulent'],
    category: 'interior-styles',
  },
  {
    id: 'interior-maximalist',
    name: 'Maximalist',
    blurb:
      'More is more: bold color, pattern clash, and gallery-wall abundance',
    prompt:
      "Restyle as bold Maximalism while keeping the room's structure, windows, and doors intact: saturated jewel-toned walls, clashing-yet-curated patterns, a velvet statement sofa, floor-to-ceiling gallery walls, layered rugs, abundant books, plants, and collected objects. Rich palette of emerald, fuchsia, sapphire, and gold with warm lamplight for an exuberant, fearless layered look.",
    applies: 'interior',
    accent: '#7B2D8E',
    tags: ['maximalist', 'bold', 'pattern', 'layered'],
    category: 'interior-styles',
  },
  {
    id: 'interior-rustic',
    name: 'Rustic',
    blurb: 'Rugged natural warmth with timber, stone, and earthy texture',
    prompt:
      "Convert to Rustic style, leaving the room's architecture, windows, and doorways as they are: heavy timber beams and plank surfaces, rough-hewn wood furniture, natural stone accents, leather and wool upholstery, antler or iron fixtures, and woven throws. Earthy palette of warm brown, stone gray, and forest green with cozy firelit, golden lighting.",
    applies: 'interior',
    accent: '#6B4F33',
    tags: ['rustic', 'timber', 'stone', 'cabin'],
    category: 'interior-styles',
  },
  {
    id: 'interior-shabby-chic',
    name: 'Shabby Chic',
    blurb: 'Soft, distressed vintage romance in pastels and florals',
    prompt:
      'Restyle in Shabby Chic, preserving walls, windows, and door placement: distressed white-painted furniture, slipcovered overstuffed sofas in faded florals, vintage chandeliers, lace and ruffled textiles, weathered pastel accents, and antique mirrors. Soft palette of cream, blush pink, and pale aqua with gentle romantic light for a worn, feminine vintage charm.',
    applies: 'interior',
    accent: '#E4B9BE',
    tags: ['shabby-chic', 'vintage', 'floral', 'pastel'],
    category: 'interior-styles',
  },
  {
    id: 'interior-french-country',
    name: 'French Country',
    blurb: 'Rustic Provencal elegance with toile, soft blues, and aged wood',
    prompt:
      'Redesign in French Country style while keeping the room geometry, windows, and doors unchanged: warm limewashed walls, carved and gently distressed wood furniture, upholstery in toile and ticking stripe, wrought-iron accents, ceramic urns, dried lavender, and a curved settee. Soft palette of cream, soft blue, ochre, and sage with warm Provencal daylight.',
    applies: 'interior',
    accent: '#9FB0A0',
    tags: ['french-country', 'provencal', 'toile', 'rustic'],
    category: 'interior-styles',
  },
  {
    id: 'interior-mediterranean',
    name: 'Mediterranean',
    blurb: 'Sun-warmed villa style with terracotta, arches, and patterned tile',
    prompt:
      'Transform into Mediterranean style, preserving existing walls, window and door placement: warm stucco surfaces, terracotta tile floors, patterned ceramic accents, wrought-iron details, carved wood furniture, and lush potted greenery. Warm palette of terracotta, ochre, olive, and cobalt blue with golden sun-drenched light for a relaxed coastal-villa mood.',
    applies: 'interior',
    accent: '#C56A3A',
    tags: ['mediterranean', 'terracotta', 'tile', 'villa'],
    category: 'interior-styles',
  },
  {
    id: 'interior-tuscan',
    name: 'Tuscan',
    blurb: 'Old-world Italian warmth with plaster, iron, and rich earth tones',
    prompt:
      "Restyle in Tuscan style while leaving the room's architecture, windows, and doors intact: textured Venetian-plaster walls in warm golds, heavy carved wood and wrought-iron furniture, terracotta and travertine surfaces, tapestry-rich upholstery, grapevine and olive motifs, and rustic ironwork. Deep palette of ochre, rust, sienna, and olive with warm candlelit ambiance.",
    applies: 'interior',
    accent: '#A8702E',
    tags: ['tuscan', 'italian', 'plaster', 'oldworld'],
    category: 'interior-styles',
  },
  {
    id: 'interior-eclectic',
    name: 'Eclectic',
    blurb: 'Curated mix of eras, cultures, and textures in harmonious tension',
    prompt:
      "Apply an Eclectic restyle, keeping the room's structure, windows, and doors unchanged: an intentional mix of vintage and modern furniture, global textiles, contrasting patterns, mismatched-yet-cohesive seating, layered art, and collected objects from varied eras. Balanced bold palette anchored by a unifying neutral, with warm layered lighting for a personal, curated worldly feel.",
    applies: 'interior',
    accent: '#B07A4E',
    tags: ['eclectic', 'mixed', 'curated', 'global'],
    category: 'interior-styles',
  },
  {
    id: 'interior-wabi-sabi',
    name: 'Wabi-Sabi',
    blurb: 'Beauty in imperfection: raw plaster, organic forms, and quiet age',
    prompt:
      'Restyle in Wabi-Sabi, preserving the existing walls, windows, and doorways: imperfect hand-troweled plaster surfaces, raw aged wood, handmade asymmetric ceramics, undyed linen, woven natural fibers, and a single weathered branch. Muted earthy palette of clay, stone, oatmeal, and charcoal with soft, contemplative natural light celebrating imperfection and age.',
    applies: 'interior',
    accent: '#A39684',
    tags: ['wabi-sabi', 'organic', 'imperfect', 'earthy'],
    category: 'interior-styles',
  },
  {
    id: 'interior-cottagecore',
    name: 'Cottagecore',
    blurb:
      'Whimsical countryside nostalgia with florals, gingham, and dried herbs',
    prompt:
      'Redesign in Cottagecore style while keeping room geometry, windows, and doors intact: floral wallpaper or painted accents, vintage floral and gingham textiles, a cozy slipcovered sofa, open shelving with crockery, dried flowers and herbs, wicker baskets, and lace details. Soft palette of cream, sage, butter yellow, and faded rose with warm pastoral daylight for nostalgic countryside charm.',
    applies: 'interior',
    accent: '#C2CB8A',
    tags: ['cottagecore', 'floral', 'countryside', 'nostalgic'],
    category: 'interior-styles',
  },
  {
    id: 'interior-dark-academia',
    name: 'Dark Academia',
    blurb: 'Moody scholarly library mood with leather, brass, and deep wood',
    prompt:
      'Transform into Dark Academia, preserving walls, windows, and door placement: floor-to-ceiling dark-wood bookshelves crammed with leather-bound books, deep oxblood leather chesterfield seating, brass desk and library lamps, vintage globes, oil-painting art, and rich drapery. Moody palette of deep brown, forest green, oxblood, and brass with warm dim scholarly lighting.',
    applies: 'interior',
    accent: '#4A3525',
    tags: ['dark-academia', 'library', 'moody', 'scholarly'],
    category: 'interior-styles',
  },
  {
    id: 'interior-memphis',
    name: 'Memphis',
    blurb: 'Playful 1980s postmodern chaos of bold shapes and clashing color',
    prompt:
      "Restyle in Memphis Design style while keeping the room's architecture, windows, and doors unchanged: bold geometric furniture in primary and candy colors, squiggle and confetti patterns, terrazzo surfaces, asymmetric shapes, black-and-white grids, and playful sculptural objects. High-energy palette of hot pink, electric blue, yellow, and black with bright flat lighting for a fun 1980s postmodern look.",
    applies: 'interior',
    accent: '#F25C9A',
    tags: ['memphis', 'postmodern', '1980s', 'playful'],
    category: 'interior-styles',
  },
  {
    id: 'interior-biophilic',
    name: 'Biophilic',
    blurb:
      'Nature-immersed living with lush plants, natural materials, and light',
    prompt:
      'Redesign in Biophilic style, leaving the room geometry, windows, and doors intact: abundant lush greenery and trailing plants, a living moss or plant wall, natural wood and stone surfaces, organic-shaped furniture, woven natural-fiber textiles, and water-inspired accents. Fresh palette of leafy green, warm wood, and soft earth tones with bright, plant-filtered natural light for a calming nature-connected space.',
    applies: 'interior',
    accent: '#5E8C4A',
    tags: ['biophilic', 'plants', 'natural', 'green'],
    category: 'interior-styles',
  },
  {
    id: 'interior-hygge',
    name: 'Hygge',
    blurb: 'Danish coziness: soft layers, candlelight, and warm comfort',
    prompt:
      'Restyle in Hygge style while preserving the existing walls, windows, and doorways: a deep soft sofa piled with chunky knit blankets and cushions, layered wool and sheepskin throws, warm wood accents, abundant candles and string lights, books, and a cozy reading nook. Warm muted palette of cream, oatmeal, soft gray, and warm wood with golden flickering candlelight for ultimate cozy comfort.',
    applies: 'interior',
    accent: '#D8C3A5',
    tags: ['hygge', 'cozy', 'candlelight', 'warm'],
    category: 'interior-styles',
  },
  {
    id: 'exterior-modern',
    name: 'Modern',
    blurb: 'Flat roofs, glass walls, clean white-and-black geometric facade',
    prompt:
      'Restyle the facade into a sleek modern home: smooth white stucco and large black-framed floor-to-ceiling glass, a flat or low parapet roofline, and cantilevered planes. Keep the exact footprint, window and door openings, and roof pitch; only resurface walls, trim, and entry in a crisp white, charcoal, and warm-wood palette with minimalist landscaping, gravel beds, and integrated linear lighting at dusk.',
    applies: 'exterior',
    accent: '#2E2E2E',
    tags: ['modern', 'minimal', 'glass'],
    category: 'exterior-styles',
  },
  {
    id: 'exterior-contemporary',
    name: 'Contemporary',
    blurb: 'Mixed materials, asymmetry, large windows, current trends',
    prompt:
      'Transform the exterior into a contemporary home blending materials: smooth painted panels, board-formed concrete, and stained wood accents around oversized aluminum windows. Preserve the existing geometry, openings, and roofline; only restyle surfaces and entry with a soft neutral palette of warm gray, taupe, and natural cedar, adding sculptural landscaping, an architectural pivot front door, and warm exterior accent lighting.',
    applies: 'exterior',
    accent: '#7D7264',
    tags: ['contemporary', 'mixed-materials'],
    category: 'exterior-styles',
  },
  {
    id: 'exterior-midcentury',
    name: 'Mid-Century Modern',
    blurb: 'Low-slung lines, wood-and-stone, butterfly vibes, retro warmth',
    prompt:
      'Reimagine the facade as 1950s-60s mid-century modern: warm tongue-and-groove wood siding, a stacked stone accent wall, exposed beams, and clerestory-style glazing with thin aluminum frames. Keep the footprint, window placement, and roof pitch intact; restyle in walnut, burnt orange, avocado, and creamy white with desert-modern landscaping, a breeze-block screen, and a statement front door in a saturated retro hue.',
    applies: 'exterior',
    accent: '#C75B39',
    tags: ['midcentury', 'retro', 'wood'],
    category: 'exterior-styles',
  },
  {
    id: 'exterior-craftsman',
    name: 'Craftsman',
    blurb: 'Tapered columns, deep eaves, earthy hand-built character',
    prompt:
      'Restyle the home as an Arts-and-Crafts Craftsman: earthy shingle-and-clapboard siding, tapered columns on stone piers, deep overhanging eaves with exposed rafter tails and knee braces, and a low-pitched gable roof. Preserve the existing footprint and openings; recolor in muted olive, sage, and warm brown with a wide covered porch, multi-light wood windows, and a substantial craftsman front door with sidelights.',
    applies: 'exterior',
    accent: '#6B7B4F',
    tags: ['craftsman', 'arts-and-crafts', 'porch'],
    category: 'exterior-styles',
  },
  {
    id: 'exterior-colonial',
    name: 'Colonial',
    blurb: 'Symmetrical two-story, shutters, classic centered entry',
    prompt:
      'Transform the facade into a classic American Colonial: symmetrical two-story composition, evenly spaced double-hung multi-pane windows with paired shutters, white clapboard or red brick, and a centered paneled door beneath a pediment. Keep the existing footprint, window grid, and roofline; restyle in crisp white with black shutters or warm red brick, neat boxwood hedges, a brick walkway, and a brass-accented entry.',
    applies: 'exterior',
    accent: '#8B3A3A',
    tags: ['colonial', 'symmetrical', 'traditional'],
    category: 'exterior-styles',
  },
  {
    id: 'exterior-victorian',
    name: 'Victorian',
    blurb: 'Ornate trim, turrets, painted-lady colors, gingerbread detail',
    prompt:
      'Reimagine the home as an ornate Victorian: intricate gingerbread trim, decorative bargeboards, fish-scale shingles, a wraparound porch with turned spindles, and tall narrow windows. Preserve the footprint, openings, and roof pitch; apply a layered painted-lady palette of plum, sage, gold, and cream with contrasting trim, ornamental ironwork, and a romantic Victorian front door framed by detailed millwork.',
    applies: 'exterior',
    accent: '#7E4A6B',
    tags: ['victorian', 'ornate', 'painted-lady'],
    category: 'exterior-styles',
  },
  {
    id: 'exterior-tudor',
    name: 'Tudor',
    blurb: 'Half-timbering, steep gables, brick-and-stucco storybook look',
    prompt:
      'Restyle the facade as an English Tudor: decorative dark half-timbering over cream stucco, mixed brick and stone at the base, steeply pitched cross-gables, and tall leaded diamond-pane casement windows. Keep the existing footprint, openings, and roofline; use a palette of espresso timber, warm stucco, and earthy brick with a rounded arched front door, prominent chimney, and storybook cottage landscaping.',
    applies: 'exterior',
    accent: '#5A4632',
    tags: ['tudor', 'half-timber', 'storybook'],
    category: 'exterior-styles',
  },
  {
    id: 'exterior-spanish',
    name: 'Spanish / Mediterranean',
    blurb: 'Terracotta tile, white stucco, arches, warm villa charm',
    prompt:
      'Transform the home into a Spanish Mediterranean villa: smooth white or sand stucco walls, a low terracotta clay-tile roof, arched windows and doorways, wrought-iron details, and decorative tile accents. Preserve the footprint, window placement, and roofline; restyle in warm cream, terracotta, and ochre with a carved wood front door, climbing bougainvillea, olive trees, and a tiled courtyard feel.',
    applies: 'exterior',
    accent: '#C56A3A',
    tags: ['spanish', 'mediterranean', 'stucco', 'tile'],
    category: 'exterior-styles',
  },
  {
    id: 'exterior-ranch',
    name: 'Ranch',
    blurb: 'Long single-story, low roof, easy mid-century suburban ease',
    prompt:
      'Restyle the facade as a classic single-story Ranch: long horizontal massing, low-pitched roof with wide eaves, a mix of brick and horizontal siding, and a simple attached carport or garage. Keep the existing footprint, openings, and roofline; use warm brick, tan siding, and white trim with picture windows, a relaxed front-yard lawn, foundation shrubs, and an inviting low-profile entry.',
    applies: 'exterior',
    accent: '#A8845C',
    tags: ['ranch', 'single-story', 'suburban'],
    category: 'exterior-styles',
  },
  {
    id: 'exterior-capecod',
    name: 'Cape Cod',
    blurb: 'Steep roof, dormers, cedar shingles, tidy New England charm',
    prompt:
      'Reimagine the home as a New England Cape Cod: weathered cedar shingle or clapboard siding, a steep side-gabled roof with symmetrical dormers, a central paneled door, and shutters flanking multi-pane windows. Preserve the footprint, openings, and roofline; restyle in soft gray-weathered shingles or white with navy shutters, a picket fence, hydrangeas, and a classic lantern by the door.',
    applies: 'exterior',
    accent: '#3E5C76',
    tags: ['capecod', 'shingle', 'newengland'],
    category: 'exterior-styles',
  },
  {
    id: 'exterior-farmhouse',
    name: 'Farmhouse',
    blurb: 'White siding, metal roof, wraparound porch, rural warmth',
    prompt:
      'Transform the facade into a traditional American farmhouse: white horizontal lap siding, a galvanized metal gable roof, a generous wraparound porch with simple posts, and tall double-hung windows. Keep the existing footprint, openings, and roof pitch; use warm white siding, weathered wood porch boards, and black-trimmed windows with a friendly front door, rocking chairs, and rustic country landscaping.',
    applies: 'exterior',
    accent: '#D6CEC1',
    tags: ['farmhouse', 'rural', 'porch'],
    category: 'exterior-styles',
  },
  {
    id: 'exterior-modern-farmhouse',
    name: 'Modern Farmhouse',
    blurb: 'Crisp white board-and-batten, black windows, metal accents',
    prompt:
      'Restyle the home as a modern farmhouse: crisp white board-and-batten siding, black-framed windows, a standing-seam metal accent roof over the porch, and warm-wood entry beams. Preserve the footprint, openings, and roofline; pair bright white walls with matte black trim and natural cedar accents, a clean covered porch, oversized barn-style lantern, and minimalist green landscaping.',
    applies: 'exterior',
    accent: '#1C1C1C',
    tags: ['modern-farmhouse', 'board-and-batten', 'black-white'],
    category: 'exterior-styles',
  },
  {
    id: 'exterior-bungalow',
    name: 'Bungalow',
    blurb: 'Cozy one-and-a-half story, low gable, welcoming front porch',
    prompt:
      'Reimagine the facade as a cozy Bungalow: low-pitched gabled roof with wide eaves, a prominent front porch under the main roofline with squared columns, shingle or clapboard siding, and grouped multi-light windows. Keep the existing footprint, openings, and roof pitch; restyle in warm earthy greens and browns with a welcoming porch, brick or stone porch base, and lush cottage-garden planting.',
    applies: 'exterior',
    accent: '#8A6B4A',
    tags: ['bungalow', 'porch', 'cozy'],
    category: 'exterior-styles',
  },
  {
    id: 'exterior-cottage',
    name: 'Cottage',
    blurb: 'Storybook scale, mixed textures, flower-filled fairy-tale charm',
    prompt:
      'Transform the home into a charming storybook cottage: textured stone and stucco or painted siding, a steep undulating roofline, an arched front door, window boxes, and small-paned windows. Preserve the footprint, openings, and roof pitch; use soft sage, cream, and stone tones with climbing roses, a curving garden path, lush flowering beds, and a warm, whimsical fairy-tale mood.',
    applies: 'exterior',
    accent: '#9CА87E',
    tags: ['cottage', 'storybook', 'garden'],
    category: 'exterior-styles',
  },
  {
    id: 'exterior-mountain-chalet',
    name: 'Mountain / Chalet',
    blurb: 'Heavy timber, stone, steep roof, cozy alpine lodge feel',
    prompt:
      'Restyle the facade as a rugged mountain chalet: heavy timber framing, stacked-stone base, log or board siding, deep overhanging eaves on a steep gable, and large windows facing the view. Keep the existing footprint, openings, and roofline; use rich brown timber, gray fieldstone, and warm window glow with snow-dusted evergreens, a stone chimney, and a cozy alpine lodge atmosphere.',
    applies: 'exterior',
    accent: '#5C4634',
    tags: ['mountain', 'chalet', 'timber', 'stone'],
    category: 'exterior-styles',
  },
  {
    id: 'exterior-coastal-beach',
    name: 'Coastal / Beach',
    blurb: 'Weathered shingles, breezy whites, pilings, seaside ease',
    prompt:
      'Reimagine the home as a breezy coastal beach house: weathered gray cedar shingles or crisp white siding, white trim, a wide porch or deck, and large windows for ocean light. Preserve the footprint, openings, and roofline; use a palette of soft white, driftwood gray, and pale blue with nautical accents, sea-grass landscaping, a sandy-toned path, and bright airy seaside lighting.',
    applies: 'exterior',
    accent: '#7FB0C4',
    tags: ['coastal', 'beach', 'shingle', 'nautical'],
    category: 'exterior-styles',
  },
  {
    id: 'exterior-desert-adobe',
    name: 'Desert / Adobe',
    blurb: 'Earthen stucco, flat roof, vigas, warm Southwest glow',
    prompt:
      'Transform the facade into Southwestern desert adobe: rounded earthen stucco walls, a flat parapet roof with projecting wood vigas, deep-set small windows, and warm clay tones. Keep the existing footprint, openings, and roofline; use sun-baked terracotta, sand, and warm beige with cactus and agave landscaping, gravel xeriscape, a rustic timber door, and golden desert sunset light.',
    applies: 'exterior',
    accent: '#B97A4E',
    tags: ['desert', 'adobe', 'southwest', 'xeriscape'],
    category: 'exterior-styles',
  },
  {
    id: 'exterior-scandinavian-cabin',
    name: 'Scandinavian Cabin',
    blurb: 'Blackened or red timber, clean gable, minimalist nordic calm',
    prompt:
      'Restyle the home as a Scandinavian cabin: vertical timber cladding in blackened wood or classic falu red, a clean simple gable, minimal trim, and large warm-lit windows. Preserve the footprint, openings, and roof pitch; use a restrained palette of black or deep red timber with natural wood accents, birch trees, low Nordic grasses, and a calm, understated minimalist mood.',
    applies: 'exterior',
    accent: '#3A3A38',
    tags: ['scandinavian', 'cabin', 'timber', 'minimal'],
    category: 'exterior-styles',
  },
  {
    id: 'exterior-japanese',
    name: 'Japanese',
    blurb: 'Charred wood, deep eaves, screens, serene zen restraint',
    prompt:
      'Reimagine the facade in Japanese style: charred shou-sugi-ban wood siding, deep low eaves, exposed wood structure, shoji-inspired screens, and clean horizontal lines. Keep the existing footprint, openings, and roofline; use black-charred timber, natural cedar, and warm paper-lantern glow with a raked gravel garden, maple and bamboo, stepping stones, and a tranquil zen atmosphere.',
    applies: 'exterior',
    accent: '#2B2622',
    tags: ['japanese', 'zen', 'charred-wood'],
    category: 'exterior-styles',
  },
  {
    id: 'exterior-brutalist',
    name: 'Brutalist',
    blurb: 'Raw board-formed concrete, bold monolithic geometry',
    prompt:
      'Transform the home into a brutalist statement: raw board-formed exposed concrete, monolithic blocky volumes, deep recessed windows, and stark cantilevers. Preserve the existing footprint, openings, and roofline; use a monochrome palette of gray concrete with the texture of wood-grain formwork, minimal hardscape, architectural shadow play, and dramatic directional lighting for a bold sculptural mood.',
    applies: 'exterior',
    accent: '#8C8C88',
    tags: ['brutalist', 'concrete', 'monolithic'],
    category: 'exterior-styles',
  },
  {
    id: 'exterior-georgian',
    name: 'Georgian',
    blurb: 'Stately brick, strict symmetry, crowned door, formal elegance',
    prompt:
      'Restyle the facade as a stately Georgian: formal strict symmetry, red brick with stone quoins and belt courses, evenly ranked multi-pane sash windows, and a crowned paneled entry with pilasters and a fanlight. Keep the existing footprint, window grid, and roofline; use classic red brick, white trim, and black accents with clipped hedges, a symmetrical brick walk, and refined formal landscaping.',
    applies: 'exterior',
    accent: '#7A3B2E',
    tags: ['georgian', 'brick', 'formal', 'symmetrical'],
    category: 'exterior-styles',
  },
  {
    id: 'exterior-prairie',
    name: 'Prairie',
    blurb: 'Horizontal lines, low hipped roof, art-glass, organic Wright feel',
    prompt:
      'Reimagine the home in Prairie School style: strong horizontal emphasis, a low-pitched hipped roof with very wide eaves, banded ribbon windows with art-glass detailing, and earthy brick or stucco with horizontal banding. Preserve the footprint, openings, and roofline; use warm tan brick, terracotta, and bronze trim with planters of foliage, broad piers, and an organic Frank Lloyd Wright-inspired mood.',
    applies: 'exterior',
    accent: '#9B7B4A',
    tags: ['prairie', 'wright', 'horizontal'],
    category: 'exterior-styles',
  },
  {
    id: 'exterior-barndominium',
    name: 'Barndominium',
    blurb: 'Metal-clad barn form, big gable, industrial-rural hybrid',
    prompt:
      'Transform the facade into a barndominium: corrugated or standing-seam metal siding and roof, a tall simple gable barn form, large black-framed windows and a roll-up or oversized entry, with wood accent beams. Keep the existing footprint, openings, and roof pitch; use weathered steel gray, matte black, and natural wood with a gravel drive, simple rural landscaping, and a modern industrial-farmhouse mood.',
    applies: 'exterior',
    accent: '#4A4E52',
    tags: ['barndominium', 'metal', 'industrial-rural'],
    category: 'exterior-styles',
  },
  {
    id: 'exterior-passive-netzero',
    name: 'Passive / Net-Zero Modern',
    blurb: 'Airtight modern shell, solar roof, triple-glazed eco design',
    prompt:
      'Restyle the home as a passive net-zero modern house: a compact airtight shell with smooth fiber-cement or wood-composite cladding, deep triple-glazed windows with shading fins, and a roof of integrated solar panels. Preserve the footprint, openings, and roofline; use clean warm-gray and natural wood tones with native drought-tolerant landscaping, rain gardens, and a crisp, efficient, eco-modern mood.',
    applies: 'exterior',
    accent: '#5E8C6A',
    tags: ['passive', 'net-zero', 'solar', 'eco'],
    category: 'exterior-styles',
  },
  {
    id: 'backyard-desert-xeriscape',
    name: 'Desert Xeriscape',
    blurb:
      'Modern low-water desert garden with sculptural agave and warm gravel',
    prompt:
      'Transform this outdoor space into a modern desert xeriscape while keeping all existing structures, fences, and hardscape footprint intact: replace lawn with decomposed granite and tan gravel beds, plant sculptural agave, golden barrel cactus, ocotillo, and silvery desert spoon, add weathered Corten steel planters and a few large terracotta-toned boulders, palette of sandstone, sage, and rust under bright high desert sun with crisp shadows.',
    applies: 'both',
    accent: '#C8975A',
    tags: ['desert', 'drought-tolerant', 'modern', 'succulent'],
    category: 'backyard-landscape',
  },
  {
    id: 'backyard-lush-tropical',
    name: 'Lush Tropical',
    blurb: 'Dense jungle greenery with palms, banana leaves and vivid blooms',
    prompt:
      'Restyle this space as a lush tropical paradise while preserving the existing room geometry, paths, and building edges: layer dense foliage of banana plants, bird-of-paradise, monstera, and feathery palms, add bright hibiscus and bromeliad blooms, line walkways with mossy stepping stones, finish with teak loungers and woven rattan accents, palette of deep emerald greens punctuated by coral and fuchsia, soft humid dappled light filtering through the canopy.',
    applies: 'both',
    accent: '#1F7A4D',
    tags: ['tropical', 'jungle', 'lush', 'palms'],
    category: 'backyard-landscape',
  },
  {
    id: 'backyard-english-cottage-garden',
    name: 'English Cottage Garden',
    blurb: 'Romantic overflowing borders of roses, foxglove and lavender',
    prompt:
      'Convert this yard into a romantic English cottage garden, keeping all walls, paths, and structures exactly in place: fill borders with billowing roses, foxglove, delphinium, hollyhock, and lavender spilling over a winding gravel path, add a weathered timber arbor draped in climbing roses, soft pastel palette of blush pink, lilac, butter yellow, and soft white, gentle overcast golden-hour light with a dreamy abundant overgrown charm.',
    applies: 'both',
    accent: '#D98AA8',
    tags: ['cottage', 'romantic', 'flowers', 'english'],
    category: 'backyard-landscape',
  },
  {
    id: 'backyard-japanese-zen',
    name: 'Japanese Zen Garden',
    blurb: 'Serene raked gravel, moss, maples and a quiet stone lantern',
    prompt:
      'Reimagine this space as a tranquil Japanese zen garden while retaining the existing architecture and boundaries: lay raked white gravel with carefully placed mossy boulders, add a sculptural Japanese maple, clipped mounded shrubs, a stone lantern, and a simple bamboo water spout, edge with dark basalt stepping stones and a low timber fence, muted palette of moss green, charcoal, and silver-grey under soft diffused light, calm and meditative.',
    applies: 'both',
    accent: '#6E7F5C',
    tags: ['zen', 'japanese', 'minimal', 'serene'],
    category: 'backyard-landscape',
  },
  {
    id: 'backyard-mediterranean-courtyard',
    name: 'Mediterranean Courtyard',
    blurb: 'Terracotta tile, olive trees and patterned ceramic warmth',
    prompt:
      'Transform this area into a sun-warmed Mediterranean courtyard, preserving the existing structure, doorways, and footprint: lay terracotta tile and pebble mosaic underfoot, add potted olive trees, citrus, and rosemary in glazed ceramic urns, a small tiled fountain, wrought-iron furniture with striped cushions, climbing bougainvillea on stucco walls, palette of warm ochre, terracotta, cobalt blue, and sage, golden afternoon light and a relaxed coastal mood.',
    applies: 'both',
    accent: '#C56B3E',
    tags: ['mediterranean', 'courtyard', 'terracotta', 'olive'],
    category: 'backyard-landscape',
  },
  {
    id: 'backyard-resort-pool-oasis',
    name: 'Resort Pool Oasis',
    blurb: 'Five-star pool with cabanas, daybeds and turquoise water',
    prompt:
      'Turn this space into a luxury resort pool oasis while keeping the existing pool shape, decking, and building lines intact: add a sleek turquoise pool with sun-shelf, white-draped cabanas and plush daybeds, towering fan palms, manicured tropical planting, polished travertine decking, and oversized glazed planters, palette of crisp white, turquoise, and warm stone, bright resort sunshine with sparkling water reflections and a vacation-luxury atmosphere.',
    applies: 'both',
    accent: '#2FB6C4',
    tags: ['pool', 'resort', 'luxury', 'cabana'],
    category: 'backyard-landscape',
  },
  {
    id: 'backyard-firepit-lounge',
    name: 'Fire-Pit Lounge',
    blurb: 'Cozy modern fire pit ringed with low sectional seating',
    prompt:
      'Restyle this space into a cozy modern fire-pit lounge, preserving the existing patio footprint and surrounding structures: center a sleek gas fire pit on a circular stone pad, surround it with a low all-weather sectional in charcoal cushions, add chunky knit throws, weatherproof poufs, and warm string-lit ambience, finish with concrete pavers and ornamental grasses, palette of warm grey, ember orange, and natural linen, glowing dusk light with a relaxed gather-round mood.',
    applies: 'both',
    accent: '#D97B36',
    tags: ['fire-pit', 'lounge', 'cozy', 'evening'],
    category: 'backyard-landscape',
  },
  {
    id: 'backyard-outdoor-kitchen',
    name: 'Outdoor Kitchen',
    blurb: 'Built-in grill, stone counters and bar-stool dining',
    prompt:
      'Convert this space into a fully equipped outdoor kitchen while keeping existing walls, footprint, and structures intact: add a built-in stainless grill and counter in honed stone, a tiled backsplash, a bar-height island with woven counter stools, open shelving with serveware, and a pergola overhead, finish with slate paving and potted herbs, palette of slate grey, stainless steel, and warm wood, bright clean daylight and an entertaining-ready feel.',
    applies: 'exterior',
    accent: '#8A8F94',
    tags: ['kitchen', 'grill', 'entertaining', 'stone'],
    category: 'backyard-landscape',
  },
  {
    id: 'backyard-prairie-meadow',
    name: 'Prairie Native Meadow',
    blurb: 'Swaying native grasses and wildflowers in naturalistic drifts',
    prompt:
      'Reimagine this yard as a naturalistic prairie meadow, retaining all existing paths, structures, and boundaries: replace lawn with flowing drifts of native grasses, coneflower, black-eyed susan, yarrow, and tall feather grass swaying in the breeze, carve a simple mown path through the planting, add a rustic timber bench, palette of golden straw, warm green, purple, and amber, soft late-afternoon light with a wild ecological abundance.',
    applies: 'both',
    accent: '#B89446',
    tags: ['prairie', 'native', 'meadow', 'grasses'],
    category: 'backyard-landscape',
  },
  {
    id: 'backyard-formal-symmetrical',
    name: 'Formal Symmetrical Garden',
    blurb: 'Crisp boxwood parterres, gravel paths and clipped topiary',
    prompt:
      'Transform this space into an elegant formal symmetrical garden while preserving the existing architecture and footprint: lay out clipped boxwood parterres around a central focal point, add cone and ball topiary in matched planters, tidy pea-gravel paths, a classical urn or sundial centerpiece, and trimmed hedging defining the borders, palette of deep manicured green, pale gravel, and stone grey, even bright light with crisp geometry and aristocratic order.',
    applies: 'both',
    accent: '#4F6B3C',
    tags: ['formal', 'symmetrical', 'topiary', 'boxwood'],
    category: 'backyard-landscape',
  },
  {
    id: 'backyard-kids-play-yard',
    name: 'Kids Play Yard',
    blurb: 'Safe, colorful play zone with soft turf and natural climbers',
    prompt:
      'Restyle this yard into a playful kids play zone, keeping the existing layout, fences, and structures intact: add soft artificial turf and rubber-mulch play areas, a natural timber climbing frame and swing, a small chalkboard wall, raised sandbox, and a tiny picnic table, dot with hardy shrubs and a shade sail, cheerful palette of grass green, sky blue, sunny yellow, and natural wood, bright happy daylight and a safe family-friendly mood.',
    applies: 'exterior',
    accent: '#F2B134',
    tags: ['kids', 'play', 'family', 'safe'],
    category: 'backyard-landscape',
  },
  {
    id: 'backyard-edible-garden',
    name: 'Edible Garden',
    blurb: 'Productive raised beds brimming with veg, herbs and fruit',
    prompt:
      'Convert this space into a thriving edible garden while preserving the existing footprint and structures: install neat cedar raised beds brimming with tomatoes, leafy greens, climbing beans on trellises, and bushy herbs, add a small fruit tree, a rustic potting bench, gravel walkways, and a rain barrel, palette of vibrant vegetable greens, ripe red and orange, and natural cedar, bright productive daylight with a wholesome homestead atmosphere.',
    applies: 'exterior',
    accent: '#5E8C3A',
    tags: ['edible', 'vegetable', 'raised-beds', 'homestead'],
    category: 'backyard-landscape',
  },
  {
    id: 'backyard-gravel-drought',
    name: 'Gravel Drought-Tolerant',
    blurb: 'Low-maintenance gravel garden with hardy Mediterranean plants',
    prompt:
      'Reimagine this space as a low-maintenance gravel drought-tolerant garden, keeping existing structures and boundaries in place: spread fine pale gravel as the main ground plane studded with self-seeding lavender, santolina, euphorbia, sea holly, and ornamental alliums, scatter a few feature boulders and a simple gravel path, palette of silver-grey, dusty green, lilac, and warm stone, bright Mediterranean light with a relaxed sustainable feel.',
    applies: 'both',
    accent: '#A9A48C',
    tags: ['gravel', 'drought-tolerant', 'low-maintenance', 'mediterranean'],
    category: 'backyard-landscape',
  },
  {
    id: 'backyard-deck-pergola',
    name: 'Deck & Pergola',
    blurb: 'Warm timber deck shaded by a slatted pergola lounge',
    prompt:
      'Transform this outdoor area into a warm timber deck with pergola while preserving the existing structure, footprint, and building edges: lay a smooth hardwood deck, build a slatted timber pergola overhead casting striped shade, add a comfortable lounge set with neutral cushions, an outdoor rug, planters of bamboo and grasses, and hanging lights, palette of honey-toned wood, soft taupe, and green, warm dappled afternoon light with an inviting relaxed mood.',
    applies: 'exterior',
    accent: '#B07D3E',
    tags: ['deck', 'pergola', 'timber', 'lounge'],
    category: 'backyard-landscape',
  },
  {
    id: 'backyard-hot-tub-retreat',
    name: 'Hot-Tub Retreat',
    blurb: 'Spa-like soaking nook framed by privacy screens and lanterns',
    prompt:
      'Restyle this space into a private hot-tub retreat, keeping the existing footprint and surrounding structures intact: nestle a sleek hot tub into a timber deck surround, add vertical slatted privacy screens, soft towels, lanterns, and a small side table, frame with tall ornamental bamboo and ferns, warm low lighting and a tealight glow, palette of deep wood brown, charcoal, and warm amber, twilight steam-rising ambience with a serene spa mood.',
    applies: 'exterior',
    accent: '#7A5A3C',
    tags: ['hot-tub', 'spa', 'retreat', 'privacy'],
    category: 'backyard-landscape',
  },
  {
    id: 'backyard-minimalist-hardscape',
    name: 'Minimalist Hardscape',
    blurb: 'Clean concrete planes, monochrome planting and stark geometry',
    prompt:
      'Convert this space into a minimalist hardscape garden while preserving the existing architecture and footprint: lay large-format poured concrete pavers with crisp gravel joints, add a single floating bench, monochrome plantings of clipped grasses and architectural agave in board-formed concrete planters, palette of pale grey, white, and restrained green, clean even daylight with stark geometry, generous negative space, and a calm modern minimalism.',
    applies: 'both',
    accent: '#9DA0A2',
    tags: ['minimalist', 'concrete', 'modern', 'geometric'],
    category: 'backyard-landscape',
  },
  {
    id: 'backyard-woodland-shade',
    name: 'Woodland Shade Garden',
    blurb: 'Dappled understory of ferns, hostas and mossy stepping stones',
    prompt:
      'Reimagine this space as a cool woodland shade garden, keeping all existing paths, structures, and boundaries intact: layer ferns, hostas, hellebores, and astilbe beneath a leafy tree canopy, wind a mossy stepping-stone path through shade-loving groundcover, add weathered log edging and a rustic bench, palette of deep forest green, fern, and soft cream, gentle dappled filtered light with a quiet cool tranquil woodland mood.',
    applies: 'both',
    accent: '#3F5B3A',
    tags: ['woodland', 'shade', 'ferns', 'naturalistic'],
    category: 'backyard-landscape',
  },
  {
    id: 'backyard-coastal-dune',
    name: 'Coastal Dune',
    blurb: 'Breezy beach-house garden with grasses, driftwood and sand',
    prompt:
      'Transform this space into a breezy coastal dune garden while preserving the existing structure and footprint: spread soft sandy gravel planted with windswept marram and feather grasses, sea thrift, and silvery sea holly, add weathered driftwood, smooth pebbles, and a faded timber boardwalk, finish with a relaxed Adirondack chair, palette of bleached sand, pale blue, soft green, and silver-grey, bright airy sea light with a relaxed coastal mood.',
    applies: 'both',
    accent: '#A7C4CC',
    tags: ['coastal', 'dune', 'beach', 'grasses'],
    category: 'backyard-landscape',
  },
  {
    id: 'backyard-rooftop-terrace',
    name: 'Rooftop Terrace',
    blurb: 'Urban sky deck with planters, lounge seating and skyline views',
    prompt:
      'Restyle this space into a stylish urban rooftop terrace, keeping the existing footprint, railings, and structural edges intact: lay composite decking tiles, add modern modular lounge seating, sleek tall planters of grasses and slender trees, a compact bar counter, and festoon lighting overhead, palette of warm grey, charcoal, natural wood, and green, golden city-evening light with a sophisticated elevated urban-oasis mood.',
    applies: 'exterior',
    accent: '#7E8689',
    tags: ['rooftop', 'terrace', 'urban', 'modern'],
    category: 'backyard-landscape',
  },
  {
    id: 'backyard-sport-court',
    name: 'Sport Court',
    blurb: 'Clean multi-sport court with crisp lines and athletic edge',
    prompt:
      'Convert this space into a sleek backyard sport court while preserving the existing footprint, fences, and structures: lay a smooth color-coated court surface with crisp painted lines, add a basketball hoop, low perimeter fencing or netting, integrated LED court lighting, and a tidy bench with a shade structure, edge with simple low planting, palette of court blue and green, white lines, and charcoal, bright clean daylight with a crisp athletic feel.',
    applies: 'exterior',
    accent: '#2E6DB4',
    tags: ['sport', 'court', 'athletic', 'active'],
    category: 'backyard-landscape',
  },
  {
    id: 'backyard-dining-pergola',
    name: 'Dining Pergola',
    blurb: 'Al fresco dining under a vine-draped pergola with string lights',
    prompt:
      'Transform this space into an al fresco dining pergola while keeping the existing footprint and surrounding structures intact: center a generous timber dining table with cushioned chairs beneath a vine-draped pergola hung with warm string lights, lay stone or porcelain paving, add lush climbing grapevine and potted herbs, a sideboard for serving, palette of natural wood, soft green, terracotta, and warm white glow, golden-hour light with a convivial dinner-party mood.',
    applies: 'exterior',
    accent: '#C28A4D',
    tags: ['dining', 'pergola', 'entertaining', 'string-lights'],
    category: 'backyard-landscape',
  },
  {
    id: 'backyard-succulent-rock-garden',
    name: 'Succulent Rock Garden',
    blurb: 'Sculptural succulents nestled among warm stone and gravel',
    prompt:
      'Reimagine this space as a sculptural succulent rock garden, preserving the existing structures and footprint: build gently contoured rock terraces and gravel beds densely planted with echeveria rosettes, aeonium, sedum, and trailing string-of-pearls, accent with smooth river boulders and a few tall aloes, palette of dusty teal, rose, chartreuse, and warm stone, bright clear light with intricate textural detail and a low-water modern feel.',
    applies: 'both',
    accent: '#7FA98C',
    tags: ['succulent', 'rock-garden', 'drought-tolerant', 'textural'],
    category: 'backyard-landscape',
  },
  {
    id: 'backyard-water-feature-pond',
    name: 'Water-Feature Pond',
    blurb: 'Tranquil naturalistic pond with lilies, rocks and a soft trickle',
    prompt:
      'Transform this space into a tranquil naturalistic pond garden while keeping the existing layout and structures intact: add a stone-edged pond with floating water lilies and reeds, a gentle trickling waterfall over mossy rocks, marginal planting of iris and grasses, a flat stone crossing, and a quiet bench nearby, palette of deep water blue-green, mossy stone, and lush foliage green, soft dappled light with reflections and a calm soothing water-garden mood.',
    applies: 'both',
    accent: '#3E7D74',
    tags: ['pond', 'water-feature', 'naturalistic', 'serene'],
    category: 'backyard-landscape',
  },
  {
    id: 'backyard-twinkle-lit-evening',
    name: 'Twinkle-Lit Evening Patio',
    blurb: 'Magical dusk patio glowing with festoon and fairy lights',
    prompt:
      'Restyle this patio into a magical twinkle-lit evening retreat while preserving the existing footprint, walls, and structures: drape crisscrossing warm festoon and fairy lights overhead, add a cozy lounge with soft cushions and lanterns, glowing candle clusters, a low fire bowl, and lush shadowy planting framing the edges, palette of deep dusk blue, warm amber glow, and soft greenery, twilight-to-night ambience with countless sparkling lights and an enchanting intimate mood.',
    applies: 'exterior',
    accent: '#E0A93B',
    tags: ['evening', 'string-lights', 'ambient', 'romantic'],
    category: 'backyard-landscape',
  },
  {
    id: 'color-warm-neutrals',
    name: 'Warm Neutrals',
    blurb: 'Soft greige, oatmeal, and taupe with cozy diffused light',
    prompt:
      'Restyle this space in a palette of warm neutrals: greige and oatmeal walls, taupe and camel upholstery, pale ash wood, and linen textiles in cream and soft beige. Keep all room geometry, windows, and architecture intact; bathe the scene in soft warm diffused daylight for a cozy, inviting mood.',
    applies: 'both',
    accent: '#C9B79C',
    tags: ['warm', 'neutral', 'cozy', 'beige'],
    category: 'color-mood',
  },
  {
    id: 'color-cool-greys',
    name: 'Cool Greys',
    blurb: 'Crisp slate, charcoal, and silver with clean even light',
    prompt:
      'Recolor the space in cool greys: slate and dove-grey walls, charcoal furnishings, brushed nickel and chrome accents, and pale grey textiles with subtle blue undertones. Preserve the exact layout, windows, and architectural lines; light it with clean, even, slightly cool daylight for a calm, modern, composed feel.',
    applies: 'both',
    accent: '#8A929B',
    tags: ['cool', 'grey', 'modern', 'minimal'],
    category: 'color-mood',
  },
  {
    id: 'color-earthy-terracotta',
    name: 'Earthy Terracotta',
    blurb: 'Burnt clay, ochre, and rust with sun-baked warmth',
    prompt:
      "Restyle in earthy terracotta tones: burnt-clay and rust walls, ochre and warm-brown textiles, unglazed terracotta pots and tiles, and natural jute. Keep the room's structure, windows, and doors unchanged; wash the scene in warm golden afternoon light for a grounded, sun-baked Mediterranean mood.",
    applies: 'both',
    accent: '#C66B3D',
    tags: ['earthy', 'terracotta', 'warm', 'mediterranean'],
    category: 'color-mood',
  },
  {
    id: 'color-sage-cream',
    name: 'Sage & Cream',
    blurb: 'Muted sage green paired with soft creamy whites',
    prompt:
      'Recolor the space in sage and cream: muted sage-green walls or cabinetry, creamy off-white trim and upholstery, pale natural oak, and soft botanical textiles. Maintain all existing geometry, window and door placement; light with gentle natural daylight for a fresh, calm, organic atmosphere.',
    applies: 'both',
    accent: '#A3B18A',
    tags: ['sage', 'green', 'cream', 'calm'],
    category: 'color-mood',
  },
  {
    id: 'color-moody-dark',
    name: 'Moody Dark',
    blurb: 'Deep charcoal and inky walls with dramatic low light',
    prompt:
      'Restyle into a moody dark palette: deep charcoal, near-black and slate walls, dark espresso wood, rich graphite upholstery, and matte black fixtures with occasional brass glints. Preserve the room layout, windows, and architecture exactly; use dramatic low warm lighting with pooled lamplight for an intimate, sophisticated mood.',
    applies: 'interior',
    accent: '#2B2B2E',
    tags: ['dark', 'moody', 'dramatic', 'charcoal'],
    category: 'color-mood',
  },
  {
    id: 'color-bright-airy-white',
    name: 'Bright & Airy White',
    blurb: 'Crisp whites and pale woods flooded with sunlight',
    prompt:
      'Recolor the space in bright airy whites: crisp white walls and trim, pale bleached wood, white and ivory textiles, and sheer linen. Keep every architectural element, window, and door in place; flood the scene with abundant bright natural daylight for a fresh, open, weightless feel.',
    applies: 'both',
    accent: '#F4F1EC',
    tags: ['white', 'bright', 'airy', 'fresh'],
    category: 'color-mood',
  },
  {
    id: 'color-jewel-tones',
    name: 'Jewel Tones',
    blurb: 'Emerald, sapphire, and ruby in lush saturated richness',
    prompt:
      'Restyle in opulent jewel tones: emerald-green and sapphire-blue walls or velvet upholstery, ruby and amethyst accents, and gold or brass detailing. Maintain the existing room geometry, windows, and doors; light with warm, slightly dramatic lighting to make the saturated colors glow with luxurious depth.',
    applies: 'interior',
    accent: '#1F6B5C',
    tags: ['jewel', 'emerald', 'sapphire', 'luxe'],
    category: 'color-mood',
  },
  {
    id: 'color-bw-monochrome',
    name: 'Black & White',
    blurb: 'Graphic black-and-white monochrome with high clarity',
    prompt:
      'Recolor the space into a crisp black-and-white monochrome scheme: white walls, black furnishings and frames, graphic black-and-white patterns, and polished chrome accents with zero color. Preserve all geometry, windows, and architecture; use clean even lighting for a sharp, graphic, editorial mood.',
    applies: 'interior',
    accent: '#1A1A1A',
    tags: ['monochrome', 'black', 'white', 'graphic'],
    category: 'color-mood',
  },
  {
    id: 'color-pastel',
    name: 'Soft Pastel',
    blurb: 'Powder pink, mint, and butter yellow in gentle softness',
    prompt:
      "Restyle in soft pastels: powder-pink, pale mint, baby blue, and butter-yellow walls and furnishings, with whitewashed wood and creamy textiles. Keep the room's layout, windows, and doors unchanged; light with soft diffused morning light for a sweet, gentle, whimsical atmosphere.",
    applies: 'both',
    accent: '#F2C9D4',
    tags: ['pastel', 'soft', 'pink', 'playful'],
    category: 'color-mood',
  },
  {
    id: 'color-navy-brass',
    name: 'Navy & Brass',
    blurb: 'Deep navy blue grounded with warm brass accents',
    prompt:
      'Recolor the space in navy and brass: deep navy-blue walls and upholstery, warm brushed-brass fixtures and hardware, walnut wood, and cream textile accents. Preserve all architectural bones, windows, and doors; light with warm focused lighting that catches the brass for a refined, masculine, timeless mood.',
    applies: 'interior',
    accent: '#1E2A45',
    tags: ['navy', 'brass', 'classic', 'refined'],
    category: 'color-mood',
  },
  {
    id: 'color-blush-gold',
    name: 'Blush & Gold',
    blurb: 'Romantic blush pink layered with glamorous gold',
    prompt:
      'Restyle in blush and gold: soft blush-pink walls and upholstery, polished gold and champagne accents, rose-toned textiles, and pale marble. Maintain the existing geometry, windows, and doors; use warm flattering lighting with a golden glow for a romantic, glamorous, feminine mood.',
    applies: 'interior',
    accent: '#E7B6A6',
    tags: ['blush', 'gold', 'romantic', 'glam'],
    category: 'color-mood',
  },
  {
    id: 'color-forest-green-wood',
    name: 'Forest Green & Wood',
    blurb: 'Deep forest green with rich natural timber',
    prompt:
      'Recolor the space in forest green and wood: deep forest-green walls or cabinetry, rich warm walnut and oak timber, leather and wool textiles in tan and moss. Keep the room layout, windows, and doors intact; light with warm natural light for a grounded, lodge-like, organic mood.',
    applies: 'both',
    accent: '#2F4A36',
    tags: ['forest', 'green', 'wood', 'organic'],
    category: 'color-mood',
  },
  {
    id: 'color-desert-sand',
    name: 'Desert Sand',
    blurb: 'Warm sand, bone, and clay in sun-bleached calm',
    prompt:
      'Restyle in desert sand tones: warm sand, bone, and pale-clay walls, sun-bleached wood, woven jute and boucle textiles, and matte ceramic. Preserve all architecture, windows, and doors; bathe the scene in warm hazy desert light for a calm, sun-bleached, minimalist mood.',
    applies: 'both',
    accent: '#D8C3A5',
    tags: ['desert', 'sand', 'warm', 'minimal'],
    category: 'color-mood',
  },
  {
    id: 'color-ocean-blues',
    name: 'Ocean Blues',
    blurb: 'Aqua, seafoam, and deep blue with breezy coastal light',
    prompt:
      'Recolor the space in ocean blues: aqua, seafoam, and deep marine-blue walls and textiles, whitewashed wood, sandy neutrals, and rope or rattan accents. Maintain the room geometry, windows, and doors; light with bright breezy coastal daylight for a fresh, relaxed, seaside mood.',
    applies: 'both',
    accent: '#3E7C9B',
    tags: ['ocean', 'blue', 'coastal', 'fresh'],
    category: 'color-mood',
  },
  {
    id: 'color-high-contrast',
    name: 'High Contrast',
    blurb: 'Bold black-on-white with sharp graphic punch',
    prompt:
      'Restyle in a high-contrast palette: stark white walls against bold black furnishings, sharp dark trim, and crisp graphic contrasts with a single saturated accent color. Preserve all geometry, windows, and architecture; use bright clean lighting with crisp shadows for a bold, confident, graphic mood.',
    applies: 'interior',
    accent: '#111111',
    tags: ['contrast', 'bold', 'graphic', 'modern'],
    category: 'color-mood',
  },
  {
    id: 'color-sunwashed',
    name: 'Sunwashed',
    blurb: 'Faded warm hues glowing in golden-hour light',
    prompt:
      'Recolor the space in sunwashed tones: faded ochre, dusty coral, soft gold, and warm sun-bleached neutrals on walls and textiles, with weathered wood. Keep the layout, windows, and doors unchanged; flood the scene with warm golden-hour light and a hazy sunlit glow for a nostalgic, dreamy mood.',
    applies: 'both',
    accent: '#E0A86B',
    tags: ['sunwashed', 'golden', 'warm', 'dreamy'],
    category: 'color-mood',
  },
  {
    id: 'color-monochromatic-beige',
    name: 'Monochromatic Beige',
    blurb: 'Layered tonal beige from sand to camel, all one family',
    prompt:
      'Restyle in monochromatic beige: layered tones of sand, ecru, camel, and mushroom across walls, upholstery, and textiles, with matching pale wood and tonal accessories. Preserve all architecture, windows, and doors; use soft warm even light for a serene, tonal, quietly luxurious mood.',
    applies: 'interior',
    accent: '#CBB89D',
    tags: ['beige', 'monochromatic', 'tonal', 'serene'],
    category: 'color-mood',
  },
  {
    id: 'color-vibrant-maximal',
    name: 'Vibrant Maximal',
    blurb: 'Bold saturated color clash with eclectic energy',
    prompt:
      'Recolor the space in vibrant maximal color: bold saturated hues clashing joyfully such as fuchsia, cobalt, marigold, and emerald across walls, furniture, patterns, and decor, layered with eclectic prints. Maintain the room geometry, windows, and doors; light brightly and evenly for an energetic, playful, maximalist mood.',
    applies: 'interior',
    accent: '#E0349B',
    tags: ['vibrant', 'maximal', 'bold', 'eclectic'],
    category: 'color-mood',
  },
  {
    id: 'room-declutter-stage',
    name: 'Declutter & Stage',
    blurb:
      'Clear surfaces, neutral staging, light and airy real-estate-ready look',
    prompt:
      "Keeping the room's exact layout, windows, and architecture, clear away all clutter and personal items, leaving clean empty surfaces and tidy minimal furnishings. Restyle in a warm-neutral palette of soft white walls, pale oak floors, and light linen upholstery, with a few staged accents like a fresh greenery sprig and a folded throw, bathed in bright even daylight for a move-in-ready, photographed-for-sale feel.",
    applies: 'interior',
    accent: '#E7E1D6',
    tags: ['staging', 'minimal', 'neutral', 'real-estate'],
    category: 'room-makeovers',
  },
  {
    id: 'room-luxury-primary-bedroom',
    name: 'Luxury Primary Bedroom',
    blurb:
      'Hotel-suite opulence with plush layered bedding and warm low lighting',
    prompt:
      "Preserve the room's geometry, windows, and doors while transforming it into an opulent primary bedroom: an upholstered king bed with a tall tufted velvet headboard, layered crisp white and taupe bedding, plush throw pillows, and a cashmere throw. Add warm walnut nightstands with brass lamps, a deep-pile area rug, floor-to-ceiling drapery, and soft warm low lighting for a serene five-star-hotel-suite mood in a palette of greige, champagne, and charcoal.",
    applies: 'interior',
    accent: '#9C8B73',
    tags: ['bedroom', 'luxury', 'hotel', 'cozy'],
    category: 'room-makeovers',
  },
  {
    id: 'room-spa-bathroom',
    name: 'Spa Bathroom',
    blurb: 'Serene stone-and-wood wet retreat with soft diffused light',
    prompt:
      "Keeping the bathroom's fixtures placement and architecture intact, restyle it into a tranquil spa: honed travertine and matte stone surfaces, warm teak accents, a freestanding soaking tub or rainfall shower, rolled white towels, eucalyptus and a flickering candle. Use a soft palette of sand, ivory, and muted sage with diffused natural light and gentle warm sconces for a calming wellness-retreat atmosphere.",
    applies: 'interior',
    accent: '#B7C2A8',
    tags: ['bathroom', 'spa', 'stone', 'wellness'],
    category: 'room-makeovers',
  },
  {
    id: 'room-chef-kitchen',
    name: 'Chef Kitchen',
    blurb: 'Pro-grade workspace with stainless steel and rich stone counters',
    prompt:
      "Maintain the kitchen's footprint, window, and cabinet layout while upgrading it to a chef's kitchen: handleless flat-panel cabinetry in deep forest green, thick honed marble or soapstone countertops, a professional stainless range with brass pot-filler, open shelving with copper cookware, and a generous island with leather-topped stools. Light it with linear pendants and warm under-cabinet glow for a refined, functional culinary atmosphere.",
    applies: 'interior',
    accent: '#3F5141',
    tags: ['kitchen', 'chef', 'marble', 'stainless'],
    category: 'room-makeovers',
  },
  {
    id: 'room-cozy-reading-nook',
    name: 'Cozy Reading Nook',
    blurb: 'Warm bookish corner with soft seating and layered amber light',
    prompt:
      "Preserving the room's bones and window placement, restyle it into an inviting reading nook: a deep upholstered armchair or built-in window seat with plush cushions and a chunky knit throw, a small side table with a warm reading lamp, and floor-to-ceiling bookshelves stacked with books and small plants. Use a cozy palette of caramel, terracotta, and cream with soft layered amber lighting for a snug, hygge-inspired mood.",
    applies: 'interior',
    accent: '#C8763E',
    tags: ['reading', 'cozy', 'books', 'hygge'],
    category: 'room-makeovers',
  },
  {
    id: 'room-home-office',
    name: 'Productive Home Office',
    blurb: 'Focused modern workspace with warm wood desk and smart storage',
    prompt:
      "Keeping the room's structure and windows unchanged, convert it into a polished home office: a solid walnut desk with a sleek monitor, an ergonomic leather chair, wall-mounted shelving with neatly arranged books and objects, and a pinboard or framed art. Use a calm palette of warm white, walnut, and muted blue-gray with abundant daylight plus a focused task lamp for a productive, uncluttered professional atmosphere.",
    applies: 'interior',
    accent: '#5C6B7A',
    tags: ['office', 'work', 'walnut', 'productive'],
    category: 'room-makeovers',
  },
  {
    id: 'room-kids-playroom',
    name: 'Kids Playroom',
    blurb: 'Playful, organized space with bright accents and soft floor zones',
    prompt:
      "Preserve the room's layout, windows, and doors while transforming it into a joyful kids playroom: low open shelving with labeled bins of toys, a soft washable play rug, a cozy teepee or reading corner, and a small activity table with pint-sized chairs. Use a cheerful but balanced palette of soft white walls with primary-and-pastel accents, playful wall decals, and bright even lighting for a fun yet tidy and safe atmosphere.",
    applies: 'interior',
    accent: '#F2B134',
    tags: ['kids', 'playroom', 'colorful', 'family'],
    category: 'room-makeovers',
  },
  {
    id: 'room-nursery',
    name: 'Serene Nursery',
    blurb: 'Soft, calming baby room with gentle pastels and natural textures',
    prompt:
      "Keeping the room's architecture and window placement intact, restyle it as a soothing nursery: a classic crib with soft bedding, a cushioned glider with an ottoman, a changing dresser, and a plush round rug. Use a gentle palette of warm white, sage, and blush with natural rattan accents, framed nursery art, soft sheer curtains, and a warm dimmable lamp for a peaceful, tender atmosphere.",
    applies: 'interior',
    accent: '#D9B8B0',
    tags: ['nursery', 'baby', 'pastel', 'calm'],
    category: 'room-makeovers',
  },
  {
    id: 'room-home-gym',
    name: 'Home Gym',
    blurb: 'Motivating workout space with rubber flooring and mirrored wall',
    prompt:
      "Maintain the room's dimensions, windows, and doors while converting it into an energizing home gym: durable black rubber tile flooring, a large mirrored wall, a rack of free weights, a yoga mat zone, and a stationary bike or bench. Use a clean palette of charcoal, white, and a single bold accent stripe, with bright crisp lighting and a motivational framed print for a focused, athletic atmosphere.",
    applies: 'interior',
    accent: '#E63946',
    tags: ['gym', 'fitness', 'workout', 'athletic'],
    category: 'room-makeovers',
  },
  {
    id: 'room-media-theater',
    name: 'Media & Theater Room',
    blurb: 'Cinematic dark lounge with tiered seating and ambient glow',
    prompt:
      "Preserve the room's structure and proportions while transforming it into a home theater: deep plush reclining sectional seating, a large screen wall, acoustic dark fabric panels, blackout treatment over existing windows, and subtle LED cove lighting. Use a moody palette of charcoal, espresso, and deep navy with soft step lighting and a warm ambient glow for an immersive cinematic atmosphere.",
    applies: 'interior',
    accent: '#2B2D42',
    tags: ['theater', 'media', 'cinema', 'moody'],
    category: 'room-makeovers',
  },
  {
    id: 'room-mudroom',
    name: 'Organized Mudroom',
    blurb:
      'Hardworking entry drop-zone with cubbies, hooks, and durable finishes',
    prompt:
      "Keeping the room's footprint and door placement, restyle it into a tidy mudroom: built-in bench seating with cubbies above, a row of sturdy hooks, baskets for shoes, and durable patterned floor tile. Use a fresh palette of crisp white millwork with a soft slate-blue accent, brass hooks, a runner rug, and bright practical lighting for an organized, welcoming functional space.",
    applies: 'interior',
    accent: '#6E8898',
    tags: ['mudroom', 'storage', 'entry', 'organized'],
    category: 'room-makeovers',
  },
  {
    id: 'room-walk-in-closet',
    name: 'Walk-In Closet',
    blurb: 'Boutique dressing room with custom shelving and warm lighting',
    prompt:
      "Preserve the room's geometry and openings while transforming it into a boutique walk-in closet: custom built-in cabinetry and open shelving, neatly hung garments, glass-front drawers, a central island with a leather top, and a full-length mirror. Use an elegant palette of warm white, pale oak, and brass hardware with integrated LED shelf lighting and a small upholstered bench for a glamorous dressing-room atmosphere.",
    applies: 'interior',
    accent: '#C2A878',
    tags: ['closet', 'dressing', 'boutique', 'organized'],
    category: 'room-makeovers',
  },
  {
    id: 'room-dining-room',
    name: 'Elegant Dining Room',
    blurb: 'Refined gathering space with statement table and warm pendant glow',
    prompt:
      "Keeping the room's architecture and windows intact, restyle it into an elegant dining room: a substantial wood dining table surrounded by upholstered chairs, a statement pendant or chandelier centered above, a sideboard with curated decor, and a large framed artwork. Use a sophisticated palette of warm taupe walls, walnut, and muted brass accents with layered warm lighting and a styled table runner for an inviting, dinner-party mood.",
    applies: 'interior',
    accent: '#8A6D4F',
    tags: ['dining', 'elegant', 'chandelier', 'gathering'],
    category: 'room-makeovers',
  },
  {
    id: 'room-entryway-foyer',
    name: 'Welcoming Entryway',
    blurb:
      'First-impression foyer with console, mirror, and bright airy palette',
    prompt:
      "Preserve the entry's layout, door, and architecture while restyling it into a gracious foyer: a slim console table with a decorative bowl and a stack of books, a large statement mirror or framed art above, a sculptural pendant light, and a runner rug over the existing floor. Use a bright welcoming palette of warm white, natural wood, and soft greenery with a fresh floral arrangement for an inviting first-impression atmosphere.",
    applies: 'interior',
    accent: '#A3B18A',
    tags: ['entryway', 'foyer', 'welcoming', 'console'],
    category: 'room-makeovers',
  },
  {
    id: 'room-sunroom',
    name: 'Garden Sunroom',
    blurb: 'Light-flooded plant-filled lounge with rattan and breezy textiles',
    prompt:
      "Maintaining the room's windows and structure, transform it into a sun-drenched garden sunroom: rattan and wicker lounge seating with breezy linen cushions, an abundance of potted plants and hanging greenery, a jute rug, and a small bistro table. Use an airy palette of white, natural fiber tones, and leafy green with sheer curtains and bright streaming daylight for a relaxed, conservatory-like atmosphere.",
    applies: 'interior',
    accent: '#7BA05B',
    tags: ['sunroom', 'plants', 'rattan', 'airy'],
    category: 'room-makeovers',
  },
  {
    id: 'room-basement-lounge',
    name: 'Basement Lounge',
    blurb: 'Cozy entertaining den with warm low lighting and plush seating',
    prompt:
      "Keeping the room's footprint and any windows intact, restyle the basement into a warm lounge: a deep sectional sofa, a low coffee table, a built-in bar nook or shelving, a large area rug, and framed art. Use a cozy palette of warm gray, caramel leather, and amber accents with layered warm lamp and LED cove lighting to counter the low ceilings, creating a relaxed entertaining-den atmosphere.",
    applies: 'interior',
    accent: '#A56C45',
    tags: ['basement', 'lounge', 'den', 'entertaining'],
    category: 'room-makeovers',
  },
  {
    id: 'room-garage-workshop',
    name: 'Garage Workshop',
    blurb: 'Clean, organized maker garage with pegboard walls and epoxy floor',
    prompt:
      'Preserve the garage structure, doors, and windows while transforming it into an organized workshop: a glossy gray epoxy floor, a sturdy workbench with a butcher-block top, full-wall pegboard with neatly hung tools, rolling tool cabinets, and overhead storage racks. Use a crisp palette of slate gray, white, and a bold accent color with bright clean shop lighting for a professional, hardworking maker atmosphere.',
    applies: 'interior',
    accent: '#F4A300',
    tags: ['garage', 'workshop', 'tools', 'organized'],
    category: 'room-makeovers',
  },
  {
    id: 'room-laundry-room',
    name: 'Bright Laundry Room',
    blurb: 'Fresh, functional utility space with cabinetry and patterned floor',
    prompt:
      "Keeping the room's plumbing and layout intact, restyle it into a cheerful laundry room: stacked or side-by-side machines under a folding counter, white shaker cabinetry, open shelving with woven baskets, a hanging rod, and a deep utility sink. Use a fresh palette of crisp white with a soft sage or sky-blue accent, patterned cement floor tile, brass hardware, and bright clean lighting for an efficient, pleasant workspace.",
    applies: 'interior',
    accent: '#9BB8C4',
    tags: ['laundry', 'utility', 'fresh', 'functional'],
    category: 'room-makeovers',
  },
  {
    id: 'room-wine-cellar',
    name: 'Wine Cellar',
    blurb: "Moody connoisseur's cellar with wood racking and accent lighting",
    prompt:
      "Preserve the room's dimensions and architecture while transforming it into a refined wine cellar: floor-to-ceiling stained-oak wine racking filled with bottles, a stone or brick accent wall, a small tasting table with leather stools, and a decanter display. Use a moody palette of deep espresso, charcoal stone, and warm amber with focused accent lighting glowing across the bottles for an intimate connoisseur atmosphere.",
    applies: 'interior',
    accent: '#5B2C2C',
    tags: ['wine', 'cellar', 'moody', 'connoisseur'],
    category: 'room-makeovers',
  },
  {
    id: 'room-home-bar',
    name: 'Home Bar',
    blurb:
      'Sophisticated cocktail lounge with brass, marble, and backlit shelves',
    prompt:
      "Keeping the room's structure and openings intact, restyle it into a chic home bar: a marble-topped bar counter with leather-upholstered stools, backlit floating shelves displaying glassware and bottles, a brass bar rail, and a mirrored or fluted-glass back wall. Use a glamorous palette of deep emerald or navy, brass, and warm marble with dramatic warm accent lighting for a speakeasy cocktail-lounge atmosphere.",
    applies: 'interior',
    accent: '#1E5945',
    tags: ['bar', 'cocktail', 'speakeasy', 'brass'],
    category: 'room-makeovers',
  },
  {
    id: 'room-craft-studio',
    name: 'Craft Studio',
    blurb:
      'Bright, inspiring maker space with organized supplies and big worktable',
    prompt:
      "Preserve the room's layout and windows while converting it into a creative craft studio: a large central worktable, wall-to-wall open shelving and labeled jars of supplies, a pegboard for tools, a comfortable task chair, and a corkboard of inspiration. Use a bright cheerful palette of white with warm wood and a playful accent hue, abundant daylight plus a daylight task lamp for an inspiring, organized maker atmosphere.",
    applies: 'interior',
    accent: '#E07A9B',
    tags: ['craft', 'studio', 'maker', 'creative'],
    category: 'room-makeovers',
  },
  {
    id: 'room-guest-suite',
    name: 'Guest Suite',
    blurb:
      'Hospitable retreat with comfortable bed and thoughtful welcoming touches',
    prompt:
      "Keeping the room's geometry, windows, and doors unchanged, restyle it into a welcoming guest suite: a comfortable upholstered queen bed with layered neutral bedding and extra pillows, a bedside table with a lamp and water carafe, a small luggage bench, and a cozy reading chair. Use a soothing palette of warm white, soft taupe, and muted blue with fresh flowers, framed art, and gentle warm lighting for a restful, hospitable hotel-like atmosphere.",
    applies: 'interior',
    accent: '#8FA1A8',
    tags: ['guest', 'suite', 'hospitable', 'restful'],
    category: 'room-makeovers',
  },
  {
    id: 'floorplan-2d-to-3d-render',
    name: '2D to 3D Render',
    blurb:
      'Flat 2D floorplan reborn as a furnished, photoreal 3D cutaway render',
    prompt:
      'Transform this flat 2D floorplan into a photorealistic 3D furnished render with the camera tilted to a three-quarter perspective, keeping every wall, window, and door exactly where the plan shows them. Add warm oak flooring, soft area rugs, contemporary sofas, beds, and dining sets, with realistic ambient daylight casting gentle shadows and material textures across each room.',
    applies: 'interior',
    accent: '#C9A66B',
    tags: ['floorplan', '3d render', 'conversion'],
    category: 'floorplan-staging',
  },
  {
    id: 'floorplan-empty-to-staged',
    name: 'Empty to Staged',
    blurb: 'Bare empty room filled with tasteful furniture and warm styling',
    prompt:
      'Stage this empty room with elegant mid-toned furnishings while preserving the exact walls, window placement, ceiling height, and flooring footprint. Introduce a tailored sofa or bed, layered textiles, a low coffee or side table, framed art, and a leafy plant, lit by soft natural light from the existing windows for an inviting, lived-in mood.',
    applies: 'interior',
    accent: '#B79A7D',
    tags: ['staging', 'empty room', 'furnished'],
    category: 'floorplan-staging',
  },
  {
    id: 'floorplan-raw-to-finished',
    name: 'Raw to Finished',
    blurb:
      'Bare-stud construction shell turned into a move-in-ready finished space',
    prompt:
      'Convert this raw construction shell into a fully finished interior, keeping the structural framing, window openings, and room layout intact. Add smooth painted drywall, baseboards, engineered wood floors, recessed lighting, finished trim, and modern fixtures, rendered with clean even illumination so the space reads as freshly completed and ready to occupy.',
    applies: 'interior',
    accent: '#9CA3AF',
    tags: ['construction', 'finished', 'renovation'],
    category: 'floorplan-staging',
  },
  {
    id: 'floorplan-topdown-color',
    name: 'Top-Down Color Plan',
    blurb:
      'Crisp top-down floorplan with color-coded rooms and furniture icons',
    prompt:
      'Render this floorplan as a clean top-down colored architectural plan viewed straight from above, preserving all wall positions, doorways, and window markings precisely. Fill each zone with soft pastel color fills, neatly drawn furniture symbols, textured flooring patterns, and subtle drop shadows for a polished real-estate marketing diagram.',
    applies: 'interior',
    accent: '#7FB3A6',
    tags: ['top-down', 'color plan', 'diagram'],
    category: 'floorplan-staging',
  },
  {
    id: 'floorplan-isometric-dollhouse',
    name: 'Isometric Dollhouse',
    blurb:
      'Charming roofless dollhouse view of the whole layout in isometric 3D',
    prompt:
      'Reimagine this floorplan as a roofless isometric dollhouse render seen from a 45-degree elevated angle, keeping the full layout, wall lengths, and openings true to plan. Show miniature furnished rooms with cozy furniture, tiny rugs and plants, warm interior lighting glowing through, and clean white exterior walls for a delightful cutaway model look.',
    applies: 'interior',
    accent: '#E0A458',
    tags: ['isometric', 'dollhouse', 'cutaway'],
    category: 'floorplan-staging',
  },
  {
    id: 'floorplan-open-concept',
    name: 'Open-Concept Conversion',
    blurb: 'Compartmentalized layout reimagined as airy open-plan living',
    prompt:
      'Reimagine this space as an open-concept layout, visually merging kitchen, dining, and living zones while respecting the exterior walls, windows, and load-bearing structure. Use continuous light wood flooring, a large central island, sightlines flowing between areas, neutral furnishings, and bright airy daylight to convey spacious, connected living.',
    applies: 'interior',
    accent: '#D6C7B0',
    tags: ['open concept', 'spacious', 'conversion'],
    category: 'floorplan-staging',
  },
  {
    id: 'floorplan-apartment-staging',
    name: 'Apartment Staging',
    blurb: 'Compact apartment furnished with smart, stylish urban pieces',
    prompt:
      'Stage this apartment with smart, space-conscious urban furnishings while keeping walls, windows, and the existing floor plan unchanged. Add a compact sectional, a slim dining setup, multi-use storage, warm accent lighting, framed prints, and greenery, styled in a modern city palette of warm greys and soft brass for an aspirational rental-ready feel.',
    applies: 'interior',
    accent: '#A38C6E',
    tags: ['apartment', 'urban', 'staging'],
    category: 'floorplan-staging',
  },
  {
    id: 'floorplan-realestate-neutral',
    name: 'Real-Estate Neutral',
    blurb: 'Broadly appealing neutral staging tuned for listing photos',
    prompt:
      'Stage this room in a broadly appealing neutral real-estate style, preserving the exact architecture, windows, and flooring layout. Use beige and greige sofas, light oak accents, crisp white walls, simple symmetrical decor, and bright balanced lighting that photographs cleanly, creating an uncluttered, buyer-friendly look that helps people picture themselves living here.',
    applies: 'interior',
    accent: '#CDBFA8',
    tags: ['real estate', 'neutral', 'listing'],
    category: 'floorplan-staging',
  },
  {
    id: 'floorplan-small-space-optimize',
    name: 'Small-Space Optimizer',
    blurb: 'Tight footprint maximized with clever multifunctional furniture',
    prompt:
      'Optimize this small space with clever multifunctional furnishings while keeping the existing walls, windows, and tight footprint intact. Add a fold-down or wall-mounted desk, a sofa bed, vertical shelving, under-bench storage, mirrors to amplify light, and a soft bright palette that makes the compact room feel open, efficient, and clutter-free.',
    applies: 'interior',
    accent: '#B9C4C9',
    tags: ['small space', 'compact', 'storage'],
    category: 'floorplan-staging',
  },
  {
    id: 'floorplan-aging-in-place',
    name: 'Accessible Living',
    blurb: 'Aging-in-place layout with barrier-free, mobility-friendly design',
    prompt:
      'Restyle this space as an accessible aging-in-place layout, keeping all walls, doorways, and window placement exactly as shown. Add wide clear walkways, a zero-step transition, grab-friendly fixtures, lever handles, a low-pile non-slip floor, supportive seating at comfortable heights, and warm even lighting for a safe, dignified, barrier-free home.',
    applies: 'interior',
    accent: '#8FA9B8',
    tags: ['accessible', 'aging in place', 'mobility'],
    category: 'floorplan-staging',
  },
  {
    id: 'floorplan-multipurpose-split',
    name: 'Multi-Purpose Split',
    blurb: 'One room cleverly zoned into two distinct functional areas',
    prompt:
      'Divide this single room into two clearly zoned multi-purpose areas while preserving the existing walls, windows, and overall footprint. Use an open shelving divider or rug delineation to separate, for example, a workspace from a lounge or a sleep nook from a sitting area, with coordinated furniture, layered task and ambient lighting, and a cohesive warm palette tying both zones together.',
    applies: 'interior',
    accent: '#A98C76',
    tags: ['multi-purpose', 'zoning', 'divided'],
    category: 'floorplan-staging',
  },
  {
    id: 'floorplan-luxe-3d-tour',
    name: 'Luxe 3D Tour',
    blurb: 'High-end furnished perspective render with designer finishes',
    prompt:
      'Render this floorplan as a luxurious furnished 3D perspective walkthrough view, holding every wall, window, and doorway true to the plan. Layer in designer finishes: wide-plank herringbone floors, statement lighting, plush upholstered furniture, marble accents, full-height drapery, and golden-hour daylight pouring through the windows for an upscale, magazine-quality interior.',
    applies: 'interior',
    accent: '#9C7A4D',
    tags: ['luxury', '3d render', 'designer'],
    category: 'floorplan-staging',
  },
  {
    id: 'seasonal-cozy-autumn',
    name: 'Cozy Autumn',
    blurb: 'Warm fall layers, chunky throws, amber light, and harvest tones',
    prompt:
      'Restyle this exact room for cozy autumn while keeping all walls, windows, doors, and architecture unchanged: drape chunky knit throws and rust, mustard, and burnt-orange cushions over the existing seating, add a stacked-log or pumpkin-and-gourd cluster on flat surfaces, dried wheat and eucalyptus in ceramic vases, and a soft amber glow from warm table lamps. Layer a textured wool area rug, place a steaming mug and an open book, and bathe the scene in low golden late-afternoon light filtering through the same windows.',
    applies: 'interior',
    accent: '#C46A1E',
    tags: ['autumn', 'cozy', 'warm', 'harvest'],
    category: 'seasonal-occasion',
  },
  {
    id: 'seasonal-winter-holiday',
    name: 'Winter Holiday',
    blurb:
      'Christmas tree, garlands, warm string lights, and festive reds and greens',
    prompt:
      'Transform this exact space into a Christmas holiday scene with all room geometry, windows, and doors preserved: add a decorated evergreen tree with warm white lights and red-and-gold ornaments in a corner, drape lush green garland with pinecones along mantels or shelves, hang stockings, and tuck wrapped gifts below. Layer plaid and velvet throw pillows in deep red and forest green, place flickering candles and a bowl of ornaments, and fill the room with cozy warm string-light glow against a soft snowy view through the existing windows.',
    applies: 'interior',
    accent: '#B3122B',
    tags: ['christmas', 'holiday', 'winter', 'festive'],
    category: 'seasonal-occasion',
  },
  {
    id: 'seasonal-spring-refresh',
    name: 'Spring Refresh',
    blurb: 'Fresh florals, pastels, airy linens, and bright morning light',
    prompt:
      'Refresh this exact room for spring while keeping every wall, window, and architectural detail intact: add abundant fresh tulips, ranunculus, and cherry blossom branches in glass and ceramic vases, swap in soft pastel and white linen cushions and a light woven throw, and introduce crisp light-toned textiles. Use airy sheer curtains on the existing windows, a few leafy potted plants, and flood the scene with bright, clean morning daylight for a fresh, renewed, optimistic mood.',
    applies: 'interior',
    accent: '#9DC88D',
    tags: ['spring', 'floral', 'pastel', 'fresh'],
    category: 'seasonal-occasion',
  },
  {
    id: 'seasonal-summer-bright',
    name: 'Summer Bright',
    blurb: 'Coastal whites, breezy blues, citrus accents, and sunlit air',
    prompt:
      'Style this exact space for a bright summer feel without altering walls, windows, or layout: introduce crisp white and breezy blue linens, striped cushions, light rattan and woven accents, and a casual airy throw. Add a bowl of lemons or fresh citrus, a vase of sunflowers or wildflowers, and lightweight gauzy curtains drawn open on the existing windows. Bathe the room in clear, vivid midday sunlight for a fresh, coastal, vacation-bright atmosphere.',
    applies: 'interior',
    accent: '#2E9BD6',
    tags: ['summer', 'coastal', 'bright', 'breezy'],
    category: 'seasonal-occasion',
  },
  {
    id: 'seasonal-halloween',
    name: 'Halloween',
    blurb:
      'Carved pumpkins, dark moody decor, cobwebs, and candlelit spooky glow',
    prompt:
      "Restyle this exact room for Halloween while preserving all architecture, windows, and doors: add carved jack-o'-lanterns and clustered pumpkins on surfaces and floor, drape subtle faux cobwebs in corners, and place black candles, dark florals, and matte-black decorative crows or skulls as accents. Layer deep charcoal and burnt-orange throws over seating, and light the scene with a moody, low candlelit and warm orange glow for a stylish, atmospheric, spooky-but-tasteful mood.",
    applies: 'interior',
    accent: '#E8731C',
    tags: ['halloween', 'spooky', 'pumpkin', 'moody'],
    category: 'seasonal-occasion',
  },
  {
    id: 'seasonal-dinner-party',
    name: 'Dinner Party Ready',
    blurb:
      'Set table, layered candles, fresh flowers, and elegant evening glow',
    prompt:
      'Stage this exact room as dinner-party ready with all walls, windows, and layout unchanged: set the table with crisp linens, layered plates, polished glassware, and folded napkins, add a low centerpiece of fresh flowers and a cluster of taper and pillar candles. Introduce a wine bottle and filled glasses, soften the lighting to a warm, dimmed, golden ambiance, and add tasteful greenery accents for an elegant, inviting, ready-to-host evening atmosphere.',
    applies: 'interior',
    accent: '#A8884F',
    tags: ['dinner-party', 'entertaining', 'elegant', 'candlelit'],
    category: 'seasonal-occasion',
  },
  {
    id: 'seasonal-biophilic',
    name: 'Biophilic Green',
    blurb: 'Lush layered plants, natural textures, and an indoor-jungle calm',
    prompt:
      'Fill this exact space with biophilic greenery while keeping the room geometry, windows, and doors intact: add layered potted plants of varying heights, trailing pothos and ferns on shelves, a large fiddle-leaf fig or monstera in a corner, and hanging planters near the existing windows. Introduce natural rattan, terracotta, and linen textures, a jute rug, and abundant soft diffused daylight for a lush, oxygen-rich, calming indoor-jungle mood.',
    applies: 'interior',
    accent: '#4E8C5A',
    tags: ['biophilic', 'plants', 'natural', 'calm'],
    category: 'seasonal-occasion',
  },
  {
    id: 'seasonal-candlelit-romantic',
    name: 'Candlelit Romantic',
    blurb: 'Dozens of candles, blush florals, soft draping, and intimate glow',
    prompt:
      'Restyle this exact room into a candlelit romantic setting, preserving all walls, windows, and architecture: cluster dozens of warm flickering candles of varying heights across surfaces, add blush and burgundy roses in vases, drape soft sheer fabric and plush velvet throws over seating, and scatter rose petals. Dim the ambient lighting to a low, intimate amber glow with gentle bokeh highlights for a sensual, warm, deeply romantic mood.',
    applies: 'interior',
    accent: '#C0506B',
    tags: ['romantic', 'candlelit', 'intimate', 'warm'],
    category: 'seasonal-occasion',
  },
  {
    id: 'seasonal-lunar-new-year',
    name: 'Lunar New Year',
    blurb:
      'Red and gold decor, lanterns, blossoms, and auspicious festive warmth',
    prompt:
      'Style this exact space for Lunar New Year while keeping all room geometry, windows, and doors unchanged: add red-and-gold accents, hanging red lanterns, gold tassels, and red couplet banners near doorways, with branches of pink plum or cherry blossom and potted kumquat or orchid. Layer red and gold cushions and a decorative throw, place a tray of oranges and festive treats, and fill the room with a warm, auspicious, celebratory glow.',
    applies: 'interior',
    accent: '#D11C2C',
    tags: ['lunar-new-year', 'festive', 'red-gold', 'lanterns'],
    category: 'seasonal-occasion',
  },
  {
    id: 'seasonal-diwali-warm',
    name: 'Diwali Warm',
    blurb: 'Glowing diyas, marigold garlands, rich jewel tones, and rangoli',
    prompt:
      'Transform this exact room for Diwali while preserving all architecture, windows, and doors: line surfaces and floor edges with rows of glowing clay diya lamps and warm fairy lights, hang marigold and jasmine garlands across doorways, and add a colorful rangoli pattern on the floor. Layer rich jewel-tone silk and brocade cushions in saffron, magenta, and gold, place brass accents and a bowl of sweets, and bathe the scene in a warm, radiant, festive golden glow.',
    applies: 'interior',
    accent: '#E8A317',
    tags: ['diwali', 'festive', 'diya', 'jewel-tones'],
    category: 'seasonal-occasion',
  },
  {
    id: 'seasonal-declutter-reset',
    name: 'Minimalist Reset',
    blurb:
      'Cleared surfaces, neutral calm, and an airy decluttered fresh start',
    prompt:
      'Reset this exact room into a serene minimalist space while keeping the walls, windows, doors, and layout exactly as they are: clear all clutter from surfaces, leave only one or two intentional objects per area, and swap to a calm neutral palette of white, oatmeal, and soft gray textiles. Add a single sculptural vase with a sparse branch, clean folded throws, hidden storage, and abundant soft natural light for an airy, ordered, breathe-easy fresh-start mood.',
    applies: 'interior',
    accent: '#CFC7BA',
    tags: ['minimalist', 'declutter', 'neutral', 'calm'],
    category: 'seasonal-occasion',
  },
  {
    id: 'seasonal-gallery-wall',
    name: 'Gallery Wall',
    blurb:
      'Curated framed art arrangement turning a blank wall into a focal feature',
    prompt:
      "Add a curated gallery wall to this exact room while preserving all architecture, window and door placement, and existing furniture: fill one prominent blank wall with a balanced arrangement of framed art and photography in mixed black, wood, and brass frames, layering varied sizes around a cohesive theme. Style the area below with a console or seating, a small plant and stacked books, and add focused warm accent lighting that highlights the new framed feature wall as the room's focal point.",
    applies: 'interior',
    accent: '#6B6B6B',
    tags: ['gallery-wall', 'art', 'feature', 'curated'],
    category: 'seasonal-occasion',
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
