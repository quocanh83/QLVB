import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { GiveAwardDialog } from '../dialogs/give-award-dialog';
import { ReportUserDialog } from '../dialogs/report-user-dialog';
import { ShareProfileDialog } from '../dialogs/share-profile';
import { KeenIcon } from '@/components/keenicons';

export function DropdownMenu9({ trigger }) {
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isAwardDialogOpen, setIsAwardDialogOpen] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);

  const handleShareDialogClose = () => {
    setIsShareDialogOpen(false);
  };

  const handleAwardDialogClose = () => {
    setIsAwardDialogOpen(false);
  };

  const handleReportDialogClose = () => {
    setIsReportDialogOpen(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
        <DropdownMenuContent className="w-[210px]" side="bottom" align="end">
          <DropdownMenuItem onClick={() => setIsShareDialogOpen(true)}>
            <KeenIcon icon="coffee" />
            <span>Share Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsAwardDialogOpen(true)}>
            <KeenIcon icon="award" />
            <span>Give Award</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="flex items-center justify-between gap-2"
            onClick={(event) => {
              event.preventDefault();
            }}
          >
            <KeenIcon icon="graph-up" />
            <div className="grow flex items-center justify-between gap-2">
              <span>Stay Updated</span>
              <Switch size="sm"></Switch>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsReportDialogOpen(true)}>
            <KeenIcon icon="info" />
            <span>Report User</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ShareProfileDialog
        open={isShareDialogOpen}
        onOpenChange={handleShareDialogClose}
      />

      <GiveAwardDialog
        open={isAwardDialogOpen}
        onOpenChange={handleAwardDialogClose}
      />

      <ReportUserDialog
        open={isReportDialogOpen}
        onOpenChange={handleReportDialogClose}
      />
    </>
  );
}
