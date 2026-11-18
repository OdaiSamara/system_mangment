import { Button } from "@mui/material";
import CallOutlinedIcon from "@mui/icons-material/CallOutlined";
import ChatOutlinedIcon from "@mui/icons-material/ChatOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import { getInitiativeContact, getWhatsAppUrl } from "../utils/initiativeContact.js";
import ActionDropdown from "./ActionDropdown.jsx";

export default function UserContactActions({ initiative, size = "small" }) {
  const { mobile, whatsapp, email } = getInitiativeContact(initiative);
  const phoneLink = mobile ? `tel:${String(mobile).replace(/[^\d+]/g, "")}` : "";
  const whatsappLink = getWhatsAppUrl(whatsapp);

  return (
    <ActionDropdown label="التواصل">
      <Button
        component={phoneLink ? "a" : "button"}
        href={phoneLink || undefined}
        disabled={!phoneLink}
        size={size}
        variant="text"
        startIcon={<CallOutlinedIcon />}
        aria-label={mobile ? `اتصال بالهاتف ${mobile}` : "رقم الهاتف غير متوفر"}
      >
        اتصال
      </Button>
      <Button
        component={whatsappLink ? "a" : "button"}
        href={whatsappLink || undefined}
        target={whatsappLink ? "_blank" : undefined}
        rel={whatsappLink ? "noopener noreferrer" : undefined}
        disabled={!whatsappLink}
        size={size}
        variant="text"
        startIcon={<ChatOutlinedIcon />}
        aria-label={whatsapp ? `التواصل عبر واتساب ${whatsapp}` : "رقم واتساب غير متوفر"}
      >
        واتساب
      </Button>
      <Button
        component={email ? "a" : "button"}
        href={email ? `mailto:${email}` : undefined}
        disabled={!email}
        size={size}
        variant="text"
        startIcon={<EmailOutlinedIcon />}
        aria-label={email ? `إرسال بريد إلى ${email}` : "البريد الإلكتروني غير متوفر"}
      >
        بريد
      </Button>
    </ActionDropdown>
  );
}
