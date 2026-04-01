import type { TextStyle } from 'react-native'

/**
 * Plus Jakarta Sans (variable) — loaded in `app/_layout.tsx` from `assets/fonts/PlusJakartaSans-Variable.ttf`.
 * Spread these into styles: `{ ...FONT_BOLD, fontSize: 16 }`
 */
export const FONT_FAMILY = 'PlusJakartaSans'

export const FONT_REGULAR: TextStyle = { fontFamily: FONT_FAMILY, fontWeight: '400' }
export const FONT_MEDIUM: TextStyle = { fontFamily: FONT_FAMILY, fontWeight: '500' }
export const FONT_SEMIBOLD: TextStyle = { fontFamily: FONT_FAMILY, fontWeight: '600' }
export const FONT_BOLD: TextStyle = { fontFamily: FONT_FAMILY, fontWeight: '700' }
export const FONT_EXTRABOLD: TextStyle = { fontFamily: FONT_FAMILY, fontWeight: '800' }

export const sectionLabelStyle: TextStyle = {
  ...FONT_BOLD,
  fontSize: 11,
  letterSpacing: 1.2,
  textTransform: 'uppercase',
}
