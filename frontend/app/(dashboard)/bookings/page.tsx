import { BookingsPageContent } from "@/components/bookings/BookingsPageContent";
import { getRequestLanguage } from "@/lib/server-language";
import { buildPageMetadata } from "@/lib/site";

export function generateMetadata() {
  return buildPageMetadata("bookings", getRequestLanguage());
}

export default function BookingsPage() {
  return <BookingsPageContent />;
}
