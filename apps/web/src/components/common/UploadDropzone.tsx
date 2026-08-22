/** Drag-and-drop зона + скрытый <input type="file"> для выбора кликом (переиспользуется для файлов встречи и аватара). */
export function UploadDropzone({
  inputId,
  accept,
  disabled,
  isDragging,
  icon,
  title,
  subtitle,
  onDragOver,
  onDragLeave,
  onDrop,
  onInputChange,
  compact = false,
}: {
  inputId: string;
  accept: string;
  disabled: boolean;
  isDragging: boolean;
  icon: React.ReactNode;
  title: React.ReactNode;
  subtitle: React.ReactNode;
  onDragOver: (event: React.DragEvent<HTMLLabelElement>) => void;
  onDragLeave: () => void;
  onDrop: (event: React.DragEvent<HTMLLabelElement>) => void;
  onInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  /** Меньшие отступы — для встраивания в компактные карточки/строки. */
  compact?: boolean;
}) {
  return (
    <label
      htmlFor={inputId}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed text-center transition-colors focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2 ${
        compact ? 'p-4' : 'p-6'
      } ${isDragging ? 'border-accent bg-accent-soft' : 'border-border'} ${
        disabled ? 'pointer-events-none opacity-70' : ''
      }`}
    >
      {icon}
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted">{subtitle}</p>
      <input
        id={inputId}
        type="file"
        className="sr-only"
        accept={accept}
        onChange={onInputChange}
        disabled={disabled}
      />
    </label>
  );
}
