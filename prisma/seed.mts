import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env["DATABASE_URL"]! });
const prisma = new PrismaClient({ adapter });

/**
 * Anonymous Gregorian algorithm (Meeus/Jones/Butcher)
 * Returns the Date of Easter Sunday for a given year.
 */
function getEasterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/** Create a Date at noon UTC to avoid timezone shifts when storing as @db.Date */
function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day, 12, 0, 0));
}

function getSAPublicHolidays(year: number): { date: Date; name: string }[] {
  const easter = getEasterDate(year);

  const fixed: { date: Date; name: string }[] = [
    { date: utcDate(year, 0, 1), name: "New Year's Day" },
    { date: utcDate(year, 2, 21), name: "Human Rights Day" },
    { date: addDays(easter, -2), name: "Good Friday" },
    { date: addDays(easter, 1), name: "Family Day" },
    { date: utcDate(year, 3, 27), name: "Freedom Day" },
    { date: utcDate(year, 4, 1), name: "Workers' Day" },
    { date: utcDate(year, 5, 16), name: "Youth Day" },
    { date: utcDate(year, 7, 9), name: "National Women's Day" },
    { date: utcDate(year, 8, 24), name: "Heritage Day" },
    { date: utcDate(year, 11, 16), name: "Day of Reconciliation" },
    { date: utcDate(year, 11, 25), name: "Christmas Day" },
    { date: utcDate(year, 11, 26), name: "Day of Goodwill" },
  ];

  // Sunday substitution rule: if a holiday falls on Sunday, Monday is also a holiday
  const substitutions: { date: Date; name: string }[] = [];
  for (const holiday of fixed) {
    if (holiday.date.getDay() === 0) {
      substitutions.push({
        date: addDays(holiday.date, 1),
        name: `${holiday.name} (observed)`,
      });
    }
  }

  return [...fixed, ...substitutions];
}

async function main() {
  console.log("Seeding database...");

  // Clear public holidays (safe to re-seed)
  await prisma.publicHoliday.deleteMany();

  // Insert SA public holidays for 2026 and 2027
  for (const year of [2026, 2027]) {
    const holidays = getSAPublicHolidays(year);
    for (const holiday of holidays) {
      await prisma.publicHoliday.create({
        data: {
          date: holiday.date,
          name: holiday.name,
          year,
          isCustom: false,
        },
      });
    }
    console.log(`Created ${holidays.length} public holidays for ${year}`);
  }

  console.log("Seeding complete!");
  console.log("Sign in via Google OAuth — then run: pnpm prisma db execute --stdin <<< \"UPDATE users SET role = 'ADMIN' WHERE email = 'YOUR_EMAIL';\"");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
