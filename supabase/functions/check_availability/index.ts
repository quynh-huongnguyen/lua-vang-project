import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function respond(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders,
  });
}

Deno.serve(async (req: Request) => {
  // Cho phép trình duyệt kiểm tra CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return respond(
      { error: "Method not allowed. Use POST." },
      405,
    );
  }

  try {
    const body = await req.json();
    const checkIn = body.check_in;
    const checkOut = body.check_out;

    // Kiểm tra định dạng ngày YYYY-MM-DD
    const isValidDate = (value: unknown): value is string => {
      if (typeof value !== "string") return false;

      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
      if (!match) return false;

      const year = Number(match[1]);
      const month = Number(match[2]);
      const day = Number(match[3]);
      const date = new Date(Date.UTC(year, month - 1, day));

      return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
      );
    };

    if (!isValidDate(checkIn) || !isValidDate(checkOut)) {
      return respond(
        {
          error: "Ngày phải đúng định dạng YYYY-MM-DD.",
        },
        400,
      );
    }

    if (checkOut <= checkIn) {
      return respond(
        {
          error: "Ngày trả phòng phải sau ngày nhận phòng.",
        },
        400,
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const secretKeys = JSON.parse(
      Deno.env.get("SUPABASE_SECRET_KEYS")!,
    );
    const secretKey = secretKeys.default;

    if (!supabaseUrl || !secretKey) {
      return respond(
        { error: "Supabase server configuration is missing." },
        500,
      );
    }

    const supabase = createClient(supabaseUrl, secretKey);

    // Tìm booking đã xác nhận có ngày bị chồng lấn.
    // Booking [check_in, check_out) cho phép khách mới
    // nhận phòng đúng ngày khách trước trả phòng.
    const { data: bookings, error: bookingError } =
      await supabase
        .from("bookings")
        .select("room_id")
        .eq("status", "confirmed")
        .lt("check_in", checkOut)
        .gt("check_out", checkIn);

    if (bookingError) {
      console.error("Booking query failed:", bookingError);
      return respond(
        { error: "Không thể kiểm tra booking." },
        500,
      );
    }

    const bookedRoomIds = [
      ...new Set((bookings ?? []).map((b) => b.room_id)),
    ];

    // Lấy phòng đang hoạt động
    let roomQuery = supabase
      .from("rooms")
      .select(
        "room_id, room_type, size_sqm, capacity, rate_low, rate_high, status",
      )
      .eq("status", "available")
      .order("room_id");

    if (bookedRoomIds.length > 0) {
      roomQuery = roomQuery.not(
        "room_id",
        "in",
        `(${bookedRoomIds.join(",")})`,
      );
    }

    const { data: rooms, error: roomError } = await roomQuery;

    if (roomError) {
      console.error("Room query failed:", roomError);
      return respond(
        { error: "Không thể lấy danh sách phòng." },
        500,
      );
    }

    return respond({
      check_in: checkIn,
      check_out: checkOut,
      total_available: rooms?.length ?? 0,
      rooms: rooms ?? [],
    });
  } catch (error) {
    console.error("Request failed:", error);
    return respond({ error: "Request JSON không hợp lệ." }, 400);
  }
});
