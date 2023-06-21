export const strip0x = (hex: string) => {
  return hex.startsWith("0x") ? hex.slice(2) : hex;
};
