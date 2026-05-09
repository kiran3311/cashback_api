const db = require("../config/firebase");
const { encrypt, decrypt } = require("../encryption/crypto");
const { sendInviteEmail } = require("../services/emailService");
const { sendInviteEmail_2 } = require("../services/sendgridmailService");
const {
    sendCashbackReceivedNotification,
    sendRedeemStatusNotification
} = require("../services/firebaseNotificationService");
const { logError } = require("../services/loggerService");
const axios = require("axios");

const logControllerError = (source, error, req) => {
    logError(source, error, {
        type: "CONTROLLER_ERROR",
        userId: req.body?.userId || req.body?.shopkeeperId || null,
        mobile: req.body?.mobile || req.body?.customerMobile || null,
        body: req.body
    });
};

exports.addCustomerToShopkeeper = async (req, res) => {

    try {
        const data = req.body;
        const d = {
            shopkeeperid: "",

        }
        const ref = await db.collection("users").add(data);
        res.status(200).send({ id: ref.id, message: "User added!" });
    } catch (err) {
        logControllerError("addCustomerToShopkeeper failed", err, req);
        res.status(500).send(err);
    }


}


exports.getAllCustomerWithShopkeeperId = async (req, res) => {

    try {
        const data = req.body;
        const ref = await db.collection("users").add(data);
        res.status(200).send({ id: ref.id, message: "User added!" });
    } catch (err) {
        logControllerError("getAllCustomerWithShopkeeperId failed", err, req);
        res.status(500).send(err);
    }


}


exports.addCustomer = async (req, res) => {
    try {
        const { shopkeeperId, name, mobile, customerEmail, cashback, billAmount, issueCashback } = req.body;

        if (!shopkeeperId || !name || !mobile ) {
            return res.status(400).json({ message: "All fields required" });
        }

        // 1️⃣ Find user with this mobile (must be customer)
        const userRef = await db.collection("users")
            .where("mobile", "==", mobile)
            .get();

        if (userRef.empty) {
            // await sendInviteEmail(customerEmail, name);
            return res.status(200).json({
                errorCode: 4,
                message: "User not found"
            });
        }

        const user = userRef.docs[0];
        const userId = user.id;
        const userData = user.data();

        // 2️⃣ Prevent linking shopkeeper as customer (your main issue)
        if (userId === shopkeeperId) {
            return res.status(400).json({
                message: "You cannot add your own number as a customer."
            });
        }

        // (optional) block if user is not a customer
        if (userData.profile !== "customer") {
            return res.status(400).json({
                message: "This user is not a customer profile. Cannot assign cashback."
            });
        }

        // 3️⃣ Add customer under shopkeeper
        await db.collection("shopkeepers")
            .doc(shopkeeperId)
            .collection("customers")
            .doc(userId)
            .set({
                name,
                mobile,
                cashback: Number(cashback) || 0,
                billAmount: Number(billAmount) || 0,
                addedAt: new Date()
            }, { merge: true });

        // 4️⃣ Add cashback entry
        const cashbackRef = await db.collection("cashbacks").add({
            userId,
            shopkeeperId,
            billAmount: Number(billAmount),
            cashback: Number(cashback),
            issueCashback: issueCashback ? issueCashback : true,
            redeemcashback: false,
            date: new Date()
        });

        sendCashbackReceivedNotification({
            userId,
            cashback: Number(cashback) || 0,
            billAmount: Number(billAmount) || 0,
            cashbackId: cashbackRef.id,
            shopkeeperId
        }).catch(error => {
            console.log("[FCM] Cashback received notification error:", error.message);
        });

        return res.status(200).json({
            message: "Customer added and cashback updated",
            userId
        });

    } catch (error) {
        console.error(error);
        logControllerError("addCustomer failed", error, req);
        return res.status(500).json({ message: "Server error" });
    }
};



exports.createShop = async (req, res) => {
    try {
        const {
            shopkeeperId,
            shopName,
            ownerName,
            mobile,
            address,
            pincode,
            gst
        } = req.body;

        // Validation
        if (!shopkeeperId || !shopName || !ownerName || !mobile) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        //    const userRef = await db.collection("users")
        //         .where("id", "==", shopkeeperId)
        //         .get();

        //     if (userRef.empty) {
        //         return res.status(404).json({ message: "No user found with this shopkeeperId" });
        //     }

        //     const user = userRef.docs[0].data();

        //     if (user.profile !== "shopkeeper") {
        //         return res.status(400).json({ message: "User is not registered as shopkeeper" });
        //     }

        // Create shop object
        const shopData = {
            shopkeeperId,
            shopName,
            ownerName,
            mobile,
            address: address || "",
            pincode: pincode || "",
            gst: gst || "",
            createdAt: new Date()
        };

        // Save to Firestore
        const ref = await db.collection("shops").add(shopData);

        res.status(201).json({
            message: "Shop created successfully",
            shopId: ref.id,
            data: shopData
        });

    } catch (error) {
        console.error("createShop error:", error);
        logControllerError("createShop failed", error, req);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};



exports.getShopsByUserId = async (req, res) => {
    try {
        const { shopkeeperId } = req.body;

        if (!shopkeeperId) {
            return res.status(400).json({ message: "shopkeeperId is required" });
        }

        // Fetch shops belonging to user
        const querySnapshot = await db
            .collection("shops")
            .where("shopkeeperId", "==", shopkeeperId)
            .get();

        if (querySnapshot.empty) {
            return res.status(404).json({ message: "No shops found for this user" });
        }

        const shops = [];
        querySnapshot.forEach(doc => {
            shops.push({
                shopId: doc.id,
                ...doc.data()
            });
        });

        res.status(200).json({
            message: "Shops fetched successfully",
            count: shops.length,
            shops: shops
        });

    } catch (error) {
        console.error("getShopsByUserId error:", error);
        logControllerError("getShopsByUserId failed", error, req);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

exports.getCustomersByShopkeeper = async (req, res) => {
    try {
        const { shopkeeperId } = req.body;

        if (!shopkeeperId) {
            return res.status(400).json({ message: "shopkeeperId required" });
        }

        // 1️⃣ Fetch linked customers
        const customerSnap = await db.collection("shopkeepers")
            .doc(shopkeeperId)
            .collection("customers")
            .get();

        if (customerSnap.empty) {
            return res.status(200).json({
                message: "No customers linked",
                customers: []
            });
        }

        let customers = [];

        for (let doc of customerSnap.docs) {
            const shopCustomer = doc.data();
            const userId = doc.id;

            // Fetch main user profile
            const userDoc = await db.collection("users").doc(userId).get();
            if (!userDoc.exists) continue;

            const userData = userDoc.data();

            // Must be customer profile
            if (userData.profile !== "customer") continue;

            // 2️⃣ Fetch cashback history (from cashbacks collection)
            const cashbackSnap = await db.collection("cashbacks")
                .where("shopkeeperId", "==", shopkeeperId)
                .where("userId", "==", userId)
                .get();


            let totalCashback = 0;
            let cashbackHistory = [];

            cashbackSnap.forEach(cb => {
                const data = cb.data();
                totalCashback += data.cashback || 0;

                cashbackHistory.push({
                    cashbackId: cb.id,
                    billAmount: data.billAmount || null,
                    cashback: data.cashback,
                    issueCashback: data?.issueCashback || false,
                    redeemcashback: data?.redeemcashback || false,
                    redeemStatus: data?.redeemStatus || "PENDING",
                    date: data.date
                        ? data.date.toDate().toLocaleString("en-IN", {
                            timeZone: "Asia/Kolkata"
                        }).toString()
                        : null,
                    redeemedAt: data?.redeemedAt ? data.redeemedAt.toDate().toLocaleString("en-IN", {
                        timeZone: "Asia/Kolkata"
                    }).toString() : null,
                });

                console.log("cashbackHistory", cashbackHistory)
            });

            // 3️⃣ Final formatted customer record
            customers.push({
                userId: userId,
                name: userData.name || shopCustomer.name,
                email: userData.email || null,
                mobile: userData.mobile || shopCustomer.mobile,
                totalcashback: totalCashback,
                createdAt: shopCustomer.addedAt.toDate().toLocaleString("en-IN", {
                    timeZone: "Asia/Kolkata"
                }).toString() || userData.createdAt.toDate().toLocaleString("en-IN", {
                    timeZone: "Asia/Kolkata"
                }).toString() || null,
                cashbackHistory // remove this line if you do NOT want history
            });
        }

        return res.status(200).json({
            message: "Customer list fetched successfully",
            customers
        });

    } catch (error) {
        console.error(error);
        logControllerError("getCustomersByShopkeeper failed", error, req);
        return res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }
};


exports.updateCashbackToExistingCustomer = async (req, res) => {
    try {
        const {
            mobile,
            cashback,
            billAmount,
            issueCashback,
            cashbackId,

        } = req.body;

        if (!mobile || !cashbackId) {
            return res.status(400).json({
                message: "mobile and cashbackId are required"
            });
        }

        // 1️⃣ Find user by mobile
        const userRef = await db.collection("users")
            .where("mobile", "==", mobile)
            .get();

        if (userRef.empty) {
            return res.status(404).json({
                message: "User not registered"
            });
        }

        const userDoc = userRef.docs[0];
        const userId = userDoc.id;
        const userData = userDoc.data();

        // 2️⃣ Ensure customer profile
        if (userData.profile !== "customer") {
            return res.status(400).json({
                message: "This user is not a customer"
            });
        }

        // 3️⃣ Fetch existing cashback by cashbackId
        const cashbackRef = db.collection("cashbacks").doc(cashbackId);
        const cashbackDoc = await cashbackRef.get();

        if (!cashbackDoc.exists) {
            return res.status(404).json({
                message: "Cashback record not found"
            });
        }

        const cashbackData = cashbackDoc.data();

        // 4️⃣ Security check (VERY IMPORTANT)
        // if (
        //     cashbackData.userId !== userId ||
        //     cashbackData.shopkeeperId !== shopkeeperId
        // ) {
        //     return res.status(403).json({
        //         message: "Unauthorized cashback update"
        //     });
        // }

        // 5️⃣ Update cashback only
        await cashbackRef.update({
            billAmount: billAmount !== undefined ? Number(billAmount) : cashbackData.billAmount,
            cashback: cashback !== undefined ? Number(cashback) : cashbackData.cashback,
            issueCashback: issueCashback !== undefined ? issueCashback : cashbackData.issueCashback,
            updatedAt: new Date()
        });

        return res.status(200).json({
            message: "Cashback updated successfully",
            cashbackId
        });

    } catch (error) {
        console.error(error);
        logControllerError("updateCashbackToExistingCustomer failed", error, req);
        return res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }

};



exports.addCashbackToExistingCustomer = async (req, res) => {
    try {
        const {
            shopkeeperId,
            mobile,
            billAmount,
            cashback,
            issueCashback
        } = req.body;

        if (!shopkeeperId || !mobile || !billAmount || !cashback) {
            return res.status(400).json({
                message: "shopkeeperId, mobile, billAmount and cashback are required"
            });
        }

        // 1️⃣ Find customer by mobile
        const userSnap = await db.collection("users")
            .where("mobile", "==", mobile)
            .get();

        if (userSnap.empty) {
            return res.status(404).json({
                message: "Customer not registered"
            });
        }

        const userDoc = userSnap.docs[0];
        const userId = userDoc.id;
        const userData = userDoc.data();

        if (userData.profile !== "customer") {
            return res.status(400).json({
                message: "User is not a customer"
            });
        }

        // 2️⃣ Check customer already linked to shopkeeper
        const customerRef = db
            .collection("shopkeepers")
            .doc(shopkeeperId)
            .collection("customers")
            .doc(userId);

        const customerDoc = await customerRef.get();

        if (!customerDoc.exists) {
            return res.status(400).json({
                message: "Customer not linked to this shopkeeper"
            });
        }

        // 3️⃣ Add new cashback entry
        const cashbackRef = await db.collection("cashbacks").add({
            userId,
            shopkeeperId,
            billAmount: Number(billAmount),
            cashback: Number(cashback),
            issueCashback: issueCashback || true,
            redeemcashback: false,
            redeemStatus: "PENDING",
            date: new Date(),
            createdAt: new Date()
        });

        sendCashbackReceivedNotification({
            userId,
            cashback: Number(cashback) || 0,
            billAmount: Number(billAmount) || 0,
            cashbackId: cashbackRef.id,
            shopkeeperId
        }).catch(error => {
            console.log("[FCM] Cashback received notification error:", error.message);
        });

        return res.status(200).json({
            message: "Cashback added successfully",
            cashbackId: cashbackRef.id,
            userId
        });

    } catch (error) {
        console.error(error);
        logControllerError("addCashbackToExistingCustomer failed", error, req);
        return res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }
};



exports.redeemCashbackToExistingCustomer = async (req, res) => {
    try {

        const {
            customerMobile,
            redeemAmount,
            cashbackId,

        } = req.body;

        if (!customerMobile || !cashbackId) {
            return res.status(400).json({
                message: "customerMobile and cashbackId are required"
            });
        }

        // 1️⃣ Find user by customerMobile
        const userRef = await db.collection("users")
            .where("mobile", "==", customerMobile)
            .get();

        if (userRef.empty) {
            return res.status(404).json({
                message: "User not registered"
            }); 
        }

        const userDoc = userRef.docs[0];
        const userId = userDoc.id;
        const userData = userDoc.data();

        console.log("userData", userId)

        // 2️⃣ Ensure customer profile
        if (userData.profile !== "customer") {
            return res.status(400).json({
                message: "This user is not a customer"
            });
        }

        // 3️⃣ Fetch existing cashback by cashbackId
        const cashbackRef = db.collection("cashbacks").doc(cashbackId);
        const cashbackDoc = await cashbackRef.get();

        if (!cashbackDoc.exists) {
            return res.status(404).json({
                message: "Cashback record not found"
            });
        }

        const cashbackData = cashbackDoc.data();

         const url = " http://72.62.195.21:8000";



       // const url = "http://localhost:8000"

        await axios.post(`${url}/send-notification`, {
            userId,
            notificationId: cashbackId,
            redeemAmount: redeemAmount,
            message: `Shopkeeper wants to redeem ₹${redeemAmount}. Approve?`
        });


        return res.status(200).json({
            message: "Cashback redeem request notification send successfully",
            cashbackId,
            customerResponse: res.data
        });

    } catch (error) {
        console.error(error);
        logControllerError("redeemCashbackToExistingCustomer failed", error, req);
        return res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }

};



// POST /redeem-response
exports.updateRedeemStatus = async (req, res) => {
    try {
        const { cashbackId, action, redeemAmount } = req.body;

        console.log("updateRedeemStatus---", req.body)

        if (!cashbackId || !action) {
            return res.status(400).json({
                message: "cashbackId and action are required"
            });
        }

        const cashbackRef = db.collection("cashbacks").doc(cashbackId);
        const cashbackDoc = await cashbackRef.get();

        if (!cashbackDoc.exists) {
            return res.status(404).json({ message: "Cashback not found" });
        }

        const updatedCashbakAmt = cashbackDoc.data().cashback - redeemAmount;

        const updateData =
            action === "APPROVED"
                ? {
                    redeemcashback: true,
                    redeemStatus: "APPROVED",
                    redeemedAt: new Date(),
                    cashback: updatedCashbakAmt
                }
                : {
                    redeemcashback: false,
                    redeemStatus: "REJECTED"
                };

        await cashbackRef.update(updateData);

        const cashbackData = cashbackDoc.data();
        const notificationUserId = action === "APPROVED"
            ? cashbackData.shopkeeperId
            : cashbackData.userId;

        if (notificationUserId) {
            sendRedeemStatusNotification({
                userId: notificationUserId,
                cashbackId,
                action,
                redeemAmount
            }).catch(error => {
                console.log("[FCM] Redeem status notification error:", error.message);
            });
        }

        console.log("redeen updateData", updateData, redeemAmount)
        return res.status(200).json({
            message: `Redeem ${action.toLowerCase()} successfully`
        });

    } catch (error) {
        console.error(error);
        logControllerError("updateRedeemStatus failed", error, req);
        return res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }
};
