import { AlertDialog, Button } from '@heroui/react';

/** Общий диалог подтверждения удаления (HeroUI AlertDialog), переиспользуется для файла встречи, аватара и встречи. */
export function ConfirmDeleteDialog({
  isOpen,
  onOpenChange,
  heading,
  onConfirm,
  children,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  heading: string;
  onConfirm: () => void;
  children: React.ReactNode;
}) {
  return (
    <AlertDialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <AlertDialog.Backdrop>
        <AlertDialog.Container>
          <AlertDialog.Dialog>
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>{heading}</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body className="flex flex-col gap-3">
              {children}
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button slot="close" variant="outline">
                Отмена
              </Button>
              <Button
                slot="close"
                className="bg-[var(--danger)] text-[var(--danger-foreground)]"
                onPress={onConfirm}
              >
                Удалить
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
}
