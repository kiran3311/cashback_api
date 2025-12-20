const db = require("../config/firebase");
const { encrypt, decrypt } = require("../encryption/crypto");
const { sendInviteEmail } = require("../services/emailService");


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
            const { shopkeeperId, cashback, billAmount, date, cashbackid } = data;

            if (!shopMap[shopkeeperId]) {
                // fetch shopkeeper profile once
                const shopDoc = await db.collection("users").doc(shopkeeperId).get();

                shopMap[shopkeeperId] = {
                    shopkeeperId,
                    shopName: shopDoc.exists ? shopDoc.data().shopName || null : null,
                    totalCashback: 0,
                    cashbackHistory: []
                };
            }

            shopMap[shopkeeperId].totalCashback += cashback || 0;
            shopMap[shopkeeperId].cashbackHistory.push({
                billAmount,
                cashback,
                cashbackid,
                date
            });
        }

        return res.status(200).json({
            message: "Customer cashback details fetched successfully",
            customerId,
            shops: Object.values(shopMap)
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }
};
