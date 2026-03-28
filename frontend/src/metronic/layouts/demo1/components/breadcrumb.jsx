import { Fragment } from 'react';
import { useLocation } from 'react-router';
import { MENU_SIDEBAR } from '@/config/menu.config';
import { cn } from '@/lib/utils';
import { useMenu } from '@/hooks/use-menu';
import { KeenIcon } from '@/components/keenicons';

export function Breadcrumb() {
  const { pathname } = useLocation();
  const { getBreadcrumb, isActive } = useMenu(pathname);
  const items = getBreadcrumb(MENU_SIDEBAR);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.25 text-xs lg:text-sm font-medium mb-2.5 lg:mb-0">
      {items.map((item, index) => {
        const last = index === items.length - 1;
        const active = item.path ? isActive(item.path) : false;

        return (
          <Fragment key={`root-${index}`}>
            <span
              className={cn(active ? 'text-mono' : 'text-secondary-foreground')}
              key={`item-${index}`}
            >
              {item.title}
            </span>
            {!last && (
              <KeenIcon
                icon="right"
                className="fs-9 text-muted-foreground"
                key={`separator-${index}`}
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
