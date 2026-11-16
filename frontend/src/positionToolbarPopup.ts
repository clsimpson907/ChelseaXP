export function positionToolbarPopup(panel: HTMLElement, button: HTMLElement) {
  // Position the top-layer menu against its trigger without clipping it inside the window.
  const anchor = button.getBoundingClientRect()
  const width = panel.offsetWidth
  const height = panel.offsetHeight
  const x = anchor.left + width <= window.innerWidth - 4 ? anchor.left : anchor.right - width
  panel.style.left = Math.max(4, x) + 'px'
  panel.style.top = Math.max(4, Math.min(anchor.bottom, window.innerHeight - height - 4)) + 'px'
  return x + width * 2 > window.innerWidth - 4
}
