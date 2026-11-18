
import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Popover,
  Toolbar,
  Typography,
  useMediaQuery,
} from "@mui/material";

import { useTheme } from "@mui/material/styles";

import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import AddCircleOutlineRoundedIcon from "@mui/icons-material/AddCircleOutlineRounded";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import BarChartOutlinedIcon from "@mui/icons-material/BarChartOutlined";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import NotificationsNoneRoundedIcon from "@mui/icons-material/NotificationsNoneRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import SettingsSuggestOutlinedIcon from "@mui/icons-material/SettingsSuggestOutlined";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";

import { useAuth } from "../context/AuthContext.jsx";
import { useInitiativeNotifications } from "../hooks/useInitiativeNotifications.js";
import ErrorPopup from "../components/ErrorPopup.jsx";

const drawerWidth = 258;

// عناصر القائمة والصلاحيات المسموح بها لكل دور
const navItems = [
  {
    label: "لوحة التحكم",
    to: "/dashboard",
    icon: <DashboardRoundedIcon />,
    roles: ["user", "manager"],
  },
  {
    label: "المبادرات",
    to: "/initiatives",
    icon: <AssignmentOutlinedIcon />,
    roles: ["user", "manager", "accountant"],
  },
  {
    label: "إنشاء مبادرة",
    to: "/initiatives/new",
    icon: <AddCircleOutlineRoundedIcon />,
    roles: ["user", "manager"],
  },
  {
    label: "الفواتير والمرفقات",
    to: "/invoices",
    icon: <ReceiptLongOutlinedIcon />,
    roles: ["manager", "accountant"],
  },
  {
    label: "التقارير",
    to: "/reports",
    icon: <BarChartOutlinedIcon />,
    roles: ["manager"],
  },
  {
    label: "الإدارة والبيانات المرجعية",
    to: "/admin",
    icon: <SettingsSuggestOutlinedIcon />,
    roles: ["manager"],
  },
];

export default function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [notificationAnchor, setNotificationAnchor] = useState(null);

  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));

  const { user, logout } = useAuth();
  const { notifications, unreadCount, error: notificationError, markAllAsRead } = useInitiativeNotifications(user);

  const navigate = useNavigate();
  const location = useLocation();

  // اسم الدور باللغة العربية
  const roleLabel =
    user?.role === "manager"
      ? "المدير"
      : user?.role === "accountant"
        ? "المحاسب"
        : user?.role === "user"
          ? "منفذ المبادرة"
          : "مستخدم";

  // تصفية القائمة بحسب دور المستخدم
  const visibleNavItems = navItems.filter((item) =>
    item.roles.includes(user?.role)
  );

  // محتوى القائمة الجانبية
  const drawer = (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: "#fff",
      }}
    >
      {/* شعار المؤسسة */}
      <Box
        sx={{
          px: 2.5,
          py: 2.6,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        <Box component="img" src="/icon.svg" alt="شعار نظام عمل" sx={{ width: 48, height: 48, objectFit: "contain" }} />

        <Box>
          <Typography fontWeight={800} fontSize={15}>
            نظام عمل
          </Typography>

          <Typography color="text.secondary" fontSize={11}>
            إدارة المبادرات والمشتريات
          </Typography>
        </Box>
      </Box>

      <Divider />

      <Typography
        sx={{
          px: 2.5,
          pt: 2.5,
          pb: 1,
          fontSize: 11,
          color: "text.secondary",
          fontWeight: 800,
        }}
      >
        القائمة الرئيسية
      </Typography>

      {/* روابط القائمة حسب الصلاحيات */}
      <List sx={{ px: 1.2, py: 0 }}>
        {visibleNavItems.map((item) => {
          const active =
            location.pathname === item.to ||
            (item.to === "/initiatives" &&
              location.pathname.startsWith("/initiatives/") &&
              location.pathname !== "/initiatives/new");

          return (
            <ListItemButton
              key={item.to}
              component={NavLink}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              sx={{
                my: 0.35,
                borderRadius: 2.5,
                minHeight: 46,
                color: active ? "primary.main" : "text.secondary",
                bgcolor: active ? "#EAF1F8" : "transparent",

                "& .MuiListItemIcon-root": {
                  color: "inherit",
                  minWidth: 38,
                },

                "&:hover": {
                  bgcolor: active ? "#EAF1F8" : "#F3F7F4",
                },
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>

              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontSize: 13,
                  fontWeight: active ? 800 : 600,
                }}
              />
            </ListItemButton>
          );
        })}
      </List>

      {/* مساحة مرنة */}
      <Box sx={{ flexGrow: 1 }} />


    </Box>
  );

  // تسجيل الخروج
  const handleLogout = () => {
    setMenuAnchor(null);
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      {/* الشريط العلوي */}
      <AppBar
        position="fixed"
        elevation={0}
        color="inherit"
        sx={{
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "rgba(255,255,255,.94)",
          backdropFilter: "blur(12px)",
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mr: { md: `${drawerWidth}px` },
        }}
      >
        <Toolbar sx={{
          minHeight: { xs: "64px !important", sm: "72px !important" },
          gap: { xs: 0.5, sm: 1.5 },
          px: { xs: 1, sm: 2 },
        }}>
          {/* زر القائمة على الشاشات الصغيرة */}
          {!isDesktop && (
            <IconButton
              aria-label="فتح القائمة"
              onClick={() => setMobileOpen(true)}
            >
              <MenuRoundedIcon />
            </IconButton>
          )}

          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography
              fontWeight={800}
              fontSize={{ xs: 12, sm: 14 }}
              color="text.primary"
              sx={{ lineHeight: 1.4 }}
            >
              نظام إدارة المبادرات والمشتريات
            </Typography>

            <Typography variant="caption" color="text.secondary" sx={{ display: { xs: "none", sm: "block" } }}>
              نظام عمل لإدارة المبادرات والمشتريات
            </Typography>
          </Box>

          {/* الإشعارات */}
          <IconButton
            aria-label={`الإشعارات${unreadCount ? `، ${unreadCount} غير مقروء` : ""}`}
            onClick={(event) => {
              setNotificationAnchor(event.currentTarget);
              markAllAsRead();
            }}
          >
            <Badge badgeContent={unreadCount} color="error">
              <NotificationsNoneRoundedIcon />
            </Badge>
          </IconButton>
          <Popover
            open={Boolean(notificationAnchor)}
            anchorEl={notificationAnchor}
            onClose={() => setNotificationAnchor(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
            transformOrigin={{ vertical: "top", horizontal: "left" }}
          >
            <Box sx={{ width: { xs: 300, sm: 360 }, maxHeight: 420, overflowY: "auto", p: 1 }}>
              <Typography variant="subtitle1" fontWeight={800} sx={{ px: 1, py: 0.5 }}>
                الإشعارات
              </Typography>
              {!notifications.length && (
                <Typography color="text.secondary" variant="body2" sx={{ p: 2, textAlign: "center" }}>
                  لا توجد إشعارات جديدة
                </Typography>
              )}
              {notifications.map((notification) => (
                <MenuItem
                  key={notification.id}
                  onClick={() => {
                    setNotificationAnchor(null);
                    navigate(`/initiatives/${encodeURIComponent(notification.initiativeId)}`);
                  }}
                  sx={{ whiteSpace: "normal", alignItems: "flex-start", borderRadius: 1 }}
                >
                  <ListItemText
                    primary={notification.message}
                    secondary={new Date(notification.createdAt).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })}
                    primaryTypographyProps={{ variant: "body2", fontWeight: notification.read ? 400 : 700 }}
                  />
                </MenuItem>
              ))}
            </Box>
          </Popover>
          <ErrorPopup message={notificationError} />

          {/* معلومات المستخدم */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              cursor: "pointer",
            }}
            onClick={(event) => setMenuAnchor(event.currentTarget)}
          >
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: "#EAF1F8",
                color: "primary.main",
                fontWeight: 800,
              }}
            >
              {user?.name?.slice(0, 1) || "م"}
            </Avatar>

            <Box sx={{ display: { xs: "none", sm: "block" } }}>
              <Typography fontSize={12} fontWeight={800}>
                {user?.name || "مستخدم"}
              </Typography>

              <Typography fontSize={11} color="text.secondary">
                {roleLabel}
              </Typography>
            </Box>

            <ExpandMoreRoundedIcon fontSize="small" />
          </Box>

          {/* قائمة الحساب */}
          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={() => setMenuAnchor(null)}
          >
            <MenuItem onClick={() => { setMenuAnchor(null); navigate("/profile"); }}>
              <AccountCircleOutlinedIcon fontSize="small" sx={{ ml: 1 }} />
              الملف الشخصي
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <LogoutRoundedIcon
                fontSize="small"
                sx={{ ml: 1 }}
              />
              تسجيل الخروج
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* القائمة الجانبية */}
      <Box
        component="nav"
        sx={{
          width: { md: drawerWidth },
          flexShrink: { md: 0 },
        }}
      >
        {/* القائمة للشاشات الصغيرة */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": {
              width: drawerWidth,
              boxSizing: "border-box",
            },
          }}
        >
          {drawer}
        </Drawer>

        {/* القائمة للشاشات الكبيرة */}
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": {
              width: drawerWidth,
              boxSizing: "border-box",
              borderLeft: "1px solid #E1E9E3",
              borderRight: 0,
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      {/* محتوى الصفحة */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          minWidth: 0,
        }}
      >
        <Toolbar sx={{ minHeight: "72px !important" }} />

        <Box
          sx={{
            p: { xs: 1.25, sm: 2.5, lg: 4 },
            maxWidth: 1600,
            mx: "auto",
            minWidth: 0,
          }}
        >
          <Outlet />
        </Box>

        {/* تذييل النظام */}
        <Box
          component="footer"
          sx={{
            px: { xs: 1.5, sm: 3 },
            pb: { xs: 2, sm: 2.5 },
            textAlign: "center",
          }}
        >
          <Typography variant="caption" color="text.secondary">
            نظام عمل © {new Date().getFullYear()}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
