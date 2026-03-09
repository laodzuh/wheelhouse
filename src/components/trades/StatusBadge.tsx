import { Badge } from "@/components/ui/Badge";
import type { Status } from "@/db/types";

const statusColors: Record<Status, "green" | "red" | "blue" | "yellow" | "purple" | "gray" | "orange"> = {
  Open: "blue",
  "Closed (Win)": "green",
  "Closed (Loss)": "red",
  Expired: "gray",
  Assigned: "purple",
  Rolled: "orange",
};

export function StatusBadge({ status }: { status: Status }) {
  return <Badge color={statusColors[status]}>{status}</Badge>;
}
