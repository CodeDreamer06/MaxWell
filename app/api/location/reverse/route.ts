import { auth } from "@clerk/nextjs/server";
import { getServerEnv } from "@/lib/env";
import { reverseGeocodeCoordinates } from "@/lib/services/hospitals";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const latitude = Number(searchParams.get("lat") ?? "");
  const longitude = Number(searchParams.get("lng") ?? "");

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return Response.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  const token = getServerEnv().MAPBOX_ACCESS_TOKEN;
  if (!token) {
    return Response.json({
      placeName: `Approx. coordinates (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
    });
  }

  const placeName = await reverseGeocodeCoordinates({
    token,
    latitude,
    longitude,
  });

  return Response.json({
    placeName:
      placeName ??
      `Approx. coordinates (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
  });
}
