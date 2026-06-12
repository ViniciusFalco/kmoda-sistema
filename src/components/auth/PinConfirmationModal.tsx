import { useState, type FormEvent } from 'react'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { PinCodeInput } from './PinCodeInput'

interface PinConfirmationModalProps {
  open: boolean
  title: string
  description?: string
  confirmLabel: string
  submitting?: boolean
  error?: string
  onClose: () => void
  onConfirm: (pin: string) => Promise<void> | void
}

export function PinConfirmationModal({
  open,
  title,
  description,
  confirmLabel,
  submitting = false,
  error = '',
  onClose,
  onConfirm,
}: PinConfirmationModalProps) {
  const [pin, setPin] = useState('')

  function handleClose() {
    setPin('')
    onClose()
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await onConfirm(pin)
    setPin('')
  }

  return (
    <Modal open={open} title={title} onClose={handleClose} size="lg" position="center">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2 text-center">
          {description ? <p className="text-sm text-gray-600">{description}</p> : null}
          <PinCodeInput
            label="PIN de 6 dígitos"
            value={pin}
            onChange={setPin}
            autoFocus={open}
            error={error}
            align="center"
            required
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting || pin.length !== 6}>
            {submitting ? 'Confirmando' : confirmLabel}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
