/**
 * camelCase string
 * @param field: string
 * @returns camelCaseString
 */
export default function camelCase(field: string) {
  return String(field).replace(/\s(\w)/g, (_, m) => m.toUpperCase());
}
