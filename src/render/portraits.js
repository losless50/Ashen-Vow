import { rect, poly, path, ellipse } from './primitives.js';

export const SPEAKERS = {
  mira:  { name: 'Mira',  role: 'The wayfarer',  caption: 'A familiar face by the fire' },
  smith: { name: 'Rowan', role: 'The camp smith', caption: 'Good steel. Steady hands.' },
  herald: { name: 'The Herald', role: 'A voice from above', caption: 'Light where none should be' },
  peddler: { name: 'Orrin', role: 'The lamp-seller', caption: 'Older than the grove, he says' },
  apothecary: { name: 'The Brewer', role: 'Of the mushroom-folk', caption: 'It will not meet your eye' },
  wife: { name: 'Neve', role: 'Orrin’s wife', caption: 'Months under a hatch, and still standing' },
};

/**
 * The brewer: a speckled cap filling the whole frame, a pale stalk beneath it,
 * and two small lights where a face would be on something that had one.
 */
function brewerPortrait(c) {
  ellipse(c, 48, 92, 34, 30, '#2a1f2e55');
  // Stalk.
  poly(c, [[34, 120], [38, 70], [58, 70], [62, 120]], '#d8cdb4');
  poly(c, [[38, 118], [41, 72], [50, 72], [49, 118]], '#efe6d0');
  // A collar of gills where cap meets stalk.
  ellipse(c, 48, 70, 26, 8, '#5a3646');
  for (let i = 0; i < 11; i++) path(c, [[26 + i * 4, 66], [26 + i * 4, 74]], 1, '#3e2431');
  // The cap.
  poly(c, [[6, 66], [12, 40], [28, 20], [48, 13], [68, 20], [84, 40], [90, 66]], '#7a4a5e');
  poly(c, [[11, 64], [17, 42], [31, 25], [48, 18], [65, 25], [79, 42], [85, 64]], '#9a5f76');
  poly(c, [[20, 58], [26, 38], [38, 26], [48, 23], [44, 34], [34, 46], [26, 60]], '#b0728a');
  // Speckles.
  for (const [sx, sy, r] of [[30, 36, 6], [52, 28, 7], [68, 42, 5], [20, 52, 4], [78, 56, 4], [44, 46, 5]])
    ellipse(c, sx, sy, r, r * .72, '#e8dcc8');
  // The lights under the brim.
  for (const ex of [40, 57]) { ellipse(c, ex, 62, 3.4, 3.4, '#f6e7a8'); ellipse(c, ex, 62, 1.6, 1.6, '#fffdf0'); }
  // Gourds on a cord across the stalk.
  path(c, [[32, 86], [64, 100]], 2, '#5a4632');
  for (const [gx, gy, tint] of [[38, 88, '#b6577a'], [48, 92, '#79b657'], [58, 96, '#5789b6']]) {
    rect(c, gx - 3, gy, 7, 9, tint);
    rect(c, gx - 1, gy - 3, 3, 4, '#4a3826');
  }
}

/** Neve: cropped hair, hollowed eyes, a blanket held shut at the throat. */
function nevePortrait(c) {
  ellipse(c, 48, 78, 36, 38, '#4a405035');
  // Blanket over the shoulders.
  poly(c, [[4, 120], [16, 84], [34, 74], [48, 80], [62, 74], [80, 84], [92, 120]], '#5a4236');
  poly(c, [[10, 120], [22, 88], [36, 79], [48, 85], [60, 79], [74, 88], [86, 120]], '#7a5a4a');
  poly(c, [[40, 78], [48, 88], [56, 78], [56, 120], [40, 120]], '#4a4050');
  // Throat and jaw.
  rect(c, 40, 62, 16, 16, '#b98a68');
  poly(c, [[28, 30], [38, 20], [58, 20], [68, 30], [68, 52], [60, 68], [48, 74], [36, 68], [28, 52]], '#c99a74');
  // What a long dark does to a face.
  c.globalAlpha = .32; ellipse(c, 39, 45, 7, 5, '#6a4a42'); ellipse(c, 58, 45, 7, 5, '#6a4a42'); c.globalAlpha = 1;
  rect(c, 35, 43, 7, 4, '#1a1620'); rect(c, 55, 43, 7, 4, '#1a1620');
  rect(c, 36, 41, 8, 2, '#3a2e2c'); rect(c, 54, 41, 8, 2, '#3a2e2c');
  rect(c, 45, 50, 5, 8, '#a8785a');
  path(c, [[41, 62], [56, 62]], 2, '#8a5f4a');
  // Hair, cut short with something that was not scissors.
  poly(c, [[25, 44], [27, 22], [40, 12], [58, 12], [70, 22], [72, 46], [67, 30], [58, 26], [38, 26], [30, 32]], '#3a2e2c');
  for (const [hx, hy] of [[30, 30], [44, 20], [60, 22], [68, 34]]) rect(c, hx, hy, 3, 7, '#2a2120');
}

/** Orrin: a face like a walnut under a wide hat, a white beard, one lamp on a hook. */
function peddlerPortrait(c) {
  poly(c, [[8, 120], [22, 84], [40, 76], [48, 82], [56, 76], [74, 84], [88, 120]], '#3b3126');
  poly(c, [[10, 120], [24, 88], [40, 80], [48, 86], [56, 80], [72, 88], [86, 120]], '#5a4a36');
  rect(c, 40, 78, 16, 12, '#8a6f4d');
  // Head, deeply lined.
  poly(c, [[30, 30], [40, 22], [56, 22], [66, 30], [66, 52], [60, 66], [48, 72], [36, 66], [30, 52]], '#a8785a');
  poly(c, [[33, 32], [41, 26], [55, 26], [63, 32], [63, 50], [58, 62], [48, 67], [38, 62], [33, 50]], '#c99a74');
  for (const [x0, y0, x1, y1] of [[36, 40, 44, 41], [52, 40, 60, 41], [40, 50, 44, 53], [52, 53, 56, 50], [42, 34, 54, 34]]) path(c, [[x0, y0], [x1, y1]], 1, '#8a5a40');
  rect(c, 38, 42, 7, 2, '#f3ddc4'); rect(c, 51, 42, 7, 2, '#f3ddc4'); rect(c, 40, 42, 2, 2, '#3a4a5a'); rect(c, 53, 42, 2, 2, '#3a4a5a');
  rect(c, 46, 45, 3, 8, '#a46c59');
  // The beard, long and white.
  poly(c, [[34, 56], [62, 56], [66, 74], [58, 96], [48, 104], [38, 96], [30, 74]], '#e6e2d4');
  poly(c, [[38, 60], [58, 60], [60, 76], [48, 92], [36, 76]], '#cfc9b8');
  path(c, [[42, 58], [48, 60], [54, 58]], 1, '#8d4451');
  // The hat: wide, sagging, with a cord.
  poly(c, [[10, 34], [28, 28], [40, 8], [56, 8], [68, 28], [86, 34], [80, 40], [48, 36], [16, 40]], '#2a2320');
  poly(c, [[14, 33], [30, 29], [41, 12], [55, 12], [66, 29], [82, 33], [76, 37], [48, 33], [20, 37]], '#4a3d33');
  rect(c, 30, 26, 36, 3, '#8a6f4d');
  // A lamp on a hook at his shoulder.
  rect(c, 76, 60, 2, 14, '#4a3d33'); rect(c, 71, 74, 12, 14, '#2a2320'); rect(c, 73, 76, 8, 10, '#ffcf7a'); rect(c, 75, 78, 4, 6, '#fff2c4');
}

/** A hooded, haloed figure — pale, gilded and hard to read. */
function heraldPortrait(c) {
  ellipse(c, 48, 62, 46, 56, '#fff1c018');
  c.strokeStyle = '#ffe29a';
  c.lineWidth = 3;
  c.beginPath();
  c.arc(48, 40, 30, 0, Math.PI * 2);
  c.stroke();
  poly(c, [[2, 120], [6, 70], [22, 50], [30, 78], [26, 120]], '#e2dac6');
  poly(c, [[94, 120], [90, 70], [74, 50], [66, 78], [70, 120]], '#e2dac6');
  poly(c, [[8, 120], [24, 84], [40, 76], [48, 82], [56, 76], [72, 84], [88, 120]], '#f6f1e4');
  rect(c, 30, 96, 36, 3, '#d9b86a');
  poly(c, [[26, 72], [24, 36], [36, 18], [60, 18], [72, 36], [70, 72], [58, 66], [38, 66]], '#ede5d2');
  poly(c, [[30, 70], [30, 40], [40, 26], [56, 26], [66, 40], [66, 70], [48, 64]], '#dfd5be');
  poly(c, [[34, 32], [48, 26], [62, 32], [64, 50], [58, 64], [48, 68], [38, 64], [32, 50]], '#f9f3e6');
  rect(c, 38, 46, 7, 3, '#fff2b0'); rect(c, 51, 46, 7, 3, '#fff2b0');
  rect(c, 40, 46, 3, 3, '#ffd77a'); rect(c, 53, 46, 3, 3, '#ffd77a');
  path(c, [[44, 59], [48, 60], [52, 59]], 1, '#c9b79a');
}

/** Original 96x120 head-and-shoulders bust, sharing palettes with the world sprites. */
export function drawNpcPortrait(c, speaker) {
  const smith = speaker === 'smith';
  c.clearRect(0, 0, 96, 120);
  c.imageSmoothingEnabled = false;
  if (speaker === 'herald') { heraldPortrait(c); return; }
  if (speaker === 'peddler') { peddlerPortrait(c); return; }
  if (speaker === 'apothecary') { brewerPortrait(c); return; }
  if (speaker === 'wife') { nevePortrait(c); return; }
  const skin = smith ? '#ba805b' : '#d49a78', light = smith ? '#e5b58a' : '#f2c4a0', shade = smith ? '#774c3d' : '#a46c59';
  ellipse(c, 49, 74, 40, 42, smith ? '#60422740' : '#71314435');
  if (!smith) {
    poly(c, [[20, 25], [26, 14], [42, 7], [61, 10], [72, 20], [76, 42], [71, 71], [83, 111], [13, 118], [16, 78], [15, 48]], '#10121d');
    poly(c, [[19, 44], [27, 25], [27, 70], [21, 102], [17, 118], [10, 118], [16, 80]], '#241b30');
  }
  // Neck, shoulders and layered clothing.
  rect(c, 37, 57, 23, 25, shade); rect(c, 43, 57, 14, 21, skin);
  poly(c, [[4, 91], [23, 80], [35, 75], [47, 81], [61, 76], [77, 81], [92, 94], [96, 120], [0, 120]], '#100e19');
  poly(c, [[5, 94], [27, 83], [37, 79], [48, 86], [60, 80], [77, 87], [91, 96], [94, 120], [2, 120]], smith ? '#65432c' : '#6c1834');
  if (smith) {
    poly(c, [[22, 87], [33, 80], [46, 86], [60, 80], [74, 87], [70, 111], [28, 110]], '#526071');
    for (let yy = 88; yy < 114; yy += 4) for (let xx = 29; xx < 71; xx += 4) { rect(c, xx + (yy % 8 ? 1 : 0), yy, 2, 1, '#a2adb0'); rect(c, xx, yy + 1, 1, 2, '#253240'); }
    poly(c, [[30, 90], [37, 95], [62, 95], [69, 89], [72, 120], [27, 120]], '#88522c');
    path(c, [[28, 84], [35, 104]], 4, '#c38a4d'); path(c, [[72, 84], [65, 104]], 4, '#b57a46');
    rect(c, 34, 100, 5, 5, '#e0b879'); rect(c, 61, 100, 5, 5, '#e0b879'); rect(c, 39, 110, 24, 3, '#4d3026');
    for (let i = 0; i < 11; i++) { const x = 7 + i * 8, y = 83 + Math.abs(5 - i) * 2; poly(c, [[x - 5, y + 2], [x - 2, y - 7], [x + 3, y - 3], [x + 6, y - 6], [x + 8, y + 6], [x + 3, y + 12]], i % 2 ? '#957357' : '#6a4e3c'); rect(c, x, y - 2, 3, 6, '#bd9670'); }
  } else {
    poly(c, [[7, 94], [29, 78], [35, 88], [27, 101], [32, 120], [9, 120]], '#9c2846');
    poly(c, [[89, 95], [68, 78], [61, 90], [68, 104], [66, 120], [91, 120]], '#481329');
    path(c, [[9, 94], [29, 80], [33, 89], [25, 100], [29, 115]], 2, '#de6570');
    path(c, [[68, 81], [64, 91], [72, 100]], 2, '#ab4356');
    poly(c, [[36, 82], [47, 87], [61, 82], [59, 103], [48, 113], [36, 102]], '#281a2c');
    path(c, [[36, 87], [46, 98], [59, 87]], 1, '#deb57b');
    poly(c, [[47, 96], [52, 101], [47, 108], [43, 101]], '#d49d58'); rect(c, 46, 98, 2, 5, '#ffda8b');
  }
  // Face contour, ears and soft angular lighting.
  rect(c, 24, 35, 6, 15, shade); rect(c, 65, 36, 6, 14, shade);
  poly(c, [[27, 25], [36, 17], [55, 17], [66, 26], [66, 47], [60, 62], [48, 71], [36, 66], [28, 53]], shade);
  poly(c, [[30, 27], [39, 20], [55, 21], [62, 28], [63, 47], [58, 60], [48, 66], [37, 61], [31, 49]], skin);
  poly(c, [[40, 23], [53, 22], [59, 28], [59, 40], [55, 45], [54, 56], [47, 62], [42, 57], [44, 43]], light);
  rect(c, 31, 34, 11, 3, shade); rect(c, 52, 34, 11, 3, shade);
  // Separate brows and eyes give each portrait an expression at small sizes.
  path(c, smith ? [[30, 34], [35, 32], [41, 34]] : [[30, 33], [35, 31], [41, 32]], 2, smith ? '#392925' : '#33222c');
  path(c, [[52, 32], [58, 31], [64, 33]], 2, smith ? '#392925' : '#33222c');
  rect(c, 32, 38, 9, 3, '#ead6bc'); rect(c, 53, 38, 9, 3, '#f3ddc4');
  rect(c, 36, 38, 3, 3, smith ? '#695844' : '#66726c'); rect(c, 56, 38, 3, 3, smith ? '#695844' : '#66726c');
  rect(c, 37, 38, 1, 3, '#171820'); rect(c, 57, 38, 1, 3, '#171820');
  rect(c, 32, 37, 9, 1, '#37242b'); rect(c, 53, 37, 9, 1, '#37242b');
  path(c, [[48, 38], [46, 48], [50, 49]], 2, shade); rect(c, 48, 40, 2, 7, light);
  path(c, [[41, 55], [47, 57], [55, 54]], 1, smith ? '#5b342d' : '#8d4451'); rect(c, 44, 58, 7, 1, light);
  if (smith) {
    poly(c, [[25, 29], [24, 20], [31, 12], [46, 9], [58, 12], [67, 19], [68, 32], [62, 27], [57, 22], [48, 20], [39, 23], [31, 22], [28, 34]], '#2d2322');
    rect(c, 30, 17, 12, 3, '#725340'); rect(c, 46, 14, 9, 3, '#8a664d'); rect(c, 60, 21, 5, 6, '#634836');
    poly(c, [[27, 45], [32, 50], [37, 52], [39, 56], [48, 59], [56, 54], [61, 48], [65, 45], [62, 61], [54, 72], [44, 76], [34, 67], [29, 57]], '#382927');
    path(c, [[32, 53], [37, 63], [44, 68]], 3, '#72523e'); path(c, [[57, 57], [52, 66], [45, 70]], 2, '#957253');
    rect(c, 39, 51, 17, 3, '#473029'); rect(c, 45, 55, 8, 2, '#251c21');
    path(c, [[62, 38], [60, 43], [61, 46]], 1, '#ebc29b');
  } else {
    poly(c, [[24, 36], [25, 21], [36, 12], [51, 11], [65, 18], [70, 28], [68, 46], [61, 38], [58, 26], [48, 22], [40, 29], [30, 31], [28, 48]], '#171520');
    path(c, [[24, 31], [29, 22], [40, 16], [50, 16]], 3, '#3c2d40'); path(c, [[28, 24], [38, 19], [48, 18]], 1, '#735263');
    poly(c, [[24, 34], [30, 30], [30, 55], [25, 80], [19, 96], [24, 65]], '#1c1726'); path(c, [[27, 36], [27, 58], [22, 80]], 2, '#533044');
    path(c, [[62, 24], [65, 37], [64, 58], [70, 82]], 3, '#2f2033');
    rect(c, 64, 48, 2, 6, '#deb779'); rect(c, 64, 54, 3, 3, '#ffcf8c');
  }
}
