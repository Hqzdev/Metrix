import { PrismaClient } from "@prisma/client";

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

const globalForPrisma = globalThis as unknown as {
  metrixWebPrisma?: PrismaClient;
};

function getPrisma() {
  globalForPrisma.metrixWebPrisma ??= new PrismaClient();
  return globalForPrisma.metrixWebPrisma;
}

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return Response.json({ bookings: [], error: "DATABASE_URL is not configured" }, { status: 503 });
  }

  try {
    const bookings = await getPrisma().$queryRaw<SharedBookingRow[]>`
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
    `;

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
