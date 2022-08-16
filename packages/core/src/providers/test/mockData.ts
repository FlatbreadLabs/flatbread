import { VFile } from 'vfile';

export const mockData = {
  Author: [
    new VFile({
      path: '/content/authors/eva.md',
      extname: '.md',
      value: `---
    id: 40s3
    name: Eva
    entity: Cat
    enjoys:
      - sitting
      - standing
      - mow mow
      - sleepy time
      - attention
    friend: 2a3e
    image: eva.svg
    date_joined: 2002-02-25T16:41:59.558Z
    skills:
      sitting: 100000
      breathing: 4.7
      liquid_consumption: 10
      existence: funky
      sports: -200
---
    `,
    }),
    new VFile({
      path: '/content/authors/tony.md',
      extname: '.md',
      value: `---
    name: Tony
    id: 2a3e
    friend: ab2c
    enjoys:
      - cats
      - tea
      - making this
    date_joined: 2021-02-25T16:41:59.558Z
    skills:
      sitting: 71
      breathing: 7.07
      liquid_consumption: 100
      existence: simulation
      sports: -2
      cat_pat: 1500
---
    `,
    }),
    new VFile({
      path: '/content/authors/daes.md',
      extname: '.md',
      value: `---
      id: ab2c
      name: Daes
      entity: Human
      enjoys:
        - cats
        - coffee
        - design
      friend: 40s3
      date_joined: 2021-04-22T16:41:59.558Z
      skills:
        sitting: 304
        breathing: 1.034234
        liquid_consumption: -100
        existence: etheral
        sports: 3
---   
    `,
    }),
  ],
};
