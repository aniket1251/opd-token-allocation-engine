
# Doctor API

Manage doctor profiles and availability in the OPD system.

---

## Create a doctor

In your `POST /api/doctors` request, set the required fields.

|Field|Description|
|---|---|
|name|Doctor's full name|
|specialization|Medical specialization (optional)|

### Sample request

In this example, a new doctor is created with a name and specialization. The system automatically generates a unique display ID.

```bash
curl --request POST \
--url 'http://localhost:8000/api/doctors' \
--header 'Content-Type: application/json' \
--header 'Accept: application/json' \
--data '{
  "name": "Dr. Amit Kumar",
  "specialization": "Cardiology"
}'
```

### Response

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Dr. Amit Kumar",
    "displayID": "AKU001",
    "specialization": "Cardiology",
    "isActive": true,
    "createdAt": "2026-02-02T10:30:00.000Z",
    "updatedAt": "2026-02-02T10:30:00.000Z"
  },
  "message": "Doctor created successfully"
}
```

---

## Get all doctors

In your `GET /api/doctors` request, optionally filter by active status.

### Query Parameters

|Parameter|Description|
|---|---|
|isActive|Filter by active status. Set to `true` (default) or `false`|

### Sample request

```bash
curl --request GET \
--url 'http://localhost:8000/api/doctors?isActive=true' \
--header 'Accept: application/json'
```

### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Dr. Amit Kumar",
      "displayID": "AKU001",
      "specialization": "Cardiology",
      "isActive": true,
      "createdAt": "2026-02-02T10:30:00.000Z",
      "updatedAt": "2026-02-02T10:30:00.000Z"
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "name": "Dr. Priya Sharma",
      "displayID": "PSH002",
      "specialization": "Pediatrics",
      "isActive": true,
      "createdAt": "2026-02-02T11:00:00.000Z",
      "updatedAt": "2026-02-02T11:00:00.000Z"
    }
  ],
  "count": 2
}
```

---

## Get a doctor

In your `GET /api/doctors/{doctorId}` request, specify the doctor ID in the path.

### Path Parameters

|Parameter|Description|
|---|---|
|doctorId|The unique identifier of the doctor|

### Sample request

```bash
curl --request GET \
--url 'http://localhost:8000/api/doctors/550e8400-e29b-41d4-a716-446655440000' \
--header 'Accept: application/json'
```

### Response

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Dr. Amit Kumar",
    "displayID": "AKU001",
    "specialization": "Cardiology",
    "isActive": true,
    "createdAt": "2026-02-02T10:30:00.000Z",
    "updatedAt": "2026-02-02T10:30:00.000Z"
  }
}
```

### Error Response

When a doctor is not found:

```json
{
  "success": false,
  "error": "Doctor not found"
}
```

---

## Activate a doctor

In your `PATCH /api/doctors/{doctorId}/activate` request, specify the doctor ID to reactivate.

### Path Parameters

|Parameter|Description|
|---|---|
|doctorId|The unique identifier of the doctor to activate|

### Sample request

```bash
curl --request PATCH \
--url 'http://localhost:8000/api/doctors/550e8400-e29b-41d4-a716-446655440000/activate' \
--header 'Accept: application/json'
```

### Response

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Dr. Amit Kumar",
    "displayID": "AKU001",
    "specialization": "Cardiology",
    "isActive": true,
    "createdAt": "2026-02-02T10:30:00.000Z",
    "updatedAt": "2026-02-02T14:45:00.000Z"
  },
  "message": "Doctor activated successfully"
}
```

---

## Deactivate a doctor

In your `PATCH /api/doctors/{doctorId}/deactivate` request, specify the doctor ID to deactivate. Deactivated doctors will not appear in default listings and cannot receive new slot assignments.

### Path Parameters

|Parameter|Description|
|---|---|
|doctorId|The unique identifier of the doctor to deactivate|

### Sample request

```bash
curl --request PATCH \
--url 'http://localhost:8000/api/doctors/550e8400-e29b-41d4-a716-446655440000/deactivate' \
--header 'Accept: application/json'
```

### Response

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Dr. Amit Kumar",
    "displayID": "AKU001",
    "specialization": "Cardiology",
    "isActive": false,
    "createdAt": "2026-02-02T10:30:00.000Z",
    "updatedAt": "2026-02-02T15:30:00.000Z"
  },
  "message": "Doctor deactivated successfully"
}
```

---
# Slot API

Manage time slots for doctor appointments with capacity controls.

---

## Create a slot

In your `POST /api/slots` request, set the required fields.

|Field|Description|
|---|---|
|doctorId|ID of the doctor for this slot|
|date|Date in DD-MM-YYYY format|
|startTime|Slot start time in HH:MM format (e.g., "09:00")|
|endTime|Slot end time in HH:MM format (e.g., "10:00")|
|capacity|Maximum number of patients allowed|
|paidCap|Optional cap for paid priority patients. If set, limits paid patients to this number|
|followUpCap|Optional cap for follow-up patients. If set, limits follow-up patients to this number|

### Sample request

In this example, a slot is created for a doctor with capacity management. The paid cap reserves space for regular patients.

```bash
curl --request POST \
--url 'http://localhost:8000/api/slots' \
--header 'Content-Type: application/json' \
--header 'Accept: application/json' \
--data '{
  "doctorId": "550e8400-e29b-41d4-a716-446655440000",
  "date": "05-02-2026",
  "startTime": "09:00",
  "endTime": "10:00",
  "capacity": 10,
  "paidCap": 3,
  "followUpCap": 2
}'
```

### Response

```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440010",
    "displayID": "S-AKU001-20260205-001",
    "doctorId": "550e8400-e29b-41d4-a716-446655440000",
    "date": "2026-02-05T00:00:00.000Z",
    "startTime": "09:00",
    "endTime": "10:00",
    "capacity": 10,
    "paidCap": 3,
    "followUpCap": 2,
    "isActive": true,
    "createdAt": "2026-02-02T10:30:00.000Z",
    "updatedAt": "2026-02-02T10:30:00.000Z",
    "doctor": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Dr. Amit Kumar",
      "displayID": "AKU001",
      "specialization": "Cardiology",
      "isActive": true
    }
  },
  "message": "Slot created successfully"
}
```

---

## Get a slot

In your `GET /api/slots/{slotId}` request, specify the slot ID in the path. The response includes allocated tokens.

### Path Parameters

|Parameter|Description|
|---|---|
|slotId|The unique identifier of the slot|

### Sample request

```bash
curl --request GET \
--url 'http://localhost:8000/api/slots/770e8400-e29b-41d4-a716-446655440010' \
--header 'Accept: application/json'
```

### Response

```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440010",
    "displayID": "S-AKU001-20260205-001",
    "doctorId": "550e8400-e29b-41d4-a716-446655440000",
    "date": "2026-02-05T00:00:00.000Z",
    "startTime": "09:00",
    "endTime": "10:00",
    "capacity": 10,
    "paidCap": 3,
    "followUpCap": 2,
    "isActive": true,
    "createdAt": "2026-02-02T10:30:00.000Z",
    "updatedAt": "2026-02-02T10:30:00.000Z",
    "doctor": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Dr. Amit Kumar",
      "displayID": "AKU001",
      "specialization": "Cardiology",
      "isActive": true
    },
    "tokens": [
      {
        "id": "880e8400-e29b-41d4-a716-446655440020",
        "displayID": "T-AKU001-20260205-001",
        "patientName": "Rahul Verma",
        "priority": "PAID",
        "status": "ALLOCATED"
      }
    ]
  }
}
```

### Error Response

When a slot is not found:

```json
{
  "success": false,
  "error": "Slot not found"
}
```

---

## Get slots by doctor

In your `GET /api/slots/doctor/{doctorId}` request, specify the doctor ID and date query parameter.

### Path Parameters

|Parameter|Description|
|---|---|
|doctorId|The unique identifier of the doctor|

### Query Parameters

|Parameter|Description|
|---|---|
|date|Date in DD-MM-YYYY format (required)|

### Sample request

```bash
curl --request GET \
--url 'http://localhost:8000/api/slots/doctor/550e8400-e29b-41d4-a716-446655440000?date=05-02-2026' \
--header 'Accept: application/json'
```

### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440010",
      "displayID": "S-AKU001-20260205-001",
      "doctorId": "550e8400-e29b-41d4-a716-446655440000",
      "date": "2026-02-05T00:00:00.000Z",
      "startTime": "09:00",
      "endTime": "10:00",
      "capacity": 10,
      "paidCap": 3,
      "followUpCap": 2,
      "isActive": true,
      "tokens": []
    },
    {
      "id": "770e8400-e29b-41d4-a716-446655440011",
      "displayID": "S-AKU001-20260205-002",
      "doctorId": "550e8400-e29b-41d4-a716-446655440000",
      "date": "2026-02-05T00:00:00.000Z",
      "startTime": "10:00",
      "endTime": "11:00",
      "capacity": 10,
      "paidCap": 3,
      "followUpCap": 2,
      "isActive": true,
      "tokens": []
    }
  ],
  "count": 2
}
```

### Error Response

When date parameter is missing:

```json
{
  "success": false,
  "error": "Date query parameter is required (DD-MM-YYYY)"
}
```

---

## Get slot availability

In your `GET /api/slots/{slotId}/availability` request, get detailed availability statistics including allocated counts by priority and capacity constraints.

### Path Parameters

|Parameter|Description|
|---|---|
|slotId|The unique identifier of the slot|

### Sample request

```bash
curl --request GET \
--url 'http://localhost:8000/api/slots/770e8400-e29b-41d4-a716-446655440010/availability' \
--header 'Accept: application/json'
```

### Response

```json
{
  "success": true,
  "data": {
    "slotId": "770e8400-e29b-41d4-a716-446655440010",
    "doctorId": "550e8400-e29b-41d4-a716-446655440000",
    "startTime": "09:00",
    "endTime": "10:00",
    "capacity": 10,
    "allocatedCount": 5,
    "availableCount": 5,
    "paidCount": 2,
    "followUpCount": 1,
    "emergencyCount": 0,
    "canAcceptPaid": true,
    "canAcceptFollowUp": true,
    "canAcceptRegular": true,
    "slotEnded": false
  }
}
```

### Response Fields

|Field|Description|
|---|---|
|allocatedCount|Number of patients currently allocated to this slot|
|availableCount|Remaining capacity (capacity - allocatedCount)|
|paidCount|Number of paid priority patients in this slot|
|followUpCount|Number of follow-up patients in this slot|
|emergencyCount|Number of emergency patients in this slot|
|canAcceptPaid|Whether slot can accept more paid patients (respects paidCap if set)|
|canAcceptFollowUp|Whether slot can accept more follow-up patients (respects followUpCap if set)|
|canAcceptRegular|Whether slot has available capacity|
|slotEnded|Whether the slot's end time has passed|

---

## Update slot capacity

In your `PATCH /api/slots/{slotId}/capacity` request, update capacity constraints. You cannot reduce capacity below the current number of allocated tokens.

### Path Parameters

|Parameter|Description|
|---|---|
|slotId|The unique identifier of the slot|

### Request Body

|Field|Description|
|---|---|
|capacity|New maximum capacity (optional)|
|paidCap|New paid patient cap (optional, set to null to remove cap)|
|followUpCap|New follow-up patient cap (optional, set to null to remove cap)|

### Sample request

```bash
curl --request PATCH \
--url 'http://localhost:8000/api/slots/770e8400-e29b-41d4-a716-446655440010/capacity' \
--header 'Content-Type: application/json' \
--header 'Accept: application/json' \
--data '{
  "capacity": 15,
  "paidCap": 5
}'
```

### Response

```json
{
  "success": true,
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440010",
    "displayID": "S-AKU001-20260205-001",
    "doctorId": "550e8400-e29b-41d4-a716-446655440000",
    "date": "2026-02-05T00:00:00.000Z",
    "startTime": "09:00",
    "endTime": "10:00",
    "capacity": 15,
    "paidCap": 5,
    "followUpCap": 2,
    "isActive": true,
    "createdAt": "2026-02-02T10:30:00.000Z",
    "updatedAt": "2026-02-02T11:15:00.000Z"
  },
  "message": "Slot updated successfully"
}
```

### Error Response

When trying to reduce capacity below allocated count:

```json
{
  "success": false,
  "error": "Cannot reduce capacity below current allocated count (8)"
}
```

---

## Delete a slot

In your `DELETE /api/slots/{slotId}` request, deactivate a slot. Slots with allocated tokens cannot be deleted.

### Path Parameters

|Parameter|Description|
|---|---|
|slotId|The unique identifier of the slot to delete|

### Sample request

```bash
curl --request DELETE \
--url 'http://localhost:8000/api/slots/770e8400-e29b-41d4-a716-446655440010' \
--header 'Accept: application/json'
```

### Response

```json
{
  "success": true,
  "message": "Slot deactivated successfully"
}
```

### Error Response

When slot has allocated tokens:

```json
{
  "success": false,
  "error": "Cannot delete slot with allocated tokens. Cancel tokens first."
}
```

---
# Token API

Manage patient tokens with automatic allocation, priority handling, and reallocation on cancellations.

---

## Create a token

In your `POST /api/tokens` request, set the required fields. The system automatically allocates the token to an available slot or places it in a waiting queue.

|Field|Description|
|---|---|
|patientName|Patient's full name|
|doctorId|ID of the doctor to visit|
|date|Appointment date in DD-MM-YYYY format|
|source|Token source: `WALKIN` or `ONLINE`|
|priority|Priority level: `EMERGENCY`, `PAID`, `FOLLOWUP`, `ONLINE`, or `WALKIN`|
|idempotencyKey|Unique key to prevent duplicate bookings (e.g., UUID)|
|patientPhone|Patient's phone number (optional)|
|patientAge|Patient's age (optional)|
|notes|Additional notes for follow-up or emergency cases (optional)|

### Sample request

In this example, a token is created for an emergency patient. The system automatically finds the best available slot or queues the patient.

```bash
curl --request POST \
--url 'http://localhost:8000/api/tokens' \
--header 'Content-Type: application/json' \
--header 'Accept: application/json' \
--data '{
  "patientName": "Rahul Verma",
  "patientPhone": "+919876543210",
  "patientAge": 45,
  "doctorId": "550e8400-e29b-41d4-a716-446655440000",
  "date": "05-02-2026",
  "source": "WALKIN",
  "priority": "EMERGENCY",
  "idempotencyKey": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "notes": "Chest pain, requires immediate attention"
}'
```

### Response

When token is allocated to a slot:

```json
{
  "success": true,
  "data": {
    "token": {
      "id": "880e8400-e29b-41d4-a716-446655440020",
      "displayID": "T-AKU001-20260205-001",
      "patientName": "Rahul Verma",
      "patientPhone": "+919876543210",
      "patientAge": 45,
      "source": "WALKIN",
      "priority": "EMERGENCY",
      "status": "ALLOCATED",
      "slotId": "770e8400-e29b-41d4-a716-446655440010",
      "doctorId": "550e8400-e29b-41d4-a716-446655440000",
      "date": "2026-02-05T00:00:00.000Z",
      "idempotencyKey": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "notes": "Chest pain, requires immediate attention",
      "createdAt": "2026-02-02T10:30:00.000Z",
      "updatedAt": "2026-02-02T10:30:00.000Z",
      "allocatedAt": "2026-02-02T10:30:00.000Z",
      "completedAt": null,
      "cancelledAt": null
    },
    "slot": {
      "id": "770e8400-e29b-41d4-a716-446655440010",
      "displayID": "S-AKU001-20260205-001",
      "startTime": "09:00",
      "endTime": "10:00"
    },
    "displacedTokens": [
      {
        "id": "880e8400-e29b-41d4-a716-446655440021",
        "displayID": "T-AKU001-20260205-002",
        "patientName": "Priya Sharma",
        "priority": "WALKIN",
        "newStatus": "WAITING",
        "message": "Moved to waiting due to emergency"
      }
    ]
  },
  "message": "Token allocated to slot S-AKU001-20260205-001"
}
```

When token enters waiting queue:

```json
{
  "success": true,
  "data": {
    "token": {
      "id": "880e8400-e29b-41d4-a716-446655440022",
      "displayID": "T-AKU001-20260205-003",
      "patientName": "Amit Singh",
      "priority": "ONLINE",
      "status": "WAITING",
      "slotId": null,
      "doctorId": "550e8400-e29b-41d4-a716-446655440000",
      "date": "2026-02-05T00:00:00.000Z"
    },
    "slot": null,
    "displacedTokens": []
  },
  "message": "Token created - added to waiting queue"
}
```

---

## Get a token

In your `GET /api/tokens/{tokenId}` request, specify the token ID in the path. The response includes slot information if allocated.

### Path Parameters

|Parameter|Description|
|---|---|
|tokenId|The unique identifier of the token|

### Sample request

```bash
curl --request GET \
--url 'http://localhost:8000/api/tokens/880e8400-e29b-41d4-a716-446655440020' \
--header 'Accept: application/json'
```

### Response

```json
{
  "success": true,
  "data": {
    "id": "880e8400-e29b-41d4-a716-446655440020",
    "displayID": "T-AKU001-20260205-001",
    "patientName": "Rahul Verma",
    "patientPhone": "+919876543210",
    "patientAge": 45,
    "source": "WALKIN",
    "priority": "EMERGENCY",
    "status": "ALLOCATED",
    "slotId": "770e8400-e29b-41d4-a716-446655440010",
    "doctorId": "550e8400-e29b-41d4-a716-446655440000",
    "date": "2026-02-05T00:00:00.000Z",
    "idempotencyKey": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "notes": "Chest pain, requires immediate attention",
    "createdAt": "2026-02-02T10:30:00.000Z",
    "updatedAt": "2026-02-02T10:30:00.000Z",
    "allocatedAt": "2026-02-02T10:30:00.000Z",
    "completedAt": null,
    "cancelledAt": null,
    "slot": {
      "id": "770e8400-e29b-41d4-a716-446655440010",
      "displayID": "S-AKU001-20260205-001",
      "doctorId": "550e8400-e29b-41d4-a716-446655440000",
      "date": "2026-02-05T00:00:00.000Z",
      "startTime": "09:00",
      "endTime": "10:00",
      "capacity": 10,
      "isActive": true
    }
  }
}
```

### Error Response

When a token is not found:

```json
{
  "success": false,
  "error": "Token not found"
}
```

---

## Get tokens by doctor

In your `GET /api/tokens/doctor/{doctorId}` request, specify the doctor ID and date query parameter to get all tokens for a specific doctor on a date.

### Path Parameters

|Parameter|Description|
|---|---|
|doctorId|The unique identifier of the doctor|

### Query Parameters

|Parameter|Description|
|---|---|
|date|Date in DD-MM-YYYY format (required)|

### Sample request

```bash
curl --request GET \
--url 'http://localhost:8000/api/tokens/doctor/550e8400-e29b-41d4-a716-446655440000?date=05-02-2026' \
--header 'Accept: application/json'
```

### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "880e8400-e29b-41d4-a716-446655440020",
      "displayID": "T-AKU001-20260205-001",
      "patientName": "Rahul Verma",
      "priority": "EMERGENCY",
      "status": "ALLOCATED",
      "slotId": "770e8400-e29b-41d4-a716-446655440010",
      "createdAt": "2026-02-02T10:30:00.000Z",
      "slot": {
        "startTime": "09:00",
        "endTime": "10:00"
      }
    },
    {
      "id": "880e8400-e29b-41d4-a716-446655440021",
      "displayID": "T-AKU001-20260205-002",
      "patientName": "Amit Singh",
      "priority": "ONLINE",
      "status": "WAITING",
      "slotId": null,
      "createdAt": "2026-02-02T11:00:00.000Z",
      "slot": null
    }
  ],
  "count": 2
}
```

---

## Get waiting tokens

In your `GET /api/tokens/doctor/{doctorId}/waiting` request, get all tokens in waiting status for a doctor on a specific date.

### Path Parameters

|Parameter|Description|
|---|---|
|doctorId|The unique identifier of the doctor|

### Query Parameters

|Parameter|Description|
|---|---|
|date|Date in DD-MM-YYYY format (required)|

### Sample request

```bash
curl --request GET \
--url 'http://localhost:8000/api/tokens/doctor/550e8400-e29b-41d4-a716-446655440000/waiting?date=05-02-2026' \
--header 'Accept: application/json'
```

### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "880e8400-e29b-41d4-a716-446655440021",
      "displayID": "T-AKU001-20260205-002",
      "patientName": "Amit Singh",
      "patientPhone": "+919876543211",
      "priority": "ONLINE",
      "status": "WAITING",
      "slotId": null,
      "doctorId": "550e8400-e29b-41d4-a716-446655440000",
      "date": "2026-02-05T00:00:00.000Z",
      "createdAt": "2026-02-02T11:00:00.000Z"
    }
  ],
  "count": 1
}
```

---

## Cancel a token

In your `PATCH /api/tokens/{tokenId}/cancel` request, cancel a token. If the token was allocated, the system automatically tries to reallocate waiting patients to the freed slot.

### Path Parameters

|Parameter|Description|
|---|---|
|tokenId|The unique identifier of the token to cancel|

### Sample request

```bash
curl --request PATCH \
--url 'http://localhost:8000/api/tokens/880e8400-e29b-41d4-a716-446655440020/cancel' \
--header 'Accept: application/json'
```

### Response

When an allocated token is cancelled (triggers reallocation):

```json
{
  "success": true,
  "data": {
    "cancelledToken": {
      "id": "880e8400-e29b-41d4-a716-446655440020",
      "displayID": "T-AKU001-20260205-001",
      "patientName": "Rahul Verma",
      "status": "CANCELLED",
      "cancelledAt": "2026-02-02T14:30:00.000Z"
    },
    "movedTokens": [
      {
        "id": "880e8400-e29b-41d4-a716-446655440021",
        "displayID": "T-AKU001-20260205-002",
        "patientName": "Amit Singh",
        "oldStatus": "WAITING",
        "newStatus": "ALLOCATED",
        "slotId": "770e8400-e29b-41d4-a716-446655440010"
      }
    ]
  },
  "message": "Token cancelled. 1 waiting patient(s) promoted."
}
```

When a waiting token is cancelled (no reallocation needed):

```json
{
  "success": true,
  "data": {
    "cancelledToken": {
      "id": "880e8400-e29b-41d4-a716-446655440021",
      "displayID": "T-AKU001-20260205-002",
      "status": "CANCELLED",
      "cancelledAt": "2026-02-02T14:30:00.000Z"
    },
    "movedTokens": []
  },
  "message": "Token cancelled (was in waiting queue)."
}
```

---

## Mark token as no-show

In your `PATCH /api/tokens/{tokenId}/no-show` request, mark an allocated token as no-show. The system automatically tries to reallocate waiting patients to fill the gap.

### Path Parameters

|Parameter|Description|
|---|---|
|tokenId|The unique identifier of the token to mark as no-show|

### Sample request

```bash
curl --request PATCH \
--url 'http://localhost:8000/api/tokens/880e8400-e29b-41d4-a716-446655440020/no-show' \
--header 'Accept: application/json'
```

### Response

```json
{
  "success": true,
  "data": {
    "noShowToken": {
      "id": "880e8400-e29b-41d4-a716-446655440020",
      "displayID": "T-AKU001-20260205-001",
      "patientName": "Rahul Verma",
      "status": "NO_SHOW"
    },
    "movedTokens": [
      {
        "id": "880e8400-e29b-41d4-a716-446655440021",
        "displayID": "T-AKU001-20260205-002",
        "patientName": "Amit Singh",
        "oldStatus": "WAITING",
        "newStatus": "ALLOCATED",
        "slotId": "770e8400-e29b-41d4-a716-446655440010"
      }
    ]
  },
  "message": "Token marked as no-show. 1 waiting patient(s) promoted."
}
```

---

## Mark token as completed

In your `PATCH /api/tokens/{tokenId}/complete` request, mark a token as completed after the patient has been seen by the doctor.

### Path Parameters

|Parameter|Description|
|---|---|
|tokenId|The unique identifier of the token to mark as completed|

### Sample request

```bash
curl --request PATCH \
--url 'http://localhost:8000/api/tokens/880e8400-e29b-41d4-a716-446655440020/complete' \
--header 'Accept: application/json'
```

### Response

```json
{
  "success": true,
  "message": "Token marked as completed"
}
```

---

## Expire waiting tokens

In your `POST /api/tokens/doctor/{doctorId}/expire` request, expire all waiting tokens for a doctor on a specific date. This is typically run at end of day.

### Path Parameters

|Parameter|Description|
|---|---|
|doctorId|The unique identifier of the doctor|

### Request Body

|Field|Description|
|---|---|
|date|Date in DD-MM-YYYY format|

### Sample request

```bash
curl --request POST \
--url 'http://localhost:8000/api/tokens/doctor/550e8400-e29b-41d4-a716-446655440000/expire' \
--header 'Content-Type: application/json' \
--header 'Accept: application/json' \
--data '{
  "date": "05-02-2026"
}'
```

### Response

```json
{
  "success": true,
  "message": "3 waiting tokens expired",
  "data": {
    "expiredCount": 3
  }
}
```

---

## Priority Levels

Understanding token priority:

|Priority|Description|Use Case|
|---|---|---|
|EMERGENCY|Highest priority|Life-threatening cases. Can displace lower priority patients|
|PAID|Premium patients|Paid priority service. Limited by `paidCap` if configured|
|FOLLOWUP|Follow-up visits|Continuity of care. Limited by `followUpCap` if configured|
|ONLINE|Online bookings|Standard advance bookings|
|WALKIN|Walk-in patients|Lowest priority. Served when capacity remains|

---

## Token Status Flow

Token states and transitions:

|Status|Description|
|---|---|
|WAITING|In queue, not assigned to any slot yet|
|ALLOCATED|Assigned to a specific time slot|
|COMPLETED|Patient was seen by the doctor|
|CANCELLED|Cancelled by patient or system|
|NO_SHOW|Patient didn't show up for allocated slot|
|EXPIRED|Waiting token expired at end of day|

**Typical flow:** WAITING → ALLOCATED → COMPLETED

**Alternative flows:**

- WAITING → CANCELLED (patient cancels before allocation)
- ALLOCATED → CANCELLED (patient cancels after allocation)
- ALLOCATED → NO_SHOW (patient doesn't show up)
- WAITING → EXPIRED (end of day, patient not served)

---

## Error Codes

Common error responses you may encounter:

|Status|Error Code|Description|
|---|---|---|
|400|INVALID_PATIENT_NAME|Patient name is required and must be a string|
|400|INVALID_DOCTOR_ID|Doctor ID is required and must be a string|
|400|INVALID_DATE|Date is required and must be a string (DD-MM-YYYY)|
|400|INVALID_DATE_FORMAT|Date must be in DD-MM-YYYY format|
|400|PAST_DATE|Cannot create tokens for past dates|
|400|INVALID_SOURCE|Valid source is required (WALKIN or ONLINE)|
|400|INVALID_PRIORITY|Valid priority is required (EMERGENCY, PAID, FOLLOWUP, ONLINE, WALKIN)|
|400|INVALID_IDEMPOTENCY_KEY|Idempotency key is required|
|400|INVALID_PHONE|Invalid phone number format|
|400|INVALID_AGE|Patient age must be a positive number|
|400|INVALID_TOKEN_ID|Valid token ID is required|
|404|-|Token not found|
|409|DUPLICATE_IDEMPOTENCY_KEY|Token with this idempotency key already exists|