// app/voice/page.tsx
// Redirect lama /voice ke halaman baru /tones.
import { redirect } from "next/navigation";

export default function VoicePage() {
  redirect("/tones");
}
