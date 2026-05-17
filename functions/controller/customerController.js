const db = require("../config/firebase");
const { encrypt, decrypt } = require("../encryption/crypto");
const { sendInviteEmail } = require("../services/emailService");
const { logError } = require("../services/loggerService");

const logControllerError = (source, error, req) => {
    logError(source, error, {
        type: "CONTROLLER_ERROR",
        userId: req.body?.userId || null,
        mobile: req.body?.mobile || null,
        body: req.body
    });
};


exports.getCustomerCashbackDetails = async (req, res) => {
    try {
        const { userId, mobile } = req.body;

        if (!mobile) {
            return res.status(400).json({
                message: "userId or mobile is required"
            });
        }

        let customerId = userId;

        // 1️⃣ Find user by mobile if userId not provided
        if (!customerId) {
            const userSnap = await db.collection("users")
                .where("mobile", "==", mobile)
                .limit(1)
                .get();

            if (userSnap.empty) {
                return res.status(404).json({
                    message: "Customer not found"
                });
            }

            customerId = userSnap.docs[0].id;
        }

        // 2️⃣ Fetch all cashback entries for this customer
        const cashbackSnap = await db.collection("cashbacks")
            .where("userId", "==", customerId)
            .get();

        if (cashbackSnap.empty) {
            return res.status(200).json({
                message: "No cashback history found",
                shops: []
            });
        }

        let shopMap = {}; // shopkeeperId → data

        for (let doc of cashbackSnap.docs) {
            const data = doc.data();
            const cashbackid = doc.id;
            const { shopkeeperId, cashback, billAmount, date , redeemcashback,issueCashback, redeemStatus} = data;
 console.log("cashback data----->>>", data);    
            if (!shopMap[shopkeeperId]) {
                const shopSnap = await db.collection("shops")
                    .where("shopkeeperId", "==", shopkeeperId)
                    .limit(1)
                    .get();

                const shopData = !shopSnap.empty ? shopSnap.docs[0].data() : null;
                const shopkeeperDoc = await db.collection("users").doc(shopkeeperId).get();

                shopMap[shopkeeperId] = {
                    shopkeeperId,
                    shopId: !shopSnap.empty ? shopSnap.docs[0].id : null,
                    shopName: shopData?.shopName || shopkeeperDoc.data()?.shopName || shopkeeperDoc.data()?.name || "CashBack Partner",
                    totalCashback: 0,
                    cashbackHistory: []
                };
            }

            shopMap[shopkeeperId].totalCashback += cashback || 0;
            shopMap[shopkeeperId].cashbackHistory.push({
                billAmount: billAmount || null,
                cashback,
                cashbackid,
                shopName: shopMap[shopkeeperId].shopName,
                date: date.toDate().toLocaleString("en-IN", {
                    timeZone: "Asia/Kolkata"
                }).toString(),
                redeemcashback: redeemcashback || false,
                issueCashback: issueCashback || false,
                redeemStatus : redeemStatus
            });
        }

        return res.status(200).json({
            message: "Customer cashback details fetched successfully",
            customerId,
            shops: Object.values(shopMap)
        });

    } catch (error) {
        console.error(error);
        logControllerError("getCustomerCashbackDetails failed", error, req);
        return res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }
};



exports.getCustomerByMobileNo = async (req, res) => {
    try {
        const { mobile } = req.body;
        if (!mobile) {
            return res.status(400).json({ message: "Mobile number is required" });
        }

        const normalizedMobile = String(mobile).replace(/\D/g, "");

        if (normalizedMobile.length < 3) {
            return res.status(200).json({
                message: "Enter at least 3 digits to search customers",
                customer: null,
                customers: []
            });
        }

        const normalizeDigits = value => String(value || "").replace(/\D/g, "");
        const customerById = new Map();

        const addCustomerDocs = snapshot => {
            snapshot.docs.forEach(doc => {
                const data = doc.data();

                if (data.profile === "customer") {
                    customerById.set(doc.id, {
                        id: doc.id,
                        ...data
                    });
                }
            });
        };

        const exactStringSnap = await db.collection("users")
            .where("mobile", "==", normalizedMobile)
            .where("profile", "==", "customer")
            .limit(10)
            .get();

        addCustomerDocs(exactStringSnap);

        const exactNumber = Number(normalizedMobile);
        if (!Number.isNaN(exactNumber)) {
            const exactNumberSnap = await db.collection("users")
                .where("mobile", "==", exactNumber)
                .where("profile", "==", "customer")
                .limit(10)
                .get();

            addCustomerDocs(exactNumberSnap);
        }

        if (!customerById.size) {
            const snapshot = await db.collection("users")
            .where("profile", "==", "customer")
                .limit(500)
            .get();

            addCustomerDocs(snapshot);
        }

        const customers = Array.from(customerById.values())
            .filter(customer => {
                const customerMobile = normalizeDigits(customer.mobile);
                return customerMobile === normalizedMobile
                    || customerMobile.startsWith(normalizedMobile)
                    || customerMobile.endsWith(normalizedMobile);
            })
            .slice(0, 10);

        if (!customers.length) {
            return res.status(404).json({ 
                errorCode: 1,
                message: "Customer not found",
                customer: null,
                customers: []
            });
        }

        res.status(200).json({
            message: "Customers fetched successfully",
            customer: customers[0] || null,
            customers
        });
    } catch (err) {
        console.error(err);
        logControllerError("getCustomerByMobileNo failed", err, req);
        res.status(500).send(err);
    }
}
