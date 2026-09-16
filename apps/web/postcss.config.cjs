/* Mantine 9 requires postcss-preset-mantine plus the breakpoint variables that
   `@media (max-width: $mantine-breakpoint-sm)` in component CSS resolves against.
   Kept as .cjs because both this workspace and the repo root are "type": "module". */
module.exports = {
  plugins: {
    'postcss-preset-mantine': {},
    'postcss-simple-vars': {
      variables: {
        'mantine-breakpoint-xs': '36em',
        'mantine-breakpoint-sm': '48em',
        'mantine-breakpoint-md': '62em',
        'mantine-breakpoint-lg': '75em',
        'mantine-breakpoint-xl': '88em',
      },
    },
  },
};
