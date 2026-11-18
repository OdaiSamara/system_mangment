import { Box, Paper, Typography } from "@mui/material";
import ConstructionOutlinedIcon from "@mui/icons-material/ConstructionOutlined";
import PageHeader from "../components/PageHeader.jsx";

export default function PlaceholderPage({ title, description }) {
  return <>
    <PageHeader title={title} subtitle={description || ""} />
    <Paper variant="outlined" sx={{ p: { xs: 3, md: 5 }, textAlign: "center" }}>
      <Box sx={{ width: 56, height: 56, mx: "auto", mb: 2, borderRadius: 3, bgcolor: "action.hover", display: "grid", placeItems: "center" }}>
        <ConstructionOutlinedIcon color="action" fontSize="large" />
      </Box>
      <Typography fontWeight={800}>لا توجد بيانات للعرض حاليًا</Typography>
      <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>يرجى المحاولة لاحقًا أو التواصل مع مسؤول النظام إذا استمرت المشكلة.</Typography>
    </Paper>
  </>;
}
