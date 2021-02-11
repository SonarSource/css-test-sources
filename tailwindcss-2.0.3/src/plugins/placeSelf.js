export default function () {
  return function ({ addUtilities, variants }) {
    addUtilities(
      {
        '.place-self-auto': {
          'place-self': 'auto',
        },
        '.place-self-start': {
          'place-self': 'start',
        },
        '.place-self-end': {
          'place-self': 'end',
        },
        '.place-self-center': {
          'place-self': 'center',
        },
        '.place-self-stretch': {
          'place-self': 'stretch',
        },
      },
      variants('placeSelf')
    )
  }
}
