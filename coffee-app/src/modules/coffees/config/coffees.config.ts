import { registerAs } from '@nestjs/config';

export default registerAs('coffees', () => ({
  foo: 'Some additional coffee configuration. Example: external API/endpoint',
}));
