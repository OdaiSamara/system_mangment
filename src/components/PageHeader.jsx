import { Box, Typography } from "@mui/material";

export default function PageHeader({ title, subtitle, action }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "flex-start", sm: "center" }, flexDirection: { xs: "column", sm: "row" }, gap: 2, mb: 3 }}>
      <Box>
        <Typography variant="h5" sx={{ mb: 0.5 }}>{title}</Typography>
        {subtitle && <Typography color="text.secondary" variant="body2">{subtitle}</Typography>}
      </Box>
      {action && <Box sx={{ width: { xs: "100%", sm: "auto" }, "& > .MuiButton-root": { width: { xs: "100%", sm: "auto" } } }}>{action}</Box>}
    </Box>
  );
}
