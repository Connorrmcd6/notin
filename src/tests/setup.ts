import { vi } from "vitest";

// Mock Next.js cache functions
vi.mock("next/cache", () => ({
  unstable_cache: <T extends (...args: unknown[]) => unknown>(fn: T) => fn,
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));

// Mock Google Calendar service
vi.mock("@/lib/google-calendar", () => ({
  createCalendarEvent: vi.fn().mockResolvedValue(null),
  deleteCalendarEvent: vi.fn().mockResolvedValue(undefined),
}));

// Mock Prisma with all model methods
const mockPrismaModel = () => ({
  create: vi.fn(),
  createMany: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
  delete: vi.fn(),
  deleteMany: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
  findUnique: vi.fn(),
  upsert: vi.fn(),
  count: vi.fn(),
});

vi.mock("@/lib/db/client", () => {
  return {
    prisma: {
      user: mockPrismaModel(),
      leaveRequest: mockPrismaModel(),
      leaveBalance: mockPrismaModel(),
      publicHoliday: mockPrismaModel(),
      balanceAdjustment: mockPrismaModel(),
      notification: mockPrismaModel(),
      $disconnect: vi.fn(),
      $transaction: vi.fn((fn: (tx: unknown) => unknown) =>
        fn({
          user: mockPrismaModel(),
          leaveRequest: mockPrismaModel(),
          leaveBalance: mockPrismaModel(),
          publicHoliday: mockPrismaModel(),
          balanceAdjustment: mockPrismaModel(),
          notification: mockPrismaModel(),
        }),
      ),
    },
  };
});
