import { useState, useEffect, useCallback } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDeleteLeft, faCheck } from '@fortawesome/free-solid-svg-icons'
import './Keypad.css'

/**
 * Touch-friendly numeric keypad for passcode entry
 * Displays masked PIN dots and handles 4-6 digit codes
 */
export default function Keypad({
  onSubmit,
  onCancel,
  error,
  title = "Enter Passcode",
  minLength = 4,
  maxLength = 6,
  confirmMode = false,
  confirmTitle = "Confirm Passcode"
}) {
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [isConfirming, setIsConfirming] = useState(false)
  const [shake, setShake] = useState(false)
  const [localError, setLocalError] = useState('')

  // Reset on error prop change
  useEffect(() => {
    if (error) {
      setShake(true)
      setPin('')
      setConfirmPin('')
      setIsConfirming(false)
      setTimeout(() => setShake(false), 500)
    }
  }, [error])

  const handleDigit = useCallback((digit) => {
    const currentPin = isConfirming ? confirmPin : pin
    if (currentPin.length >= maxLength) return

    if (isConfirming) {
      setConfirmPin(prev => prev + digit)
    } else {
      setPin(prev => prev + digit)
    }
    setLocalError('')
  }, [pin, confirmPin, isConfirming, maxLength])

  const handleBackspace = useCallback(() => {
    if (isConfirming) {
      setConfirmPin(prev => prev.slice(0, -1))
    } else {
      setPin(prev => prev.slice(0, -1))
    }
    setLocalError('')
  }, [isConfirming])

  const handleClear = useCallback(() => {
    if (isConfirming) {
      setConfirmPin('')
    } else {
      setPin('')
    }
    setLocalError('')
  }, [isConfirming])

  const handleSubmit = useCallback(() => {
    const currentPin = isConfirming ? confirmPin : pin

    if (currentPin.length < minLength) {
      setLocalError(`Passcode must be at least ${minLength} digits`)
      setShake(true)
      setTimeout(() => setShake(false), 500)
      return
    }

    if (confirmMode && !isConfirming) {
      // Move to confirmation step
      setIsConfirming(true)
      return
    }

    if (confirmMode && isConfirming) {
      // Check if pins match
      if (pin !== confirmPin) {
        setLocalError('Passcodes do not match')
        setShake(true)
        setConfirmPin('')
        setTimeout(() => setShake(false), 500)
        return
      }
    }

    onSubmit(pin)
  }, [pin, confirmPin, isConfirming, confirmMode, minLength, onSubmit])

  const currentPin = isConfirming ? confirmPin : pin
  const displayTitle = isConfirming ? confirmTitle : title
  const displayError = localError || error

  return (
    <div className={`keypad-container ${shake ? 'shake' : ''}`}>
      <h2 className="keypad-title">{displayTitle}</h2>

      <div className="keypad-pin-display">
        {[...Array(maxLength)].map((_, i) => (
          <div
            key={i}
            className={`pin-dot ${i < currentPin.length ? 'filled' : ''} ${i < minLength ? 'required' : ''}`}
          />
        ))}
      </div>

      {displayError && (
        <div className="keypad-error">{displayError}</div>
      )}

      <div className="keypad-grid">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(digit => (
          <button
            key={digit}
            className="keypad-button digit"
            onClick={() => handleDigit(String(digit))}
          >
            {digit}
          </button>
        ))}

        <button
          className="keypad-button action"
          onClick={handleBackspace}
          disabled={currentPin.length === 0}
        >
          <FontAwesomeIcon icon={faDeleteLeft} />
        </button>

        <button
          className="keypad-button digit"
          onClick={() => handleDigit('0')}
        >
          0
        </button>

        <button
          className="keypad-button action submit"
          onClick={handleSubmit}
          disabled={currentPin.length < minLength}
        >
          <FontAwesomeIcon icon={faCheck} />
        </button>
      </div>

      {onCancel && (
        <button className="keypad-cancel" onClick={onCancel}>
          Cancel
        </button>
      )}
    </div>
  )
}
