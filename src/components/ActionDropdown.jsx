import { useState } from "react";
import { Button, Menu, Stack } from "@mui/material";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";

export default function ActionDropdown({ label, children, size = "small" }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const actions = Array.isArray(children) ? children : [children];
  const availableActions = actions.filter(Boolean);

  return (
    <>
      <Button
        size={size}
        variant="outlined"
        endIcon={<ExpandMoreRoundedIcon />}
        aria-haspopup="menu"
        aria-expanded={Boolean(anchorEl)}
        onClick={(event) => setAnchorEl(event.currentTarget)}
      >
        {label}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        MenuListProps={{
          onClickCapture: () => window.setTimeout(() => setAnchorEl(null), 0),
          sx: { minWidth: 150, "& .MuiButton-root": { width: "100%", justifyContent: "flex-start" } },
        }}
      >
        <Stack spacing={0.75} sx={{ p: 1 }}>
          {availableActions}
        </Stack>
      </Menu>
    </>
  );
}
