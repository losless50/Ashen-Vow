// The five drawing calls every sprite in the game is built from.
export function rect(c, x, y, w, h, color) {
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

export function ellipse(c, x, y, rx, ry, color) {
  c.fillStyle = color;
  c.beginPath();
  c.ellipse(Math.round(x), Math.round(y), rx, ry, 0, 0, Math.PI * 2);
  c.fill();
}

export function poly(c, pts, color) {
  c.fillStyle = color;
  c.beginPath();
  pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]));
  c.closePath();
  c.fill();
}

export function path(c, pts, width, color) {
  c.strokeStyle = color;
  c.lineWidth = width;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.beginPath();
  pts.forEach((p, i) => i ? c.lineTo(...p) : c.moveTo(...p));
  c.stroke();
}

export function label(c, x, y, text, color = '#e7e4c8', size = 8) {
  c.font = `${size}px monospace`;
  c.textAlign = 'center';
  c.fillStyle = '#1d1623cc';
  c.fillText(text, Math.round(x + 1), Math.round(y + 1));
  c.fillStyle = color;
  c.fillText(text, Math.round(x), Math.round(y));
}
