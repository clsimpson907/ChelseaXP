import type { HTMLAttributes, ReactNode } from 'react'

export default function WindowTitleBar({ title, titleId, icon, children, ...events }: {
  title: string
  titleId?: string
  icon?: string
  children: ReactNode
} & Pick<HTMLAttributes<HTMLElement>, 'onPointerDown' | 'onPointerMove' | 'onLostPointerCapture'>) {
  return (
    <header className="title-bar" {...events}>
      <span id={titleId}>{icon && <img className="window-icon" src={icon} alt="" />}{title}</span>
      {children}
    </header>
  )
}
