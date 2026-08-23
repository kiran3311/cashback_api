# Cashback API Reference

## Base URL and common headers

Local base URL:

```text
http://72.62.195.21:5001
```

Send this header for every request with a JSON body:

```http
Content-Type: application/json
```

No authentication middleware is currently registered. The documented server URL is `http://72.62.195.21:5001`.

## Endpoint index

| Area | Method | Endpoint |
| --- | --- | --- |
| Documentation | GET | `/swagger.json` |
| Documentation | GET | `/api-docs` |
| Users | POST | `/adduser` |
| Users | GET | `/getUsers` |
| Users | POST | `/register` |
| Users | POST | `/login` |
| OTP | POST | `/send-otp` |
| OTP | POST | `/verify-otp` |
| Customers | POST | `/getCustCashbackListById` |
| Customers | POST | `/getCustomerByMobileNo` |
| Shops | POST | `/createShop` |
| Shops | POST | `/getShopsByUserId` |
| Shops | POST | `/getCustomerListByShopkeeperId` |
| Cashback | POST | `/adduserToShop` |
| Cashback | POST | `/updateCashbackToExistingCustomer` |
| Cashback | POST | `/addCashbackToExistingCustomer` |
| Redemption | POST | `/redeemCashback` |
| Redemption | POST | `/updateRedeemStatus` |
| Notifications | POST | `/save-fcm-token` |
| Notifications | POST | `/send-push-notification` |

---

## Documentation endpoints

### GET `/swagger.json`

Returns the project Swagger/OpenAPI JSON document.

**Sample response**

```json
{
  "openapi": "3.0.0"
}
```

### GET `/api-docs`

Returns the browser Swagger documentation page.

---

## User endpoints

### POST `/adduser`

Adds the supplied request body as a new document in Firestore `users`. The route has no field validation.

**Request body**

```json
{
  "name": "Rahul Kumar",
  "email": "rahul@example.com",
  "mobile": "9876543210",
  "profile": "customer"
}
```

**Success — 200**

```json
{
  "id": "NEW_USER_DOCUMENT_ID",
  "message": "User added!"
}
```

### GET `/getUsers`

Returns every Firestore document in `users`.

**Success — 200**

```json
[
  {
    "id": "USER_DOCUMENT_ID",
    "name": "Rahul Kumar",
    "mobile": "9876543210",
    "profile": "customer"
  }
]
```

### POST `/register`

Registers a new user after checking that `email` and `mobile` are not already present.

**Request body**

```json
{
  "name": "Rahul Kumar",
  "email": "rahul@example.com",
  "mobile": "9876543210",
  "password": "optional-currently-not-stored",
  "profile": "customer"
}
```

Required fields: `name`, `email`, `mobile`, `profile`. The current implementation accepts `password` but does not save or validate it.

**Success — 200**

```json
{
  "success": true,
  "errorCode": 0,
  "message": "User registered successfully",
  "userId": "NEW_USER_DOCUMENT_ID"
}
```

**Duplicate email/mobile — 200**

```json
{
  "success": false,
  "errorCode": 1,
  "message": "Email already registered"
}
```

### POST `/login`

Finds a user by email address or mobile number. Password checking is currently disabled.

**Request body**

```json
{
  "emailOrMobile": "rahul@example.com"
}
```

**Success — 200**

```json
{
  "success": true,
  "errorCode": 0,
  "message": "Login successful",
  "user": {
    "userId": "USER_DOCUMENT_ID",
    "name": "Rahul Kumar",
    "email": "rahul@example.com",
    "mobile": "9876543210",
    "profile": "customer"
  }
}
```

**User not found — 200**

```json
{
  "success": false,
  "errorCode": 1,
  "message": "User not found"
}
```

---

## OTP endpoints

### POST `/send-otp`

Sends an OTP to a 10-digit mobile number.

**Request body**

```json
{
  "mobile": "9876543210"
}
```

**Success — 200**

```json
{
  "success": true
}
```

**Invalid mobile — 400**

```json
{
  "success": false,
  "error": "Enter valid 10-digit mobile number"
}
```

### POST `/verify-otp`

Verifies a six-digit OTP sent to a 10-digit mobile number.

**Request body**

```json
{
  "mobile": "9876543210",
  "otp": "123456"
}
```

**Success — 200**

```json
{
  "success": true
}
```

**Invalid mobile / OTP format — 400**

```json
{
  "success": false,
  "error": "Enter valid 6-digit OTP"
}
```

> The exact success/failure fields returned after validation come from `services/otpService.js`.

---

## Customer endpoints

### POST `/getCustCashbackListById`

Returns a customer's cashback history grouped by shop. A `mobile` value is required; `userId` is optional.

**Request body**

```json
{
  "userId": "USER_DOCUMENT_ID",
  "mobile": "9876543210"
}
```

**Success — 200**

```json
{
  "message": "Customer cashback details fetched successfully",
  "customerId": "USER_DOCUMENT_ID",
  "shops": [
    {
      "shopkeeperId": "SHOPKEEPER_DOCUMENT_ID",
      "shopId": "SHOP_DOCUMENT_ID",
      "shopName": "Demo Store",
      "totalCashback": 50,
      "cashbackHistory": [
        {
          "cashbackid": "CASHBACK_DOCUMENT_ID",
          "billAmount": 1000,
          "cashback": 50,
          "redeemcashback": false,
          "issueCashback": true,
          "redeemStatus": "PENDING"
        }
      ]
    }
  ]
}
```

### POST `/getCustomerByMobileNo`

Searches customer-profile users by a full or partial mobile number. At least three digits are required.

**Request body**

```json
{
  "mobile": "987"
}
```

**Success — 200**

```json
{
  "message": "Customers fetched successfully",
  "customer": {
    "id": "USER_DOCUMENT_ID",
    "name": "Rahul Kumar",
    "mobile": "9876543210",
    "profile": "customer"
  },
  "customers": []
}
```

**No customer found — 200**

```json
{
  "errorCode": 1,
  "message": "Customer not found",
  "customer": null,
  "customers": []
}
```

---

## Shop endpoints

### POST `/createShop`

Creates a shop in Firestore `shops`.

**Request body**

```json
{
  "shopkeeperId": "SHOPKEEPER_DOCUMENT_ID",
  "shopName": "Demo Store",
  "ownerName": "Amit Sharma",
  "mobile": "9876543210",
  "address": "Main Road",
  "pincode": "110001",
  "gst": "GSTIN123456"
}
```

Required: `shopkeeperId`, `shopName`, `ownerName`, `mobile`.

**Success — 201**

```json
{
  "message": "Shop created successfully",
  "shopId": "SHOP_DOCUMENT_ID",
  "data": {
    "shopkeeperId": "SHOPKEEPER_DOCUMENT_ID",
    "shopName": "Demo Store"
  }
}
```

### POST `/getShopsByUserId`

Returns shops owned by a shopkeeper.

**Request body**

```json
{
  "shopkeeperId": "SHOPKEEPER_DOCUMENT_ID"
}
```

**Success — 200**

```json
{
  "message": "Shops fetched successfully",
  "count": 1,
  "shops": [
    {
      "shopId": "SHOP_DOCUMENT_ID",
      "shopName": "Demo Store",
      "shopkeeperId": "SHOPKEEPER_DOCUMENT_ID"
    }
  ]
}
```

### POST `/getCustomerListByShopkeeperId`

Returns customers linked to a shopkeeper, including their cashback history for that shopkeeper.

**Request body**

```json
{
  "shopkeeperId": "SHOPKEEPER_DOCUMENT_ID"
}
```

**Success — 200**

```json
{
  "message": "Customer list fetched successfully",
  "customers": [
    {
      "userId": "USER_DOCUMENT_ID",
      "name": "Rahul Kumar",
      "mobile": "9876543210",
      "totalcashback": 50,
      "cashbackHistory": []
    }
  ]
}
```

If no customers are linked, the response is:

```json
{
  "message": "No customers linked",
  "customers": []
}
```

---

## Cashback endpoints

### POST `/adduserToShop`

Links an existing customer to a shopkeeper, creates a cashback entry, and triggers a **Cashback received** FCM notification.

**Request body**

```json
{
  "shopkeeperId": "SHOPKEEPER_DOCUMENT_ID",
  "name": "Rahul Kumar",
  "mobile": "9876543210",
  "customerEmail": "rahul@example.com",
  "billAmount": 500,
  "cashback": 20,
  "issueCashback": true
}
```

Required: `shopkeeperId`, `name`, `mobile`.

**Success — 200**

```json
{
  "message": "Customer added and cashback updated",
  "userId": "USER_DOCUMENT_ID"
}
```

### POST `/updateCashbackToExistingCustomer`

Updates an existing cashback record. This route does not send a push notification.

**Request body**

```json
{
  "mobile": "9876543210",
  "cashbackId": "CASHBACK_DOCUMENT_ID",
  "billAmount": 1200,
  "cashback": 60,
  "issueCashback": true
}
```

Required: `mobile`, `cashbackId`. The other fields are optional and only supplied values are updated.

**Success — 200**

```json
{
  "message": "Cashback updated successfully",
  "cashbackId": "CASHBACK_DOCUMENT_ID"
}
```

### POST `/addCashbackToExistingCustomer`

Creates a cashback record for a customer already linked to a shopkeeper and triggers a **Cashback received** FCM notification.

**Request body**

```json
{
  "shopkeeperId": "SHOPKEEPER_DOCUMENT_ID",
  "mobile": "9876543210",
  "billAmount": 1000,
  "cashback": 50,
  "issueCashback": true
}
```

Required: `shopkeeperId`, `mobile`, `billAmount`, `cashback`.

**Success — 200**

```json
{
  "message": "Cashback added successfully",
  "cashbackId": "NEW_CASHBACK_DOCUMENT_ID",
  "userId": "USER_DOCUMENT_ID"
}
```

---

## Redemption endpoints

### POST `/redeemCashback`

Requests redemption for an existing cashback record. The controller calls an external notification service.

**Request body**

```json
{
  "customerMobile": "9876543210",
  "cashbackId": "CASHBACK_DOCUMENT_ID",
  "redeemAmount": 50
}
```

Required: `customerMobile`, `cashbackId`.

**Success — 200**

```json
{
  "message": "Cashback redeem request notification send successfully",
  "cashbackId": "CASHBACK_DOCUMENT_ID"
}
```

### POST `/updateRedeemStatus`

Approves or rejects a redemption request, updates the cashback record, then triggers an FCM notification.

**Request body — approve**

```json
{
  "cashbackId": "CASHBACK_DOCUMENT_ID",
  "action": "APPROVED",
  "redeemAmount": 50
}
```

**Request body — reject**

```json
{
  "cashbackId": "CASHBACK_DOCUMENT_ID",
  "action": "REJECTED",
  "redeemAmount": 50
}
```

Required: `cashbackId`, `action`. `redeemAmount` is used when approving to reduce the cashback amount.

**Success — 200**

```json
{
  "message": "Redeem approved successfully"
}
```

Current notification recipient logic:

| Action | FCM recipient |
| --- | --- |
| `APPROVED` | Shopkeeper from the cashback record. |
| `REJECTED` | Customer from the cashback record. |

---

## Notification endpoints

### POST `/save-fcm-token`

Saves an Android/browser FCM token for a user.

**Request body**

```json
{
  "userId": "USER_DOCUMENT_ID",
  "fcmToken": "REAL_FCM_TOKEN_FROM_DEVICE"
}
```

**Success — 200**

```json
{
  "success": true,
  "message": "FCM token saved successfully"
}
```

### POST `/send-push-notification`

Manually sends a Firebase push notification to every unique FCM token saved for one user.

**Request body**

```json
{
  "userId": "USER_DOCUMENT_ID",
  "title": "Cashback received",
  "body": "You received Rs. 20 cashback.",
  "data": {
    "type": "CASHBACK_RECEIVED",
    "cashbackId": "CASHBACK_DOCUMENT_ID"
  }
}
```

Required: `userId`, `title`, `body`. `data` is optional; all data values are sent to FCM as strings.

**Success — 200**

```json
{
  "success": true,
  "successCount": 1,
  "failureCount": 0
}
```

**No token — 400**

```json
{
  "success": false,
  "error": "No FCM token found for user"
}
```

## FCM trigger summary

| API operation | Notification behavior |
| --- | --- |
| `/adduserToShop` | Sends cashback received notification to the customer. |
| `/addCashbackToExistingCustomer` | Sends cashback received notification to the customer. |
| `/updateRedeemStatus` | Sends redeem status notification to the shopkeeper on approval, customer on rejection. |
| `/send-push-notification` | Sends a custom push to the requested user. |
