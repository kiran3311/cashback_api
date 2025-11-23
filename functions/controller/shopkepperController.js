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
        const { shopkeeperId, name, mobile, customerEmail, cashback } = req.body;

        if (!shopkeeperId || !name || !mobile || !customerEmail) {
            return res.status(400).json({ message: "All fields required" });
        }

        // Check if customer already registered
        const userRef = await db.collection("users")
            .where("mobile", "==", mobile)
            .get();

        let userId;

        if (userRef.empty) {
            await sendInviteEmail(customerEmail, name);

            // await sendInviteEmail_2(
            //     customerEmail,
            //     "Welcome!",
            //     `<h3>Hi ${name}</h3><p>Please Download cashback App.</p>`
            // );
            return res.status(200).json({ message: "user is not registered invitation sent to mail" });
            // Customer NOT registered → send SMS invite
            //   const inviteMessage =
            //     `Hi ${name}, you are invited to join Cashback App. Download & register to start earning rewards!`;

            //   await sendSMS(mobile, inviteMessage);

            //   // Create user placeholder (not fully registered)
            //   const userDoc = await db.collection("users").add({
            //     name,
            //     mobile,
            //     registered: false,
            //     createdAt: new Date()
            //   });

            //   userId = userDoc.id;
        } else {
            // Already registered
            const user = userRef.docs[0];
            userId = user.id;
        }

        // Add customer under shopkeeper
        await db.collection("shopkeepers")
            .doc(shopkeeperId)
            .collection("customers")
            .doc(userId)
            .set({
                name,
                mobile,
                cashback,
                addedAt: new Date()
            });

        // Also store cashback inside customer record
        await db.collection("cashbacks").add({
            userId,
            shopkeeperId,
            cashback,
            date: new Date()
        });

        return res.status(200).json({
            message: "Customer added successfully to your shop",
            userId: userId
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
