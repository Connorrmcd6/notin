import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CalendarDays, TrendingDown, ArrowRightLeft, Minus } from "lucide-react";
import type { LeaveBalance } from "@/generated/prisma/client";

interface BalanceCardsProps {
  balance: LeaveBalance | null;
}

export function BalanceCards({ balance }: BalanceCardsProps) {
  if (!balance) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No leave balance set for this year. Contact your admin.
        </CardContent>
      </Card>
    );
  }

  const total = balance.annualAllowance + balance.carriedOver;
  const remaining = total - balance.usedDays;

  const cards = [
    {
      title: "Total Allowance",
      value: total,
      icon: CalendarDays,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Used",
      value: balance.usedDays,
      icon: Minus,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      title: "Remaining",
      value: remaining,
      icon: TrendingDown,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    ...(balance.carriedOver > 0
      ? [
          {
            title: "Carried Over",
            value: balance.carriedOver,
            icon: ArrowRightLeft,
            color: "text-purple-600",
            bgColor: "bg-purple-50",
          },
        ]
      : []),
  ];

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <div className={`rounded-md p-2 ${card.bgColor}`}>
              <card.icon className={`size-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {card.value % 1 === 0 ? card.value : card.value.toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground">days</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
