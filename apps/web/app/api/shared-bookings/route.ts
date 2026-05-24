import { Pool } from "pg";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SharedBookingRow = {
  id: string;
  locationId: string;
  locationName: string;
  resourceId: string;
  resourceName: string;
  slotId: string;
  telegramUserId: bigint;
  paidAmountMinorUnits: number;
  priceLabel: string;
  startsAt: string;
  startsAtIso: Date;
  endsAt: string;
  endsAtIso: Date;
  status: string;
  createdAt: Date;
};

const globalForPg = globalThis as unknown as {
  metrixWebPool?: Pool;
};

function getPool() {
  globalForPg.metrixWebPool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
  });
  return globalForPg.metrixWebPool;
}

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return Response.json({ bookings: [], error: "DATABASE_URL is not configured" }, { status: 503 });
  }

  try {
    const { rows: bookings } = await getPool().query<SharedBookingRow>(`
      SELECT
        "id",
        "locationId",
        "locationName",
        "resourceId",
        "resourceName",
        "slotId",
        "telegramUserId",
        "paidAmountMinorUnits",
        "priceLabel",
        "startsAt",
        "startsAtIso",
        "endsAt",
        "endsAtIso",
        "status",
        "createdAt"
      FROM booking."Booking"
      WHERE "status" = 'active'
      ORDER BY "startsAtIso" ASC
    `);

    return Response.json(
      {
        bookings: bookings.map((booking) => ({
          ...booking,
          createdAt: booking.createdAt.toISOString(),
          endsAtIso: booking.endsAtIso.toISOString(),
          startsAtIso: booking.startsAtIso.toISOString(),
          telegramUserId: booking.telegramUserId.toString(),
        })),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch {
    return Response.json({ bookings: [], error: "Shared booking database is unavailable" }, { status: 503 });
  }
}
