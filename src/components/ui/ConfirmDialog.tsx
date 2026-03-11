import { useState } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { Input } from "./Input";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (inputValue?: string) => void;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: "danger" | "default";
  input?: {
    label: string;
    type?: string;
    placeholder?: string;
  };
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  variant = "default",
  input,
}: ConfirmDialogProps) {
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState("");

  function handleConfirm() {
    if (input) {
      if (!inputValue.trim()) {
        setError("This field is required.");
        return;
      }
      if (input.type === "number" && isNaN(Number(inputValue))) {
        setError("Please enter a valid number.");
        return;
      }
    }
    onConfirm(inputValue || undefined);
    setInputValue("");
    setError("");
  }

  function handleClose() {
    setInputValue("");
    setError("");
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title={title}>
      <p className="text-sm text-gray-300 mb-4">{message}</p>
      {input && (
        <div className="mb-4">
          <Input
            label={input.label}
            type={input.type ?? "text"}
            placeholder={input.placeholder}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setError("");
            }}
            autoFocus
          />
          {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
        </div>
      )}
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          variant={variant === "danger" ? "danger" : "primary"}
          onClick={handleConfirm}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
