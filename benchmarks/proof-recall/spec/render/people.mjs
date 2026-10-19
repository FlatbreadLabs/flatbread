// Names and a time helper shared by the render thread modules.
export const INES = 'Ines Okafor';
export const TOMASZ = 'Tomasz Brandt';
export const YUSUF = 'Yusuf Demir';
export const RHEA = 'Rhea Valdés';
export const KENJI = 'Kenji Arakawa';
export const PRIYA = 'Priya Natarajan';
export const LIAM = "Liam O'Connell";
export const DARA = 'Dara Whitlock';

/** '2025-09-03 11:00' -> '2025-09-03T11:00:00Z' */
export const d = (s) => `${s.replace(' ', 'T')}:00Z`;

/** Pretty JSON for Blob bodies. */
export const json = (value) => JSON.stringify(value, null, 2);
