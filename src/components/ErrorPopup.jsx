import { useEffect, useState } from "react";
import { Alert, Snackbar } from "@mui/material";

export default function ErrorPopup({ message, onClose, action }) {
  const [open, setOpen] = useState(Boolean(message));

  useEffect(() => {
    setOpen(Boolean(message));
  }, [message]);

  function close(event, reason) {
    if (reason === "clickaway") return;
    setOpen(false);
    onClose?.();
  }

  if (!message) return null;

  return (
    <Snackbar
      open={open}
      autoHideDuration={7000}
      onClose={close}
      anchorOrigin={{ vertical: "top", horizontal: "center" }}
      sx={{ mt: 7 }}
    >
      <Alert severity="error" variant="filled" onClose={onClose ? close : undefined} action={action}>
        {message}
      </Alert>
    </Snackbar>
  );
}
