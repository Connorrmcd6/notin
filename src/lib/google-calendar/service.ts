import { prisma } from "@/lib/db/client";

interface CalendarEventInput {
  userId: string;
  summary: string;
  startDate: Date;
  endDate: Date;
  dayType: "FULL" | "MORNING" | "AFTERNOON";
}

async function getAccessToken(userId: string): Promise<string | null> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
    select: { refresh_token: true, access_token: true, expires_at: true },
  });

  if (!account?.refresh_token) return null;

  if (
    account.expires_at &&
    account.expires_at * 1000 > Date.now() + 300_000
  ) {
    return account.access_token;
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.AUTH_GOOGLE_ID!,
      client_secret: process.env.AUTH_GOOGLE_SECRET!,
      grant_type: "refresh_token",
      refresh_token: account.refresh_token,
    }),
  });

  if (!response.ok) return null;

  const tokens = await response.json();

  await prisma.account.updateMany({
    where: { userId, provider: "google" },
    data: {
      access_token: tokens.access_token,
      expires_at: Math.floor(Date.now() / 1000) + tokens.expires_in,
    },
  });

  return tokens.access_token;
}

export async function createCalendarEvent(
  input: CalendarEventInput,
): Promise<string | null> {
  const accessToken = await getAccessToken(input.userId);
  if (!accessToken) return null;

  const event = buildEventBody(input);

  try {
    const response = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      },
    );

    if (!response.ok) {
      console.error("Failed to create calendar event:", await response.text());
      return null;
    }

    const created = await response.json();
    return created.id;
  } catch (error) {
    console.error("Calendar API error:", error);
    return null;
  }
}

export async function deleteCalendarEvent(
  userId: string,
  eventId: string,
): Promise<void> {
  const accessToken = await getAccessToken(userId);
  if (!accessToken) return;

  try {
    await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
  } catch (error) {
    console.error("Calendar event deletion error:", error);
  }
}

function buildEventBody(input: CalendarEventInput) {
  const { summary, startDate, endDate, dayType } = input;

  if (dayType === "FULL") {
    const end = new Date(endDate);
    end.setDate(end.getDate() + 1);
    return {
      summary,
      start: { date: toDateString(startDate) },
      end: { date: toDateString(end) },
      transparency: "opaque",
    };
  }

  const dateStr = toDateString(startDate);
  const startTime = dayType === "MORNING" ? "08:00:00" : "12:00:00";
  const endTime = dayType === "MORNING" ? "12:00:00" : "17:00:00";

  return {
    summary,
    start: {
      dateTime: `${dateStr}T${startTime}`,
      timeZone: "Africa/Johannesburg",
    },
    end: {
      dateTime: `${dateStr}T${endTime}`,
      timeZone: "Africa/Johannesburg",
    },
    transparency: "opaque",
  };
}

function toDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}
