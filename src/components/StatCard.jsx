import { Box, Paper, Typography } from "@mui/material";

export default function StatCard({ title, value, icon, tone = "blue", hint }) {
  const tones = {
    blue: { bg: "#EAF1F8", color: "#244B83" },
    teal: { bg: "#E8F2EC", color: "#367653" },
    amber: { bg: "#FFF9D9", color: "#8A7600" },
    purple: { bg: "#EAF1F8", color: "#244B83" },
  };
  const style = tones[tone] || tones.blue;

  return (
    <Paper variant="outlined" sx={{ p: 2.3, height: "100%", borderColor: "divider" }}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={1}>
        <Box>
          <Typography variant="body2" color="text.secondary" fontWeight={600}>{title}</Typography>
          <Typography variant="h4" sx={{ mt: 1, fontSize: { xs: 26, md: 30 } }}>{value}</Typography>
          {hint && <Typography variant="caption" color="text.secondary">{hint}</Typography>}
        </Box>
        <Box sx={{ width: 44, height: 44, borderRadius: 3, bgcolor: style.bg, color: style.color, display: "grid", placeItems: "center" }}>
          {icon}
        </Box>
      </Box>
    </Paper>
  );
}
