import { Button, createTheme, TextInput } from '@mantine/core';

export const theme = createTheme({
  primaryColor: 'indigo',
  defaultRadius: 'md',
  components: {
    Button: Button.extend({ defaultProps: { variant: 'filled' } }),
    TextInput: TextInput.extend({ defaultProps: { size: 'md' } }),
  },
});
