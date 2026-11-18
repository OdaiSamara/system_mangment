import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  direction: "rtl",
  palette: {
    mode: "light",
    primary: { main: "#244B83", dark: "#19365F", light: "#EAF1F8" },
    secondary: { main: "#4D9970", dark: "#367653", light: "#E8F2EC" },
    background: { default: "#F6F8F6", paper: "#FFFFFF" },
    success: { main: "#4D9970" },
    warning: { main: "#B7791F" },
    error: { main: "#C34242" },
    text: { primary: "#202938", secondary: "#6B7280" },
    divider: "#E1E9E3",
  },
  typography: {
    fontFamily: '"Cairo", Arial, sans-serif',
    h4: { fontWeight: 800 },
    h5: { fontWeight: 800 },
    h6: { fontWeight: 700 },
    button: { fontWeight: 700, textTransform: "none" },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: { styleOverrides: { root: { borderRadius: 10, boxShadow: "none" } } },
    MuiPaper: { styleOverrides: { rounded: { borderRadius: 14 } } },
    MuiTableCell: { styleOverrides: { head: { fontWeight: 800, color: "#5D6675", backgroundColor: "#F3F7F4" } } },
  },
});

export default theme;
