import { outdent } from './utils/outdent';

export class IllegalFieldNameError extends Error {
  constructor(illegalSequence: string) {
    super(outdent`
      The sequence "${illegalSequence}" is reserved and not allowed in field names
      Either:
        - remove all instances of "${illegalSequence}" in the names of fields in your content
        - add a fieldNameTransform function to your flatbread.config.js to translate to something else
          Example:
            {
              ...,
              fieldNameTransform: (value) => value.replaceAll("${illegalSequence}",'-')
            }
      `);
  }
}

export class ReferenceAlreadyExistsError<K extends Record<string, K>> extends Error {
  constructor(
    payload: K,
    collectionName: string,
    metadata: { referenceField: string; reference: string }
  ) {
    const payloadString = JSON.stringify(payload, null, 2);
    super(
      outdent`
      Failed to create
      ${payloadString}
      ${collectionName} with ${metadata.referenceField} of ${metadata.reference} already exists`
    );
  }
}