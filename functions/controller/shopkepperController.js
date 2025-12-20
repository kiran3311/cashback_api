const db = require("../config/firebase");
const { encrypt, decrypt } = require("../encryption/crypto");
const { sendInviteEmail } = require("../services/emailService");
const { sendInviteEmail_2 } = require("../services/sendgridmailService");

exports.addCustomerToShopkeeper = async (req, res) => {

    try {
        const data = req.body;
        const d = {
            shopkeeperid: "",

        }
        const ref = await db.collection("users").add(data);
        res.status(200).send({ id: ref.id, message: "User added!" });
    } catch (err) {
        res.status(500).send(err);
    }


}


exports.getAllCustomerWithShopkeeperId = async (req, res) => {

    try {
        const data = req.body;
        const ref = await db.collection("users").add(data);
        res.status(200).send({ id: ref.id, message: "User added!" });
    } catch (err) {
        res.status(500).send(err);
    }


}


exports.addCustomer = async (req, res) => {
    try {
        const { shopkeeperId, name, mobile, customerEmail, cashback,  billAmount, issuCashback } = req.body;

        if (!shopkeeperId || !name || !mobile || !customerEmail) {
            return res.status(400).json({ message: "All fields required" });
        }

        // 1️⃣ Find user with this mobile (must be customer)
        const userRef = await db.collection("users")
            .where("mobile", "==", mobile)
            .get();

        if (userRef.empty) {
            await sendInviteEmail(customerEmail, name);
            return res.status(200).json({
                message: "User not registered — invitation sent to email."
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
                billAmount: Number(billAmount) ||0,
                addedAt: new Date()
            }, { merge: true });

        // 4️⃣ Add cashback entry
        await db.collection("cashbacks").add({
            userId,
            shopkeeperId,
            billAmount :Number(billAmount),
            cashback: Number(cashback),
            issuCashback : issuCashback? issuCashback : false,
            date: new Date()
        });

        return res.status(200).json({
            message: "Customer added and cashback updated",
            userId
        });

    } catch (error) {
        console.error(error);
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
                    billAmount  : data.billAmount,
                    cashback: data.cashback,
                    issuCashback: data.issuCashback,
                    date: data.date
                });
            });

            // 3️⃣ Final formatted customer record
            customers.push({
                userId :userId,
                name: userData.name || shopCustomer.name,
                email: userData.email || null,
                mobile: userData.mobile || shopCustomer.mobile,
                totalcashback: totalCashback,
                createdAt: shopCustomer.addedAt || userData.createdAt || null,
                cashbackHistory // remove this line if you do NOT want history
            });
        }

        return res.status(200).json({
            message: "Customer list fetched successfully",
            customers
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Server error",
            error: error.message
        });
    }
};



