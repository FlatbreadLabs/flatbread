/**
 * camelCase string
 * @param field: string
 * @returns camelCaseString
 */
export default function camelCase(field: string) {
  return String(field)
    .toLowerCase()
    .replace(/\s(\w)/g, (_, m) => m.toUpperCase());
}
