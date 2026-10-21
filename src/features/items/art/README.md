# Item art

Pictures for items, drawn wherever an item is: tiles, details, equipment and
pet slots, loadouts, the market. An item without art keeps its Game Icons icon,
so art can arrive one item at a time.

- **Name** a file for the item's id (`weapons/bronze-dagger.png`); for a pet,
  its content `image` (`pets/tarantula.png`), since a pet item's id carries its
  rarity.
- **Folders** are only for tidiness: lookup is by file name alone, and two
  files with the same name fail the script.
- **Format**: square PNG, transparent background, 256×256, about 8% empty
  margin. Tiles draw it at 37–60px, slots at 48, details at 64, so keep the
  shape bold enough to read small.
- **Indexing** is automatic: `npm start` (and tunnel, android, ios) indexes
  on launch and again whenever a file here changes, and the app reloads.
  `npm run check` fails if the index is out of date.
