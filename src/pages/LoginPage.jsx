import { getApiError } from "../api/http.js";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { useAuth } from "../context/AuthContext.jsx";
import ErrorPopup from "../components/ErrorPopup.jsx";



export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (event) => {
  event.preventDefault();
  setError("");

  try {
    await login({
      email: username,
      password,
    });

    navigate("/initiatives");
  } catch (err) {
    setError(
      getApiError(err)
    );
  }
};

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        p: 2,
        background:
          "radial-gradient(circle at top right, #E8F2EC 0, transparent 35%), #F6F8F6",
      }}
    >
      <Paper
        elevation={0}
        variant="outlined"
        sx={{
          width: "100%",
          maxWidth: 460,
          p: { xs: 3, sm: 4 },
          borderColor: "#E1E9E3",
        }}
      >
        <Stack alignItems="center" spacing={1}>
          <Box component="img" src="/icon.svg" alt="شعار نظام عمل" sx={{ width: 112, height: 112, objectFit: "contain" }} />

          <Typography variant="h5" sx={{ mt: 1 }}>
            أهلاً بك
          </Typography>
          <Typography color="text.secondary" textAlign="center" fontSize={13}>
            نظام إدارة وتوثيق مشتريات المبادرات
          </Typography>
          <Typography color="text.secondary" fontSize={12}>
            نظام عمل
          </Typography>
        </Stack>



        <ErrorPopup message={error} onClose={() => setError("")} />

        <Box component="form" onSubmit={handleLogin} sx={{ mt: 3 }}>
          <Stack spacing={2}>
            <TextField
              label="اسم المستخدم أو البريد الإلكتروني"
              placeholder="أدخل البريد الإلكتروني"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              fullWidth
            />

            <TextField
              label="كلمة المرور"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
            />

            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              sx={{ py: 1.3 }}
            >
              تسجيل الدخول
            </Button>
          </Stack>
        </Box>


      </Paper>
    </Box>
  );
}
