export const siteYear = 2006

export function siteDate(now: Date) {
  const month = now.getMonth()
  const lastDay = new Date(siteYear, month + 1, 0).getDate()
  return new Date(siteYear, month, Math.min(now.getDate(), lastDay), 12)
}
