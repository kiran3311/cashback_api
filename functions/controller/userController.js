const db = require("../config/firebase");
const { encrypt , decrypt } = require("../encryption/crypto");


exports.createUser = async (req, res) => {

    try {
        const data = req.body;
        const ref = await db.collection("users").add(data);
        res.status(200).send({ id: ref.id, message: "User added!" });
    } catch (err) {
        res.status(500).send(err);
    }


}


exports.getAllUsers = async (req, res) => {
    try {
        const snapshot = await db.collection("users").get();
        const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).send(users);
    } catch (err) {
        res.status(500).send(err);
    }
}

exports.register = async (req, res) => {
    try {
        const { name, email, mobile, password, profile } = req.body;

        if (!name || !email || !mobile || !password ||!profile) {
            return res.status(400).json({ message: "All fields required" });
        }

        // 1️⃣ Check if email exists
        const emailSnap = await db.collection("users")
            .where("email", "==", email)
            .get();

        if (!emailSnap.empty) {
            return res.status(400).json({ message: "Email already registered" });
        }

        // 2️⃣ Check if mobile exists
        const mobileSnap = await db.collection("users")
            .where("mobile", "==", mobile)
            .get();

        if (!mobileSnap.empty) {
            return res.status(400).json({ message: "Mobile number already registered" });
        }

        // 3️⃣ Encrypt password
        const encryptedPassword = encrypt(password);

        // 4️⃣ Store user
        const docRef = await db.collection("users").add({
            name,
            email,
            mobile,
            password: encryptedPassword,
            profile,
            createdAt: new Date()
        });

        res.status(200).json({
            message: "User registered successfully",
            userId: docRef.id
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};




exports.login = async (req, res) => {
    try {
        const { emailOrMobile, password } = req.body;

        if (!emailOrMobile || !password) {
            return res.status(400).json({ message: "Email/Mobile and password required" });
        }

        // 1️⃣ Check by email
        let userSnap = await db.collection("users")
            .where("email", "==", emailOrMobile)
            .get();

        // 2️⃣ If email not found → check by mobile
        if (userSnap.empty) {
            userSnap = await db.collection("users")
                .where("mobile", "==", emailOrMobile)
                .get();
        }

        // 3️⃣ User not found
        if (userSnap.empty) {
            return res.status(404).json({ message: "User not found" });
        }

        const user = userSnap.docs[0].data();

        // 4️⃣ Decrypt and match password
        const decryptedPassword = decrypt(user.password);

        if (decryptedPassword !== password) {
            return res.status(400).json({ message: "Invalid password" });
        }

        res.status(200).json({
            message: "Login successful",
            user: {
                name: user.name,
                email: user.email,
                mobile: user.mobile,
                profile: user.profile
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

