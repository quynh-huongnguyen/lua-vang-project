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
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return respond({ error: "Use POST." }, 405);
  }

  try {
    const body = await req.json();
    const { room_id, guest_name, check_in, check_out } = body;

    const isValidDate = (value: unknown): value is string => {
      if (typeof value !== "string") return false;
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
      if (!match) return false;

      const y = Number(match[1]);
      const m = Number(match[2]);
      const d = Number(match[3]);
      const date = new Date(Date.UTC(y, m - 1, d));

      return date.getUTCFullYear() === y &&
        date.getUTCMonth() === m - 1 &&
        date.getUTCDate() === d;
    };

    if (
      typeof room_id !== "string" || !room_id.trim() ||
      typeof guest_name !== "string" || !guest_name.trim() ||
      !isValidDate(check_in) ||
      !isValidDate(check_out)
    ) {
      return respond({
        error: "Cần room_id, guest_name, check_in và check_out hợp lệ.",
      }, 400);
    }

    if (check_out <= check_in) {
      return respond({
        error: "Ngày trả phòng phải sau ngày nhận phòng.",
      }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      return respond({
        error: "Thiếu cấu hình Supabase server.",
      }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Kiểm tra phòng tồn tại và đang được mở bán
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("room_id, status")
      .eq("room_id", room_id.trim())
      .maybeSingle();

    if (roomError) {
      console.error(roomError);
      return respond({ error: "Không thể kiểm tra phòng." }, 500);
    }

    if (!room || room.status !== "available") {
      return respond({
        error: "Không tìm thấy phòng hoặc phòng không khả dụng.",
      }, 404);
    }

    // Kiểm tra booking bị chồng lấn ngày
    const { data: conflicts, error: conflictError } = await supabase
      .from("bookings")
      .select("booking_id")
      .eq("room_id", room_id.trim())
      .eq("status", "confirmed")
      .lt("check_in", check_out)
      .gt("check_out", check_in)
      .limit(1);

    if (conflictError) {
      console.error(conflictError);
      return respond({ error: "Không thể kiểm tra lịch đặt phòng." }, 500);
    }

    if (conflicts && conflicts.length > 0) {
      return respond({
        error: "Phòng đã được đặt trong khoảng ngày này.",
      }, 409);
    }

    const bookingId =
      "LV-" + crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase();

    const { data: booking, error: insertError } = await supabase
      .from("bookings")
      .insert({
        booking_id: bookingId,
        room_id: room_id.trim(),
        guest_name: guest_name.trim(),
        check_in,
        check_out,
        status: "confirmed",
      })
      .select()
      .single();

    if (insertError) {
      console.error(insertError);
      return respond({
        error: "Không tạo được booking. Hãy kiểm tra cấu trúc bảng bookings.",
      }, 500);
    }

    return respond({
      message: "Đặt phòng thành công.",
      booking,
    }, 201);
  } catch (error) {
    console.error(error);
    return respond({ error: "Request JSON không hợp lệ." }, 400);
  }
});
