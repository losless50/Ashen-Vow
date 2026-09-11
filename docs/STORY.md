# Ashen Vow — story and chapter plan

*In ash, we remember. In vow, we rise.*

The world map in `Ref art/world-map.png` is the reference for the full game. Hearthwood Camp is
the "Sanctuary · Main Camp" at its centre; every named site around it is a future region.

## The story

**The beginning.** The kingdom of Eldoria was prosperous under King Aldren and Queen Seraphine.
Then, without warning, the Queen changed: executions, villages burned for resisting her, strange
soldiers and creatures at her side. Aldren tried to stop her and failed. Accused of treason, he was
stripped of his crown and banished into the wilderness with the clothes on his back and a broken
sword. Deep in the woods he finds a small encampment: Mira, the fire keeper whose campfire holds the
creatures of the forest at bay, and Rowan, a rough but talented smith who mends his ruined gear.
They know who he is. Neither treats him like royalty.

**The middle.** Aldren rebuilds his strength in the wilderness. Ruins lie under the trees, abandoned
settlements are full of corpses, and enormous creatures hold territory. Hellspawn appear, drawn from
underground ruins. Corrupted champions known as the Fallen hold the regions; felling each returns a
fragment of Aldren's old strength and a piece of the truth. Symbols in the ruins repeat one name:
Hades. The corruption began when Seraphine changed.

**The return.** Aldren reaches Eldoria and finds it ruined: broken walls, empty streets, banners
replaced by strange symbols, hellspawn in the towns. He fights to the throne room. Seraphine does not
recognise him. Something ancient looks out through her eyes.

**The truth.** Hades possessed the Queen. She was chosen because she was powerful enough to be his
vessel, not because she was evil. Every execution and burned village thinned the barrier between the
worlds. Aldren's banishment was part of the plan: remove the king, leave the kingdom defenceless.

**The end.** Aldren refuses to kill Seraphine and fights Hades directly as the boundary collapses.
Hades abandons her body and reveals his true form. Aldren defeats him and breaks his hold. The
hellspawn fade, the corruption recedes, Seraphine survives, broken but alive. The kingdom is still in
ruins, but Aldren finally has the chance to build something new. Mira and Rowan wait at the edge of
the woods. The campfire is still burning.

**Theme.** Being a king is not about possessing a kingdom. It is about protecting the people who
remain when the kingdom is gone.

## What the player is told, and when

The game keeps the truth back. Everything before the throne room is told from Aldren's point of
view, and he believes his wife betrayed him.

1. **Intro.** The banishment, in five text cards, then Aldren walks into Hearthwood along the
   southern road. *(built)*
2. **Hearthwood tutorial.** Rowan mends the broken sword and fits him with armour. Mira sends him
   to gather, Rowan reinforces the blade, the north road leads to the old sanctuary. *(built)*
3. **The Hollow Warden.** The first of the Fallen. *(built)*
4. **The Herald.** After the Warden falls, a winged figure descends into the sanctuary and the
   whole chamber brightens. It tells Aldren that Seraphine has given herself to something old,
   that the kingdom burns, and that he must cut her down and reclaim the throne. It is never named
   as anything but "The Herald", and the player is given no reason yet to doubt it. The Warden
   never rises again; the sanctuary becomes the Herald's shop, trading embers for vials, deeper
   flasks and blessings — the list in `HERALD_WARES` grows as the road demands. *(built)*
5. **Fast travel.** With the hearth charm, Mira tells Aldren the Sanctuary fire can carry him to
   any campfire he has found, and home again. Travel is done only at the Sanctuary hearth (rest →
   Travel), on the world map drawn in the game's style — `src/render/worldmap.js`. The Herald has nothing to do with it. *(hearth menu built; destinations come with the
   regions)*
6. **The regions.** One at a time, following the map (`Ref art/world-map.png`): each has a campfire,
   a Fallen mini boss (skull) or a main boss (crown), a fragment of the truth, and its own creature
   kinds — the camp keeps only the mossy wildling as a one-time practice kill, the quarry has the
   ash raider, the bog ghoul and the two brutes, and every region after adds new kinds rather than
   reusing these. Order: **Echo Grove** (south — trees too thick for sunlight, lit only by glowing
   mushrooms and fireflies; wolves and humanoid mushroom monsters — *built*: three Fallen in three
   lairs gate the cave, Hushmaw in the cave reuses the Warden's fight for now, and the stone
   behind it gives the first fragment: the split-circle sigil and the name HADES — the den's keeper
   is Vaelira, an elf warden the grove took, fought in three rounds), then Dreadmarsh, Emberfall
   Ruins, Wolfspire, Mirror Lake, Stonebloom Cliffs, Hollowroot Caverns, Sunken Vault, The Blighted
   Woods; main bosses at Frostveil Summit and Eldoria. Region keys live in `src/world/regions.js`.
7. **Eldoria and the throne room.** The reveal, Hades, the ending.

## Save-facing quest steps

| step | title | objective |
| --- | --- | --- |
| 0 | The fallen king | Speak to Rowan at the forge. |
| 1 | A spark of belonging | Speak to Mira beside the campfire. |
| 2 | Gather a little hope | 6 timber, 3 ironstone, reinforce at Rowan. |
| 3 | Beyond the treeline | Follow the north road to the sanctuary. |
| 4 | The hollow heart | Defeat the Hollow Warden. |
| 5 | A voice from above | Return to Mira at Hearthwood. |
| 6 | The road to Eldoria | Grow strong; the road east opens next. |

Saves written before the Herald existed carry no `version` field and are shifted onto this table
when loaded.
