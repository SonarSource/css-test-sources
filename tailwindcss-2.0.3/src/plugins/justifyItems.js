export default function () {
  return function ({ addUtilities, variants }) {
    addUtilities(
      {
        '.justify-items-auto': {
          'justify-items': 'auto',
        },
        '.justify-items-start': {
          'justify-items': 'start',
        },
        '.justify-items-end': {
          'justify-items': 'end',
        },
        '.justify-items-center': {
          'justify-items': 'center',
        },
        '.justify-items-stretch': {
          'justify-items': 'stretch',
        },
      },
      variants('justifyItems')
    )
  }
}
