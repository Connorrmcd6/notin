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
  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function getSAPublicHolidays(year: number): { date: Date; name: string }[] {
  const easter = getEasterDate(year);

  const fixed: { date: Date; name: string }[] = [
    { date: new Date(year, 0, 1), name: "New Year's Day" },
    { date: new Date(year, 2, 21), name: "Human Rights Day" },
    { date: addDays(easter, -2), name: "Good Friday" },
    { date: addDays(easter, 1), name: "Family Day" },
    { date: new Date(year, 3, 27), name: "Freedom Day" },
    { date: new Date(year, 4, 1), name: "Workers' Day" },
    { date: new Date(year, 5, 16), name: "Youth Day" },
    { date: new Date(year, 7, 9), name: "National Women's Day" },
    { date: new Date(year, 8, 24), name: "Heritage Day" },
    { date: new Date(year, 11, 16), name: "Day of Reconciliation" },
    { date: new Date(year, 11, 25), name: "Christmas Day" },
    { date: new Date(year, 11, 26), name: "Day of Goodwill" },
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

  // Clear all tables in reverse dependency order
  await prisma.notification.deleteMany();
  await prisma.balanceAdjustment.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.leaveBalance.deleteMany();
  await prisma.publicHoliday.deleteMany();
  await prisma.user.deleteMany();

  // Create admin user
  const admin = await prisma.user.create({
    data: {
      email: "admin@thoughtlab.studio",
      name: "Admin User",
      role: "ADMIN",
    },
  });
  console.log(`Created admin: ${admin.email}`);

  // Create sample employees
  const employees = await Promise.all([
    prisma.user.create({
      data: { email: "jane@thoughtlab.studio", name: "Jane Smith", role: "EMPLOYEE" },
    }),
    prisma.user.create({
      data: { email: "john@thoughtlab.studio", name: "John Doe", role: "EMPLOYEE" },
    }),
    prisma.user.create({
      data: { email: "sarah@thoughtlab.studio", name: "Sarah Johnson", role: "EMPLOYEE" },
    }),
    prisma.user.create({
      data: { email: "mike@thoughtlab.studio", name: "Mike Williams", role: "EMPLOYEE" },
    }),
  ]);
  console.log(`Created ${employees.length} employees`);

  const allUsers = [admin, ...employees];
  const allowances = [20, 15, 16, 18, 17]; // admin gets 20, employees get 15-18

  // Create leave balances for 2026 and 2027
  for (const year of [2026, 2027]) {
    for (let i = 0; i < allUsers.length; i++) {
      await prisma.leaveBalance.create({
        data: {
          userId: allUsers[i].id,
          year,
          annualAllowance: allowances[i],
          usedDays: 0,
          carriedOver: 0,
        },
      });
    }
  }
  console.log("Created leave balances for 2026 and 2027");

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

  // Create sample leave requests
  const jane = employees[0];
  const john = employees[1];
  const sarah = employees[2];
  const mike = employees[3];

  // 1. PENDING request
  await prisma.leaveRequest.create({
    data: {
      userId: jane.id,
      leaveType: "PAID_ANNUAL",
      startDate: new Date(2026, 5, 15), // June 15
      endDate: new Date(2026, 5, 19), // June 19
      dayType: "FULL",
      note: "Family vacation",
      status: "PENDING",
    },
  });
  console.log("Created PENDING leave request");

  // 2. APPROVED request (with balance updated)
  await prisma.leaveRequest.create({
    data: {
      userId: john.id,
      leaveType: "PAID_ANNUAL",
      startDate: new Date(2026, 3, 6), // April 6
      endDate: new Date(2026, 3, 10), // April 10
      dayType: "FULL",
      note: "Spring break",
      status: "APPROVED",
      reviewedBy: admin.id,
      reviewedAt: new Date(2026, 2, 20),
    },
  });
  await prisma.leaveBalance.update({
    where: { userId_year: { userId: john.id, year: 2026 } },
    data: { usedDays: 5 },
  });
  console.log("Created APPROVED leave request");

  // 3. DECLINED request
  await prisma.leaveRequest.create({
    data: {
      userId: sarah.id,
      leaveType: "PAID_ANNUAL",
      startDate: new Date(2026, 11, 24), // Dec 24
      endDate: new Date(2026, 11, 31), // Dec 31
      dayType: "FULL",
      note: "Holiday season",
      status: "DECLINED",
      reviewedBy: admin.id,
      reviewedAt: new Date(2026, 10, 15),
      declineReason: "Too many team members already off during this period",
    },
  });
  console.log("Created DECLINED leave request");

  // 4. CANCELLED request
  await prisma.leaveRequest.create({
    data: {
      userId: mike.id,
      leaveType: "UNPAID",
      startDate: new Date(2026, 7, 3), // Aug 3
      endDate: new Date(2026, 7, 3), // Aug 3
      dayType: "MORNING",
      note: "Personal errand",
      status: "CANCELLED",
    },
  });
  console.log("Created CANCELLED leave request");

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
