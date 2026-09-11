# Sunken Vault environment pass

The vault is a ruined coastal settlement built around a canal basin. Broad ground replaces the small circular islands; raised masonry terraces separate the old village, temple precinct and irrigation gardens from the lower banks and quay.

## Exploration

- The western entrance opens onto a bank with three choices: village stairs, the central court bridge, or the lower waterfront.
- The village–temple–gardens route forms the upper circuit. The temple fire sits on a full landing beside the sanctuary stairs.
- The western waterfront–gate–quay route forms the lower circuit. The central court links these circuits, and the western canal street provides another shortcut.
- Two garden stairways connect the court approach and the quay. Water leaves the garden gutters at the retaining lip.
- The southern arrival plaza provides an unobstructed view toward the court and access to both shore routes.

Streets have 120 units of standing width. Plazas use the complete ground polygon; worn paving suggests a route without confining the player to it. Stair openings range from 128 to 176 units. Retaining faces use the same geometry for rendering and collision. Houses, palms and columns leave the street corridors clear.

## The grove-side gate

The Drowned Gate now faces west, square onto the vault road. The curtain wall crosses the road near Echo Grove's eastern edge and the road runs straight through the one arch left in it, so the approach is a single walk east — no turn north and no step behind the façade. The standing half of the gate is north of the passage and sorts behind the player; the fallen half is south of it and is held low, because in this projection anything drawn south of the road stands over whoever is walking it. The collapsed crown of the arch is collision as well as scenery: it banks the south side of the opening so he cannot walk into the strip the low wall would cover. `tests/mechanics.mjs` asserts both halves of that rule.

## Visual references

- [Heart Machine: Creating the World of Hyper Light Drifter](https://blog.playstation.com/2014/03/14/creating-the-world-of-hyper-light-drifter-on-ps4-and-ps-vita/) — landmark palettes, reactive wildlife, and architectural remnants as environmental storytelling.
- [Sea of Stars](https://seaofstarsgame.co/) and [Stonemasons Outpost screenshots](https://www.neoseeker.com/sea-of-stars/guides/Stonemasons_Outpost_Chest_Locations) — reference for visible terrace faces, stairs and layered masonry.

The original vault uses warm sandstone, muted jade planting beds, turquoise canals, worn mosaic paving, saltbush, palms, ruined market furnishings and ivy. Existing code primitives provide the artwork; no external art assets are copied.

## Review

Open `/tools/sunken-preview.html` for an animated overview or detailed district views; its **Vault gate** view stands the wanderer in the grove-side gateway at play scale. The preview omits enemies and does not start gameplay. Tests traverse every stair, check clear space on both sides of streets, flood actual collision from the southern gate to every district, and verify that water clearance stays within visible ground. Enemy placement is outside this pass.
