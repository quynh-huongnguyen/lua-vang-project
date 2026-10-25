# Lụa Vàng Resort & Spa — Backend API Documentation

## 1. Base URL

```text
https://mhdhjvyryyggwwsqseid.supabase.co/functions/v1
```

## 2. Common Headers

```http
Content-Type: application/json
apikey: YOUR_SUPABASE_PUBLISHABLE_KEY
```

If the Edge Function requires JWT authentication, also provide:

```http
Authorization: Bearer YOUR_VALID_ACCESS_TOKEN
```

Never expose service-role or secret keys in frontend code.

## 3. Check Room Availability

**Endpoint:** `POST /check_availability`

### Request Body

```json
{
  "check_in": "2026-11-10",
  "check_out": "2026-11-12"
}
```

### Success Response — `200 OK`

```json
{
  "check_in": "2026-11-10",
  "check_out": "2026-11-12",
  "total_available": 1,
  "rooms": []
}
```

The response contains the actual available room records. The example is illustrative.

### Possible Errors

- `400 Bad Request`: Invalid date format or check-out is not after check-in.
- `405 Method Not Allowed`: Request method is not POST.
- `500 Internal Server Error`: Database query or server configuration error.

## 4. Create Booking

**Endpoint:** `POST /create_booking`

### Request Body

```json
{
  "room_id": "R101",
  "guest_name": "Nguyen Van An",
  "check_in": "2026-11-10",
  "check_out": "2026-11-12"
}
```

### Success Response — `201 Created`

Returns a success message and the newly created booking record, including its `booking_id`.

### Possible Errors

- `400 Bad Request`: Missing required fields or invalid dates.
- `404 Not Found`: Room does not exist or is not available.
- `409 Conflict`: Room has an overlapping confirmed booking.
- `500 Internal Server Error`: Database or server error.

## 5. Cancel Booking

**Endpoint:** `POST /cancel_booking`

### Request Body

```json
{
  "booking_id": "LV-AB12CD34EF56"
}
```

Replace the example with an existing booking ID.

### Success Response — `200 OK`

Returns a success message and the booking record with status `cancelled`.

### Possible Errors

- `400 Bad Request`: Missing booking ID or invalid JSON.
- `404 Not Found`: Booking does not exist.
- `409 Conflict`: Booking is not in a cancellable state or has changed.
- `500 Internal Server Error`: Database or server error.

## 6. Notes

- Dates use the `YYYY-MM-DD` format.
- Check-out must be after check-in.
- A cancelled booking should not block room availability.
- Confirm actual authentication settings and response behavior before integration.
- Server secrets must not be committed to GitHub.
