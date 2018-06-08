/**
 * ❯ node parseint-number.js
 * parseInt: 187.971ms
 * number: 95.057ms
 */
console.time('parseInt');
for (let i = 0; i < 1000000; i++) {
  parseInt(i + '');
}
console.timeEnd('parseInt');

console.time('number');
for (let i = 0; i < 1000000; i++) {
  Number(i + '');
}
console.timeEnd('number');
