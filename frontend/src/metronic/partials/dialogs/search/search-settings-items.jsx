import { AccordionMenuItem } from '@/components/ui/accordion-menu';
import { KeenIcon } from '@/components/keenicons';

export function SearchSettingsItems({ items }) {
  return (
    <>
      {items.map((item, index) => (
        <AccordionMenuItem key={index} value={item.info}>
          <KeenIcon icon={item.icon} className="text-sm" />
          <span>{item.info}</span>
        </AccordionMenuItem>
      ))}
    </>
  );
}
