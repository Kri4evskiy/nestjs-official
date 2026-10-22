import { WithUuid } from '../../common/mixins/with-uuid.mixin/with-uuid.mixin.js';

export class Coffee {
  constructor(public name: string) {}
}

const CoffeeWithUuid = WithUuid(Coffee);
const coffee = new CoffeeWithUuid('Buddy Brew');
// coffee.name  --> 'Buddy Brew'
// coffee.uuid  --> 'c28a54d6-8b2d-...'
// coffee.regenerateUuid()
