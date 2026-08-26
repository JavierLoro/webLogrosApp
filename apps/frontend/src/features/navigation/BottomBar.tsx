import { Panel } from "@/components/ui/Panel"
import styles from "../visuals.module.css"

export type BottomBarKey = "dashboard" | "achievements" | "ranking"

export interface BottomBarItem {
  key: BottomBarKey
  label: string
  href: string
  icon?: string
}

export interface MoreMenuItem {
  label: string
  href: string
}

export interface BottomBarProps {
  items: BottomBarItem[]
  moreItems?: MoreMenuItem[]
  activeKey?: BottomBarKey
  moreLabel?: string
}

export function BottomBar({ items, moreItems = [], activeKey, moreLabel = "Más" }: BottomBarProps) {
  return <Panel className={styles.surface}>
    <nav className={styles.bottomBar} aria-label="Navegación principal">
      {items.slice(0, 3).map((item) => <a key={item.key} className={styles.navLink} href={item.href} data-active={item.key === activeKey ? "true" : "false"} aria-current={item.key === activeKey ? "page" : undefined}>
        <span className={styles.navIcon} aria-hidden="true">{item.icon ?? "·"}</span>
        <span>{item.label}</span>
      </a>)}
      <details className={styles.more}>
        <summary className={styles.moreSummary}><span className={styles.navIcon} aria-hidden="true">＋</span><span>{moreLabel}</span></summary>
        {moreItems.length > 0 ? <div className={styles.moreMenu} role="menu">
          {moreItems.map((item) => <a key={item.href} href={item.href} role="menuitem">{item.label}</a>)}
        </div> : null}
      </details>
    </nav>
  </Panel>
}
