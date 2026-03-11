import { UiButton, UiModal } from '@/components/ui';
import { useTranslation } from 'react-i18next';

interface GlobalErrorDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  details?: string;
  onClose: () => void;
}

export function GlobalErrorDialog({
  isOpen,
  title,
  message,
  details,
  onClose,
}: GlobalErrorDialogProps) {
  const { t } = useTranslation();

  return (
    <UiModal
      isOpen={isOpen}
      title={title}
      onClose={onClose}
      widthClassName="w-[560px]"
      footer={(
        <UiButton variant="primary" size="sm" onClick={onClose}>
          {t('common.close')}
        </UiButton>
      )}
    >
      <div className="space-y-3">
        <p className="text-sm text-text-dark">{message}</p>
        {details && (
          <div className="rounded-lg border border-[rgba(255,255,255,0.12)] bg-bg-dark/60 p-3">
            <div className="mb-2 text-xs font-medium text-text-muted">{t('errorDialog.detailsTitle')}</div>
            <pre className="ui-scrollbar max-h-[280px] overflow-auto whitespace-pre-wrap break-words text-xs text-text-dark">
              {details}
            </pre>
          </div>
        )}
      </div>
    </UiModal>
  );
}
