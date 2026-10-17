import { lazy, Suspense } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const WalletAuthPanel = lazy(() => import('@/components/wallet-auth'));

export function WalletConnectionDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="surface max-w-2xl rounded-[28px] border-[#e8dfd5] bg-[#fffaf6] p-6 sm:p-8">
        <DialogHeader className="pr-8 text-left">
          <DialogTitle className="display text-2xl font-extrabold text-[#24133f]">
            Connect to make a connection.
          </DialogTitle>
          <DialogDescription className="text-sm leading-6 text-[#82778c]">
            Browse profiles freely. Connect and verify a Chog holder wallet to like,
            pass, match, or message.
          </DialogDescription>
        </DialogHeader>
        <Suspense
          fallback={
            <div className="skeleton h-14 w-52 rounded-full" role="status">
              Loading wallet options…
            </div>
          }
        >
          <WalletAuthPanel showManualAddressScan={false} />
        </Suspense>
      </DialogContent>
    </Dialog>
  );
}
