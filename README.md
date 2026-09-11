# Ashen Vow

An original, playable top-down pixel action RPG prototype. Aldren, the banished king of Eldoria,
walks into Hearthwood Camp in rags with a broken sword. Meet Mira and Rowan, fell trees and break
quarry veins, reinforce your blade, spend embers on your attributes at the hearth, build up the
camp, and challenge the Hollow Warden in the old sanctuary — where something is waiting to tell you
what to do next. The full story and the chapter plan are in `docs/STORY.md`; the world map that
plan follows is `Ref art/world-map.png`.

## Run

Ashen Vow ships as a native app on Android and Linux, and still runs from a plain web server for
development. There is no bundler anywhere — `dist/` is a copy of `index.html`, `style.css` and
`src/`, and every shell serves those files over a local scheme, so plain ES modules load as-is.

```sh
npm start            # dev server on :8000, live from src/
npm run build        # copy the game into dist/

npm run android      # build dist/, sync, install and launch on the connected device
npm run apk          # just build android/app/build/outputs/apk/debug/app-debug.apk
npm run desktop      # Tauri dev window against the dev server
npm run desktop:build   # native Linux binary in src-tauri/target/release/app
```

**Nothing loads from the network at runtime** — no webfonts, no CDNs, no analytics. The two music
tracks and the combat samples ship inside `src/assets/audio/`, which is why the APK is now larger. An installed
build works with the radio off, and `tests/mechanics.mjs` asserts that no remote `@import` or asset
reference creeps back into the markup or the stylesheet.

### Android (Capacitor)

Requires a JDK, the Android SDK and `adb`. The app is landscape-locked (`sensorLandscape`), runs
immersive edge-to-edge with the status and navigation bars hidden, draws behind the display cutout,
and holds `FLAG_KEEP_SCREEN_ON` so the screen never dims mid-fight. Saves live in the WebView's
`localStorage`.

The debug APK is about 9 MB, most of it the two music tracks. iOS is the same codebase — `npx cap add ios` — but needs a Mac to
build and sign, and `localStorage` should move to native storage first, since iOS can evict it.

### Linux (Tauri)

Requires `webkit2gtk-4.1`, `gtk3`, `libsoup3` and `librsvg`. The release binary is around 11 MB
because it uses the system webview rather than bundling a browser. `npm run desktop:build` also
produces `.deb`, `.rpm` and AppImage bundles when run without `--no-bundle`.

### Interface

The app boots to a title screen over a live view of the camp, not a web page. There is no scrolling
document, no browser chrome and no text selection. Every icon in the interface is pixel art drawn by
`src/ui/icons.js` with the same primitives as the world, then cached as a data URI — so the HUD, the
menus and the game are literally the same art system. Touch controls appear only on touch devices,
and the layout reflows for short or narrow windows.

## Controls

- WASD / arrows: move
- Space / Shift: directional dodge with a brief invulnerability window
- Q / left mouse (or J): start normal attack
- R / right mouse (or K): start strong attack
- E: interact or gather
- F: healing flask
- C or I, or tapping the portrait: inventory
- Escape: pause
- Touch: left movement stick; swipe the world to dodge; tap to attack; hold a finger still for
  about a sixth of a second and a heavy strike fires by itself. The flask sits on the right, and a
  parry button pops in beside it whenever a blow is coming. The only buttons are the flask on the right and the
  interact prompt.

Every input starts the swing immediately — a touch tap included. A tap is a light swing. A finger
held still for 170 ms is a heavy strike on its own, fired the moment the hold is recognised. If a
hold begins while a light swing is still in the air, the heavy is buffered and fires the moment the
blade is free. The flask and interact buttons respond on
pointer-down, so they work while the other thumb is holding the stick. The boss health bar sits low
and small at the bottom centre so the arena stays clear. Light strikes connect after 140 ms; heavy strikes
after 270 ms. Damage and blood resolve once at blade contact, and an enemy can leave the committed
swing before it lands. Q/R sit beside WASD; mouse attacks aim toward the cursor when no nearby
target is in reach. Attacks initially face a nearby target and keep that facing throughout the
swing. Rolls and attacks consume stamina; windups and recovery windows make the boss punishable.
At half health, the boss attacks faster and alternates lunges with expanding shockwaves.

**Telegraphs.** Every attack is marked on the ground before it lands: a creature's windup fills a
ring at its feet, a wolf's leap draws the lane it crosses and a ring where it lands, a mushroom-folk
draws the reach of its spore burst, and Mycel's dig closes a ring on the spot he will erupt from.
The Fallen draw theirs twice as thick.

**Parry.** Whenever a blow is on its way — a wildling's shiv, a wolf's leap, a spore burst, the
Warden's or Hushmaw's lunge or ring — an **E** flashes over Aldren's head and a gold parry button
pops in beside the flask. That cue lasts the whole windup, but the blade only catches the blow in
the last **0.13 s** before it lands, so it is a matter of timing, not reaction. Get it right and
the blow never lands, Aldren is briefly untouchable, and the attacker is left **exposed** for under
two seconds, the way the Warden is after a missed charge, taking half again as much damage. Get it
wrong and the blade is out of position: 0.8 s locked out, stamina spent, and the blow still coming,
so mashing E is worse than not trying. With nothing coming at all, E interacts as usual.

## First journey

A new journey opens on five animated cards — the banishment — then Aldren walks up the southern
road into Hearthwood in rags. Rowan mends the broken sword and fits him with mail, which is when the
sprite and the portrait change to the armoured wanderer. Mira sends you for 6 timber and 3
ironstone; Rowan reinforces the blade; the north road leads to the sanctuary. When the Warden
falls, a winged light descends through the roof, the whole chamber brightens, and the Herald tells
Aldren to find his queen and cut her down. Swear to it, return to Mira for the hearth charm (+20
maximum health): with it, the Sanctuary hearth gains a Travel option that opens the world map as a
full screen of its own — repainted in the game's own pixel style with its title, legend, compass
and scale, the land cached and weather drawn live over it: clouds drift across, rain falls on the
marsh and the blight, fog curls at the coast, the lake shimmers and every known fire flickers under
a glow. Drag to pan, pinch, scroll or the + − buttons to zoom (from fitted to four and a half
times), tap a fire to choose it; the bar at the bottom names it and carries him there when the fire
is lit and the road is open. Escape, M, the × or the phone's back button close it. Fires are lit
where he has sat and dark where he has not, starting with Echo Grove to the south, the next region to
be built. The Warden never rises again: from then on
the sanctuary is the Herald's, and going back down opens its shop. The workbench builds a supply shelter for 8
timber and 2 ironstone, adding a flask when you rest.

**Death drops your embers where you fell.** Everything you were carrying stays on the ground as a
heap of coals with a standing flame and a light of its own, in the exact region, arena or room you
died in. Waking at the fire does not give them back: you have to walk to the pile and step on it.
Die again on the way and that pile is gone, replaced by the new one — and dying while carrying
nothing wipes whatever was still owed. The satchel lists how many are out there and where.

Progress is saved to browser localStorage: materials, attributes, upgrades, buildings, quests, the
relic, the Herald's vow and the embers you have lying on the ground somewhere. Combat position and
health reset when reloading. Death preserves everything else and returns you to the last fire. Reset your save from the title screen with New journey. Saves from before
the Herald are shifted onto the new seven-step quest table on load.

## Echo Grove

Walk off the south road out of Hearthwood and the light goes out: Echo Grove is twice the size of
Hearthwood, and its canopy is so thick that no daylight reaches the floor. A few great trees stand
far apart with low bushes between them,
and the only light is the glowing mushrooms along the paths in teal, violet and amber, the
fireflies, the fire by the entrance, and a faint glow on Aldren himself. One rule holds in every
region: nothing is planted on a path or a road — no tree, bush or mushroom. Walk back off the north path to return. Sit at the grove fire once and the hearth
charm remembers it, so the map can carry you between the two.

- **Wolves** hunt the paths in twos. They wait in the dark and only come once you are close, then
  close fast, crouch, and leap the distance — roll aside, not back. Grey, black and pale skins.
- **Mushroom-folk** (sporelings) keep a **village** in the east: wattle huts roofed with glowing
  caps, a skull over every door, and in the middle an iron pot on a fire with the last traveller
  going into it, the folk gathered round. Slow, tough, and their windup ends in a spore burst that
  reaches further than a blade. Teal, violet and amber caps.
- **The three Fallen** each die once, and while you are near one the boss bar comes up at the
  bottom with its name, its health and a tell for what it is about to do. Each has a move of its
  own: Greymane throws his head back and **howls**, then comes three leaps in a row; the
  Sporemother raises her arms and **spore-fall** rings mark the floor around you and burst a
  moment later; Mycel **goes to ground** and erupts where you were standing, and every leap he
  makes leaves spore pools that sting whoever steps in. Greymane's body leaves his **pelt**.

  When something too large to frame is on the floor — the Spore Monster, or Hushmaw in its den —
  the view pulls back on its own until it is gone.

  Two of them have a second stage at half health. The Sporemother swells to **twice her size** as
  the **Spore Monster**, strikes **three times as fast**, and every blow now billows a bank of
  spores that keeps hurting anyone standing in it. Mycel comes up onto his hind legs as **Mycel,
  Risen** — a taller, more infected thing with its hide split open on a green light — stops leaping
  and swipes with claws that leave **venom** in the wound: it ticks through rolls and i-frames until
  it runs out or a fire burns it away, and the health bar turns green while it works. His rend
  sweeps both claws and tears a ring of venomous ground out of the floor. **Greymane**, the
  scarred alpha, holds the boneyard in the far west in the open, a field of bones, ribcages,
  carcasses and old blood. **The Sporemother**, bloated and hung
  with gills, nests in the **sporehouse**: a mushroom the size of a house beyond the bog, a ladder
  up its stalk to a lit door in the cap, and inside a spongy gill-lined room with cap-lamps on the
  walls, bone middens and her nest at the back. **Mycel, the Grafted**, a wolf the grove grew
  mushrooms through, dens in **Mycel's cave**: a rock outcrop in the south wall of the hollow with
  a mouth breathing teal light, and a mushroom-lit warren of brown earth and root inside. Each room is its own
  small arena, like the Warden's, with the boss music while its Fallen lives and a way back out at
  the bottom; an emptied room stays empty. Rooms live in `src/systems/rooms.js` and are painted by
  `src/render/rooms.js`.
- **Ruins** stand in the empty quarters between the paths — a watchpost, a shrine, a sunken hall, a
  gate and a mill — cracked flagstones under moss and root, with columns, wall stubs and half an
  arch still up and solid. Three of them still hold a **chest**, which glints faintly in the dark
  and gives up what is in it once: 260 embers at the watchpost, 150 ironstone at the shrine, and
  500 embers with 200 ironstone in the sunken hall.
- **Small things** live here that want nothing to do with you: hares, beetles and pale moths sit
  out on the floor and bolt the moment you come near, running for the trees and vanishing. Another
  is out on the same patch a little later.
- **Pond frogs** sit at the edge of every standing water, croaking to each other across it every
  few seconds and swelling their throats as they do. They swell up and spit a slow gobbet of
  acid that burns where it lands. Weak, and easily killed — but a pond never stays empty: a frog is
  back within thirty seconds without anyone resting.
- **The den beneath the roots**, in the dead tree at the far south-east, is barred by living roots
  until the three Fallen are down. Inside waits **Vaelira, Thorn of the Grove** — the elf who kept
  this place before it kept her, and who is enjoying herself far more than she should. She fights
  **three rounds**, healing to full between them and changing her hands each time, with an
  animation for the change: she rises off the floor, throws her arms wide, the grove pours back into
  her, and she comes back with something new.

  | Round | Weapon | What she does |
  | --- | --- | --- |
  | I | Knives | she barely stops: short windups, a dash that turns on the spot and comes again two or three times over, and a step through the dark that puts her at your shoulder already cutting |
  | II | Whip | a wide arc that reaches most of the room, and a hook down a straight line that **catches you, reels you in and throws you at the wall** for enormous damage. She will not trade blows: she gives ground after every swing and backs off hard when you close |
  | III | Bow | a nine-arrow spread, a tight triple of aimed shots, and — once in seven moves, no more — her **ultimate**: she plants her feet and turns **a full circle and a quarter** clockwise in two seconds, loosing twice as fast as she used to, so the gap she opens behind her has closed again before you can walk into it |

  Everything she does is marked on the floor first, and the mark is the hit box: the lane her dash
  crosses and the ring where it ends, the circle her knives reach, the wedge the whip sweeps, the
  narrow lane the hook runs down with the hooks drawn on it, the five lines of a spread, the single
  bright line of an aimed shot, and for the ultimate a ring around the room with a hand sweeping to
  show which way she will turn. Her windups can be parried like anything else's.

  Felling her uncovers a carved stone: a circle split by a line, and one word, HADES.

By the grove fire sits **Orrin**, the lamp-seller, bent over his staff under a wide hat. For 300
embers he sells a **pocket lantern**: a brass box that burns a real hole in the dark around Aldren,
a wide circle of ordinary daylight-visible ground rather than a warm tint, and it works in the grove,
in both Fallen rooms and in Hushmaw's den. It is carried, not equipped, and shows under
Tools in the inventory. Wherever he walks, any canopy that would hide him all but vanishes so he
can see where he is going.

Echo Grove is not the camp: its wolves and mushroom-folk carry **75% more** health and damage than
they used to, and its Fallen and Hushmaw **three times** as much of both. Every boss and Fallen also
leaves **3 to 6 ironstone** on the ground alongside its embers.
Ordinary grove creatures come back after a rest, poorer each time, the same as the quarry. Dying
in the grove wakes you at whichever fire you last sat beside. The grove's geometry and painter
live in `src/world/echo.js`; the world module holds one region at a time and swaps on crossing.

## Gathering materials

Nothing lies on the ground to pick up. Materials come from two places, and both renew:

- **Trees** — strike any tree with your blade. Two light hits (or one heavy, once you have a
  point of Strength or a reinforced blade) fells it for **2–4 timber**; a heavy finishing blow
  splits more. The trunk leaves a stump you can walk over, and a sapling grows back over 45
  seconds.
- **Greyhollow Quarry**, east across the bridge — blue ironstone veins in the cut walls. Break one
  for **2–4 ironstone**; veins reform after 30 seconds. Two quarry brutes and a wildling live
  there, and they hit considerably harder than the creatures around camp.

**Resting at the hearth restores the whole region at once** — every felled tree, every broken
vein, and every quarry creature. That is the intended farming loop: clear, rest, repeat. The three
mossy wildlings around camp are the exception: they are practice, one kind only, and once each is
put down it never returns, on rest or on reload. Later in the story the camp will have no enemies
at all.

## Rowan's forge

Rowan does two separate things. **Reinforcing** adds +8 damage per level, up to **+5**, and its cost
climbs with each level. **Forging** replaces the blade entirely — a new weapon arrives unreinforced,
so reinforcement starts over, but the reach and base damage are yours immediately.

| Blade | Cost | Effect |
| --- | --- | --- |
| Traveler's Blade | — | the one you arrive with |
| Ironsong Longsword | 18 timber + 12 iron + 120 embers | +10 damage, +9 reach |
| Warden's Edge | not forged: a 15% drop when the Warden falls | +24 damage, +16 reach |

Reach is real: a longer blade genuinely connects from further out, for both the swing arc and its
hitbox. The Warden's Edge is rolled once, on the kill: if it drops it is taken up on the spot,
unreinforced, and Rowan can reinforce it but never make one. Since the Warden never rises again,
most journeys will not see it.

## The Herald's shop

Once the vow is sworn, E on the Herald in the sanctuary trades embers for the road ahead. The list
lives in `HERALD_WARES` in `src/core/gear.js`; anything new the game needs goes there.

| Ware | Cost | Effect |
| --- | --- | --- |
| Vial of dawn | 35 embers, up to 5 held | drunk automatically by F when the flasks are empty, +45 vitality |
| Deeper flask | 180 embers, then ×1.6, up to 2 | +1 sunlit flask permanently |
| Blessing of light | 220 embers, once | heavy strikes cost 8 less stamina |

## Armor

Armor is a slot in the inventory. Defense comes off every blow he takes, and a set can carry more
than that.

| Armor | Where | Effect |
| --- | --- | --- |
| Road rags | what the banishment left him | nothing |
| Mended mail | Rowan, at the forge | −2 damage from every blow |
| Greymane's Pelt | off the alpha's body in Echo Grove | −3 damage, +15 stamina, +3 stamina recovery |

## Building Hearthwood

The workbench builds four permanent additions, each costing more than the last:

| Building | Cost | Effect |
| --- | --- | --- |
| Supply shelter | 8 timber + 2 iron | +1 sunlit flask whenever you rest |
| Stone well | 16 timber + 9 iron | flasks restore +12 vitality |
| Whetstone rack | 30 timber + 20 iron + 60 embers | +4 damage on every strike |
| Ember brazier | 34 timber + 22 iron + 150 embers | attributes cost 12% fewer embers |

Every one of them appears in the camp once built, and each is solid — as are the tents, the smithy,
the workbench and the campfire. Walking into a structure slides you along it rather than stopping
you dead, and creatures respect the same footprints.

## Embers and attributes

Embers drop from every creature you kill (12 from a wildling, 26 from a quarry brute, 150 from the
Warden). A creature that comes back after a rest is worth less each time — 70% of the last kill,
never below a quarter of its base — so the quarry rewards moving on rather than farming one spot.
The practice wildlings around camp die once and pay in full. They are spent at the campfire — *Rest at the hearth → Kindle · spend embers* — on five
attributes, souls-style. The first point in any attribute costs 45 embers and each one after costs
about 16% more, capped at level 20.

| Attribute | Per level |
| --- | --- |
| Vitality | +12 maximum vitality |
| Endurance | +7 stamina, +1.5 stamina recovery per second |
| Strength | +4 damage on every strike |
| Agility | +2% movement speed, +0.012s dodge invulnerability |
| Resolve | +5 flask healing, +1 flask every 3 levels |

Your character level is 1 plus the sum of your attributes. Press **C**, or tap the portrait, for the
**inventory**: a full-body look at Aldren in whatever he is holding and wearing, then his blades,
armor and relics with Equip / Wear / Remove buttons, and the satchel. The **character sheet** with
attributes, condition, strike numbers, the relic worn and what stands at Hearthwood lives at the
hearth, next to kindling, and the two panels link to each other there. Every blade keeps its own reinforcement level, so swapping back to an old sword brings
Rowan's work with it. Armor is a slot too: the road rags he arrives in, then Rowan's mended mail,
which takes 2 off every blow; set the mail aside and he is back in rags, sprite and all. Only one
relic is worn at a time.

## NPC conversations

Mira, Rowan and the Herald speak through a classic bottom text box — nothing is dimmed, the world
keeps moving behind it — with original pixel head-and-shoulders portraits, a name tag, and clickable
response choices. Long lines come one paragraph at a time: tap the box, or press E, Enter or Space,
to turn the page; the choices wait for the last one. A speech bubble hangs over anyone you are close
enough to talk to, and a red "!" bubble marks whoever has something new to say. Walk up and
press E (or tap Interact) to talk. Escape or the × button leaves the conversation. Tab/Shift+Tab
cycles through the conversation buttons. Combat pauses while talking.

## Characters & animation

Creature and boss art follows the reference sheets in `Ref art/`. Wildlings are hunched, long-armed
goblins with deep-set glowing sockets and tusks, and they come in three skins so no two neighbours
match: the mossy forest goblin with a spined back and a bone shiv (the only creature around camp),
the ash raider in a fur mantle and red war paint swinging a chipped hatchet, and the bog ghoul —
sunken ribs, marsh-light eyes, dripping, nothing but claws; both of those live at the quarry. Brutes are heavier and hunched under a stone maul; the quarry brute
wears slabs of grey stone, the ironback rusted iron with ironstone crystals grown through it. Skins
are a look only: stats and rewards follow the kind, and `SKIN_KEYS` in `src/systems/entities.js`
lists them. The Hollow Warden is a gaunt, stooped thing under a wide
bone crown hung with gold, with a pale mask split by a red gash, a ridge of vertebrae up its back, a
ragged tail, rotting wraps on its shins and gold bands on the wasted arm — in phase two embers climb
out of its ribcage.

The wanderer wears layered chain and plate, a crested steel helm, a torn crimson cloak, and brass
accents — once Rowan has fitted him out. Before that he is the beggar king: bare-headed, a torn
brown cloak over a grey shirt, cloth-wrapped shins and the snapped sword, sharing the same walk,
facing and swing. The Herald is a robed, winged figure under a ring of light that hovers over the
sanctuary altar with a slow wing-beat. Front, back, left and right views follow movement. Footsteps advance with actual distance
travelled, with alternating legs, arm motion, and cloak sway. Dodge rolls use a tucked silhouette.
Sword windup, slash, and recovery share their direction and timing with the attack arc and hit
resolution. Mira has a breathing/idle animation; Rowan works his hammer; wildlings, quarry brutes
and the Warden have movement and attack motion. Pausing freezes animation.

## Sound

Sound is on by default and the speaker button remembers your choice across journeys. Two looping
tracks carry the title and Hearthwood: *Iron and Ash* under the title and the banishment cards, and
*Stone and Silence* in the camp and its quarry, with *The Final Chant* for the Warden. Each region
brings its own pair, and crossing the border changes the song: Echo Grove plays *Mire of Forgotten
Things* in the open and *Slimey Spore Swarm* for every fight in it — all three Fallen and Vaelira.
A boss track runs from the moment a living boss is entered until it falls, you leave, or you die. Every switch is a crossfade of a few
seconds, and the music pauses and resumes with the speaker. Browsers allow audio only after a first tap or key, so
the music begins on the first touch of the title screen. The blade uses recorded samples in `src/assets/audio/`
(Dragon Studio): two sword slices alternate as each swing leaves its windup, and an armour impact
plays whenever Aldren's strike connects. Blows he takes rotate through five separate shield-impact
recordings, pitched a little lower for heavy hits, so a beating never sounds like a loop. A footstep sounds every third
footfall and reads the painted ground under Aldren: green pixels play the grass step, paths, the
clearing, the quarry and the sanctuary floor play the dirt step, each nudged a little in pitch.
Everything else (rolls, chopping, the Warden's tells, menus) is still synthesized in
`src/systems/audio.js`.
Voices: Vaelira speaks for herself, pitched a little up — she answers back when she is cut, has a
line as she takes up the whip, and one more as she goes down. The Warden roars a different line for the lunge and the
slam, and cries out when it falls; wildlings pick one of four goblin voices as they wind up and brutes snarl lower and louder, though
creatures speak on only about half their swings and never twice within a few seconds, and the
Warden roars for about two attacks in three; Aldren has a death
cry of his own. Under the music in the wilds a forest-wind ambience loops quietly; it fades out in the sanctuary
and comes back on the way out. Nothing streams: the clips ship inside the app like the rest of `src/`.

## Atmosphere

Deep forest shadows, dark charcoal stone, golden paths, and copper foliage give the world strong
value contrast. **It is always raining a little**, everywhere outdoors — a thin drift of it drawn in
screen space with splashes where it lands, heavier under Echo Grove's canopy than around Hearthwood.
The world moves: the river carries ripples and bank foam downstream under the bridge,
every canopy leans and flutters in a wind that ripples across the forest by position, and leaves
tumble past on gusts that rise and fall. Status toasts sit low, above the bottom edge. Campfires, forge embers, path lanterns, quarry lamps and sanctuary braziers cast
animated amber light; ironstone veins and crystal clusters give localized cool glow. Hits produce
directional pixel blood, lingering ground stains, and fragments on heavy or lethal hits. Chopping
throws wood chips; breaking stone throws rock chips. Effects are bounded, fade over time, stay in
their own scene, and clear when resting.

## Project layout

```
index.html          markup and HUD only — no game logic
style.css
src/
  main.js           bootstrap: load save, wire events, start the loop, expose diagnostics
  core/
    state.js        progress, player, runtime flags, derived stats, save/load
    platform.js     app vs browser, fullscreen, orientation, back button, quit
    stats.js        attribute definitions and ember cost curve
    gear.js         craftable weapons and camp buildings
    rng.js          the shared deterministic world RNG
    events.js       tiny pub/sub for cross-cutting moments (death, boss defeat)
    input.js        keyboard, mouse, touch and HUD button bindings
    loop.js         update(dt) orchestration and the rAF frame
  world/
    world.js        the live region: trees, veins, NPCs, solids, exits; enterRegion swaps them
    echo.js         Echo Grove: layout, terrain painter, mushrooms, the cave
    terrain.js      one-time offscreen painting of the static map
    quarry.js       Greyhollow Quarry geometry
    regions.js      the regions of the world map, their campfires and map positions
    interact.js     what E does, and every NPC conversation
  systems/
    combat.js       committed swings, strike resolution, rolls, damage
    player.js       movement, healing, resting, respawning
    entities.js     enemy archetypes, spawns, target selection
    inventory.js    owning and equipping blades, armor and relics
    enemies.js      creature AI
    boss.js         the main-boss state machine, one spec per boss
    vaelira.js      Vaelira's three rounds: knives, whip, bow, and the turn
    rooms.js        the Fallen's rooms: the sporehouse and the burrow
    herald.js       the winged light that descends once the Warden falls
    effects.js      particles, blood, debris, floating numbers
    audio.js        opt-in synthesized feedback
  render/
    primitives.js   rect / ellipse / poly / path / label
    actors.js       the wanderer, NPCs, creatures, the Warden, swing arc
    scenes.js       the wilds and the sanctuary, props, flora, quarry
    intro.js        the five animated banishment scenes behind the intro cards
    rooms.js        the sporehouse and burrow interiors
    worldmap.js     the world map in the game's pixel style, for the travel screen
    lighting.js     glow sprites and the screen-blend atmosphere pass
    portraits.js    conversation busts
    renderer.js     canvas, camera, pixel scaling, the composite draw
  ui/
    dialogs.js      the modal/conversation panel
    menus.js        controls, inventory, character sheet, ember kindling, shop rows, pause, death
    hud.js          vitals, quest, boss bar, toasts
    dom.js          $ and element helpers
    icons.js        pixel icon set, cached as data URIs
    screens.js      title, intro and play screens, transitions, chrome icons
    story.js        the intro cards, the walk into camp, captions, the Herald's words
    travel.js       the full-screen world map: pan, zoom, pick a fire, travel
docs/
  STORY.md          the story, what the player is told when, and the chapter plan
tools/
  build.mjs         copies the game into dist/ for packaging
  map-preview.html  paints the travel map at 2x from the dev server, for eyeballing it
                    (`index.html?map` on the dev server opens the real map screen at once;
                    add `&lamp` to a grove flag to start with the pocket lantern,
                    `&rage` to drop a Fallen to half health and see its second stage,
                    `&den` to start Vaelira's fight (`&den=2`, `&den=3` at that round);
                    `?grove`, `?grove=bog`, `?grove=hollow`, `?grove=sporehouse`, `?grove=burrow` and `?grove=cave` drop into Echo Grove)
android/            Capacitor Android project (generated, then hand-tuned)
src-tauri/          Tauri desktop shell
tests/
  mechanics.mjs     deterministic checks against a mocked DOM
  dom-stub.js
```

Two rules keep the modules honest:

1. **`core/rng.js` is one shared stream.** Tree placement and terrain painting both
   draw from it in that order, so the order and count of `rand()` calls defines the map. Append new
   painting at the end of `paintTerrain`; never insert calls in the middle.
2. **Systems never import UI to announce something.** `core/events.js` carries the cross-cutting
   moments (`death`, `bossDefeated`, `enteredPlay`) so `combat.js` does not need to know that menus
   exist.
3. **One guard decides whether the wanderer may act.** `state.playing()` is true only on the play
   screen with no panel open, unpaused and alive; `attack`, `roll`, `heal` and `interact` all defer
   to it rather than re-deriving the condition.

`Ref art/` holds the reference images used while drawing; none of them ship in the game — all world
art is procedural canvas pixel artwork.

## Verification

Run `node tests/mechanics.mjs` (or `npm test`) for deterministic mechanics checks against a mocked
DOM/canvas. 89 checks cover stamina, dodge invulnerability, attack damage and reach, gathering, tree
felling and regrowth, ore veins, quarry brutes, enemy and structure collision, sliding along camp
footprints, weapon forging and its cost curve, building effects and costs, save migration from
pre-building saves, ember costs and attribute effects, the attribute cap, boss phases and rewards,
healing, respawn persistence, camp flasks, bridge collision, blood generation, effect limits,
rendering of every creature and Warden state, directional animation, walk-cycle progression,
contact-frame damage, cancelled/missed swings, the title screen running no gameplay, icon
rendering, platform fallbacks, and the offline-assets guarantee.

Browser smoke checks in headless Chrome additionally verified boot with no console errors, keyboard
movement, every dialogue path, chopping and mining end to end, both menu panels, and the boss round
trip. The intro cards, the walk into camp, the ragged king and the bottom conversation box were
checked on a physical Android device over adb. Physical-device feel and balance still need
playtesting.

## Scope

Two outdoor regions — Hearthwood with its quarry, and Echo Grove — two NPCs and the Herald, four camp buildings, three craftable blades with three
reinforcement levels each, five attributes, four creature types, three named Fallen, and two two-phase bosses. All world art is procedural canvas pixel
artwork; reference images are not redistributed in the game. Audio is opt-in: recorded sword samples plus
synthesized feedback. No backend, account, or external game engine.
