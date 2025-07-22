// components/attendance/columns.tsx
import { ColumnDef } from "@tanstack/react-table";

export type Attendance = {
  userId: string;
  userName: string;
  email?: string;
  status: string;
  workingMinutes?: number;
  inTime?: string;
  inPhotoUrl?: string;
  outTime?: string;
  outPhotoUrl?: string;
  inLocationAddress?: string;
  outLocationAddress?: string;
};

export const columns: ColumnDef<Attendance>[] = [
  {
    accessorKey: "userName",
    header: "Employee Name",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium">{row.original.userName}</span>
        <span className="text-xs text-muted-foreground">
          {row.original.email}
        </span>
      </div>
    ),
  },
  {
    header: "Clock In",
    cell: ({ row }) => (
      <div>
        <div className="text-orange-600 font-medium">{row.original.inTime}</div>
        <div className="text-xs text-muted-foreground">
          {row.original.inLocationAddress}
        </div>
      </div>
    ),
  },
  {
    header: "Clock Out",
    cell: ({ row }) => (
      <div>
        <div className="text-green-600 font-medium">{row.original.outTime}</div>
        <div className="text-xs text-muted-foreground">
          {row.original.outLocationAddress}
        </div>
      </div>
    ),
  },
  {
    header: "In Photo",
    cell: ({ row }) =>
      row.original.inPhotoUrl ? (
        <a
          href={row.original.inPhotoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs underline text-blue-600"
        >
          View
        </a>
      ) : (
        "-"
      ),
  },
  {
    header: "Out Photo",
    cell: ({ row }) =>
      row.original.outPhotoUrl ? (
        <a
          href={row.original.outPhotoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs underline text-blue-600"
        >
          View
        </a>
      ) : (
        "-"
      ),
  },
];
