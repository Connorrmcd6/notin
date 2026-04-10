"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AddHolidayDialog } from "@/components/holidays/add-holiday-dialog";
import {
  fetchHolidays,
  deleteHoliday as deleteHolidayApi,
} from "@/lib/api/client";
import type { PublicHoliday } from "@/generated/prisma/client";

export function HolidayTable() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [holidays, setHolidays] = useState<PublicHoliday[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const years = Array.from({ length: 5 }, (_, i) => currentYear - 1 + i);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchHolidays(year);
      setHolidays(result.data);
    } catch {
      toast.error("Failed to load holidays");
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await deleteHolidayApi(id);
      toast.success("Holiday deleted");
      load();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete holiday",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Select
          value={String(year)}
          onValueChange={(v) => setYear(Number(v))}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <AddHolidayDialog onCreated={load} />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-6">
                  <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : holidays.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center py-6 text-muted-foreground"
                >
                  No holidays for {year}
                </TableCell>
              </TableRow>
            ) : (
              holidays.map((h) => (
                <TableRow key={h.id}>
                  <TableCell>
                    {new Date(h.date).toLocaleDateString("en-ZA", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell className="font-medium">{h.name}</TableCell>
                  <TableCell>
                    <Badge variant={h.isCustom ? "secondary" : "outline"}>
                      {h.isCustom ? "Custom" : "Auto"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(h.id)}
                      disabled={deletingId === h.id}
                    >
                      {deletingId === h.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
