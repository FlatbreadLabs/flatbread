import { outdent } from './utils/outdent';

export class IllegalFieldNameError extends Error {
  constructor(illegalSequence: string) {
    super();
    this.message = outdent`
      The sequence "${illegalSequence}" is reserved and not allowed in field names
      Either:
        - remove all instances of "${illegalSequence}" in the names of fields in your content
        - add a fieldNameTransform function to your flatbread.config.js to translate to something else
          Example:
            {
              ...,
              fieldNameTransform: (value) => value.replaceAll("${illegalSequence}",'-')
            }
      `;
  }
}
