'use client';

import { useState } from 'react';
import {
  Description,
  FieldError,
  InputGroup,
  Label,
  TextField,
  ToggleButton,
} from '@heroui/react';
import { EyeIcon, EyeOffIcon } from '@/components/icons/EyeIcon';

/** Поле пароля с переключателем видимости, общее для форм входа и регистрации. */
export function PasswordField({
  name = 'password',
  label = 'Пароль',
  isDisabled,
  autoComplete,
  placeholder,
  minLength,
  validate,
  description,
  onChange,
}: {
  name?: string;
  label?: string;
  isDisabled: boolean;
  autoComplete: 'new-password' | 'current-password';
  placeholder: string;
  minLength?: number;
  validate: (value: string) => string | null;
  description?: string;
  onChange?: (value: string) => void;
}) {
  const [isVisible, setVisible] = useState(false);

  return (
    <TextField
      isRequired
      fullWidth
      isDisabled={isDisabled}
      minLength={minLength}
      name={name}
      type={isVisible ? 'text' : 'password'}
      validate={validate}
      onChange={onChange}
    >
      <Label>{label}</Label>
      <InputGroup fullWidth>
        <InputGroup.Input
          autoComplete={autoComplete}
          placeholder={placeholder}
        />
        <InputGroup.Suffix>
          <ToggleButton
            isIconOnly
            isDisabled={isDisabled}
            isSelected={isVisible}
            onChange={setVisible}
            size="sm"
            variant="ghost"
            aria-label={isVisible ? 'Скрыть пароль' : 'Показать пароль'}
          >
            {isVisible ? <EyeOffIcon /> : <EyeIcon />}
          </ToggleButton>
        </InputGroup.Suffix>
      </InputGroup>
      {description ? <Description>{description}</Description> : null}
      <FieldError />
    </TextField>
  );
}
