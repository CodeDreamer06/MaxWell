import { auth } from "@clerk/nextjs/server";
import { getLatestMemorySnapshot } from "@/lib/db";
import {
  geocodeLocation,
  searchNearbyHospitals,
} from "@/lib/services/hospitals";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const latValue = searchParams.get("lat");
  const lngValue = searchParams.get("lng");
  const query = searchParams.get("q")?.trim() ?? "";

  let latitude = latValue ? Number(latValue) : Number.NaN;
  let longitude = lngValue ? Number(lngValue) : Number.NaN;

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    if (query) {
      const geocoded = await geocodeLocation({ query });
      if (geocoded) {
        latitude = geocoded.latitude;
        longitude = geocoded.longitude;
      }
    } else {
      const memory = await getLatestMemorySnapshot(userId);
      const memoryLocation = memory?.snapshot.demographics.locationText;
      if (memoryLocation) {
        const geocoded = await geocodeLocation({ query: memoryLocation });
        if (geocoded) {
          latitude = geocoded.latitude;
          longitude = geocoded.longitude;
        }
      }
    }
  }

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return Response.json(
      {
        hospitals: [],
        center: null,
        error:
          "Provide location text or coordinates to search nearby hospitals.",
      },
      { status: 400 },
    );
  }

  try {
    const hospitals = await searchNearbyHospitals({
      latitude,
      longitude,
      limit: 10,
    });

    return Response.json({
      center: { latitude, longitude },
      hospitals,
    });
  } catch {
    return Response.json(
      {
        hospitals: [],
        center: { latitude, longitude },
        error: "Unable to fetch hospitals right now.",
      },
      { status: 502 },
    );
  }
}
