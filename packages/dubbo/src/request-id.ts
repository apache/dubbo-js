let uniqueId = 0;

export function id() {
  uniqueId = ++uniqueId;
  if (uniqueId === Number.MAX_SAFE_INTEGER) {
    uniqueId = 0;
  }
  return uniqueId;
}
