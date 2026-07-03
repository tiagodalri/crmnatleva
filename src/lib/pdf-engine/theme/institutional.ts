/**
 * Fonte única de verdade para dados institucionais da NatLeva usados em
 * qualquer PDF renderizado pela engine. NUNCA hardcodar esses valores em
 * componentes — sempre importar daqui.
 */
export const NATLEVA_FOOTER = {
  phone: "+55 (11) 96639-6692",
  instagram: "@natlevaviagens",
} as const;

/** Texto único, centralizado, exibido no rodapé de toda página. */
export const NATLEVA_FOOTER_LINE = `${NATLEVA_FOOTER.phone}   ·   ${NATLEVA_FOOTER.instagram}`;
