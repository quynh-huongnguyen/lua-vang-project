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
    const bookingId = body.booking_id;

    if (
      typeof bookingId !== "string" ||
      !bookingId.trim()
    ) {
      return respond({
        error: "Vui lòng cung cấp booking_id.",
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

    // Tìm booking theo mã
    const { data: booking, error: findError } = await supabase
      .from("bookings")
      .select("booking_id, room_id, guest_name, check_in, check_out, status")
      .eq("booking_id", bookingId.trim())
      .maybeSingle();

    if (findError) {
      console.error(findError);
      return respond({
        error: "Không thể tìm booking.",
      }, 500);
    }

    if (!booking) {
      return respond({
        error: "Không tìm thấy booking.",
      }, 404);
    }

    if (booking.status === "cancelled") {
      return respond({
        message: "Booking này đã được hủy trước đó.",
        booking,
      });
    }

    if (booking.status !== "confirmed") {
      return respond({
        error: "Booking không ở trạng thái có thể hủy.",
      }, 409);
    }

    // Chỉ hủy booking đang confirmed
    const { data: cancelledBooking, error: updateError } =
      await supabase
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("booking_id", bookingId.trim())
        .eq("status", "confirmed")
        .select()
        .maybeSingle();

    if (updateError) {
      console.error(updateError);
      return respond({
        error: "Không thể hủy booking.",
      }, 500);
    }

    if (!cancelledBooking) {
      return respond({
        error: "Booking đã được thay đổi. Hãy kiểm tra lại trạng thái.",
      }, 409);
    }

    return respond({
      message: "Hủy booking thành công.",
      booking: cancelledBooking,
    });
  } catch (error) {
    console.error(error);
    return respond({ error: "Request JSON không hợp lệ." }, 400);
  }
});
