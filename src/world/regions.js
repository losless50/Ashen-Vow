// The regions of the world map (Ref art/world-map.png). Each has a campfire the
// hearth can carry Aldren to once he has found it. Only Hearthwood exists yet;
// the rest are named here so the travel list and the story plan agree.
// `map` is the region's place on the world map, 0..1 across and down. `boss` is
// what the map marks there: a skull for the Fallen, a crown for the main bosses.
export const REGIONS = [
  { key: 'hearthwood', name: 'Hearthwood Camp',   blurb: 'The sanctuary fire. Home.',                          built: true,  map: { x: .50, y: .54 }, boss: null },
  { key: 'echo',       name: 'Echo Grove',        blurb: 'Where the trees shut out the sun and the mushrooms glow.', built: true,  map: { x: .50, y: .77 }, boss: 'skull' },
  { key: 'dreadmarsh', name: 'Dreadmarsh',        blurb: 'Boardwalks over black water.',                       built: false, map: { x: .23, y: .73 }, boss: 'skull' },
  { key: 'emberfall',  name: 'Emberfall Ruins',   blurb: 'Autumn woods around a broken keep.',                 built: false, map: { x: .19, y: .47 }, boss: 'skull' },
  { key: 'wolfspire',  name: 'Wolfspire',         blurb: 'A cold spur above the falls.',                       built: false, map: { x: .27, y: .27 }, boss: 'skull' },
  { key: 'mirror',     name: 'Mirror Lake',       blurb: 'A tower on an island in still water.',               built: false, map: { x: .52, y: .36 }, boss: null },
  { key: 'stonebloom', name: 'Stonebloom Cliffs', blurb: 'Pink blossom on grey stone.',                        built: false, map: { x: .75, y: .48 }, boss: 'skull' },
  { key: 'hollowroot', name: 'Hollowroot Caverns', blurb: 'The dark under the cliffs.',                        built: false, map: { x: .90, y: .65 }, boss: 'skull' },
  { key: 'sunken',     name: 'Sunken Vault',      blurb: 'Ruins half-drowned in the eastern shallows.',        built: false, map: { x: .78, y: .80 }, boss: 'skull' },
  { key: 'blighted',   name: 'The Blighted Woods', blurb: 'Purple rot at the capital’s edge.',                 built: false, map: { x: .64, y: .25 }, boss: 'skull' },
  { key: 'frostveil',  name: 'Frostveil Summit',  blurb: 'Snow, and something crowned.',                       built: false, map: { x: .46, y: .12 }, boss: 'crown' },
  { key: 'eldoria',    name: 'Eldoria',           blurb: 'The royal capital, and the throne.',                 built: false, map: { x: .77, y: .20 }, boss: 'crown' },
];

export const region = key => REGIONS.find(r => r.key === key);
