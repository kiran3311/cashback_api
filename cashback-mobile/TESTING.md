# CashBack Mobile Test Checklist

## Authentication
- Register a customer with name, email, mobile and `customer` profile.
- Register a shopkeeper with name, email, mobile and `shopkeeper` profile.
- Login as customer by mobile number.
- Login as shopkeeper by mobile number.
- Close and reopen the app, then verify the saved session restores.
- Sign out from customer and shopkeeper profile pages.

## Push Notifications
- Login on a physical Android device.
- Grant notification permission when prompted.
- Verify `/save-fcm-token` receives a token for the logged-in user.
- Issue cashback to a customer and verify a notification log is created by the backend.
- Send a redeem request and verify the customer receives a notification or backend notification log.
- Approve/reject redeem and verify the shopkeeper/customer receives the status notification or backend log.

## Customer Flow
- Open customer dashboard and verify cashback summary loads.
- Pull down to refresh every customer tab.
- Open Wallet and verify transactions show bill amount, cashback, status and shop name.
- Approve a redeem request from Wallet.
- Reject a redeem request from Wallet.
- Verify balance/transactions update after approval or rejection.

## Shopkeeper Flow
- Open Settings and create a shop.
- Verify the created shop appears in Your Shops.
- Pull down to refresh every shopkeeper tab.
- Search a registered customer by mobile.
- Issue cashback to that customer.
- Verify the customer appears in the Customers tab.
- Open Transactions and update bill/cashback values for a transaction.
- Send a redeem request from Transactions.
- Verify customer can approve/reject that redeem request.

## Production Build
- Set `EXPO_PUBLIC_API_BASE_URL` to the production HTTPS API URL.
- Run `eas build -p android --profile preview --clear-cache` for APK testing.
- Install the APK on a physical device.
- Repeat the authentication, customer, shopkeeper and notification checks.
- Run `eas build -p android --profile production --clear-cache` for Play Store AAB.
