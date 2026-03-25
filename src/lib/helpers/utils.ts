export const parseNum = (v: string): number | null => {
  if (v.trim() === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
};
