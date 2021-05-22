export default function select<T>(
  choices: Array<T>,
  type: 'random' = 'random',
) {
  if (type === 'random') {
    return randomSelect(choices)
  }
}

export function randomSelect<T>(choices: Array<T>) {
  const len = choices.length
  switch (len) {
    case 0:
      return null
    case 1:
      return choices[0]
    default:
      return choices[Math.floor(Math.random() * len)]
  }
}
