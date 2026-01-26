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
            const cashbackid = doc.id;
            const { shopkeeperId, cashback, billAmount, date , redeemcashback,issueCashback} = data;
 console.log("cashback data----->>>", data);    
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
                billAmount: billAmount || null,
                cashback,
                cashbackid,
                date: date.toDate().toLocaleString("en-IN", {
                    timeZone: "Asia/Kolkata"
                }).toString(),
                redeemcashback: redeemcashback || false,
                issueCashback: issueCashback || false
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



exports.getCustomerByMobileNo = async (req, res) => {
    try {
        const { mobile } = req.body;
        if (!mobile) {
            return res.status(400).json({ message: "Mobile number is required" });
        }
        const snapshot = await db.collection("users")
            .where("mobile", "==", mobile)
            .where("profile", "==", "customer")
            .limit(1)
            .get();
        //   const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const customer = {
            id: snapshot.docs[0]?.id,
            ...snapshot.docs[0]?.data()
        };

        if (snapshot.empty) {
            return res.status(404).json({ 
                errorCode: 1,
                message: "Customer not found" });
        }
        res.status(200).json({
            message: "Customer fetched successfully",
            customer
        });
    } catch (err) {
        console.error(err);
        res.status(500).send(err);
    }
}
